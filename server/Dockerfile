FROM python:3.11-slim

# Setze Arbeitsverzeichnis
WORKDIR /app

# Installiere Tesseract OCR und das deutsche Sprachpaket
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-deu \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopiere Abhängigkeiten
COPY requirements.txt .

# Installiere Python-Abhängigkeiten
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere Projektdateien
COPY . .

# Erstelle Uploads-Ordner
RUN mkdir -p uploads

# Setze Umgebungsvariablen
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Freigabe des Ports
EXPOSE 5000

# Starte die Anwendung
CMD ["flask", "run", "--host=0.0.0.0"]
