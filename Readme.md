# Chatbot Integration - Dokumentation

## 1. Voraussetzungen

### Technische Anforderungen
- React (v16.8 oder höher)
- TypeScript
- Tailwind CSS
- Node.js & npm/yarn

### Erforderliche Pakete
```bash
npm install react-markdown remark-gfm remark-math rehype-katex rehype-highlight lucide-react date-fns
```

## 2. Hauptkomponenten

### Erforderliche Dateien
- `Chatbot.tsx` - Hauptkomponente
- `ChatMessage.tsx` - Nachrichtenanzeige
- `ChatInput.tsx` - Eingabekomponente
- `types/chat.ts` - TypeScript Definitionen
- `utils/api.ts` - API-Kommunikation

### CSS-Anforderungen
Fügen Sie folgende Tailwind-Direktiven in Ihre `index.css` ein:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 3. Integration

### - Add the chatbot folder to your project component folder

### - Basis-Implementation, add the <Chatbot /> component to your route
```typescript
import { Chatbot } from './components/Chatbot';

//Where your Navbar is
function YourApp() {
  return (
    <Chatbot 
      companys={[
        { name: 'Firmenname', id: 'firmen-id' }
      ]}
      user={{
        name: 'Benutzername',
        lang: 'de', // Unterstützte Sprachen: 'de' | 'en' | 'ar' | 'tr'
        id: 'benutzer-id'
      }}
      position="bottom-right" // oder "bottom-left"
      isDriver={false}
    />
  );
}
```

### - Erforderliche Props

Get the data for the props from API from the user that is logged in

#### `companys` (Array)
```typescript
{
  name: string;  // Firmenname
  id: string;    // Eindeutige Firmen-ID
}[]
```

#### `user` (Objekt)
```typescript
{
  name: string;              // Benutzername
  lang: SupportedLanguages;  // 'de' | 'en' | 'ar' | 'tr'
  id: string;               // Eindeutige Benutzer-ID
}
```

#### `position` (Optional)
- `'bottom-right'` (Standard)
- `'bottom-left'`

#### `isDriver` (Boolean)
- `true`: Fahrer-Modus
- `false`: Standard-Modus

## 4. Backend-Anforderungen

### API-Endpunkte
Der Chatbot erwartet folgende Endpunkte:

#### Chat-Endpunkt
```typescript
POST /api/chat
Content-Type: application/json

{
  chatverlauf: {
    content: {
      text: string,
      files?: Array<{
        type: 'image_url' | 'image_file',
        data: string
      }>
    }
  },
  thread_id?: string,
  isDriver: boolean,
  companies: Array<{ name: string, id: string }>,
  user: { name: string, lang: string, id: string }
}
```

#### Upload-Endpunkt
```typescript
POST /api/upload
Content-Type: multipart/form-data

file: File
```

## 5. Anpassungen

### API-Konfiguration
Passen Sie die API-URL in `utils/api.ts` an, test API can change:
```typescript
const API_URL = 'http://49.13.25.32:5000/';
```


## 6. Funktionen

- Textnachrichten senden
- Bilder hochladen
- Dokumente hochladen
- Kamera-Integration
- Mehrsprachenunterstützung
- Markdown-Rendering
- Responsive Design
- Minimierbar/Maximierbar
- Firmenauswahl (wenn nicht im Fahrer-Modus)

## 7. Fehlerbehebung

- Stellen Sie sicher, dass alle erforderlichen Pakete installiert sind
- Überprüfen Sie die API-Verbindung
- Kontrollieren Sie die Konsolenmeldungen für Fehler
- Validieren Sie die Props-Typen
