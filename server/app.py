from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import logging
import json
import io
import re
import os
from werkzeug.utils import secure_filename

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
CORS(app)  # Erlaubt standardmäßig alle Origins

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def update_annotations(annotations, text_value,  base_url="http://127.0.0.1:5000"):
    # Iterate over content to find annotations and update paths
    print("update_annotations runs")
    for annotation in annotations:
        if annotation.type == "file_path":
            file_id = annotation.file_path.file_id
                    # Create new URL with file_id
            new_path = f"{base_url}/api/file?file_id={file_id}"
            print("new_path: ",new_path)
                    # Replace the old path in the value text
            old_path = annotation.text
            print("old_path: ",old_path)
            text_value = text_value.replace(old_path, new_path)
            print("new_text_value: ", text_value)
            # Update the value with modified text
        print("annotation.type before ")
        if annotation.type == "file_citation":
            print("annotation.type runs ")
            file_id = annotation.file_citation.file_id
            new_path = f"{base_url}/api/file?file_id={file_id}"
            print("new_path: ",new_path)
            old_path = annotation.text
            print("old_path: ",old_path)
            match = re.search(r'【(\d+):', text_value)
            files_mapping = {
                "files": [
                    {
                        "id": "file-Go9rW5UsfoDVcw8QZHFyxa",
                        "name": "FA Nutzeranleitung.pdf",
                        "path": f"{base_url}/files/FA%20Nutzeranleitung.pdf"
                    }
                ]
            }
            for file in files_mapping["files"]:
                if file["id"] == file_id:
                    text_value = text_value.replace(old_path, f" [{file['name']}]({file['path']}) ")

            print("new_text_value: ", text_value)

    return text_value

