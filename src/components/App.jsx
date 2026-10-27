import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import ItemList from './ItemList.jsx';
import ItemForm from './ItemForm.jsx';
import StatusLine from './StatusLine.jsx';
import { sanitizeForTerminal } from '../text.js';

// Keeps the highlighted row on the list even after items are removed.
export function clampIndex(index, length) {
  if (length === 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

// The terminal counterpart of MyApp in public/app.js. The state and the
// fetch logic are the same; only the rendering and the input handling differ.
export default function App({ api }) {
  const { exit } = useApp();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  // 'list', 'add', or 'edit'
  const [mode, setMode] = React.useState('list');
  const [editingItem, setEditingItem] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  // Ignore keys while a request is in flight, so two deletes can't overlap.
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    // If the app exits before the fetch finishes, don't update state afterwards.
    let isCancelled = false;

    const loadItems = async () => {
      try {
        const data = await api.fetchItems();
        if (!isCancelled) {
          setItems(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadItems();
    return () => {
      isCancelled = true;
    };
  }, [api]);

  const selected = clampIndex(selectedIndex, items.length);

  const handleDestroy = async (item) => {
    setIsBusy(true);
    try {
      await api.deleteItem(item.id);
      // Use the updater form so we filter the latest list, not a stale copy.
      setItems((previousItems) => previousItems.filter((i) => i.id !== item.id));
      setStatus({ kind: 'success', message: 'Item deleted' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddItem = async (what, when) => {
    setMode('list');
    setIsBusy(true);
    try {
      // Unlike the web version, save to the server and use the id it assigns.
      const savedItem = await api.createItem(what, when);
      setItems((previousItems) => [...previousItems, savedItem]);
      setStatus({ kind: 'success', message: 'Item added' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateItem = async (what, when) => {
    const item = editingItem;
    setMode('list');
    setEditingItem(null);
    setIsBusy(true);
    try {
      const updatedItem = await api.updateItem(item.id, what, when);
      // Replace the item where it is, so the list order and highlight don't move.
      setItems((previousItems) =>
        previousItems.map((i) => (i.id === item.id ? updatedItem : i))
      );
      setStatus({ kind: 'success', message: 'Item updated' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelForm = () => {
    setMode('list');
    setEditingItem(null);
    setStatus(null);
  };

  useInput(
    (input, key) => {
      if (input === 'q') {
        exit();
        return;
      }
      if (loading || loadError || isBusy) {
        return;
      }
      if (key.upArrow) {
        setSelectedIndex(clampIndex(selected - 1, items.length));
      } else if (key.downArrow) {
        setSelectedIndex(clampIndex(selected + 1, items.length));
      } else if (input === 'a') {
        setStatus(null);
        setMode('add');
      } else if (input === 'e' && items.length > 0) {
        setStatus(null);
        setEditingItem(items[selected]);
        setMode('edit');
      } else if (input === 'd' && items.length > 0) {
        handleDestroy(items[selected]);
      }
    },
    // Turn this handler off while the form has the keyboard, so typing "q"
    // or "d" into a text field doesn't quit or delete.
    { isActive: mode === 'list' }
  );

  if (loading) {
    return <Text>Loading items...</Text>;
  }

  if (loadError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {loadError}</Text>
        <Text dimColor>q: quit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold underline>Todo Items</Text>
      {mode === 'add' && (
        <ItemForm title="Add New Item" onSubmit={handleAddItem} onCancel={handleCancelForm} />
      )}
      {mode === 'edit' && (
        // The text fields display their contents, so clean the server's
        // values before putting them there, just as ItemList does.
        <ItemForm
          title="Edit Item"
          initialWhat={sanitizeForTerminal(editingItem.what)}
          initialWhen={sanitizeForTerminal(editingItem.when)}
          onSubmit={handleUpdateItem}
          onCancel={handleCancelForm}
        />
      )}
      <ItemList items={items} selectedIndex={selected} />
      <StatusLine status={status} />
      {mode === 'list' && (
        <Text dimColor>↑/↓: select   a: add   e: edit   d: delete   q: quit</Text>
      )}
    </Box>
  );
}
