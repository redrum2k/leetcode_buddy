import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Chat } from './Chat';
import './index.css';
import 'katex/dist/katex.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Chat />
  </StrictMode>,
);
