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
                        "id": "file-LSw5k1p5KY8wWU2fY8iagM",
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

def format_markdown_text(text):
    # Fügt eine Leerzeile vor jedem "---" ein, wenn nicht bereits vorhanden
    return re.sub(r'([^\n])\n---', r'\1\n\n---', text)

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
        
        # Attachments korrekt formatieren
        attachments = []
        if data.get("attachments"):
            attachments = [{
                "file_id": file_id,
                "tools": [{"type": "file_search"}],
            } for file_id in data.get("attachments")]

        # Erstelle die Nachricht mit Text
        user_message = [{
            "type": "text", 
            "text": data.get("chatverlauf").get("content").get("text").get("text"),
        }]
        company = data.get("companies")[0]
        print("company: ",company)
        
        # Füge Bilder hinzu, falls vorhanden
        if data.get("chatverlauf").get("content").get('files'):
            for file in data.get("chatverlauf").get("content").get('files'):
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
        thread = None
        if not thread_id:
            thread = client.beta.threads.create()
        message = client.beta.threads.messages.create(
            thread_id=thread_id or thread.id,
            role="user",
            content=user_message,
            attachments = attachments
           )
        run = client.beta.threads.runs.create_and_poll(
                thread_id = thread_id or thread.id,
                assistant_id="asst_SUrRky1PsAt8CJFySbv7fZvf",
                instructions=
                "Du bist ein virtueller Assistent, der als Plugin für die Fahrer-App eines Unternehmens dient, um effizient mit Daten umzugehen und verschiedene betriebliche Aufgaben zu unterstützen. Und kein Assistent, der als allgemeiner Chatbot dient."
                "Zuordnung von Strafzetteln zu Fahrern: Identifiziere den Fahrer, dem ein Strafzettel zugeordnet werden muss."
                "Bereitstellung von Anleitungen: Gib klare Anweisungen für gängige Unternehmensabläufe."
                "Abfragen zu Schichtplänen: Beantworte Anfragen zu den Schichtplänen der Fahrer."
                "Umsatzberechnungen: Berechne den Umsatz basierend auf den Betriebsdaten."
                "Fahrerbewertung: Analysiere die Leistung der Fahrer und identifiziere, welche Fahrer gut oder schlecht sind."

                "Schritte"

                "1. Zuordnung von Strafzetteln:  "
                "Analysiere die Daten der Fahrer und die Details des Strafzettels."
                "Bestimme, welcher Fahrer dem Strafzettel zugeordnet werden soll."

                "2. Bereitstellung von Anleitungen:  "
                "Wenn User Fragen wie Sie die FahrerApp nutzten, steht die Dokumentation zur Verfügung"
                "Bereite präzise und verständliche Anleitungen vor. Die in 'dokumentation für KI (1).pdf'"

                "3. Abfragen zu Schichtplänen:  "
                "Greife auf Schichtplandaten zu."
                "Liefere relevante Informationen zu den Schichten der Fahrer."

                "4. Umsatzberechnungen:  "
                "Sammle relevante Daten für die Umsatzberechnung."
                "Berechne und präsentiere den Umsatz."

                "5. Fahrerbewertung:  "
                "Bewertungsverfahren durchführen auf Basis von Leistungsmessungen."
                "Ergebnisse bereitstellen, die aufzeigen, welche Fahrer gut oder schlecht abschneiden."

                "Ausgabeformat"

                "Die Ausgabe sollte klar und präzise sein und jeweils im passenden Format und Detailgrad für jede spezifische Aufgabe dargestellt werden. Nutze Tabellen oder Listen, wenn nötig, um Informationen übersichtlich zu präsentieren."

                "# Hinweise"

                "Achte darauf, persönliche Daten der Fahrer zu schützen und die Datenschutzrichtlinien des Unternehmens zu befolgen."
                "Sei flexibel und anpassungsfähig, um auf unerwartete Anfragen schnell reagieren zu können."

                "Information über den aktuellen nutzer: "
                "Information über den Nutzer: " +   data.get("user").get("name") + ", Bevorzugte Sprache " + data.get("user").get("lang") + ", bitte antworte in der selben Sprache, Unternehmen " + company.get("name") + ""
                )


        if run.status == 'completed': 
            messages = client.beta.threads.messages.list(
                thread_id = thread_id or thread.id
            )
            text_message = messages.data[0].content[0].text.value
            
            if messages.data[0].content[0].text.annotations:
                text_message = update_annotations(messages.data[0].content[0].text.annotations, text_message)
            
            # Formatiere den Text vor dem Senden
            text_message = format_markdown_text(text_message)
            
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
        if run.required_action.submit_tool_outputs:
            # Loop through each tool in the required action section
            for tool in run.required_action.submit_tool_outputs.tool_calls:
                if tool.function.name == "extract_ticket_info":
                    print("tool.function.arguments: ", tool.function.arguments)
                    arguments = json.loads(tool.function.arguments)

                    extracted_info = extract_ticket_info(
                        arguments.get("license_plate"),
                        arguments.get("datetime"),
                        company
                    )
                    print("extracted_info: ",extracted_info)
                    tool_outputs.append({
                    "tool_call_id": tool.id,
                    "output": "Informationen die gefunden wurden: " + extracted_info + "\n"
                    "Anleitung für das Modell:\n"

                    "Lies die Informationen und formuliere eine Antwort basierend auf den folgenden Regeln. Wähle die entsprechende Struktur, die zur Situation passt:\n"

                    "1. Wenn ein passender Fahrer für die Schicht gefunden wurde:\n"
                    "Grund für die Zuordnung zum Fahrer:\n"

                    "Erkläre kurz, warum dieser Fahrer zur Schicht passt. Zum Beispiel: Der Fahrer hat das Fahrzeug genutzt und im Arbeitszeitraum gearbeitet.\n"
                    "Fahrerinformationen:\n"

                    "Liste die relevanten Informationen über den Fahrer:\n"
                    "arbeitszeitraum\n"
                    "Name\n"
                    "Nachname\n"
                    "Unternehmen (falls vorhanden)\n"
                    "Adresse\n"
                    "Geburtsdatum und Geburtsort\n"
                    "Falls Informationen fehlen, gib an, dass diese fehlen.\n"
                    
                    "Mail-Vorlage:\n"
                    "Erstelle eine Mail, um der Polizeibehörde mitzuteilen, dass dies der Fahrer war. Die Mail sollte die folgenden Details enthalten: Aktenzeichen, Datum, Uhrzeit, Fahrerinformationen\n"

                    "---"
                    "Betreff: [Aktenzeichen] \n"
                    "Beispiel: Sehr geehrte Damen und Herren, hiermit teilen wir Ihnen mit, dass der Fahrer des Fahrzeuges [Kennzeichen] am [Datum] um [Uhrzeit] wie folgt identifiziert wurde."
                    "Vorname\n"
                    "Nachname\n"  
                    "Adresse\n"
                    "Postleitzahl/Ort\n"
                    "Geburtsdatum und Geburtsort\n"
                    "Für weitere Informationen stehen wir Ihnen gerne zur Verfügung.\n"

                    "Mit freundlichen Grüßen\n"

                    "" + company.get("name") + "\n"

                    "---"
                    "2. Wenn kein passender Fahrer gefunden wurde, aber Schichten vor oder nach dem Datum existieren:\n"
                    "Keinen passenden Fahrer gefunden:\n"
                    "Gib an, warum kein passender Fahrer identifiziert werden konnte.\n"
                    "Schichten gefunden (kurz vor oder nach dem Datum):\n"
                    "Liste die Fahrer auf, die vor oder nach dem angegebenen Datum gearbeitet haben, mit:\n"
                    "Name\n"
                    "Nachname\n"
                    "Adresse\n"
                    "Geburtsdatum und Geburtsort\n"
                    "Fahrer zugewiesen zu dem Fahrzeug:\n"
                    "Liste alle Fahrer, die dem Fahrzeug zugewiesen sind, in einer nummerierten Liste.\n"
                    "3. Wenn kein Fahrzeug mit dem angegebenen Kennzeichen gefunden wurde:\n"
                    "Kein Fahrzeug gefunden:\n"
                    "Gib an, dass kein Fahrzeug mit dem angegebenen Kennzeichen gefunden werden konnte.\n"
                    "Beispiel: Kein Fahrzeug mit dem Kennzeichen [Kennzeichen] konnte gefunden werden.\n"

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
        text_message = format_markdown_text(text_message)
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
        file_type = None
        if 'file' not in request.files:
            return jsonify({'error': 'Keine Datei gefunden'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Keine Datei ausgewählt'}), 400

        if file:
            # Datei temporär speichern
            temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
            file.save(temp_path)
            
            # Dateityp bestimmen
            mime_type = file.content_type
            print("Detected MIME type:", mime_type)
            
            # Purpose basierend auf MIME-Typ setzen
            if mime_type == 'application/pdf':
                purpose = "assistants"
                file_type = "pdf_file"
            else:
                file_type = "image_file"
                purpose = "vision"
                
            # OpenAI File erstellen
            with open(temp_path, 'rb') as file_data:
                openai_file = client.files.create(
                    file=file_data,
                    purpose=purpose
                )
            
            
            # Temporäre Datei löschen
            os.remove(temp_path)
            
            return jsonify({
                'success': True,
                'file_id': openai_file.id,
                'file_type': file_type
            })
            
    except Exception as e:
        print("Upload error:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)