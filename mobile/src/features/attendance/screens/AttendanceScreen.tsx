import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchAttendanceList,
  fetchMyAttendance,
  markAttendanceThunk,
  updateAttendanceStatus,
} from '../attendanceSlice';
import { fetchStudentsList } from '../../students/studentSlice';
import { getErrorMessage } from '../../../services/api';
import { Attendance } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import StatusBadge from '../../../components/StatusBadge';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loading from '../../../components/Loading';
import RoleGuard from '../../../components/RoleGuard';
import { formatDate, todayYMD } from '../../../utils/formatDate';
import { useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AttendanceScreen() {
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { items, loading } = useAppSelector((state) => state.attendance);
  const { items: students } = useAppSelector((state) => state.students);
  const isWarden = user?.role === 'warden';

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(todayYMD());
  const [status, setStatus] = useState<'PRESENT' | 'ABSENT'>('PRESENT');

  useEffect(() => {
    if (isWarden) {
      dispatch(fetchAttendanceList());
      dispatch(fetchStudentsList());
    } else if (user?.student?.id) {
      dispatch(fetchMyAttendance(user.student.id));
    }
  }, [dispatch, isWarden, user?.student?.id]);

  const week = useMemo(() => {
    const days: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: toYMD(d), label: SHORT_DAYS[d.getDay()] });
    }
    return days;
  }, []);

  const filtered = selectedDate
    ? items.filter((a) => a.date === selectedDate)
    : items;

  const studentNameFor = (a: Attendance) =>
    a.student ? (a.student.user?.name ?? a.student.rollNumber) : undefined;

  const present = items.filter((a) => a.status === 'PRESENT').length;
  const absent = items.filter((a) => a.status === 'ABSENT').length;
  const pct = items.length > 0 ? Math.round((present / items.length) * 100) : 0;

  const onMark = async () => {
    if (!studentId) {
      Alert.alert('Select a student', 'Choose a student before marking.');
      return;
    }
    try {
      await dispatch(markAttendanceThunk({ studentId: Number(studentId), date, status })).unwrap();
      setModalVisible(false);
      setStudentId('');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const onToggle = async (a: Attendance) => {
    const next = a.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    try {
      await dispatch(updateAttendanceStatus({ id: a.id, status: next })).unwrap();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      {/* ── Date strip ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        <Pressable
          style={[styles.dayCell, selectedDate === null && styles.dayCellActive]}
          onPress={() => setSelectedDate(null)}
        >
          <Text style={selectedDate === null ? styles.dayLabelActive : styles.dayLabel}>All</Text>
        </Pressable>
        {week.map((d) => {
          const active = selectedDate === d.date;
          return (
            <Pressable
              key={d.date}
              style={[styles.dayCell, active && styles.dayCellActive]}
              onPress={() => setSelectedDate(active ? null : d.date)}
            >
              <Text style={active ? styles.dayLabelActive : styles.dayLabel}>{d.label}</Text>
              <Text style={active ? styles.dayNumActive : styles.dayNum}>{d.date.slice(8)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Overall card ── */}
      <View style={styles.overallWrap}>
        <View style={styles.overallCard}>
          <View style={styles.overallTop}>
            <Text style={styles.overallLabel}>Overall Attendance</Text>
            <View style={styles.goodBadge}>
              <Text style={styles.goodText}>{pct >= 75 ? 'GOOD' : 'LOW'}</Text>
            </View>
          </View>
          <Text style={styles.overallValue}>{pct}%</Text>
          <View style={styles.overallStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Records</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── History ── */}
      <Text style={styles.sectionTitle}>History</Text>
      <FlatList
        data={filtered}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {selectedDate
              ? `No attendance on ${formatDate(selectedDate)}.`
              : 'No attendance records yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {isWarden ? studentNameFor(item) : 'You'}
              </Text>
              <Text style={styles.rowMeta}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.rowRight}>
              <StatusBadge status={item.status} />
              <RoleGuard role="warden">
                <Pressable onPress={() => onToggle(item)} hitSlop={8}>
                  <Text style={styles.toggle}>Toggle</Text>
                </Pressable>
              </RoleGuard>
            </View>
          </View>
        )}
      />

      <RoleGuard role="warden">
        <View style={styles.fabWrap}>
          <Button title="+ Mark Attendance" variant="outline" onPress={() => setModalVisible(true)} style={styles.fab} />
        </View>
      </RoleGuard>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <Text style={styles.label}>Student</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={studentId} onValueChange={(v) => setStudentId(v)} style={styles.picker}>
                <Picker.Item label="Select a student" value="" />
                {students.map((s) => (
                  <Picker.Item
                    key={s.id}
                    label={`${s.user?.name ?? s.rollNumber} (${s.rollNumber})`}
                    value={String(s.id)}
                  />
                ))}
              </Picker>
            </View>
            <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={status} onValueChange={(v: 'PRESENT' | 'ABSENT') => setStatus(v)} style={styles.picker}>
                <Picker.Item label="PRESENT" value="PRESENT" />
                <Picker.Item label="ABSENT" value="ABSENT" />
              </Picker>
            </View>
            <View style={styles.modalActions}>
              <Button title="Mark" variant="outline" onPress={onMark} style={styles.flex} />
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Date strip
  dateStrip: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  dayCell: {
    width: 48,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: {
    backgroundColor: '#000000',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
  },
  dayLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    marginTop: 0,
  },
  dayNumActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 0,
  },

  // Overall card
  overallWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  overallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  overallTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallLabel: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
  },
  goodBadge: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goodText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  overallValue: {
    color: '#111111',
    fontSize: 44,
    fontWeight: '800',
    marginTop: 6,
  },
  overallStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E0E0E0',
  },
  statValue: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#777777',
    fontSize: 12,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  empty: {
    color: '#777777',
    textAlign: 'center',
    marginTop: 24,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  rowMeta: {
    fontSize: 13,
    color: '#777777',
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  toggle: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  fabWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fab: {
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
    marginTop: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  picker: {
    color: '#111111',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flex: {
    flex: 1,
  },
});
