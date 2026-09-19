import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadProfile } from '../profile/profileSlice';
import { fetchMyComplaintList, fetchComplaintsList } from '../complaints/complaintSlice';
import { fetchOutingsList } from '../outings/outingSlice';
import { fetchMyAttendance, fetchAttendanceList } from '../attendance/attendanceSlice';
import { fetchMenus } from '../food/foodSlice';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { todayYMD } from '../../utils/formatDate';
import StatusBadge from '../../components/StatusBadge';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FOOD_DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

interface QuickAction {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  roles: Array<'student' | 'warden'>;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Attendance', subtitle: 'Mark today', icon: 'checkbox-outline', href: '/attendance', roles: ['student', 'warden'] },
  { title: 'Outings', subtitle: 'Request & track', icon: 'walk-outline', href: '/outings', roles: ['student', 'warden'] },
  { title: 'Complaints', subtitle: 'Submit issues', icon: 'megaphone-outline', href: '/complaints', roles: ['student', 'warden'] },
  { title: 'Mess Menu', subtitle: 'Weekly food menu', icon: 'restaurant-outline', href: '/food-menu', roles: ['student', 'warden'] },
  { title: 'Rooms', subtitle: 'View hostels', icon: 'bed-outline', href: '/rooms', roles: ['student', 'warden'] },
  { title: 'Students', subtitle: 'Manage students', icon: 'people-outline', href: '/students', roles: ['warden'] },
  { title: 'Ask AI', subtitle: 'Chat assistant', icon: 'sparkles-outline', href: '/chat', roles: ['student', 'warden'] },
];

