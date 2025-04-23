import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Keyboard,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { supabase } from '../config/supabase'
import Spacing from '../config/spacing'
import Typography from '../config/typography'
import Colors from '../config/colors'
import ButtonPrimary from '../components/ButtonPrimary'

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else {
      setError('')
      Alert.alert('Account Created', 'Please check your email to confirm your account.')
      navigation.navigate('Login')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create an Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
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

          <ButtonPrimary title="Sign Up" onPress={handleSignUp} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? Log in</Text>
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
