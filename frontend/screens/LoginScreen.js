import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '../config/supabase'
import Spacing from '../config/spacing'
import Typography from '../config/typography'
import Colors from '../config/colors'
import ButtonPrimary from '../components/ButtonPrimary'

export default function LoginScreen({ navigation, setSession }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      console.log("Login attempt with:", email);
      console.log("Login response:", data);
      console.log("Login error:", error);

      if (error) {
        setError(error.message);
        return;
      }

      if (!data?.session) {
        setError('No session returned from login');
        return;
      }

      // Clear any previous errors on successful login
      setError('');
      setEmail('');
      setPassword('');

      // Explicitly update the session
      setSession(data.session);
      
    } catch (e) {
      console.error("Login error:", e);
      setError('An unexpected error occurred');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Log In</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit
            onChangeText={setEmail}
            value={email}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit
            onChangeText={setPassword}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ButtonPrimary title="Log In" onPress={handleLogin} />

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.link}>Don’t have an account? Sign up</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: '#fff',
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#F8F8F8',
    color: '#000',
    fontFamily: 'DMSans-Regular',
  },
  error: {
    color: 'red',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  link: {
    marginTop: Spacing.md,
    color: Colors.primary,
    textAlign: 'center',
    fontFamily: 'DMSans-Medium',
  },
})