function initialsOf(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function ActionTile({ action, onPress }: { action: QuickAction; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: '#FFFFFF' }]}>
        <Ionicons
          name={action.icon}
          size={22}
          color="#000000"
        />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {action.title}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile.student);
  const complaints = useAppSelector((state) => state.complaints.items);
  const outings = useAppSelector((state) => state.outings.items);
  const attendance = useAppSelector((state) => state.attendance.items);
  const menus = useAppSelector((state) => state.food.items);

  const [query, setQuery] = useState('');

  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (user?.student) dispatch(loadProfile(user.student.id));
    if (isStudent) dispatch(fetchMyComplaintList());
    else dispatch(fetchComplaintsList());
    dispatch(fetchOutingsList());
    dispatch(fetchMenus());
    if (isStudent && user?.student) dispatch(fetchMyAttendance(user.student.id));
    else dispatch(fetchAttendanceList());
  }, [dispatch, user?.student?.id, isStudent]);

  const attendanceSummary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'PRESENT').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent: total - present, pct };
  }, [attendance]);

  const openComplaints = useMemo(
    () => complaints.filter((c) => c.status === 'PENDING' || c.status === 'IN_PROGRESS').length,
    [complaints],
  );

  const today = new Date();
  const todayKey = FOOD_DAY_KEYS[today.getDay()];
  const todayMenu = menus.find((m) => m.day === todayKey);
  const todayAttendance = attendance.find((a) => a.date === todayYMD());

  const upcomingOuting = useMemo(() => {
    const future = outings
      .filter((o) => o.status === 'Approved' && o.outingDate >= todayYMD())
      .sort((a, b) => (a.outingDate + a.outTime).localeCompare(b.outingDate + b.outTime));
    return future[0];
  }, [outings]);

  const room = profile?.room;
  const roomLabel = room ? `${room.block} · Room ${room.roomNumber}` : 'Not assigned';

  const name = user?.name ?? '';
  const firstName = name.split(' ')[0] || 'there';

  const visible = QUICK_ACTIONS.filter((a) => user?.role && a.roles.includes(user.role));
  const filtered = query.trim()
    ? visible.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.subtitle.toLowerCase().includes(query.toLowerCase()),
      )
    : visible;

  const goto = (href: string) => {
    Keyboard.dismiss();
    setQuery('');
    router.push(href as never);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsOf(name)}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.hi}>Hi, Welcome Back!</Text>
                <Text style={styles.headerName} numberOfLines={1}>
                  {name}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/complaints' as never)}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {openComplaints > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>

          {/* ── Hero ── */}
          <Text style={styles.hero}>How are you{'\n'}today, {firstName}?</Text>

          {/* ── Search bar ── */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 2 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search features…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
              cursorColor={colors.text}
              selectionColor={colors.primary}
              textAlignVertical="center"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {query.trim() ? (
            <>
              <Text style={styles.sectionTitle}>Results for "{query}"</Text>
              <View style={styles.resultGrid}>
                {filtered.map((a) => (
                  <ActionTile key={a.title} action={a} onPress={() => goto(a.href)} />
                ))}
                {filtered.length === 0 && (
                  <Text style={styles.noResults}>No features match "{query}"</Text>
                )}
              </View>
            </>
          ) : (
            <>
              {/* ── Stat cards ── */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statDark]}>
                  <View style={styles.badgeRow}>
                    <View style={styles.goodBadge}>
                      <Text style={styles.goodText}>{isStudent ? 'ACTIVE' : 'WARDEN'}</Text>
                    </View>
                  </View>
                  <Text style={styles.statDarkLabel}>
                    {isStudent ? 'My Room' : 'Open Issues'}
                  </Text>
                  <Text style={styles.statDarkValue} numberOfLines={1}>
                    {isStudent ? roomLabel : String(openComplaints)}
                  </Text>
                  <Text style={styles.statDarkSub}>
                    {isStudent ? `Block ${room?.block ?? '—'}` : 'Pending & in progress'}
                  </Text>
                </View>

                <View style={[styles.statCard, styles.statLight]}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.goodBadge, styles.goodBadgeLight]}>
                      <Text style={styles.goodTextLight}>
                        {attendanceSummary.pct >= 75 ? 'GOOD' : 'ATTEND'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.statLightLabel}>Attendance</Text>
                  <Text style={styles.statLightValue}>{attendanceSummary.pct}%</Text>
                  <Text style={styles.statLightSub}>
                    {attendanceSummary.present} present · {attendanceSummary.absent} absent
                  </Text>
                </View>
              </View>

              {/* ── Today's schedule ── */}
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <View style={styles.scheduleCard}>
                <View style={styles.schedRow}>
                  <View style={styles.schedIcon}>
                    <Ionicons name="restaurant-outline" size={18} color="#000000" />
                  </View>
                  <View style={styles.schedBody}>
                    <Text style={styles.schedLabel}>Mess {SHORT_DAYS[today.getDay()]}</Text>
                    {todayMenu ? (
                      <Text style={styles.schedValue} numberOfLines={2}>
                        {todayMenu.breakfast} · {todayMenu.lunch} · {todayMenu.dinner}
                      </Text>
                    ) : (
                      <Text style={styles.schedValue}>Menu not set for today</Text>
                    )}
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.schedRow}>
                  <View style={styles.schedIcon}>
                    <Ionicons name="walk-outline" size={18} color="#000000" />
                  </View>
                  <View style={styles.schedBody}>
                    <Text style={styles.schedLabel}>Next outing</Text>
                    {upcomingOuting ? (
                      <Text style={styles.schedValue} numberOfLines={1}>
                        {upcomingOuting.destination} · {upcomingOuting.outingDate}
                      </Text>
                    ) : isStudent ? (
                      <Text style={styles.schedValue}>No approved outing planned</Text>
                    ) : (
                      <Text style={styles.schedValue}>{outings.length} outing requests</Text>
                    )}
                  </View>
                  {upcomingOuting && <StatusBadge status={upcomingOuting.status} />}
                </View>
                {isStudent && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.schedRow}>
                      <View style={styles.schedIcon}>
                        <Ionicons name="checkbox-outline" size={18} color="#000000" />
                      </View>
                      <View style={styles.schedBody}>
                        <Text style={styles.schedLabel}>Attendance today</Text>
                        {todayAttendance ? (
                          <Text style={styles.schedValue}>{todayAttendance.status.toLowerCase()}</Text>
                        ) : (
                          <Text style={styles.schedValue}>Not marked yet</Text>
                        )}
                      </View>
                      {todayAttendance && <StatusBadge status={todayAttendance.status} />}
                    </View>
                  </>
                )}
              </View>

              {/* ── Quick actions ── */}
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsScroll}
              >
                {filtered.map((a) => (
                  <ActionTile key={a.title} action={a} onPress={() => goto(a.href)} />
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pressed: { opacity: 0.7 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  hi: {
    fontSize: 12,
    color: colors.muted,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },

  // Hero
  hero: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 34,
    marginBottom: 18,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 12,
    marginBottom: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 0,
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    selectionColor: colors.primary,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  noResults: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 132,
    justifyContent: 'flex-end',
  },
  statDark: {
    backgroundColor: colors.heroCardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLight: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  goodBadge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  goodBadgeLight: {
    backgroundColor: colors.pillGreen,
  },
  goodText: {
    color: colors.surfaceDark,
    fontSize: 11,
    fontWeight: '700',
  },
  goodTextLight: {
    color: colors.approved,
    fontSize: 11,
    fontWeight: '700',
  },
  statDarkLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statDarkValue: {
    color: colors.heroCardText,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  statDarkSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  statLightLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statLightValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  statLightSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  // Schedule card
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 22,
  },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  schedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  schedBody: {
    flex: 1,
    marginRight: 10,
  },
  schedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  schedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Quick actions
  actionsScroll: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 4,
  },
  actionTile: {
    width: 78,
    alignItems: 'center',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});