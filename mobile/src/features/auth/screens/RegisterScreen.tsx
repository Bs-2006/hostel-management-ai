import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import RegisterForm from '../components/RegisterForm';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function RegisterScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the hostel portal</Text>
        </View>
        <RegisterForm />
        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 6,
  },
  link: {
    marginTop: 20,
    alignSelf: 'center',
  },
  linkText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});