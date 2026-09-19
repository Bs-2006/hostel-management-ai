import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchRooms, editRoom } from '../roomSlice';
import { fetchStudentsList } from '../../students/studentSlice';
import { getErrorMessage } from '../../../services/api';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loading from '../../../components/Loading';
import RoleGuard from '../../../components/RoleGuard';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../../constants/colors';

export default function RoomDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.rooms);
  const { items: students } = useAppSelector((state) => state.students);
  const room = items.find((r) => r.id === Number(id));

  // Prefer occupants embedded in the room object (from findOne which now includes them), fallback to filtering students list
  const occupantsFromRoom = (room as any)?.occupants as Array<{ name: string; rollNumber: string; branch: string; year: number }> | undefined;
  const occupants =
    occupantsFromRoom && Array.isArray(occupantsFromRoom)
      ? occupantsFromRoom.map((o, idx) => ({
          id: (o as any).userId ?? idx,
          rollNumber: o.rollNumber,
          branch: o.branch,
          year: o.year,
          user: { name: o.name } as any,
          roomId: room!.id,
        }))
      : students.filter((s) => s.roomId === Number(id));

  const [editing, setEditing] = useState(false);
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    if (!room) dispatch(fetchRooms());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, room]);

  useEffect(() => {
    dispatch(fetchStudentsList());
  }, [dispatch]);

  useEffect(() => {
    if (room) {
      setBlock(room.block);
      setFloor(String(room.floor));
      setCapacity(String(room.capacity));
    }
  }, [room]);

  const onSave = async () => {
    if (!block.trim() || !floor || !capacity) {
      Alert.alert('Missing fields', 'Block, floor and capacity are required.');
      return;
    }
    try {
      await dispatch(
        editRoom({
          id: room!.id,
          dto: { block: block.trim(), floor: Number(floor), capacity: Number(capacity) },
        }),
      ).unwrap();
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading && !room) return <Loading />;
  if (!room) return <Loading />;

  const available = room.capacity - room.occupied;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.roomNumber}>{room.roomNumber}</Text>
        <Text style={styles.meta}>Block {room.block}</Text>
        <Text style={styles.meta}>Floor {room.floor}</Text>
        <Text style={styles.meta}>Capacity {room.capacity}</Text>
        <Text style={styles.meta}>
          Occupied {room.occupied} ({available > 0 ? `${available} available` : 'Full'})
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Students in this room</Text>
      {occupants.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No students assigned to this room.</Text>
        </Card>
      ) : (
        occupants.map((s) => (
          <Card key={s.id}>
            <View style={styles.occupantRow}>
              <View style={styles.occupantIcon}>
                <Ionicons name="person-outline" size={18} color={colors.muted} />
              </View>
              <View style={styles.occupantInfo}>
                <Text style={styles.occupantName}>{s.user?.name ?? 'Unknown'}</Text>
                <Text style={styles.occupantSub}>
                  {s.rollNumber} | {s.branch}, Year {s.year}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}

      <RoleGuard role="warden">
        {!editing ? (
          <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} />
        ) : (
          <Card>
            <Text style={styles.editTitle}>Edit Room</Text>
            <Input label="Block" value={block} onChangeText={setBlock} />
            <Input label="Floor" value={floor} onChangeText={setFloor} keyboardType="number-pad" />
            <Input
              label="Capacity"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
            <View style={styles.row}>
              <Button title="Save" onPress={onSave} style={styles.flex} />
              <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
            </View>
          </Card>
        )}
      </RoleGuard>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
  },
  roomNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    marginTop: 6,
    fontSize: 16,
    color: colors.muted,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
  },
  occupantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupantIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  occupantInfo: {
    flex: 1,
  },
  occupantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  occupantSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  flex: {
    flex: 1,
  },
});