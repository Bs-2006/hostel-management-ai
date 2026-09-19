import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchComplaintsList, fetchMyComplaintList, updateComplaintStatusThunk } from '../complaintSlice';
import { getErrorMessage } from '../../../services/api';
import { Complaint, ComplaintStatus } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import Button from '../../../components/Button';
import Loading from '../../../components/Loading';
import RoleGuard from '../../../components/RoleGuard';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

const STATUSES: ComplaintStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
type Tab = 'All' | 'Open' | 'Done';

const TABS: Tab[] = ['All', 'Open', 'Done'];

export default function ComplaintsScreen() {
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { items, loading } = useAppSelector((state) => state.complaints);
  const isWarden = user?.role === 'warden';
  const [tab, setTab] = useState<Tab>('All');

  useEffect(() => {
    if (isWarden) {
      dispatch(fetchComplaintsList());
    } else {
      dispatch(fetchMyComplaintList());
    }
  }, [dispatch, isWarden]);

  const studentNameFor = (c: Complaint) =>
    c.student ? (c.student.user?.name ?? c.student.rollNumber) : undefined;

  const filtered = items.filter((c) => {
    if (tab === 'All') return true;
    if (tab === 'Open') return c.status === 'PENDING' || c.status === 'IN_PROGRESS';
    return c.status === 'RESOLVED' || c.status === 'REJECTED';
  });

  const onStatusChange = async (c: Complaint, status: ComplaintStatus) => {
    if (status === c.status) return;
    try {
      await dispatch(updateComplaintStatusThunk({ id: c.id, status })).unwrap();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      {/* ── Status tabs ── */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={active ? styles.tabTextActive : styles.tabText}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isWarden ? 'No complaints yet.' : "You haven't submitted any complaints."}
          </Text>
        }
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            studentName={isWarden ? studentNameFor(item) : undefined}
          >
            <RoleGuard role="warden">
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={item.status}
                  onValueChange={(v: ComplaintStatus) => onStatusChange(item, v)}
                  style={styles.picker}
                >
                  {STATUSES.map((s) => (
                    <Picker.Item key={s} label={s.replace('_', ' ')} value={s} />
                  ))}
                </Picker>
              </View>
            </RoleGuard>
          </ComplaintCard>
        )}
      />

      <RoleGuard role="student">
        <View style={styles.fabWrap}>
          <Button title="+ New Complaint" variant="dark" onPress={() => router.push('/complaints/create' as never)} style={styles.fab} />
        </View>
      </RoleGuard>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.surfaceDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  picker: {
    color: colors.text,
  },
  fabWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fab: {
    paddingVertical: 12,
  },
});