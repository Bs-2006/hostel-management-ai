import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import OutingForm from '../components/OutingForm';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function CreateOutingScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>New Outing Request</Text>
      <OutingForm onSuccess={() => router.back()} />
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
});