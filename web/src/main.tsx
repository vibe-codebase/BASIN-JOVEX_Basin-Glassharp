import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-sc/latin-500.css';
import '@fontsource/cormorant-sc/latin-600.css';
import '@fontsource/inter-tight/latin-400.css';
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
