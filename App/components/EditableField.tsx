import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/constants/theme';

const c = Colors.light;

type EditableFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  editable?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'multiline' | 'maxLength' | 'editable'>;

export function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  multiline,
  maxLength,
  showCharCount,
  editable = true,
  ...rest
}: EditableFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {editable ? (
        <>
          <TextInput
            style={[
              styles.input,
              multiline && styles.inputMultiline,
              error && styles.inputError,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={c.subtitle}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            maxLength={maxLength}
            {...rest}
          />
          {showCharCount && maxLength != null && (
            <Text style={styles.charCount}>
              {value.length}/{maxLength}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.readOnly}>{value || '—'}</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: c.heading,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.inputBackground,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: c.error,
  },
  readOnly: {
    fontSize: 16,
    color: c.text,
    paddingVertical: 10,
  },
  charCount: {
    fontSize: 12,
    color: c.subtitle,
    marginTop: 4,
    textAlign: 'right',
  },
  error: {
    fontSize: 12,
    color: c.error,
    marginTop: 4,
  },
});
