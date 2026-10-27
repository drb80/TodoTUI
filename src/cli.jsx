import React from 'react';
import { render } from 'ink';
import App from './components/App.jsx';
import { createApi, parseBaseUrl, DEFAULT_BASE_URL } from './api.js';

// The terminal equivalent of root.render(<MyApp />) in index.html.
// Set TODOS_URL to talk to a server somewhere other than localhost:3000.
let baseUrl;
try {
  baseUrl = parseBaseUrl(process.env.TODOS_URL || DEFAULT_BASE_URL);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// alternateScreen starts on a blank screen, like vim or less, and puts the
// earlier terminal contents back when the app quits.
render(<App api={createApi(baseUrl)} />, { alternateScreen: true });
