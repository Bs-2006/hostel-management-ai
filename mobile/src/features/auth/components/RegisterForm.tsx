import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { register } from '../services/authService';
import { getErrorMessage } from '../../../services/api';
import { Role } from '../../../types';
import { isValidEmail, required } from '../../../utils/validation';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  rollNumber?: string;
  branch?: string;
  year?: string;
}

export default function RegisterForm() {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: FormErrors = {};
    if (!required(name)) next.name = 'Name is required';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (role === 'student') {
      if (!required(rollNumber)) next.rollNumber = 'Roll number is required';
      if (!required(branch)) next.branch = 'Branch is required';
      if (!required(year) || Number.isNaN(Number(year)) || Number(year) < 1) {
        next.year = 'Enter a valid year';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    const dto: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    if (role === 'student') {
      dto.rollNumber = rollNumber.trim();
      dto.branch = branch.trim();
      dto.year = Number(year);
    }
    try {
      await register(dto);
      router.replace('/login');
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Input label="Full Name" placeholder="John Doe" value={name} onChangeText={setName} error={errors.name} />
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
        placeholder="At least 6 characters"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={role} onValueChange={(v: Role) => setRole(v)} style={styles.picker}>
          <Picker.Item label="Student" value="student" />
          <Picker.Item label="Warden" value="warden" />
        </Picker>
      </View>

      {role === 'student' && (
        <>
          <Input
            label="Roll Number"
            placeholder="CS2021001"
            value={rollNumber}
            onChangeText={setRollNumber}
            error={errors.rollNumber}
          />
          <Input
            label="Branch"
            placeholder="Computer Science"
            value={branch}
            onChangeText={setBranch}
            error={errors.branch}
          />
          <Input
            label="Year"
            placeholder="2"
            keyboardType="number-pad"
            value={year}
            onChangeText={setYear}
            error={errors.year}
          />
        </>
      )}

      {!!apiError && <Text style={styles.apiError}>{apiError}</Text>}
      <Button title="Register" variant="outline" onPress={onSubmit} loading={loading} style={styles.button} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
  apiError: {
    color: colors.rejected,
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    marginTop: 4,
  },
});