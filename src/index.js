import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import "./theme.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import App from './App';
import DemoSite from './DemoSite';
import { AuthProvider } from './auth';
import ConsoleLogin from './console/ConsoleLogin';
import ConsoleLayout from './console/ConsoleLayout';
import { AdminOnly, AssistantPage, TicketsPage, PeoplePage, KnowledgePage } from './console/pages';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DemoSite />} />
          <Route path="/widget" element={<App />} />
          <Route path="/console/login" element={<ConsoleLogin />} />
          <Route path="/console" element={<ConsoleLayout />}>
            <Route index element={<AssistantPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="people" element={<AdminOnly><PeoplePage /></AdminOnly>} />
            <Route path="knowledge" element={<AdminOnly><KnowledgePage /></AdminOnly>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);