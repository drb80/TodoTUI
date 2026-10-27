import React from 'react';
import { Box, Text } from 'ink';
import { sanitizeForTerminal } from '../text.js';

// Replaces the list of <div className="item"> rows from the web version.
// There are no Delete buttons; the highlighted row is the one "d" deletes.
export default function ItemList({ items, selectedIndex }) {
  if (items.length === 0) {
    return <Text dimColor>{'No items yet. Press "a" to add one.'}</Text>;
  }

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Text key={item.id} inverse={isSelected}>
            {isSelected ? '> ' : '  '}
            <Text bold>{sanitizeForTerminal(item.what)}</Text>
            {' - '}
            {sanitizeForTerminal(item.when)}
          </Text>
        );
      })}
    </Box>
  );
}
