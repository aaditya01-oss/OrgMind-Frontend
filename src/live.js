import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_URL } from './shared';

// One live connection for the whole page, shared by everything that listens.
let connection = null;
let connectedToken = null;
let stopTimer = null;
const listeners = new Set();

function ensureConnection(token) {
  clearTimeout(stopTimer);
  if (connection && connectedToken === token) return;
  if (connection) connection.stop();

  connectedToken = token;
  connection = new signalR.HubConnectionBuilder()
    // WebSockets straight away: no extra negotiation request, so no extra cross-site rules.
    .withUrl(`${API_URL}/hubs/live`, {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

  connection.on('refresh', (event) => listeners.forEach(fn => fn(event || {})));
  connection.start().catch(() => { /* the page still refreshes by itself */ });
}

function subscribe(token, fn) {
  ensureConnection(token);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      stopTimer = setTimeout(() => {
        if (connection && listeners.size === 0) { connection.stop(); connection = null; connectedToken = null; }
      }, 3000);
    }
  };
}

// Calls handler({ area, kind, id }) whenever the server says something new arrived.
export function useLive(token, handler) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });

  useEffect(() => {
    if (!token) return undefined;
    return subscribe(token, (event) => latest.current(event));
  }, [token]);
}