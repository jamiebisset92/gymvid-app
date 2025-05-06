import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';

const BIOMETRIC_KEY = 'BIOMETRIC_ENABLED';
const CREDENTIALS_KEY = 'USER_CREDENTIALS';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricPreference();
  }, []);

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setBiometricSupported(compatible);
  };

  const loadBiometricPreference = async () => {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    setBiometricEnabled(enabled === 'true');
  };

  const toggleBiometric = async () => {
    const newState = !biometricEnabled;
    await SecureStore.setItemAsync(BIOMETRIC_KEY, String(newState));
    setBiometricEnabled(newState);
  };

  const saveCredentials = async (email, password) => {
    if (rememberMe) {
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
    } else {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    }
  };

  const loadSavedCredentials = async () => {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return credentials ? JSON.parse(credentials) : null;
  };

  const signIn = async (email, password, useBiometric = false) => {
    try {
      setLoading(true);

      if (useBiometric && biometricEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to sign in',
          fallbackLabel: 'Use password instead',
        });

        if (!result.success) {
          throw new Error('Biometric authentication failed');
        }

        const savedCreds = await loadSavedCredentials();
        if (savedCreds) {
          email = savedCreds.email;
          password = savedCreds.password;
        }
      }

      const { user, session, error } = await supabase.auth.signIn({
        email,
        password,
      });

      if (error) throw error;

      if (rememberMe) {
        await saveCredentials(email, password);
      }

      return { user, session, error: null };
    } catch (error) {
      return { user: null, session: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'gymvid://',
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    if (password.length < 6) {
      return { data: null, error: new Error('Password must be at least 6 characters long') };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'gymvid://reset-password',
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    signInWithProvider,
    loading,
    biometricSupported,
    biometricEnabled,
    toggleBiometric,
    rememberMe,
    setRememberMe,
  };
}; 