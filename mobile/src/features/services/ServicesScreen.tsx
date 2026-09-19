import React from 'react';
import {
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
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

interface ServiceTile {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  roles: Array<'student' | 'warden'>;
}

const SERVICES: ServiceTile[] = [
  { title: 'Attendance', subtitle: 'Mark & view', icon: 'checkbox-outline', href: '/attendance', roles: ['student', 'warden'] },
  { title: 'Outings', subtitle: 'Request & track', icon: 'walk-outline', href: '/outings', roles: ['student', 'warden'] },
  { title: 'Complaints', subtitle: 'Submit issues', icon: 'megaphone-outline', href: '/complaints', roles: ['student', 'warden'] },
  { title: 'Mess Menu', subtitle: 'Weekly meal plan', icon: 'restaurant-outline', href: '/food-menu', roles: ['student', 'warden'] },
  { title: 'Rooms', subtitle: 'Hostel blocks', icon: 'bed-outline', href: '/rooms', roles: ['student', 'warden'] },
  { title: 'Students', subtitle: 'All residents', icon: 'people-outline', href: '/students', roles: ['warden'] },
  { title: 'AI Assistant', subtitle: 'Ask anything', icon: 'sparkles-outline', href: '/chat', roles: ['student', 'warden'] },
];

function initialsOf(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function ServicesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = React.useState('');

  const visible = SERVICES.filter((s) => user?.role && s.roles.includes(user.role));
  const filtered = query.trim()
    ? visible.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(query.toLowerCase()),
      )
    : visible;

  const isStudent = user?.role === 'student';
  const name = user?.name ?? '';
  const firstName = name.split(' ')[0] || 'there';

  const goto = (href: string) => {
    setQuery('');
    router.push(href as never);
  };

  const renderService = (item: ServiceTile) => (
    <Pressable
      key={item.title}
      onPress={() => goto(item.href)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.tileIcon, { backgroundColor: '#FFFFFF' }]}>
        <Ionicons
          name={item.icon}
          size={22}
          color="#000000"
        />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.tileSubtitle} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(name)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.hi}>Hostel</Text>
              <Text style={styles.headerName} numberOfLines={1}>
                Services
              </Text>
            </View>
          </View>
          <Text style={styles.hero}>Everything your{'\n'}hostel offers, {firstName}</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 2 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services…"
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
            <View style={styles.grid}>
              {filtered.map((s) => renderService(s))}
              {filtered.length === 0 && (
                <Text style={styles.empty}>No services match "{query}"</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Services grid */}
            <Text style={styles.sectionTitle}>Explore Services</Text>
            <View style={styles.grid}>{visible.map((s) => renderService(s))}</View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    pressed: { opacity: 0.75 },

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
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    hero: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.muted,
      lineHeight: 21,
      textAlign: 'right',
      marginLeft: 10,
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

    // Info cards
    infoScroll: {
      gap: 12,
      paddingRight: 8,
      paddingBottom: 8,
      marginBottom: 20,
    },
    infoCard: {
      width: 200,
      borderRadius: 20,
      padding: 16,
      minHeight: 132,
      justifyContent: 'flex-end',
    },
    infoDark: {
      backgroundColor: colors.heroCardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoLight: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 10,
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
    infoDarkLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 8,
    },
    infoDarkValue: {
      color: colors.heroCardText,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 2,
    },
    infoLightLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 8,
    },
    infoLightValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 2,
    },

    // Section
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    empty: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 8,
    },

    // Services grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tile: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      width: '48%',
      marginBottom: 12,
    },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    tileTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    tileSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
  });