@app.route('/api/file', methods=['GET'])
def download_file():
    # Retrieve the file_id from the query parameters
    file_id = request.args.get('file_id')

    if not file_id:
        return jsonify({"error": "file_id is required"}), 400

    try:
        # Step 1: Retrieve file metadata
        file_metadata = client.files.retrieve(file_id)

        # Extract filename from metadata (fallback to file_id if not present)
        filename = file_metadata.filename

        # Step 2: Retrieve the file content
        file_stream = client.files.content(file_id)  # This returns a streamable response
        file_content = file_stream.read()  # Read the content as bytes

        # Step 3: Create an in-memory file for the response content
        file_like_object = io.BytesIO(file_content)
        file_like_object.seek(0)  # Move to the beginning of the file

        # Step 4: Return the file as a downloadable response
        return send_file(
            file_like_object,
            as_attachment=True,
            download_name=filename,  # Use the actual filename from metadata
            mimetype="application/octet-stream"  # General mimetype
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        print("Received data:", data)
        
        # Erstelle die Nachricht mit Text
        user_message = [{
            "type": "text", 
            "text": data.get("chatverlauf").get('text').get('text')
        }]
        
        # Füge Bilder hinzu, falls vorhanden
        if data.get("chatverlauf").get('files'):
            for file in data.get("chatverlauf").get('files'):
                if file.get('type') == 'image_file':
                    user_message.append({
                        "type": "image_file",
                        "image_file": {
                            "file_id": file.get('data')
                        }
                    })

        thread_id = data.get("thread_id")
        tools_used = []
        text_message = ""

        thread = client.beta.threads.create()
        message = client.beta.threads.messages.create(
            thread_id=thread_id or thread.id,
            role="user",
            content=user_message
        )
        run = client.beta.threads.runs.create_and_poll(
                thread_id = thread_id or thread.id,
                assistant_id="asst_SUrRky1PsAt8CJFySbv7fZvf",
                #instructions="Please address the user as Jane Doe. The user has a premium account."
                )


        if run.status == 'completed': 
            messages = client.beta.threads.messages.list(
                thread_id = thread_id or thread.id
            )
            text_message = messages.data[0].content[0].text.value
            # Zugriff auf das Textobjekt
            print("messages.data[0].content[0].text: ",messages.data[0].content[0].text)
            if messages.data[0].content[0].text.annotations:
                text_message = update_annotations(messages.data[0].content[0].text.annotations, text_message)
            print("text_message1: ",text_message)
            return jsonify({
                    'success': True,
                    'response': {
                        'message': text_message,
                        'id': thread_id or thread.id,
                    }
                })
        else:
            print(run.status)
        tool_outputs = []

        # Loop through each tool in the required action section
        for tool in run.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name == "extract_ticket_info":
                print("tool.function.arguments: ", tool.function.arguments)
                arguments = json.loads(tool.function.arguments)

                extracted_info = extract_ticket_info(
                    arguments.get("license_plate"),
                    arguments.get("datetime"),
                    arguments.get("company")
                )
                tool_outputs.append({
                "tool_call_id": tool.id,
                "output": "daten die gfeunden wurden: " + extracted_info + "\n\n"
                "Bitte formuliere die Antwort wie folgt:\n\n"
                            "if(falls du einen Fahrer gefunden hast der zu einem Schicht passt)"
                            "1. **Grund für die Zuordnung zum Fahrer:** Erkläre, warum es sich um diesen Fahrer handeln könnte, zum Beispiel, weil er oder sie das Fahrzeug genutzt hat und im Fahrzeugraum gearbeitet hat..\n\n"
                            "2. **Fahrerinformationen:** Gib unten die Informationen über den Fahrer an. Die Relvenat sind für die Fahrer Idetifizierung. Unternehmenname (die gefunden wurde), Name, Nachname, Adresse, Geburtsdatum, Geburtsort, falls die Informationen fehlen bitte angebn.\n\n"
                            "3. Frage dann dem Nutzer, ob du einen Mail Vorlage schreiben sollst, um der Polizei behörde zu sagen das es der Fahrer war, mit den Daten, Vorname, Nachname, Adresse, Poslteitzahl/Ort, Geburtdatum und Ort.\n\n"
                            "else if(falls du keinen direkt pasenden Schicht gefunden hast)"
                            "1. **Keinen passenden Fahrer gefunden**: Warum du kein passenden Fahrer gefunden hast\n\n"
                            "2. **Schichten gefunden kurz vor oder nach dem Datum:** Bitte gebe Hier an, wer die Fahrer sind die kurz Vor oder Nach dem Datum gerarbeitet haben, mit den Persönlichen daten, details\n\n"
                            "3. **Fahrer die zu diesem Fahrzeug zu gewiesen sind:** Gebe alle Fahrer an Die zu dem Fahrzeug gehören, mit Nummerierung\n\n"
                            "4. Frage dann dem Nutzer, ob du einen Mail Vorlage schreiben sollst, um der Polizei behörde zu sagen das es der Fahrer war, mit den Daten, Vorname, Nachname, Adresse, Poslteitzahl/Ort, Geburtdatum und Ort. Aber Frage auch welche Fahrer der Nutzer denkt das es der Fahrer ist, weil der Nutzer entscheidet dann, über den Fahrer\n\n"
                            "Else"
                            " Falls keine Schichten gefunden wurden für die Zeit, dann sage bitte das du keinen passenden fahrer finden konntest, der um die Uhrezti gearbeitet hat."
                })

        if tool_outputs:
            try:
                run = client.beta.threads.runs.submit_tool_outputs_and_poll(
                thread_id = thread_id or thread.id,
                run_id=run.id,
                tool_outputs=tool_outputs
                )
                print("Tool outputs submitted successfully.")
            except Exception as e:
                print("Failed to submit tool outputs:", e)
            else:
                print("No tool outputs to submit.")
            
            if run.status == 'completed':
                messages = client.beta.threads.messages.list(
                thread_id = thread_id or thread.id

                )
                print(messages)
            else:
                print(run.status)
        text_message = messages.data[0].content[0].text.value
        if messages.data[0].content[0].text.annotations:
                text_message = update_annotations(messages.data[0].content[0].text.annotations, text_message)
        print("text_message2: ",text_message)
        return jsonify({
                'success': True,
                'response': {
                    'message': text_message,
                    'id': thread_id or thread.id,
                }
            })
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Ein interner Fehler ist aufgetreten.'
        }), 500

@app.route('/files/<filename>')
def serve_file(filename):
    return send_from_directory('static/files', filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Keine Datei gefunden'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Keine Datei ausgewählt'}), 400

        if file:
            # Datei temporär speichern
            temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
            file.save(temp_path)
            
            # OpenAI File erstellen
            with open(temp_path, 'rb') as file_data:
                openai_file = client.files.create(
                    file=file_data,
                    purpose="vision"
                )
            
            # Temporäre Datei löschen
            os.remove(temp_path)
            
            return jsonify({
                'success': True,
                'file_id': openai_file.id
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)