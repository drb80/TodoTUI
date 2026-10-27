// Helpers for checking and cleaning text before it reaches the terminal.

export const MAX_WHAT_LENGTH = 200;

// Matches C0 control characters (including ESC), DEL, and C1 control characters.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

// Text from the server is untrusted. A terminal treats escape sequences as
// commands (move the cursor, clear the screen, change the window title), so
// printing them is the terminal's version of an XSS attack. Strip them out.
export function sanitizeForTerminal(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(CONTROL_CHARACTERS, '');
}

// Accepts only real calendar dates written as YYYY-MM-DD.
export function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC quietly rolls 2026-02-30 over to March 2, so check it round-trips.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Returns an error message, or null when the item is acceptable.
export function validateItem(what, when) {
  const trimmedWhat = what.trim();
  const trimmedWhen = when.trim();

  if (!trimmedWhat || !trimmedWhen) {
    return 'Please fill in both fields';
  }
  if (trimmedWhat.length > MAX_WHAT_LENGTH) {
    return `Description must be ${MAX_WHAT_LENGTH} characters or fewer`;
  }
  if (sanitizeForTerminal(trimmedWhat) !== trimmedWhat) {
    return 'Description cannot contain control characters';
  }
  if (!isValidDate(trimmedWhen)) {
    return 'Date must be a real date in YYYY-MM-DD form';
  }
  return null;
}
