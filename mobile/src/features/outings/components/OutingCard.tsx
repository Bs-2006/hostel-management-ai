import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Outing } from '../../../types';
import StatusBadge from '../../../components/StatusBadge';
import { formatTime } from '../../../utils/formatDate';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface OutingCardProps {
  outing: Outing;
  studentName?: string;
  children?: React.ReactNode;
}

function shortDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function OutingCard({ outing, studentName, children }: OutingCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="walk-outline" size={20} color={colors.muted} />
        </View>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1}>
              {outing.destination}
            </Text>
            {!!studentName && <Text style={styles.student}>by {studentName}</Text>}
          </View>
          <StatusBadge status={outing.status} />
        </View>
      </View>

      {!!outing.reason && <Text style={styles.description}>{outing.reason}</Text>}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.metaValue}>{shortDate(outing.outingDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.metaValue}>
            {formatTime(outing.outTime)} › {formatTime(outing.inTime)}
          </Text>
        </View>
      </View>

      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  student: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
