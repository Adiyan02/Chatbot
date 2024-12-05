from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import json

from services.openai_service import client
from services.api_service import (
    extract_ticket_info,
    determine_company,
    determine_vehicle,
    get_filtered_companies,
    get_filtered_vehicles,
    get_shift
)

# Konfiguration des Loggings
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(
    app,
    origins="http://localhost:5173",
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"]
)

@app.route('/api/test', methods=['GET'])
def test():
    """
    Eine einfache GET-Route zum Testen der Serververbindung und CORS.
    """
    return jsonify({
        'success': True,
        'message': 'Server ist erreichbar!'
    }), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('chatverlauf')
        tools_used = []

        if not user_message:
            return jsonify({
                'success': False,
                'error': 'Keine Nachricht erhalten.'
            }), 400

        system_prompt = {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous."
                }
            ]
        }
        user_message = [system_prompt] + user_message

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=user_message,
            response_format={"type": "text"},
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "extract_ticket_info",
                        "description": (
                            "Extrahiert Informationen aus Strafzettel-Nachrichten zu Fahrzeugverstößen, "
                            "um die relevanten Details über den Fahrer zu ermitteln, der den Verstoß begangen hat."
                        ),
                        "parameters": {
                            "type": "object",
                            "required": ["license_plate", "datetime", "company"],
                            "properties": {
                                "license_plate": {
                                    "type": "string",
                                    "description": "Kennzeichen des Fahrzeugs"
                                },
                                "datetime": {
                                    "type": "string",
                                    "description": "Datum und Uhrzeit des Vorfalls"
                                },
                                "company": {
                                    "type": "string",
                                    "description": "Unternehmen, das den Strafzettel erhalten hat"
                                }
                            },
                            "additionalProperties": False
                        }
                    }
                }
            ],
            temperature=1,
            max_tokens=2048,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )

        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            tool_call_id = tool_call.id
            arguments = json.loads(tool_call.function.arguments)

            if tool_call.function.name == "extract_ticket_info":
                extracted_info = extract_ticket_info(
                    arguments.get('license_plate'),
                    arguments.get('datetime'),
                    arguments.get('company')
                )
                tools_used.append({
                    "role": "assistant",
                    "tool_calls": [
                        {
                            "id": tool_call_id,
                            "type": "function",
                    "function": {
                        "name": "extract_ticket_info",
                    "arguments": (
                        "Bitte formuliere die Antwort wie folgt:\n"
                        "1. **Grund für die Zuordnung zum Fahrer:** Erkläre, warum es sich um diesen Fahrer handeln könnte, zum Beispiel, weil er oder sie das Fahrzeug genutzt hat und im Fahrzeugraum gearbeitet hat..\n"
                        "2. **Fahrerinformationen:** Gib unten die Informationen über den Fahrer an. Die Relvenat sind für die Fahrer Idetifizierung. Unternehmenname (die gefunden wurde), Name, Nachname, Adresse, Geburtsdatum, Geburtsort, falls die Informationen fehlen bitte angebn.\n\n"
                        " Falls keine Schichten gefunden wurden für die Zeit, dann sage bitte das du keinen passenden fahrer finden konntest, der um die Uhrezti gearbeitet hat."
                        + tool_call.function.arguments
                    )            }
                        }
                    ]
                })
                tools_used.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": [
                        {
                            "type": "text",
                            "text": extracted_info
                        }
                    ],
                })
                user_message.extend(tools_used)
                model_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=user_message,
                )
                return jsonify({
                    'success': True,
                    'response': {
                        'tools_used': tools_used,
                        'message': model_response.choices[0].message.content
                    }
                })

        return jsonify({
            'success': True,
            'response': {
                'message': response.choices[0].message.content
            }
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Ein interner Fehler ist aufgetreten.'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)