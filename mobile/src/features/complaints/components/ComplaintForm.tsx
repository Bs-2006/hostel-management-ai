import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAppDispatch } from '../../../store/hooks';
import { createComplaintThunk } from '../complaintSlice';
import { getErrorMessage } from '../../../services/api';
import { required } from '../../../utils/validation';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

interface ComplaintFormProps {
  onSuccess?: () => void;
}

export default function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const next: { title?: string; description?: string } = {};
    if (!required(title)) next.title = 'Title is required';
    if (!required(description)) next.description = 'Description is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      await dispatch(createComplaintThunk({ title: title.trim(), description: description.trim() })).unwrap();
      setSubmitting(false);
      Alert.alert('Submitted', 'Your complaint has been submitted.');
      onSuccess?.();
    } catch (err) {
      setApiError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <View>
      <Input
        label="Title"
        placeholder="e.g. Water problem"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
      />
      <Input
        label="Description"
        placeholder="Describe the issue in detail..."
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        numberOfLines={4}
        style={styles.multiline}
      />
      {!!apiError && <Text style={styles.apiError}>{apiError}</Text>}
      <Button title="Submit Complaint" variant="dark" onPress={onSubmit} loading={submitting} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  apiError: {
    color: colors.rejected,
    fontSize: 13,
    marginBottom: 10,
  },
});