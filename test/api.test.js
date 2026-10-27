import { createApi, parseBaseUrl } from '../src/api.js';

// A stand-in for fetch that records each call and returns a canned response.
function makeFakeFetch({ ok = true, status = 200, body = null } = {}) {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok, status, json: async () => body };
  };
  return { fakeFetch, calls };
}

describe('parseBaseUrl', () => {
  test('accepts http and https URLs and drops a trailing slash', () => {
    expect(parseBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(parseBaseUrl('https://example.com/todos/')).toBe('https://example.com/todos');
  });

  test('rejects other protocols', () => {
    expect(() => parseBaseUrl('file:///etc/passwd')).toThrow(/http/);
    expect(() => parseBaseUrl('javascript:alert(1)')).toThrow(/http/);
  });

  test('rejects text that is not a URL', () => {
    expect(() => parseBaseUrl('not a url')).toThrow(/Not a valid URL/);
  });
});

describe('fetchItems', () => {
  test('GETs /items.json and returns the parsed list', async () => {
    const items = [{ id: 1, what: 'Buy milk', when: '2026-10-24' }];
    const { fakeFetch, calls } = makeFakeFetch({ body: items });
    const api = createApi('http://server', fakeFetch);

    await expect(api.fetchItems()).resolves.toEqual(items);
    expect(calls[0].url).toBe('http://server/items.json');
  });

  test('throws with the status code when the server fails', async () => {
    const { fakeFetch } = makeFakeFetch({ ok: false, status: 500 });
    const api = createApi('http://server', fakeFetch);

    await expect(api.fetchItems()).rejects.toThrow('Failed to fetch items (HTTP 500)');
  });
});

describe('createItem', () => {
  test('POSTs the item nested under "item" as JSON', async () => {
    const saved = { id: 7, what: 'Buy milk', when: '2026-10-24' };
    const { fakeFetch, calls } = makeFakeFetch({ status: 201, body: saved });
    const api = createApi('http://server', fakeFetch);

    await expect(api.createItem('Buy milk', '2026-10-24')).resolves.toEqual(saved);

    const { url, options } = calls[0];
    expect(url).toBe('http://server/items.json');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      item: { what: 'Buy milk', when: '2026-10-24' },
    });
  });

  test('throws when the server rejects the item', async () => {
    const { fakeFetch } = makeFakeFetch({ ok: false, status: 422 });
    const api = createApi('http://server', fakeFetch);

    await expect(api.createItem('x', '2026-10-24')).rejects.toThrow('HTTP 422');
  });
});

describe('updateItem', () => {
  test('PATCHes the item nested under "item" as JSON', async () => {
    const updated = { id: 3, what: 'Buy oat milk', when: '2026-10-26' };
    const { fakeFetch, calls } = makeFakeFetch({ body: updated });
    const api = createApi('http://server', fakeFetch);

    await expect(api.updateItem(3, 'Buy oat milk', '2026-10-26')).resolves.toEqual(updated);

    const { url, options } = calls[0];
    expect(url).toBe('http://server/items/3.json');
    expect(options.method).toBe('PATCH');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      item: { what: 'Buy oat milk', when: '2026-10-26' },
    });
  });

  test('throws when the server rejects the change', async () => {
    const { fakeFetch } = makeFakeFetch({ ok: false, status: 422 });
    const api = createApi('http://server', fakeFetch);

    await expect(api.updateItem(3, 'x', '2026-10-26')).rejects.toThrow(
      'Failed to update item (HTTP 422)'
    );
  });

  test('refuses ids that are not integers without calling the server', async () => {
    const { fakeFetch, calls } = makeFakeFetch();
    const api = createApi('http://server', fakeFetch);

    await expect(api.updateItem('3?x=1', 'x', '2026-10-26')).rejects.toThrow('Invalid item id');
    expect(calls).toHaveLength(0);
  });
});

describe('deleteItem', () => {
  test('sends DELETE to /items/:id.json', async () => {
    const { fakeFetch, calls } = makeFakeFetch({ status: 204 });
    const api = createApi('http://server', fakeFetch);

    await api.deleteItem(3);

    expect(calls[0].url).toBe('http://server/items/3.json');
    expect(calls[0].options.method).toBe('DELETE');
  });

  test('throws when the server refuses', async () => {
    const { fakeFetch } = makeFakeFetch({ ok: false, status: 404 });
    const api = createApi('http://server', fakeFetch);

    await expect(api.deleteItem(3)).rejects.toThrow('Failed to delete item (HTTP 404)');
  });

  test('refuses ids that are not integers without calling the server', async () => {
    const { fakeFetch, calls } = makeFakeFetch();
    const api = createApi('http://server', fakeFetch);

    await expect(api.deleteItem('1/../../admin')).rejects.toThrow('Invalid item id');
    expect(calls).toHaveLength(0);
  });
});
