import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Student } from '../../../types';
import { useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function ProfileDetails({ student }: { student: Student }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{student.user?.name ?? '-'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{student.user?.email ?? '-'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Roll Number</Text>
        <Text style={styles.value}>{student.rollNumber}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Branch</Text>
        <Text style={styles.value}>{student.branch}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Year</Text>
        <Text style={styles.value}>{student.year}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Room</Text>
        <Text style={styles.value}>
          {student.room ? `${student.room.roomNumber} (Block ${student.room.block})` : 'Unassigned'}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 15,
    color: colors.muted,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
});