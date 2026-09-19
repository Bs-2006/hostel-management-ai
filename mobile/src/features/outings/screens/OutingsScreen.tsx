import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchOutingsList, approveOutingThunk, rejectOutingThunk } from '../outingSlice';
import { fetchStudentsList } from '../../students/studentSlice';
import { getErrorMessage } from '../../../services/api';
import { Outing } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import OutingCard from '../components/OutingCard';
import Button from '../../../components/Button';
import Loading from '../../../components/Loading';
import RoleGuard from '../../../components/RoleGuard';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

type Tab = 'All' | 'Pending' | 'Done';

const TABS: Tab[] = ['All', 'Pending', 'Done'];

export default function OutingsScreen() {
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.outings);
  const { items: students } = useAppSelector((state) => state.students);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('All');

  useEffect(() => {
    dispatch(fetchOutingsList());
    if (user?.role === 'warden') dispatch(fetchStudentsList());
  }, [dispatch, user?.role]);

  const studentNameFor = (outing: Outing) => {
    const student = students.find((s) => s.id === outing.studentId);
    return student ? (student.user?.name ?? student.rollNumber) : undefined;
  };

  const filtered = items.filter((o) => {
    if (tab === 'All') return true;
    if (tab === 'Pending') return o.status === 'Pending';
    return o.status !== 'Pending';
  });

  const onAct = async (outing: Outing, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await dispatch(approveOutingThunk(outing.id)).unwrap();
      } else {
        await dispatch(rejectOutingThunk(outing.id)).unwrap();
      }
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
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'All' ? 'No outing requests found.' : `No ${tab.toLowerCase()} outings.`}
          </Text>
        }
        renderItem={({ item }) => (
          <OutingCard outing={item} studentName={user?.role === 'warden' ? studentNameFor(item) : undefined}>
            {user?.role === 'warden' && item.status !== 'Approved' && (
              <View style={styles.actions}>
                <Button
                  title="Approve"
                  small
                  variant="success"
                  disabled={item.status !== 'Pending'}
                  onPress={() => onAct(item, 'approve')}
                  style={styles.actionButton}
                />
                <Button
                  title="Reject"
                  small
                  variant="danger"
                  disabled={item.status !== 'Pending'}
                  onPress={() => onAct(item, 'reject')}
                  style={styles.actionButton}
                />
              </View>
            )}
          </OutingCard>
        )}
      />

      <RoleGuard role="student">
        <View style={styles.fabWrap}>
          <Button title="+ New Outing" variant="dark" onPress={() => router.push('/outings/create' as never)} style={styles.fab} />
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  fabWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fab: {
    paddingVertical: 12,
  },
});