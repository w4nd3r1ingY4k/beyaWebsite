// index.tsx
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './webapp/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
);