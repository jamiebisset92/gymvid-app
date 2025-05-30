import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  Alert,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Dimensions
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import AuthButton from '../../components/AuthButton';
import PremiumInput from '../../components/PremiumInput';
import PremiumButton from '../../components/PremiumButton';
import AuthBackground from '../../components/AuthBackground';
import { useToast } from '../../components/ToastProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { ANIMATION_CONFIG } from '../../utils/animationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, signInWithProvider, loading } = useAuth();
  const toast = useToast();
  const { isKeyboardVisible } = useKeyboardVisibility();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideLogoDown = useRef(new Animated.Value(-height * 0.2)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideFormLeft = useRef(new Animated.Value(-width)).current;
  const fadeInDivider = useRef(new Animated.Value(0)).current;
  const slideUpGoogle = useRef(new Animated.Value(100)).current;
  const slideUpApple = useRef(new Animated.Value(150)).current;
  const fadeInFooter = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entryAnimations = () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideLogoDown.setValue(-height * 0.2);
      scaleAnim.setValue(0.8);
      slideFormLeft.setValue(-width);
      fadeInDivider.setValue(0);
      slideUpGoogle.setValue(100);
      slideUpApple.setValue(150);
      fadeInFooter.setValue(0);
      pulseAnim.setValue(0);

      // Main background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.fade.easing,
      }).start();

      // Logo drops down with bounce
      Animated.sequence([
        Animated.timing(slideLogoDown, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: ANIMATION_CONFIG.slide.easing,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Form slides in from left
      Animated.spring(slideFormLeft, {
        toValue: 0,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
        delay: 300,
      }).start();

      // Divider fades in
      Animated.timing(fadeInDivider, {
        toValue: 1,
        duration: 400,
        delay: 800,
        useNativeDriver: true,
      }).start();

      // Social buttons slide up with stagger
      Animated.stagger(150, [
        Animated.spring(slideUpGoogle, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpApple, {
          toValue: 0, 
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Footer fades in
      Animated.timing(fadeInFooter, {
        toValue: 1,
        duration: 400,
        delay: 1000,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation for signup button
      startPulseAnimation();
    };

    // Run animations when component mounts
    entryAnimations();

    // Add animation for when user navigates back to this screen
    const unsubscribe = navigation.addListener('focus', entryAnimations);
    return unsubscribe;
  }, [navigation]);

  // Create a continuous pulsing animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: ANIMATION_CONFIG.fade.easing,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
          easing: ANIMATION_CONFIG.fade.easing,
        }),
      ])
    ).start();
  };

  // Subtle shadow effect for the signup button based on pulse animation
  const shadowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      console.log('Starting signup process for email:', email);
      
      // Call the signUp function from our auth hook
      const { data, error } = await signUp(email, password);
      
      if (error) {
        const errorMessage = error.message || error.msg || 'An error occurred. Please try again.';
        
        // Handle "User already registered" case specifically
        if (errorMessage === 'User already registered' || errorMessage.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
          
          // Navigate to login screen with the email pre-filled
          setTimeout(() => {
            navigation.navigate('Login', { email });
          }, 1500);
          return;
        }
        
        // Handle other errors
        console.error('Error signing up:', errorMessage);
        toast.error(errorMessage);
        return;
      }
      
      // Log the response data for debugging
      console.log('SignUp successful with data:', JSON.stringify(data, null, 2));
      
      // Extract the user ID
      const userId = data?.user?.id;
      
      // Make sure we have a userId
      if (!userId) {
        console.error('No user ID found in signup response');
        toast.error('Account created but could not start onboarding. Please sign in manually.');
        
        // Navigate to login as fallback
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login', params: { email } }],
        });
        return;
      }
      
      // Log the userId for debugging
      console.log('Starting onboarding with userId:', userId);
      
      // Mark this as a fresh signup to prevent ProfileScreen flash
      await AsyncStorage.setItem('freshSignup', 'true');
      
      // Ensure we're not in a loading state before navigating
      setTimeout(() => {
        // Use navigation.reset to prevent going back
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Name', 
            params: { 
              userId: userId,
              email: email,
              fromSignUp: true
            }
          }],
        });
      }, 800); // Increased timeout to ensure profile creation completes
    } catch (err) {
      const errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
      
      // Handle "User already registered" case in catch block too
      if (errorMessage === 'User already registered' || errorMessage.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
        
        // Navigate to login screen with the email pre-filled
        setTimeout(() => {
          navigation.navigate('Login', { email });
        }, 1500);
        return;
      }
      
      console.error('Unexpected error during signup:', err);
      toast.error(errorMessage);
    }
  };

  const handleSocialLogin = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) {
      toast.error(error.message || 'Error signing in with ' + provider);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <AuthBackground>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <SafeAreaView style={styles.safeContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : null}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              style={styles.keyboardContainer}
            >
              <View style={styles.container}>
                {!isKeyboardVisible && (
                  <Animated.View 
                    style={[
                      styles.headerContainer,
                      {
                        transform: [
                          { translateY: slideLogoDown },
                          { scale: scaleAnim }
                        ]
                      }
                    ]}
                  >
                    <Image
                      source={require('../../assets/images/logo.png')}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </Animated.View>
                )}

                <Animated.Text 
                  style={[
                    styles.subtitle,
                    { 
                      marginTop: isKeyboardVisible ? 20 : -20,
                      marginBottom: isKeyboardVisible ? 35 : 20,
                      opacity: fadeAnim
                    }
                  ]}
                >
                  Create your account
                </Animated.Text>

                <Animated.View 
                  style={[
                    styles.formContainer,
                    {
                      transform: [{ translateX: slideFormLeft }]
                    }
                  ]}
                >
                  <PremiumInput
                    icon="mail-outline"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    returnKeyType="next"
                  />

                  <PremiumInput
                    icon="lock-closed-outline"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="next"
                    textContentType="newPassword"
                    autoComplete="new-password"
                    autoCorrect={false}
                    spellCheck={false}
                    passwordRules=""
                    importantForAutofill="no"
                  />

                  <PremiumInput
                    icon="shield-checkmark-outline"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    autoCorrect={false}
                    spellCheck={false}
                    passwordRules=""
                    importantForAutofill="no"
                  />

                  <Animated.View style={[
                    styles.bottomButtonContainer,
                    {
                      shadowOpacity,
                      shadowColor: colors.primary,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: shadowOpacity.interpolate({
                        inputRange: [0.2, 0.5],
                        outputRange: [3, 6]
                      })
                    }
                  ]}>
                    <PremiumButton 
                      title="Sign Up"
                      iconName="arrow-forward"
                      onPress={handleSignUp}
                      disabled={loading}
                      loading={loading}
                      loadingText="Creating Account..."
                      style={styles.signUpButton}
                    />
                  </Animated.View>
                </Animated.View>

                {!isKeyboardVisible && (
                  <>
                    <Animated.View style={[styles.divider, { opacity: fadeInDivider }]}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </Animated.View>

                    <View style={styles.socialContainer}>
                      <Animated.View style={{ transform: [{ translateY: slideUpGoogle }] }}>
                        <AuthButton
                          title="Continue with Google"
                          onPress={() => handleSocialLogin('google')}
                          variant="social-google"
                          icon="logo-google"
                        />
                      </Animated.View>
                      
                      <Animated.View style={{ transform: [{ translateY: slideUpApple }] }}>
                        <AuthButton
                          title="Continue with Apple"
                          onPress={() => handleSocialLogin('apple')}
                          variant="social-apple"
                          icon="logo-apple"
                        />
                      </Animated.View>
                    </View>
                  </>
                )}

                <Animated.View style={[styles.footerContainer, { opacity: fadeInFooter }]}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <PremiumButton
                    title="Sign In"
                    variant="text"
                    onPress={handleSignIn}
                    style={styles.signInButton}
                  />
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </Animated.View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 0,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -30,
  },
  logo: {
    width: 200,
    height: 200, 
    marginBottom: -50,
  },
  logoSmall: {
    width: 120,
    height: 120,
    marginBottom: -30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.2,
  },
  formContainer: {
    width: '100%',
    marginBottom: 16,
  },
  signUpButton: {
    marginTop: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  dividerText: {
    marginHorizontal: 10,
    color: colors.gray,
    fontWeight: '500',
  },
  socialContainer: {
    marginBottom: 24,
    marginTop: 16,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    color: colors.darkGray,
    fontSize: 16,
  },
  signInButton: {
    marginVertical: 0,
    height: 32,
  },
  bottomButtonContainer: {
    marginTop: 10,
  },
}); 