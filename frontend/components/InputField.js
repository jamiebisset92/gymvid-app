// components/InputField.js
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Spacing from '../config/spacing'
import Typography from '../config/typography';

export default function InputField({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#7E7E7E"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.body.fontSize,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#F8F8F8',
    color: '#000',
  },
});
