import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '../config/colors'
import Spacing from '../config/spacing'
import Typography from '../config/typography'

export default function ButtonPrimary({ title, onPress, style, textStyle }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, style]}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.darkGray,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  text: {
    color: Colors.white,
    ...Typography.button,
  },
});
