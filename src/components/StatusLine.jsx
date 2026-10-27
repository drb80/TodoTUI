import React from 'react';
import { Text } from 'ink';

const COLORS = {
  error: 'red',
  success: 'green',
  info: 'gray',
};

// Takes the place of alert() and console.log() from the web version:
// a terminal app can't pop up a dialog, and console output would garble the screen.
export default function StatusLine({ status }) {
  if (!status) {
    return null;
  }
  return <Text color={COLORS[status.kind]}>{status.message}</Text>;
}
