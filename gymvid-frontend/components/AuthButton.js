import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import GoogleIcon from './GoogleIcon';

export default function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // primary, secondary, social-google, social-apple, text
  icon,
  style,
  textStyle,
}) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'social-google':
        return styles.googleButton;
      case 'social-apple':
        return styles.appleButton;
      case 'text':
        return styles.textButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButtonText;
      case 'social-google':
        return styles.socialButtonText;
      case 'social-apple':
        return styles.appleButtonText;
      case 'text':
        return styles.textButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  const getIconColor = () => {
    if (textStyle?.color) {
      return textStyle.color;
    }
    switch (variant) {
      case 'secondary':
        return colors.primary;
      case 'social-google':
        return '#DB4437';
      case 'social-apple':
        return '#000';
      case 'text':
        return colors.primary;
      default:
        return colors.white;
    }
  };

  const renderIcon = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.white} />
        </View>
      );
    }
    
    if (!icon) return null;

    if (variant === 'social-google') {
      return (
        <View style={styles.iconContainer}>
          <GoogleIcon size={20} />
        </View>
      );
    }

    return (
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={24}
          color={getIconColor()}
        />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        (loading || disabled) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {renderIcon()}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  googleButton: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textButton: {
    backgroundColor: 'transparent',
    padding: 0,
    marginVertical: 0,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
  socialButtonText: {
    color: '#757575',
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
  appleButtonText: {
    color: '#757575',
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    width: 24,
    height: 24,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 