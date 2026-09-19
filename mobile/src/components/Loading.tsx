import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../constants/colors';

export default function Loading() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
  });