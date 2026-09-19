import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../constants/colors';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'dark' | 'success' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: object;
  small?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  small = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'dark' && styles.dark,
        variant === 'outline' && styles.outline,
        variant === 'success' && styles.success,
        (pressed || inactive) && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#000000' : variant === 'outline' ? '#FFFFFF' : '#fff'} />
      ) : (
        <Text style={[styles.text, small && styles.textSmall, variant === 'secondary' && styles.textSecondary, variant === 'outline' && styles.textOutline]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    small: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: '#000000',
    },
    outline: {
      backgroundColor: '#000000',
      borderWidth: 1,
      borderColor: '#000000',
    },
    danger: {
      backgroundColor: colors.danger,
    },
    dark: {
      backgroundColor: colors.surfaceDark,
    },
    success: {
      backgroundColor: colors.approved,
    },
    pressed: {
      opacity: 0.6,
    },
    text: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    textSmall: {
      fontSize: 13,
    },
    textSecondary: {
      color: '#000000',
    },
    textOutline: {
      color: '#FFFFFF',
    },
  });