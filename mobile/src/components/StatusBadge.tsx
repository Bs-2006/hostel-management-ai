import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Black & white status pills: Pending is a solid black call-to-action,
// the rest are clean white pills with black text/border.
const STATUS_STYLE: Record<
  string,
  'black' | 'white' | 'strike' | 'green'
> = {
  Pending: 'black',
  PENDING: 'black',
  Approved: 'green',
  RESOLVED: 'green',
  PRESENT: 'green',
  Rejected: 'strike',
  REJECTED: 'strike',
  ABSENT: 'strike',
  IN_PROGRESS: 'white',
  Assigned: 'green',
  Unassigned: 'black',
};

export default function StatusBadge({ status }: { status: string }) {
  const kind = STATUS_STYLE[status] ?? 'white';
  const styles = createStyles(kind);

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

function createStyles(kind: 'black' | 'white' | 'strike' | 'green') {
  const isBlack = kind === 'black';
  const isStrike = kind === 'strike';
  const isGreen = kind === 'green';
  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: isBlack ? '#000000' : isGreen ? '#DCFCE7' : '#FFFFFF',
      borderWidth: isBlack || isGreen ? 0 : 1,
      borderColor: '#000000',
    },
    text: {
      fontSize: 12,
      fontWeight: '700',
      color: isBlack ? '#FFFFFF' : isGreen ? '#166534' : '#111111',
      textDecorationLine: isStrike ? 'line-through' : 'none',
    },
  });
}
