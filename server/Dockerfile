FROM python:3.11-slim

# Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere requirements.txt zuerst (für besseres Caching)
COPY requirements.txt .

# Installiere Abhängigkeiten
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere den restlichen Projektcode
COPY . .

# Erstelle uploads Ordner
RUN mkdir -p uploads

# Setze Umgebungsvariablen
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Port freigeben
EXPOSE 5000

# Starte die Anwendung
CMD ["flask", "run", "--host=0.0.0.0"]