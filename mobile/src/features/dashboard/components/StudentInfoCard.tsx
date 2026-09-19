import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student, Role } from '../../../types';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface Props {
  student?: Student | null;
  role?: Role;
}

interface RowProps {
  label: string;
  value?: string;
}

function Row({ label, value }: RowProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );
}

export function StudentInfoCard({ student, role }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isStudent = role === 'student';
  const name = student?.user?.name || '';
  const registration = student?.rollNumber;
  const branch = student?.branch;
  const year = student?.year;
  const room = student?.room
    ? `${student.room.roomNumber} (Block ${student.room.block})`
    : 'Unassigned';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Ionicons
            name={isStudent ? 'person' : 'shield-checkmark'}
            size={26}
            color={colors.primary}
          />
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.subText}>
            {isStudent ? 'Resident' : 'Warden'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isStudent ? 'STUDENT' : 'WARDEN'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {isStudent ? (
        <>
          <Row label="Registration No." value={registration} />
          <Row label="Department" value={branch} />
          <Row label="Year" value={year !== undefined ? String(year) : undefined} />
          <Row label="Room / Hostel" value={room} />
        </>
      ) : (
        <Row label="Role" value="Hostel Administration" />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.pillBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.pillBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    paddingLeft: 12,
  },
});
