# OrgMind Frontend

The React app of OrgMind AI. It has two surfaces:

- **Chat widget** (visitors and customers): ask questions, get a ticket raised, fill forms, follow
  ticket conversations. It runs inside an iframe on a demo company site and can go full screen.
- **Staff console** (`/console`, employees and admins): tickets, requests, messages, team,
  knowledge library, and for admins: people and invites (with QR code), knowledge base, forms, audit log.

Customers are never sent to the console. What each person sees is decided by the API from their
signed token; the screens only reflect it.

## What works today

Chat with sources, scan-to-fill forms, ticket and request conversations with unread markers,
live updates over WebSocket, staff direct and department messages, people management,
invite links and QR codes, audit log with filters and CSV download.

## Known limits (honest list)

- The API address is still written in the code (`src/shared.js`); it should become a setting.
- Built with Create React App, which is no longer maintained. Moving to Vite is planned.
- No automated front-end tests yet.
- English only for now.
- Mostly tested on desktop; the mobile layout has had little testing.

## Run it locally

You need a current Node.js LTS release, and the API running on `http://localhost:5147`.

```powershell
npm install
npm start
```

The app opens on `http://localhost:3000`.

## Security notes

- The sign-in token is kept in the browser's session storage and cleared when the tab closes.
  A 401 answer from the API signs the person out.
- Invite codes travel in the part of the link after `#`, so they are not sent to servers or logged.