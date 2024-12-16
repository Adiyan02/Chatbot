from PIL import Image
import pytesseract

    #pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'

    # Pfad zur Tesseract-Installation (nur für Windows nötig)
    # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
def ocr(image_path):
    # Lade das Bild
    image_path = './images/p2.jpeg'
    image = Image.open(image_path)

    # Extrahiere den Text
    extracted_text = pytesseract.image_to_string(image, lang='deu')  # 'deu' für Deutsch, 'eng' für Englisch
    print("Extrahierter Text:")
    print(extracted_text)
