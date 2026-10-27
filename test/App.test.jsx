import React from 'react';
import { render } from 'ink-testing-library';
import App, { clampIndex } from '../src/components/App.jsx';

const DOWN_ARROW = '\u001b[B';
const UP_ARROW = '\u001b[A';
const ENTER = '\r';
const ESCAPE = '\u001b';
const BACKSPACE = '\u007f';

// Ink redraws asynchronously, so keep checking until the condition holds.
async function waitFor(condition, timeoutMs = 1000) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// Give Ink a moment to handle a key press before sending the next one.
async function press(stdin, keys) {
  stdin.write(keys);
  await new Promise((resolve) => setTimeout(resolve, 20));
}

function sampleItems() {
  return [
    { id: 1, what: 'Buy milk', when: '2026-10-24' },
    { id: 2, what: 'Grade papers', when: '2026-10-25' },
  ];
}

// A fake api object with the same shape as createApi() that records calls.
function makeFakeApi({
  items = sampleItems(),
  failLoad = false,
  failDelete = false,
  failCreate = false,
  failUpdate = false,
} = {}) {
  const calls = { deleteItem: [], createItem: [], updateItem: [] };
  let nextId = 100;
  const api = {
    fetchItems: async () => {
      if (failLoad) {
        throw new Error('Failed to fetch items (HTTP 500)');
      }
      return items;
    },
    deleteItem: async (id) => {
      calls.deleteItem.push(id);
      if (failDelete) {
        throw new Error('Failed to delete item (HTTP 422)');
      }
    },
    createItem: async (what, when) => {
      calls.createItem.push({ what, when });
      if (failCreate) {
        throw new Error('Failed to add item (HTTP 422)');
      }
      nextId += 1;
      return { id: nextId, what, when };
    },
    updateItem: async (id, what, when) => {
      calls.updateItem.push({ id, what, when });
      if (failUpdate) {
        throw new Error('Failed to update item (HTTP 422)');
      }
      return { id, what, when };
    },
  };
  return { api, calls };
}

async function renderLoaded(options) {
  const { api, calls } = makeFakeApi(options);
  const app = render(<App api={api} />);
  await waitFor(() => !app.lastFrame().includes('Loading'));
  return { ...app, calls };
}

describe('clampIndex', () => {
  test('keeps the index inside the list', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(5, 3)).toBe(2);
  });

  test('returns 0 for an empty list', () => {
    expect(clampIndex(4, 0)).toBe(0);
  });
});

