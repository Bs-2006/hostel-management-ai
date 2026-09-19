import React, { useCallback, useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchStudentsList, deleteStudentRecord, assignRoomThunk } from '../studentSlice';
import { fetchRooms } from '../../rooms/roomSlice';
import { Student, Room } from '../../../types';
import { getErrorMessage } from '../../../services/api';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loading from '../../../components/Loading';
import StatusBadge from '../../../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function StudentsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { items: students, loading } = useAppSelector((state) => state.students);
  const { items: rooms } = useAppSelector((state) => state.rooms);

  const [assigning, setAssigning] = useState<Student | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [showRoomList, setShowRoomList] = useState(false);

  useEffect(() => {
    dispatch(fetchStudentsList());
    dispatch(fetchRooms());
  }, [dispatch]);

  const selectedRoomLabel = () => {
    const r = rooms.find((x) => String(x.id) === selectedRoom);
    return r ? `${r.roomNumber} (${r.capacity - r.occupied} free)` : 'Select a room';
  };

  const openAssign = (student: Student) => {
    setSelectedRoom(student.roomId ? String(student.roomId) : '');
    setAssigning(student);
  };

  const onAssign = async () => {
    if (!assigning) return;
    if (!selectedRoom) {
      Alert.alert('Select a room', 'Choose a room to assign.');
      return;
    }
    try {
      await dispatch(assignRoomThunk({ studentId: assigning.id, roomId: Number(selectedRoom) })).unwrap();
      setAssigning(null);
      Alert.alert('Assigned', `Room assigned to ${assigning.user?.name ?? assigning.rollNumber}.`);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const onDelete = (student: Student) => {
    Alert.alert('Delete Student', `Delete ${student.user?.name ?? student.rollNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteStudentRecord(student.id)).unwrap();
          } catch (err) {
            Alert.alert('Error', getErrorMessage(err));
          }
        },
      },
    ]);
  };

  const showStudentActions = (student: Student) => {
    const name = student.user?.name ?? student.rollNumber;
    Alert.alert(name, 'Choose an action', [
      { text: 'Assign Room', onPress: () => openAssign(student) },
      { text: 'Edit', onPress: () => router.push(`/students/${student.id}` as never) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(student) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderStudent = useCallback(
    ({ item }: { item: Student }) => (
      <Card onPress={() => showStudentActions(item)}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="person-outline" size={20} color={colors.muted} />
          </View>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title} numberOfLines={1}>
                {item.user?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.subtitle}>
                {item.rollNumber} | {item.branch}, Year {item.year}
              </Text>
            </View>
            <StatusBadge status={item.room ? 'Assigned' : 'Unassigned'} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="bed-outline" size={14} color={colors.muted} />
            <Text style={styles.metaValue}>
              Room {item.room ? item.room.roomNumber : 'Not assigned yet'}
            </Text>
          </View>
        </View>

      </Card>
    ),
    [colors, styles],
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderStudent}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.hint}>
              {students.length === 0 ? 'No students yet.' : `${students.length} student(s)`}
            </Text>
          }
        />
      )}

      <Modal visible={!!assigning} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAssigning(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              Assign Room to {assigning?.user?.name ?? ''}
            </Text>
            <Pressable style={styles.pickerWrap} onPress={() => setShowRoomList((v) => !v)}>
              <Text style={[styles.pickerText, !selectedRoom && styles.pickerPlaceholder]}>
                {selectedRoomLabel()}
              </Text>
              <Text style={styles.pickerCaret}>▾</Text>
            </Pressable>
            {showRoomList && (
              <View style={styles.roomListWrap}>
                <ScrollView nestedScrollEnabled style={styles.roomList}>
                  <Pressable
                    style={styles.roomOption}
                    onPress={() => {
                      setSelectedRoom('');
                      setShowRoomList(false);
                    }}
                  >
                    <Text style={styles.roomOptionText}>Select a room</Text>
                  </Pressable>
                  {rooms.map((r: Room) => {
                    const free = r.capacity - r.occupied;
                    const disabled = free <= 0 && assigning?.roomId !== r.id;
                    return (
                      <Pressable
                        key={r.id}
                        disabled={disabled}
                        style={[styles.roomOption, disabled && styles.roomOptionDisabled]}
                        onPress={() => {
                          setSelectedRoom(String(r.id));
                          setShowRoomList(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.roomOptionText,
                            disabled && styles.roomOptionDisabledText,
                          ]}
                        >
                          {r.roomNumber} ({free} free)
                          {assigning?.roomId === r.id ? ' (current)' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <View style={styles.modalActions}>
              <Button title="Assign" variant="outline" onPress={onAssign} style={styles.flex} />
              <Button title="Cancel" variant="secondary" onPress={() => setAssigning(null)} style={styles.flex} />
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
    backgroundColor: colors.bg,
  },
  list: {
    padding: 16,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 12,
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
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    marginBottom: 12,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  pickerText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.muted,
  },
  pickerCaret: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
  },
  roomListWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  roomList: {
    maxHeight: 200,
  },
  roomOption: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  roomOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  roomOptionDisabled: {
    opacity: 0.4,
  },
  roomOptionDisabledText: {
    color: colors.muted,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});