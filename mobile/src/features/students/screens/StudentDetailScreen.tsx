import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchStudentsList, updateStudentRecord } from '../studentSlice';
import { getErrorMessage } from '../../../services/api';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loading from '../../../components/Loading';
import { useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function StudentDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.students);
  const student = items.find((s) => s.id === Number(id));

  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!student) dispatch(fetchStudentsList());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, student]);

  useEffect(() => {
    if (student) {
      setBranch(student.branch);
      setYear(String(student.year));
    }
  }, [student]);

  const onSave = async () => {
    if (!branch.trim() || !year || Number.isNaN(Number(year))) {
      Alert.alert('Missing fields', 'Branch and year are required.');
      return;
    }
    try {
      await dispatch(
        updateStudentRecord({ id: student!.id, dto: { branch: branch.trim(), year: Number(year) } }),
      ).unwrap();
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading && !student) return <Loading />;
  if (!student) return <Loading />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.name}>{student.user?.name ?? 'Unknown'}</Text>
        <Text style={styles.meta}>Email: {student.user?.email ?? '-'}</Text>
        <Text style={styles.meta}>Roll Number: {student.rollNumber}</Text>
        <Text style={styles.meta}>Branch: {student.branch}</Text>
        <Text style={styles.meta}>Year: {student.year}</Text>
        <Text style={styles.meta}>
          Room: {student.room ? `${student.room.roomNumber} (Block ${student.room.block})` : 'Unassigned'}
        </Text>
      </Card>

      {!editing ? (
        <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} />
      ) : (
        <Card>
          <Text style={styles.editTitle}>Edit Student</Text>
          <Input label="Branch" value={branch} onChangeText={setBranch} />
          <Input label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" />
          <View style={styles.row}>
            <Button title="Save" onPress={onSave} style={styles.flex} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
          </View>
        </Card>
      )}
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
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    marginTop: 6,
    fontSize: 15,
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