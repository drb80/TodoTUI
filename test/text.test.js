import {
  sanitizeForTerminal,
  isValidDate,
  validateItem,
  MAX_WHAT_LENGTH,
} from '../src/text.js';

describe('sanitizeForTerminal', () => {
  test('leaves ordinary text alone', () => {
    expect(sanitizeForTerminal('Buy milk - 2026-10-24')).toBe('Buy milk - 2026-10-24');
  });

  test('removes ANSI escape characters', () => {
    // "\u001b[2J" clears the screen; "\u001b]0;pwned\u0007" sets the window title.
    expect(sanitizeForTerminal('a\u001b[2Jb\u001b]0;pwned\u0007c')).toBe('a[2Jb]0;pwnedc');
  });

  test('removes newlines and C1 control characters', () => {
    expect(sanitizeForTerminal('one\ntwo\u009bthree')).toBe('onetwothree');
  });

  test('keeps non-ASCII text', () => {
    expect(sanitizeForTerminal('café ✓')).toBe('café ✓');
  });

  test('turns null, undefined, and numbers into strings', () => {
    expect(sanitizeForTerminal(null)).toBe('');
    expect(sanitizeForTerminal(undefined)).toBe('');
    expect(sanitizeForTerminal(42)).toBe('42');
  });
});

describe('isValidDate', () => {
  test('accepts a real date', () => {
    expect(isValidDate('2026-10-24')).toBe(true);
  });

  test('accepts February 29 in a leap year', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
  });

  test('rejects dates that do not exist', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2027-02-29')).toBe(false);
  });

  test('rejects other formats', () => {
    expect(isValidDate('2026-1-5')).toBe(false);
    expect(isValidDate('10/24/2026')).toBe(false);
    expect(isValidDate('tomorrow')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('validateItem', () => {
  test('accepts a good item', () => {
    expect(validateItem('Buy milk', '2026-10-24')).toBeNull();
  });

  test('ignores surrounding spaces', () => {
    expect(validateItem('  Buy milk ', ' 2026-10-24 ')).toBeNull();
  });

  test('requires both fields', () => {
    expect(validateItem('', '2026-10-24')).toBe('Please fill in both fields');
    expect(validateItem('Buy milk', '   ')).toBe('Please fill in both fields');
  });

  test('limits the description length', () => {
    const tooLong = 'x'.repeat(MAX_WHAT_LENGTH + 1);
    expect(validateItem(tooLong, '2026-10-24')).toMatch(/characters or fewer/);
    expect(validateItem('x'.repeat(MAX_WHAT_LENGTH), '2026-10-24')).toBeNull();
  });

  test('rejects control characters in the description', () => {
    expect(validateItem('evil\u001b[2J', '2026-10-24')).toMatch(/control characters/);
  });

  test('rejects a bad date', () => {
    expect(validateItem('Buy milk', '2026-02-30')).toMatch(/real date/);
  });
});
