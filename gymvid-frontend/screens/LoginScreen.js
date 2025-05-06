import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import colors from '../config/colors';

export default function LoginScreen({ navigation, setSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { 
    signIn, 
    signInWithProvider,
    loading, 
    biometricSupported,
    biometricEnabled,
    rememberMe,
    setRememberMe,
    signUp,
  } = useAuth();

  const handleLogin = async (useBiometric = false) => {
    console.log('Login button pressed', { email, password, useBiometric });
    if (!useBiometric && (!email || !password)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await signIn(email, password, useBiometric);
    console.log('signIn result:', result);

    if (result?.error) {
      Alert.alert('Error', result.error.message);
    } else if (result?.session) {
      setSession(result.session);
    } else {
      Alert.alert('Error', 'Unknown error occurred');
    }
  };

  const handleSocialLogin = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignIn = async () => {
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.log('Sign in error:', error);
        Alert.alert('Sign in error', error.message);
      } else {
        // Optionally navigate or show success
        console.log('Sign in successful');
      }
    } catch (error) {
      console.log('Sign in error:', error);
      Alert.alert('Sign in error', error.message);
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
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <AuthInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            icon="mail-outline"
          />
          
          <AuthInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          <View style={styles.optionsContainer}>
            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>
            <AuthButton
              title="Forgot Password?"
              onPress={() => navigation.navigate('ResetPassword')}
              variant="text"
              style={styles.forgotButton}
            />
          </View>

          <AuthButton
            title="Sign In"
            onPress={() => handleLogin(false)}
            loading={loading}
            icon="enter"
          />

          {biometricSupported && biometricEnabled && (
            <AuthButton
              title="Sign In with Biometrics"
              onPress={() => handleLogin(true)}
              loading={loading}
              icon="finger-print"
              variant="secondary"
            />
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <AuthButton
            title="Continue with Google"
            onPress={() => handleSocialLogin('google')}
            variant="social-google"
            icon="logo-google"
          />
          <AuthButton
            title="Continue with Apple"
            onPress={() => handleSocialLogin('apple')}
            variant="social-apple"
            icon="logo-apple"
          />
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <AuthButton
            title="Sign Up"
            onPress={() => navigation.navigate('SignUp')}
            variant="text"
            style={styles.signUpButton}
          />
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
    marginBottom: 10,
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
    marginBottom: -55,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  formContainer: {
    marginBottom: 0,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    color: colors.darkGray,
    fontFamily: 'DMSans-Regular',
  },
  forgotButton: {
    marginVertical: 0,
    padding: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightGray,
  },
  dividerText: {
    marginHorizontal: 10,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
  },
  socialContainer: {
    marginBottom: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.darkGray,
    fontFamily: 'DMSans-Regular',
  },
  signUpButton: {
    marginVertical: 0,
    padding: 0,
  },
}); 