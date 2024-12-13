# Chatbot Integration - Documentation

## 1. Prerequisites

### Technical Requirements
- React (v16.8 or higher)
- TypeScript
- Tailwind CSS
- Node.js & npm/yarn

### Required Packages
```bash
npm install react-markdown remark-gfm remark-math rehype-katex rehype-highlight lucide-react date-fns
```

## 2. Main Components

### Required Files
- `Chatbot.tsx` - Main component
- `ChatMessage.tsx` - Message display
- `ChatInput.tsx` - Input component
- `types/chat.ts` - TypeScript definitions
- `utils/api.ts` - API communication

### CSS Requirements
Add the following Tailwind directives to your `index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 3. Integration

### - Add the chatbot folder to your project component folder

### - Basic Implementation, add the <Chatbot /> component to your route
```typescript
import { Chatbot } from './components/Chatbot';

//Where your Navbar is
function YourApp() {
  return (
    <Chatbot 
      companys={[
        { name: 'Company Name', id: 'company-id' }
      ]}
      user={{
        name: 'Username',
        lang: 'de', // Supported languages: 'de' | 'en' | 'ar' | 'tr'
        id: 'user-id'
      }}
      position="bottom-right" // or "bottom-left"
      isDriver={false}
      allowFileUpload={true} // Enable/disable file upload functionality
      allowCamera={true} // Enable/disable camera functionality (mobile only)
    />
  );
}
```

### - Required Props

Get the data for the props from API from the user that is logged in

#### `companys` (Array)
```typescript
{
  name: string;  // Company name
  id: string;    // Unique company ID
}[]
```

#### `user` (Object)
```typescript
{
  name: string;              // Username
  lang: SupportedLanguages;  // 'de' | 'en' | 'ar' | 'tr'
  id: string;               // Unique user ID
}
```

#### `position` (Optional)
- `'bottom-right'` (Default)
- `'bottom-left'`

#### `isDriver` (Boolean)
- `true`: Driver mode
- `false`: Standard mode

#### `allowFileUpload` (Optional)
- Type: `boolean`
- Default: `true`
- Controls whether users can upload files (images and PDFs)

#### `allowCamera` (Optional)
- Type: `boolean`
- Default: `true`
- Controls whether users can use camera functionality
- Only available on mobile and tablet devices
- Hidden automatically on desktop devices

## 4. Backend Requirements

### API Endpoints
The chatbot expects the following endpoints:

#### Chat Endpoint
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

#### Upload Endpoint
```typescript
POST /api/upload
Content-Type: multipart/form-data

file: File
```

## 5. Customization

### API Configuration
Adjust the API URL in `utils/api.ts`, test API can change:
```typescript
const API_URL = 'http://49.13.25.32:5000/';
```

## 6. Features

- Send text messages
- Upload images
- Upload documents
- Camera integration
- Multi-language support
- Markdown rendering
- Responsive design
- Minimizable/Maximizable
- Company selection (when not in driver mode)

## 7. Troubleshooting

- Ensure all required packages are installed
- Check API connection
- Monitor console messages for errors
- Validate prop types
