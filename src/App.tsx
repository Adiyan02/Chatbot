// App.tsx

import { Chatbot } from './components/Chatbot';
type SupportedLanguages = 'de' | 'en' | 'ar' | 'tr';

interface AppProps {
  companys: {name: string, id: string}[];
  user: {name: string, lang: SupportedLanguages, id: string};
  position: 'bottom-right' | 'bottom-left';
  isDriver: boolean;
  allowFileUpload: boolean;
  allowCamera: boolean;
}

function App({ companys, user, position, isDriver, allowFileUpload, allowCamera }: AppProps) {
  return (
    <Chatbot 
      companys={companys}
      user={user}
      position={position}
      isDriver={isDriver}
      allowFileUpload={allowFileUpload}
      allowCamera={allowCamera}
    />
  );
}

export default App;