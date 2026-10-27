import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { validateItem } from '../text.js';

// Used for both adding and editing; replaces the <form> from the web version.
// A terminal has no mouse or date picker, so Enter moves from "What" to
// "When", and the date is typed. For an edit, pass the item's current values.
export default function ItemForm({ title, initialWhat = '', initialWhen = '', onSubmit, onCancel }) {
  const [what, setWhat] = React.useState(initialWhat);
  const [when, setWhen] = React.useState(initialWhen);
  const [focusedField, setFocusedField] = React.useState('what');
  const [validationError, setValidationError] = React.useState(null);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleWhatSubmit = () => {
    setFocusedField('when');
  };

  const handleWhenSubmit = () => {
    const error = validateItem(what, when);
    if (error) {
      setValidationError(error);
      return;
    }
    onSubmit(what.trim(), when.trim());
  };

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>{title}</Text>
      <Box>
        <Text>What: </Text>
        <TextInput
          value={what}
          onChange={setWhat}
          onSubmit={handleWhatSubmit}
          focus={focusedField === 'what'}
          placeholder="Enter task description"
        />
      </Box>
      <Box>
        <Text>When: </Text>
        <TextInput
          value={when}
          onChange={setWhen}
          onSubmit={handleWhenSubmit}
          focus={focusedField === 'when'}
          placeholder="YYYY-MM-DD"
        />
      </Box>
      {validationError && <Text color="red">{validationError}</Text>}
      <Text dimColor>Enter: next / save   Esc: cancel</Text>
    </Box>
  );
}
