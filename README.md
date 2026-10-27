# Todos TUI

> **To run this finished example:** `npm install`, then `npm start` (in this
> folder).
>
> **New to Ink?** Start with [INK_INTRO.md](INK_INTRO.md), a step-by-step
> introduction for people who already know React.

Ink is React rendered to the
terminal instead of the DOM, so the components, `useState`, and `useEffect`
work the same way; only the elements and the input handling change.

| Web (`public/app.js`)        | Terminal (`src/`)                          |
|------------------------------|--------------------------------------------|
| `<div>`, `<h1>`, CSS         | `<Box>` (flexbox) and `<Text bold color>`  |
| `<input>`                    | `<TextInput>` from `ink-text-input`        |
| `<input type="date">`        | Typed `YYYY-MM-DD`, checked by `isValidDate` |
| Buttons and clicks           | Keys, via Ink's `useInput` hook            |
| `alert()`                    | `<StatusLine>`                             |
| `root.render(<MyApp />)`     | `render(<App />)` in `src/cli.jsx`         |

## Running

Requires Node 22 or later, with the Rails server running on port 3000.

    npm install
    npm start                      # or: TODOS_URL=http://host:port npm start

Keys: ↑/↓ select, `a` add, `e` edit, `d` delete, `q` quit. In the add and
edit form, Enter moves to the next field and then saves; Esc cancels.

Each key maps to one request:

| Action | Request                  |
|--------|--------------------------|
| list   | `GET /items.json`        |
| add    | `POST /items.json`       |
| edit   | `PATCH /items/:id.json`  |
| delete | `DELETE /items/:id.json` |

## Testing and linting

    npm test                       # Jest, using ink-testing-library
    npm run lint                   # ESLint
    npm audit

## Notes

- Text from the server is passed through `sanitizeForTerminal` before it is
  displayed. Escape sequences in a terminal are commands, so printing
  untrusted text is the terminal's version of XSS.
- A terminal client has no CSRF token, so `ItemsController` skips the CSRF
  check for requests with a JSON body (`skip_forgery_protection if: ...`).
  HTML form posts are still checked. Without that line, POST and DELETE
  from this app are rejected with HTTP 422.
- `react/prop-types` is turned off in ESLint to keep the example short.
