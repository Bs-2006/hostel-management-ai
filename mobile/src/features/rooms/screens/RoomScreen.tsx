import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchRooms, addRoom, editRoom, removeRoom } from '../roomSlice';
import { loadProfile } from '../../profile/profileSlice';
import { Room } from '../../../types';
import { getErrorMessage } from '../../../services/api';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loading from '../../../components/Loading';
import { useAuth } from '../../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface RoomFormState {
  roomNumber: string;
  block: string;
  floor: string;
  capacity: string;
}

const emptyForm: RoomFormState = { roomNumber: '', block: '', floor: '', capacity: '' };

export default function RoomScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { items, loading } = useAppSelector((state) => state.rooms);
  const profile = useAppSelector((state) => state.profile.student);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomFormState>(emptyForm);

  const isWarden = user?.role === 'warden';

  useEffect(() => {
    dispatch(fetchRooms());
    if (user?.student) dispatch(loadProfile(user.student.id));
  }, [dispatch, user?.student]);

  const assignedBlock = profile?.room?.block ?? '';
  const assignedNumber = profile?.room?.roomNumber ?? '';
  const hasAssignment = !!assignedBlock && !!assignedNumber;
  const myRoom = hasAssignment
    ? items.find((r) => r.block === assignedBlock && r.roomNumber === assignedNumber)
    : undefined;

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setModalVisible(true);
  };

  const openEdit = (room: Room) => {
    setForm({
      roomNumber: room.roomNumber,
      block: room.block,
      floor: String(room.floor),
      capacity: String(room.capacity),
    });
    setEditing(room);
    setModalVisible(true);
  };

  const onLongPress = (room: Room) => {
    Alert.alert(room.roomNumber, 'Choose an action', [
      {
        text: 'Edit',
        onPress: () => openEdit(room),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Room', `Delete room ${room.roomNumber}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await dispatch(removeRoom(room.id)).unwrap();
                  dispatch(fetchRooms());
                } catch (err) {
                  Alert.alert('Error', getErrorMessage(err));
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSave = async () => {
    if (!form.roomNumber.trim() || !form.block.trim() || !form.floor || !form.capacity) {
      Alert.alert('Missing fields', 'Please fill in room number, block, floor and capacity.');
      return;
    }
    const dto = {
      roomNumber: form.roomNumber.trim(),
      block: form.block.trim(),
      floor: Number(form.floor),
      capacity: Number(form.capacity),
    };
    try {
      if (editing) {
        await dispatch(editRoom({ id: editing.id, dto })).unwrap();
      } else {
        await dispatch(addRoom(dto)).unwrap();
        dispatch(fetchRooms());
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderRoom = useCallback(
    ({ item }: { item: Room }) => {
      const available = item.capacity - item.occupied;
      return (
        <Card onPress={() => router.push(`/rooms/${item.id}` as never)} style={styles.roomCard}>
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <Text style={styles.roomNumber}>{item.roomNumber}</Text>
              <Text style={styles.roomMeta}>
                Block {item.block} | Floor {item.floor}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.occupancy}>
                {item.occupied}/{item.capacity}
              </Text>
              <Text style={[styles.available, available <= 0 && styles.full]}>
                {available > 0 ? `${available} free` : 'Full'}
              </Text>
            </View>
          </View>
        </Card>
      );
    },
    [],
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Loading />
      ) : isWarden ? (
        <>
          <View style={styles.toolbar}>
            <Button title="+ Add Room" variant="outline" onPress={openCreate} style={styles.addButton} />
          </View>
          <FlatList
            data={items}
            keyExtractor={(r) => String(r.id)}
            renderItem={renderRoom}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.hint}>
                {items.length === 0
                  ? 'No rooms yet.'
                  : 'Tap a room for details. (Warden: long-press to edit/delete)'}
              </Text>
            }
          />
        </>
      ) : hasAssignment ? (
        <View style={styles.studentWrap}>
          <Text style={styles.studentTitle}>My Room</Text>
          <Card
            style={styles.myRoomCard}
            onPress={myRoom ? () => router.push(`/rooms/${myRoom.id}` as never) : undefined}
          >
            <View style={[styles.myRoomBadge, { backgroundColor: colors.pillBlue }]}>
              <Ionicons name="bed-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.myRoomBody}>
              <Text style={styles.myRoomNumber}>Room {assignedNumber}</Text>
              <Text style={styles.myRoomMeta}>
                Block {assignedBlock}
                {myRoom ? ` · Floor ${myRoom.floor}` : ''}
              </Text>
              {myRoom ? (
                <View style={styles.myRoomStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: myRoom.capacity - myRoom.occupied > 0 ? colors.approved : colors.rejected },
                    ]}
                  />
                  <Text style={styles.myRoomAvail}>
                    {myRoom.capacity - myRoom.occupied > 0
                      ? `${myRoom.capacity - myRoom.occupied} bed${myRoom.capacity - myRoom.occupied > 1 ? 's' : ''} free`
                      : 'Room full'}
                  </Text>
                </View>
              ) : (
                <View style={styles.myRoomStatus}>
                  <View style={[styles.statusDot, { backgroundColor: colors.pending }]} />
                  <Text style={styles.myRoomAvail}>Details coming soon</Text>
                </View>
              )}
            </View>
            {myRoom ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null}
          </Card>
          {myRoom ? <Text style={styles.studentHint}>Tap your room for details</Text> : null}
        </View>
      ) : (
        <View style={styles.studentWrap}>
          <Text style={styles.studentTitle}>My Room</Text>
          <View style={styles.emptyCard}>
            <Ionicons name="bed-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyText}>No room assigned yet.</Text>
            <Text style={styles.emptySub}>Your hostel room will appear here once assigned.</Text>
          </View>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Room' : 'Add Room'}</Text>
            <Input
              label="Room Number"
              placeholder="A101"
              value={form.roomNumber}
              onChangeText={(v) => setForm({ ...form, roomNumber: v })}
            />
            <Input
              label="Block"
              placeholder="A"
              value={form.block}
              onChangeText={(v) => setForm({ ...form, block: v })}
            />
            <Input
              label="Floor"
              placeholder="1"
              keyboardType="number-pad"
              value={form.floor}
              onChangeText={(v) => setForm({ ...form, floor: v })}
            />
            <Input
              label="Capacity"
              placeholder="4"
              keyboardType="number-pad"
              value={form.capacity}
              onChangeText={(v) => setForm({ ...form, capacity: v })}
            />
            <Button title="Save" onPress={onSave} style={styles.saveButton} />
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
  toolbar: {
    padding: 16,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  roomCard: {
    flexDirection: 'row',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  roomMeta: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 64,
  },
  occupancy: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  available: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.approved,
  },
  full: {
    color: colors.rejected,
  },
  studentWrap: {
    padding: 16,
    paddingTop: 8,
  },
  studentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  myRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  myRoomBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRoomBody: {
    flex: 1,
  },
  myRoomNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  myRoomMeta: {
    marginTop: 3,
    fontSize: 14,
    color: colors.muted,
  },
  myRoomStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  myRoomAvail: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  studentHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});