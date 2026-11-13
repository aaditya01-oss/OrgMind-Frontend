import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import DemoSite from './DemoSite';
import { AuthProvider } from './auth';
import ConsoleLogin from './console/ConsoleLogin';
import ConsoleHome from './console/ConsoleHome';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DemoSite />} />
          <Route path="/widget" element={<App />} />
          <Route path="/console/login" element={<ConsoleLogin />} />
          <Route path="/console" element={<ConsoleHome />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);