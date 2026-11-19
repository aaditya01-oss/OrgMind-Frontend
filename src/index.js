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
import { AdminOnly, AssistantPage, TicketsPage, PeoplePage, KnowledgePage, HomePage } from './console/pages';
import FormsPage from './console/FormsPage';
import SubmissionsPage from './console/SubmissionsPage';
import RequestsPage from './console/RequestsPage';
import ProfilePage from './console/ProfilePage';
import TeamPage from './console/TeamPage';
import MessagesPage from './console/MessagesPage';
import AuditPage from './console/AuditPage';
import AccessReviewPage from './console/AccessReviewPage';
import LibraryPage from './console/LibraryPage';
import CompanyPage from './console/CompanyPage';

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
          <Route index element={<HomePage />} />
          <Route path="assistant" element={<AssistantPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="people" element={<AdminOnly><PeoplePage /></AdminOnly>} />
            <Route path="knowledge" element={<AdminOnly><KnowledgePage /></AdminOnly>} />
            <Route path="forms" element={<AdminOnly><FormsPage /></AdminOnly>} />
            <Route path="audit" element={<AdminOnly><AuditPage /></AdminOnly>} />
            <Route path="access-review" element={<AdminOnly><AccessReviewPage /></AdminOnly>} />
            <Route path="company" element={<CompanyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);