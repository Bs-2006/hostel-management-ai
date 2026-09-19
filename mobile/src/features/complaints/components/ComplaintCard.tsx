import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Complaint } from '../../../types';
import StatusBadge from '../../../components/StatusBadge';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface ComplaintCardProps {
  complaint: Complaint;
  studentName?: string;
  children?: React.ReactNode;
}

export default function ComplaintCard({ complaint, studentName, children }: ComplaintCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="megaphone-outline" size={20} color={colors.muted} />
        </View>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1}>
              {complaint.title}
            </Text>
            {!!studentName && <Text style={styles.student}>by {studentName}</Text>}
          </View>
          <StatusBadge status={complaint.status} />
        </View>
      </View>
      <Text style={styles.description}>{complaint.description}</Text>
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
  },
});