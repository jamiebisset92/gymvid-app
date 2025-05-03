import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import colors from '../config/colors';

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const { resetPassword, loading } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const { error } = await resetPassword(email);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Check your email for password reset instructions',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <AuthInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            icon="mail-outline"
          />

          <AuthButton
            title="Send Reset Instructions"
            onPress={handleResetPassword}
            loading={loading}
            icon="send"
          />

          <View style={styles.backButtonContainer}>
            <AuthButton
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              variant="text"
              icon="arrow-back-outline"
              style={styles.backButton}
              textStyle={styles.backButtonText}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    color: colors.darkGray,
    fontFamily: 'DMSans-Black',
    textAlign: 'center',
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 20,
  },
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    padding: 0,
  },
  backButtonText: {
    color: colors.gray,
  },
}); 