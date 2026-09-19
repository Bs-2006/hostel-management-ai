import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { login } from '../services/authService';
import { getErrorMessage } from '../../../services/api';
import { isValidEmail, required } from '../../../utils/validation';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

export default function LoginForm() {
  const styles = useThemedStyles(createStyles);
  const { login: setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    if (!required(password)) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await login(email.trim(), password);
      await setSession(res.token, res.user);
      router.replace('/chat');
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Input
        label="Email"
        placeholder="you@hostel.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <Input
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      {!!apiError && <Text style={styles.apiError}>{apiError}</Text>}
      <Button title="Login" variant="outline" onPress={onSubmit} loading={loading} style={styles.button} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  apiError: {
    color: colors.rejected,
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    marginTop: 4,
  },
});