import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppDispatch } from '../../../store/hooks';
import { createOutingThunk } from '../outingSlice';
import { getErrorMessage } from '../../../services/api';
import { isValidDateYMD, required } from '../../../utils/validation';
import { todayYMD } from '../../../utils/formatDate';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { ThemeColors } from '../../../constants/colors';

// Validates a 12-hour time like "09:00" or "9:00" (hour 1-12, minute 0-59).
function isValidTime12(value: string): boolean {
  const m = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return false;
  const h = Number(m[1]);
  return h >= 1 && h <= 12;
}

// Converts a 12-hour time + AM/PM into 24-hour "HH:MM".
function to24Hour(value: string, period: 'AM' | 'PM'): string {
  const m = value.trim().match(/^(\d{1,2}):([0-5]\d)$/)!;
  let h = Number(m[1]) % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: 'AM' | 'PM';
  onChange: (p: 'AM' | 'PM') => void;
}) {
  const styles = useThemedStyles(createStyles);
  const renderBtn = (value: 'AM' | 'PM') => {
    const active = period === value;
    return (
      <Pressable
        onPress={() => onChange(value)}
        style={[styles.periodBtn, active && styles.periodBtnActive]}
      >
        <Text style={[styles.periodText, active && styles.periodTextActive]}>{value}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.periodGroup}>
      {renderBtn('AM')}
      {renderBtn('PM')}
    </View>
  );
}

interface FormErrors {
  destination?: string;
  reason?: string;
  outingDate?: string;
  outTime?: string;
  inTime?: string;
}

interface OutingFormProps {
  onSuccess?: () => void;
}

export default function OutingForm({ onSuccess }: OutingFormProps) {
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [outingDate, setOutingDate] = useState(todayYMD());
  const [outTime, setOutTime] = useState('');
  const [inTime, setInTime] = useState('');
  const [outPeriod, setOutPeriod] = useState<'AM' | 'PM'>('AM');
  const [inPeriod, setInPeriod] = useState<'AM' | 'PM'>('AM');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: FormErrors = {};
    if (!required(destination)) next.destination = 'Destination is required';
    if (!required(reason)) next.reason = 'Reason is required';
    if (!isValidDateYMD(outingDate)) next.outingDate = 'Use YYYY-MM-DD format';
    if (!isValidTime12(outTime)) next.outTime = 'Use HH:MM (12-hour), e.g. 09:00';
    if (!isValidTime12(inTime)) next.inTime = 'Use HH:MM (12-hour), e.g. 18:00';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await dispatch(
        createOutingThunk({
          destination: destination.trim(),
          reason: reason.trim(),
          outingDate,
          outTime: to24Hour(outTime, outPeriod),
          inTime: to24Hour(inTime, inPeriod),
        }),
      ).unwrap();
      setSubmitting(false);
      onSuccess?.();
      return true;
    } catch (err) {
      setApiError(getErrorMessage(err));
      setSubmitting(false);
      return false;
    }
  };

  return (
    <View>
      <Input
        label="Destination"
        placeholder="Chennai Central Mall"
        value={destination}
        onChangeText={setDestination}
        error={errors.destination}
      />
      <Input
        label="Reason"
        placeholder="Family visit"
        value={reason}
        onChangeText={setReason}
        error={errors.reason}
      />
      <Input
        label="Outing Date (YYYY-MM-DD)"
        placeholder="2026-08-30"
        value={outingDate}
        onChangeText={setOutingDate}
        error={errors.outingDate}
      />
      <View style={styles.timeField}>
        <Text style={styles.timeLabel}>Out Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInputWrap}>
            <Input
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              value={outTime}
              onChangeText={setOutTime}
              error={errors.outTime}
            />
          </View>
          <PeriodToggle period={outPeriod} onChange={setOutPeriod} />
        </View>
      </View>
      <View style={styles.timeField}>
        <Text style={styles.timeLabel}>Expected In Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInputWrap}>
            <Input
              placeholder="08:30"
              keyboardType="numbers-and-punctuation"
              value={inTime}
              onChangeText={setInTime}
              error={errors.inTime}
            />
          </View>
          <PeriodToggle period={inPeriod} onChange={setInPeriod} />
        </View>
      </View>
      {!!apiError && <Text style={styles.apiError}>{apiError}</Text>}
      <Button title="Submit Request" variant="dark" onPress={onSubmit} loading={submitting} />
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
  timeField: {
    marginBottom: 14,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeInputWrap: {
    flex: 1,
    marginRight: 10,
  },
  periodGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodBtnActive: {
    backgroundColor: colors.surfaceDark,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  periodTextActive: {
    color: '#fff',
  },
});