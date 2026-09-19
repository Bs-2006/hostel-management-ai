import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchMenus, addMenu, editMenu, removeMenu } from '../foodSlice';
import { getErrorMessage } from '../../../services/api';
import { FoodDay, FoodMenu } from '../../../types';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loading from '../../../components/Loading';
import RoleGuard from '../../../components/RoleGuard';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

const DAYS: FoodDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_SHORT: Record<FoodDay, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '🍳', time: '7 – 9 AM', chip: '#FFFFFF' },
  { key: 'lunch', label: 'Lunch', icon: '🍱', time: '12 – 2 PM', chip: '#F1F1EF' },
  { key: 'snacks', label: 'Snacks', icon: '🍵', time: '4 – 5 PM', chip: '#E5E5E5' },
  { key: 'dinner', label: 'Dinner', icon: '🌙', time: '7 – 9 PM', chip: '#000000' },
] as const;

function todayDay(): FoodDay {
  const idx = (new Date().getDay() + 6) % 7;
  return DAYS[idx];
}

function prettyDay(day: FoodDay) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

interface MenuFormState {
  day: FoodDay;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

const emptyForm = (day: FoodDay = DAYS[0]): MenuFormState => ({
  day,
  breakfast: '',
  lunch: '',
  snacks: '',
  dinner: '',
});

export default function FoodMenuScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.food);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<FoodMenu | null>(null);
  const [form, setForm] = useState<MenuFormState>(emptyForm());

  useEffect(() => {
    dispatch(fetchMenus());
  }, [dispatch]);

  const today = todayDay();
  const todayMenu = items.find((m) => m.day === today);
  const now = new Date();
  const dateLine = `${MONTHS[now.getMonth()]} ${now.getDate()}`;

  const openCreate = (day: FoodDay) => {
    setForm(emptyForm(day));
    setEditing(null);
    setModalVisible(true);
  };

  const openAddAnother = () => {
    const taken = new Set(items.map((m) => m.day));
    const nextDay = DAYS.find((d) => !taken.has(d));
    openCreate(nextDay ?? today);
  };

  const openEdit = (menu: FoodMenu) => {
    setForm({
      day: menu.day,
      breakfast: menu.breakfast,
      lunch: menu.lunch,
      snacks: menu.snacks,
      dinner: menu.dinner,
    });
    setEditing(menu);
    setModalVisible(true);
  };

  const onLongPress = (menu: FoodMenu) => {
    Alert.alert(DAY_SHORT[menu.day], 'Choose an action', [
      { text: 'Edit', onPress: () => openEdit(menu) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Menu', `Delete the ${DAY_SHORT[menu.day]} menu?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await dispatch(removeMenu(menu.id)).unwrap();
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
    if (
      !form.breakfast.trim() &&
      !form.lunch.trim() &&
      !form.snacks.trim() &&
      !form.dinner.trim()
    ) {
      Alert.alert('Empty menu', 'Fill in at least one meal.');
      return;
    }
    const dto = {
      breakfast: form.breakfast.trim() || 'Not set',
      lunch: form.lunch.trim() || 'Not set',
      snacks: form.snacks.trim() || 'Not set',
      dinner: form.dinner.trim() || 'Not set',
    };
    try {
      if (editing) {
        await dispatch(editMenu({ id: editing.id, dto })).unwrap();
      } else {
        await dispatch(addMenu({ day: form.day, ...dto })).unwrap();
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Headline */}
        <View style={styles.headRow}>
          <View>
            <Text style={styles.headEyebrow}>MESS MENU · {dateLine.toUpperCase()}</Text>
            <View style={styles.headTitleRow}>
              <Text style={styles.headTitle}>{prettyDay(today)}</Text>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            </View>
            <Text style={styles.headSub}>Today's mess menu</Text>
          </View>
          <RoleGuard role="warden">
            <Button
              title="Edit"
              small
              variant="secondary"
              onPress={() => (todayMenu ? openEdit(todayMenu) : openCreate(today))}
            />
          </RoleGuard>
        </View>

        {todayMenu ? (
          <Pressable
            style={({ pressed }) => [styles.menuWrap, pressed && styles.pressed]}
            onLongPress={() => onLongPress(todayMenu)}
          >
            {MEALS.map((meal, idx) => {
              const value = todayMenu[meal.key] || 'Not set';
              const isSet = value !== 'Not set';
              return (
                <View key={meal.key}>
                  {idx > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.mealRow}>
                    <View style={[styles.mealIcon, { backgroundColor: meal.chip }]}>
                      <Text style={styles.mealEmoji}>{meal.icon}</Text>
                    </View>
                    <View style={styles.mealBody}>
                      <View style={styles.mealTop}>
                        <Text style={styles.mealLabel}>{meal.label}</Text>
                        <Text style={styles.mealTime}>{meal.time}</Text>
                      </View>
                      <Text style={[styles.mealValue, !isSet && styles.mealValueEmpty]} numberOfLines={2}>
                        {value}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>No menu set for {prettyDay(today)} yet.</Text>
            <RoleGuard role="warden">
              <Button title="+ Set menu" variant="outline" onPress={() => openCreate(today)} style={styles.emptyBtn} />
            </RoleGuard>
          </View>
        )}

        <RoleGuard role="warden">
          <Button title="+ Add another day" variant="secondary" onPress={openAddAnother} />
        </RoleGuard>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Menu' : 'Add Menu'}</Text>
            {!editing && (
              <>
                <Text style={styles.label}>Day</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={form.day}
                    onValueChange={(v: FoodDay) => setForm({ ...form, day: v })}
                    style={styles.picker}
                  >
                    {DAYS.map((d) => (
                      <Picker.Item key={d} label={d} value={d} />
                    ))}
                  </Picker>
                </View>
              </>
            )}
            <Input label="Breakfast" value={form.breakfast} onChangeText={(v) => setForm({ ...form, breakfast: v })} />
            <Input label="Lunch" value={form.lunch} onChangeText={(v) => setForm({ ...form, lunch: v })} />
            <Input label="Snacks" value={form.snacks} onChangeText={(v) => setForm({ ...form, snacks: v })} />
            <Input label="Dinner" value={form.dinner} onChangeText={(v) => setForm({ ...form, dinner: v })} />
            <Button title="Save" variant="outline" onPress={onSave} />
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
    content: {
      padding: 16,
      paddingTop: 20,
      paddingBottom: 32,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: '#000000',
    },
    headTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    headTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    headSub: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 3,
    },
    todayBadge: {
      backgroundColor: colors.accent,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    todayBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.surfaceDark,
      letterSpacing: 0.4,
    },
    menuWrap: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      marginBottom: 16,
    },
    pressed: {
      opacity: 0.8,
    },
    mealRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 13,
      gap: 12,
    },
    mealIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealEmoji: {
      fontSize: 22,
    },
    mealBody: {
      flex: 1,
    },
    mealTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mealLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },
    mealTime: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
    },
    mealValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginTop: 3,
      lineHeight: 20,
    },
    mealValueEmpty: {
      color: colors.muted,
      fontWeight: '500',
      fontStyle: 'italic',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 68,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 10,
      textAlign: 'center',
    },
    emptyBtn: {
      marginTop: 16,
      alignSelf: 'stretch',
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
      maxHeight: '90%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginBottom: 12,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    picker: {
      color: colors.text,
    },
  });