import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import colors from '../config/colors';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, signInWithProvider, loading } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const { data, error } = await signUp(email, password);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Check your email for the confirmation link!',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  const handleSocialLogin = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignIn = async () => {
    console.log('Sign In button pressed');
    try {
      const { user, session, error } = await supabase.auth.signIn({ email, password });
      if (error) {
        console.log('Sign in error:', error);
        Alert.alert('Sign in error', error.message);
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
          <Text style={styles.subtitle}>Sign up to get started</Text>
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
          <AuthInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            icon="shield-checkmark-outline"
          />

          <AuthButton
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            icon="person-add"
          />
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
          <Text style={styles.footerText}>Already have an account? </Text>
          <AuthButton
            title="Sign In"
            onPress={handleSignIn}
            variant="text"
            style={styles.signInButton}
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
    marginBottom: -65,
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
  signInButton: {
    marginVertical: 0,
    padding: 10,
  },
}); 