describe('App', () => {
  test('shows a loading message first, then the items', async () => {
    const { api } = makeFakeApi();
    const { lastFrame, unmount } = render(<App api={api} />);

    expect(lastFrame()).toContain('Loading items...');
    await waitFor(() => lastFrame().includes('Buy milk'));
    expect(lastFrame()).toContain('Grade papers - 2026-10-25');
    unmount();
  });

  test('shows the error when loading fails', async () => {
    const { lastFrame, unmount } = await renderLoaded({ failLoad: true });

    expect(lastFrame()).toContain('Error: Failed to fetch items (HTTP 500)');
    unmount();
  });

  test('shows a hint when there are no items', async () => {
    const { lastFrame, unmount } = await renderLoaded({ items: [] });

    expect(lastFrame()).toContain('No items yet');
    unmount();
  });

  test('strips escape sequences from server data', async () => {
    const evilItems = [{ id: 1, what: 'evil\u001b]0;pwned\u0007', when: '2026-10-24' }];
    const { lastFrame, unmount } = await renderLoaded({ items: evilItems });

    expect(lastFrame()).toContain('evil]0;pwned');
    expect(lastFrame()).not.toContain('\u0007');
    unmount();
  });

  test('"d" deletes the highlighted item', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'd');
    await waitFor(() => lastFrame().includes('Item deleted'));

    expect(calls.deleteItem).toEqual([1]);
    expect(lastFrame()).not.toContain('Buy milk');
    expect(lastFrame()).toContain('Grade papers');
    unmount();
  });

  test('arrow keys move the highlight', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, DOWN_ARROW);
    await press(stdin, DOWN_ARROW); // already at the bottom; should stay put
    expect(lastFrame()).toContain('> Grade papers');

    await press(stdin, UP_ARROW);
    expect(lastFrame()).toContain('> Buy milk');

    await press(stdin, DOWN_ARROW);
    await press(stdin, 'd');
    await waitFor(() => lastFrame().includes('Item deleted'));
    expect(calls.deleteItem).toEqual([2]);
    unmount();
  });

  test('ignores key presses while a delete is still in progress', async () => {
    const { api, calls } = makeFakeApi();
    // Hold the delete open until the test says so.
    let finishDelete;
    api.deleteItem = (id) => {
      calls.deleteItem.push(id);
      return new Promise((resolve) => {
        finishDelete = resolve;
      });
    };
    const { lastFrame, stdin, unmount } = render(<App api={api} />);
    await waitFor(() => lastFrame().includes('Buy milk'));

    await press(stdin, 'd');
    await press(stdin, 'd');
    await press(stdin, DOWN_ARROW);
    expect(calls.deleteItem).toEqual([1]);

    finishDelete();
    await waitFor(() => lastFrame().includes('Item deleted'));
    expect(lastFrame()).toContain('> Grade papers');
    unmount();
  });

  test('keeps the item and shows an error when delete fails', async () => {
    const { lastFrame, stdin, unmount } = await renderLoaded({ failDelete: true });

    await press(stdin, 'd');
    await waitFor(() => lastFrame().includes('HTTP 422'));

    expect(lastFrame()).toContain('Buy milk');
    unmount();
  });

  test('"a" opens the form and a new item is saved to the server', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'a');
    expect(lastFrame()).toContain('Add New Item');

    await press(stdin, 'Walk dog');
    await press(stdin, ENTER);
    await press(stdin, '2026-11-01');
    await press(stdin, ENTER);
    await waitFor(() => lastFrame().includes('Item added'));

    expect(calls.createItem).toEqual([{ what: 'Walk dog', when: '2026-11-01' }]);
    expect(lastFrame()).toContain('Walk dog - 2026-11-01');
    expect(lastFrame()).not.toContain('Add New Item');
    unmount();
  });

  test('typing "q" and "d" in the form does not quit or delete', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'a');
    await press(stdin, 'quid');

    expect(lastFrame()).toContain('Add New Item');
    expect(calls.deleteItem).toEqual([]);
    unmount();
  });

  test('the form refuses an invalid date', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'a');
    await press(stdin, 'Walk dog');
    await press(stdin, ENTER);
    await press(stdin, '2026-02-30');
    await press(stdin, ENTER);

    expect(lastFrame()).toContain('Date must be a real date');
    expect(calls.createItem).toEqual([]);
    unmount();
  });

  test('Escape closes the form without saving', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'a');
    await press(stdin, 'Walk dog');
    await press(stdin, ESCAPE);
    await waitFor(() => !lastFrame().includes('Add New Item'));

    expect(calls.createItem).toEqual([]);
    unmount();
  });

  test('"e" opens the form filled in with the highlighted item', async () => {
    const { lastFrame, stdin, unmount } = await renderLoaded();

    await press(stdin, DOWN_ARROW);
    await press(stdin, 'e');

    expect(lastFrame()).toContain('Edit Item');
    expect(lastFrame()).toContain('What: Grade papers');
    expect(lastFrame()).toContain('When: 2026-10-25');
    unmount();
  });

  test('an edited item is saved to the server and updated in place', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'e');
    await press(stdin, ' and eggs');
    await press(stdin, ENTER);
    await press(stdin, BACKSPACE);
    await press(stdin, BACKSPACE);
    await press(stdin, '30');
    await press(stdin, ENTER);
    await waitFor(() => lastFrame().includes('Item updated'));

    expect(calls.updateItem).toEqual([
      { id: 1, what: 'Buy milk and eggs', when: '2026-10-30' },
    ]);
    // The edited item stays in its place, still highlighted, above the other one.
    expect(lastFrame()).toContain('> Buy milk and eggs - 2026-10-30');
    expect(lastFrame().indexOf('Buy milk and eggs')).toBeLessThan(
      lastFrame().indexOf('Grade papers')
    );
    expect(lastFrame()).not.toContain('Edit Item');
    unmount();
  });

  test('the edit form checks the date like the add form does', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'e');
    await press(stdin, ENTER);
    await press(stdin, BACKSPACE);
    await press(stdin, BACKSPACE);
    await press(stdin, '99');
    await press(stdin, ENTER);

    expect(lastFrame()).toContain('Date must be a real date');
    expect(calls.updateItem).toEqual([]);
    unmount();
  });

  test('Escape closes the edit form without saving', async () => {
    const { lastFrame, stdin, calls, unmount } = await renderLoaded();

    await press(stdin, 'e');
    await press(stdin, ' changed');
    await press(stdin, ESCAPE);
    await waitFor(() => !lastFrame().includes('Edit Item'));

    expect(calls.updateItem).toEqual([]);
    expect(lastFrame()).toContain('> Buy milk - 2026-10-24');
    unmount();
  });

  test('keeps the old item and shows an error when the update fails', async () => {
    const { lastFrame, stdin, unmount } = await renderLoaded({ failUpdate: true });

    await press(stdin, 'e');
    await press(stdin, ' changed');
    await press(stdin, ENTER);
    await press(stdin, ENTER);
    await waitFor(() => lastFrame().includes('Failed to update item'));

    expect(lastFrame()).toContain('Buy milk - 2026-10-24');
    expect(lastFrame()).not.toContain('changed');
    unmount();
  });

  test('"e" does nothing when the list is empty', async () => {
    const { lastFrame, stdin, unmount } = await renderLoaded({ items: [] });

    await press(stdin, 'e');

    expect(lastFrame()).not.toContain('Edit Item');
    expect(lastFrame()).toContain('No items yet');
    unmount();
  });

  test('shows an error when the server rejects a new item', async () => {
    const { lastFrame, stdin, unmount } = await renderLoaded({ failCreate: true });

    await press(stdin, 'a');
    await press(stdin, 'Walk dog');
    await press(stdin, ENTER);
    await press(stdin, '2026-11-01');
    await press(stdin, ENTER);
    await waitFor(() => lastFrame().includes('Failed to add item'));

    expect(lastFrame()).not.toContain('Walk dog');
    unmount();
  });
});
