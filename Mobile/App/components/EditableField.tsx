import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(224, 222, 222)',
  accent: 'rgb(205, 88, 56)',
  white: '#FFFFFF',
  background: 'rgb(128, 128, 128)',
  error: '#B91C1C',
  placeholder: 'rgb(102, 102, 101)',
};

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
            placeholderTextColor={theme.placeholder}
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
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.primary,
    backgroundColor: theme.white,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.error,
  },
  readOnly: {
    fontSize: 16,
    color: theme.primary,
    paddingVertical: 10,
  },
  charCount: {
    fontSize: 12,
    color: theme.placeholder,
    marginTop: 4,
    textAlign: 'right',
  },
  error: {
    fontSize: 12,
    color: theme.error,
    marginTop: 4,
  },
});
