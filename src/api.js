// Talks to the Rails backend's JSON API (see config/routes.rb: resources :items).

export const DEFAULT_BASE_URL = 'http://localhost:3000';

// Only allow plain web URLs, so a bad TODOS_URL can't point us at file: or similar.
export function parseBaseUrl(text) {
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`Not a valid URL: ${text}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`URL must start with http:// or https://, got ${url.protocol}`);
  }

  // Drop any trailing slash so we can safely append paths like "/items.json".
  return url.origin + url.pathname.replace(/\/$/, '');
}

// fetchFunction is a parameter so tests can pass in a fake instead of hitting a server.
export function createApi(baseUrl = DEFAULT_BASE_URL, fetchFunction = fetch) {
  const jsonHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  async function fetchItems() {
    const response = await fetchFunction(`${baseUrl}/items.json`, {
      headers: jsonHeaders,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch items (HTTP ${response.status})`);
    }
    return response.json();
  }

  async function createItem(what, when) {
    // Rails expects the fields nested under "item" (see ItemsController#item_params).
    const response = await fetchFunction(`${baseUrl}/items.json`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ item: { what, when } }),
    });
    if (!response.ok) {
      throw new Error(`Failed to add item (HTTP ${response.status})`);
    }
    return response.json();
  }

  function itemUrl(id) {
    // Ids come from the server; refuse anything that isn't a plain number
    // rather than building a URL out of it.
    if (!Number.isInteger(id)) {
      throw new Error(`Invalid item id: ${id}`);
    }
    return `${baseUrl}/items/${id}.json`;
  }

  async function updateItem(id, what, when) {
    const response = await fetchFunction(itemUrl(id), {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ item: { what, when } }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update item (HTTP ${response.status})`);
    }
    return response.json();
  }

  async function deleteItem(id) {
    const response = await fetchFunction(itemUrl(id), {
      method: 'DELETE',
      headers: jsonHeaders,
    });
    if (!response.ok) {
      throw new Error(`Failed to delete item (HTTP ${response.status})`);
    }
  }

  return { fetchItems, createItem, updateItem, deleteItem };
}
