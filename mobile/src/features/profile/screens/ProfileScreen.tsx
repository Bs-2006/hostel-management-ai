import React, { useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { loadProfile } from '../profileSlice';
import Loading from '../../../components/Loading';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

function InfoRow({ label, value }: { label: string; value?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, destructive && styles.actionIconDanger]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : '#000000'} />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, destructive && styles.actionTitleDanger]}>{title}</Text>
        {!!subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
      </View>
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.border} />}
    </TouchableOpacity>
  );
}

const soon = (title: string) =>
  Alert.alert(title, 'This feature is coming soon.');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const { student, loading } = useAppSelector((state) => state.profile);

  useEffect(() => {
    if (user?.student) dispatch(loadProfile(user.student.id));
  }, [dispatch, user?.student]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading && !student) return <Loading />;

  const displayName = user?.name ?? 'Admin';
  const isWarden = user?.role === 'warden';

  const branch = student?.branch ?? '';
  const year = student?.year;
  const rollNumber = student?.rollNumber ?? '';
  const roomLabel = student?.room
    ? `${student.room.block} · Room ${student.room.roomNumber}`
    : 'Not assigned';

  const qrData = JSON.stringify({
    name: displayName,
    role: isWarden ? 'Warden' : 'Student',
    email: user?.email ?? '',
    ...(isWarden
      ? {}
      : {
          rollNumber,
          branch,
          year: year ?? '',
          room: roomLabel,
          status: 'ACTIVE',
        }),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your account & settings</Text>
      </View>

      {/* ── Avatar ── */}
      <View style={styles.heroSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {displayName
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <Text style={styles.heroName}>{displayName.toUpperCase()}</Text>
        {isWarden ? (
          <Text style={styles.heroMeta}>Warden</Text>
        ) : (
          <Text style={styles.heroMeta}>
            {branch || '—'}
            {year ? ` · Year ${year}` : ''}
          </Text>
        )}
        {!isWarden && <Text style={styles.heroRoom}>{roomLabel}</Text>}
      </View>

      {/* ── Hostel ID (QR) ── */}
      <Text style={styles.sectionTitle}>Hostel ID</Text>
      <SectionCard style={styles.qrCard}>
        <QRCode value={qrData} size={140} backgroundColor="#ffffff" color="#111111" />
        <Text style={styles.qrHint}>Scan this code to verify your hostel ID</Text>
      </SectionCard>

      {/* ── Details ── */}
      <Text style={styles.sectionTitle}>Account Details</Text>
      <SectionCard>
        <InfoRow label="Email" value={user?.email} />
        <View style={styles.divider} />
        <InfoRow label="Role" value={isWarden ? 'Warden' : 'Student'} />
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
      </SectionCard>

      {!isWarden && (
        <>
          <Text style={styles.sectionTitle}>Hostel</Text>
          <SectionCard>
            <ActionRow icon="person-outline" title="Warden Details" subtitle="Watchman & contact" onPress={() => soon('Warden Details')} />
            <View style={styles.divider} />
            <ActionRow icon="person-circle-outline" title="Guardian Information" subtitle="Parent & emergency contact" onPress={() => soon('Guardian Information')} />
            <View style={styles.divider} />
            <ActionRow icon="exit-outline" title="Leave Hostel" subtitle="Request to vacate" onPress={() => soon('Leave Hostel')} />
          </SectionCard>
        </>
      )}

      {/* ── Settings ── */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <SectionCard>
        <ActionRow icon="options-outline" title="Customize Dashboard" subtitle="Reorder quick actions" onPress={() => soon('Customize Dashboard')} />
        <View style={styles.divider} />
        <View style={styles.actionRow}>
          <View style={styles.actionIcon}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={'#000000'} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Theme</Text>
            <Text style={styles.actionSubtitle}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.divider} />
        <ActionRow icon="notifications-outline" title="Notifications" subtitle="Outing & complaint alerts" onPress={() => soon('Notifications')} />
      </SectionCard>

      {/* ── Legal ── */}
      <Text style={styles.sectionTitle}>Legal</Text>
      <SectionCard>
        <ActionRow icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => soon('Privacy Policy')} />
        <View style={styles.divider} />
        <ActionRow icon="document-text-outline" title="Terms & Conditions" onPress={() => soon('Terms & Conditions')} />
      </SectionCard>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color="#000000" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
  content: { padding: 20 },

  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },

  heroSection: { alignItems: 'center', marginBottom: 20 },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.textLight },
  heroName: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  heroMeta: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 4 },
  heroRoom: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },

  qrCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  qrHint: { fontSize: 12, color: colors.muted, marginTop: 12 },

  divider: { height: 1, backgroundColor: colors.border },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: colors.muted },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    paddingLeft: 12,
  },
  activeBadge: {
    backgroundColor: colors.pillGreen,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  activeText: { fontSize: 11, fontWeight: '700', color: colors.approved, letterSpacing: 0.5 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconDanger: {
    backgroundColor: colors.pillRed,
  },
  actionText: { flex: 1, marginRight: 6 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  actionTitleDanger: { color: colors.danger },
  actionSubtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 6,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#000000' },
});