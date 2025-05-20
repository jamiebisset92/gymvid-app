import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Dimensions,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import AuthButton from '../../components/AuthButton';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import PremiumInput from '../../components/PremiumInput';
import PremiumButton from '../../components/PremiumButton';
import AuthBackground from '../../components/AuthBackground';
import { useToast } from '../../components/ToastProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { 
  createAnimationValues, 
  runWorldClassEntranceAnimation,
  resetAnimations,
  ANIMATION_CONFIG
} from '../../utils/animationUtils';

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Wrap PremiumInput to support refs
const ForwardedPremiumInput = forwardRef((props, ref) => (
  <PremiumInput {...props} ref={ref} />
));

export default function LoginScreen({ navigation, setSession, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [contentLayout, setContentLayout] = useState({
    headerVisible: true,
    headerHeight: 150,
    formHeight: 0,
    footerVisible: true
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Refs for input fields and form container
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const formContainerRef = useRef(null);
  
  const { 
    signIn, 
    signInWithProvider,
    loading, 
    biometricSupported,
    biometricEnabled,
    rememberMe,
    setRememberMe
  } = useAuth();
  const toast = useToast();
  const { isKeyboardVisible, keyboardHeight } = useKeyboardVisibility();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideInLogo = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideUpForm = useRef(new Animated.Value(50)).current;
  const slideSocialLeft = useRef(new Animated.Value(-width)).current;
  const slideSocialRight = useRef(new Animated.Value(width)).current;
  const fadeInFooter = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Maintain stable layout when keyboard appears
  useEffect(() => {
    // Use a gentle layout animation for hiding/showing elements
    const animationConfig = LayoutAnimation.create(
      300,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity
    );
    
    if (isKeyboardVisible) {
      LayoutAnimation.configureNext(animationConfig);
      setContentLayout({
        ...contentLayout,
        headerVisible: false,
        footerVisible: false
      });
    } else {
      LayoutAnimation.configureNext(animationConfig);
      setContentLayout({
        ...contentLayout,
        headerVisible: true,
        footerVisible: true
      });
    }
  }, [isKeyboardVisible]);

  useEffect(() => {
    const entryAnimations = () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideInLogo.setValue(-100);
      scaleAnim.setValue(0.9);
      slideUpForm.setValue(50);
      slideSocialLeft.setValue(-width);
      slideSocialRight.setValue(width);
      fadeInFooter.setValue(0);
      rotateAnim.setValue(0);

      // Main background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.fade.easing,
      }).start();

      // Logo animation with slight bounce
      Animated.sequence([
        Animated.timing(slideInLogo, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: ANIMATION_CONFIG.slide.easing,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

      // Form slides up
      Animated.timing(slideUpForm, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.slide.easing,
      }).start();

      // 3D rotate animation for logo
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.fade.easing,
      }).start();

      // Social buttons slide in from opposite sides
      Animated.stagger(100, [
        Animated.spring(slideSocialLeft, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(slideSocialRight, {
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
        delay: 600,
        useNativeDriver: true,
      }).start();
    };

    // Run animations when the component mounts
    entryAnimations();

    // Add animation for when user navigates back to this screen
    const unsubscribe = navigation.addListener('focus', entryAnimations);
    return unsubscribe;
  }, [navigation]);

  // Calculate rotation for 3D effect on logo
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleLogin = async (useBiometric = false) => {
    console.log('Login button pressed', { email, password, useBiometric });
    if (!useBiometric && (!email || !password)) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoggingIn(true);
      const result = await signIn(email, password, useBiometric);
      console.log('signIn result:', result);

      if (result?.error) {
        let errorMsg = typeof result.error === 'string' ? result.error : (result.error && result.error.message) ? result.error.message : 'An error occurred. Please try again.';
        if (errorMsg === 'Invalid login credentials') {
          toast.error('Incorrect password. Reset it by tapping "Forgot Password"');
        } else {
          toast.error(errorMsg);
        }
      } else if (result?.session) {
        // Show success toast before session change
        toast.success('Login successful!');
        
        // Use a timeout to ensure session update happens after animation completes
        setTimeout(() => {
          // Set the session
          setSession(result.session);
        }, 300);
      } else {
        toast.error('Unknown error occurred');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) {
      toast.error(error.message || 'Error signing in with ' + provider);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ResetPassword');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Handle smooth transition between inputs
  const handleEmailSubmit = () => {
    // Focus password input without changing keyboard state
    passwordInputRef.current?.focus();
  };

  // Check if there's a message from onboarding completion
  useEffect(() => {
    if (route.params?.message) {
      // Display message from completed onboarding
      setTimeout(() => {
        toast.success(route.params.message);
      }, 500);
    }
    
    // Pre-fill email if provided from completed onboarding
    if (route.params?.email && email !== route.params.email) {
      setEmail(route.params.email);
      
      // Focus password field if we already have email
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 1000);
    }
  }, [route.params]);

  return (
    <AuthBackground>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <SafeAreaView style={styles.safeContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
              style={styles.keyboardContainer}
            >
              <View style={styles.container}>
                {/* Header with logo - constant size container even when not visible */}
                <View 
                  style={[
                    styles.headerContainer,
                    { height: contentLayout.headerVisible ? 150 : 0 }
                  ]}
                >
                  {contentLayout.headerVisible && (
                    <Animated.Image
                      source={require('../../assets/images/logo.png')}
                      style={[
                        styles.logo,
                        {
                          transform: [
                            { translateY: slideInLogo },
                            { scale: scaleAnim },
                            { rotateY: spin }
                          ]
                        }
                      ]}
                      resizeMode="contain"
                    />
                  )}
                </View>

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
                  Sign in to continue
                </Animated.Text>

                <Animated.View 
                  ref={formContainerRef}
                  style={[
                    styles.formContainer,
                    {
                      transform: [{ translateY: slideUpForm }],
                      opacity: fadeAnim
                    }
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <ForwardedPremiumInput
                      ref={emailInputRef}
                      icon="mail-outline"
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={handleEmailSubmit}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <ForwardedPremiumInput
                      ref={passwordInputRef}
                      icon="lock-closed-outline"
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={() => handleLogin(false)}
                    />
                  </View>

                  <View style={styles.optionsContainer}>
                    <View style={styles.rememberMeContainer}>
                      <Switch
                        value={rememberMe}
                        onValueChange={setRememberMe}
                        trackColor={{ false: colors.lightGray, true: colors.primary }}
                      />
                      <Text style={styles.rememberMeText}>Remember me</Text>
                    </View>
                    <PremiumButton
                      title="Forgot Password?"
                      variant="text"
                      onPress={handleForgotPassword}
                      style={styles.forgotButton}
                    />
                  </View>

                  <PremiumButton 
                    title="Sign In"
                    iconName="log-in-outline"
                    onPress={() => handleLogin(false)}
                    loading={loading || isLoggingIn}
                    disabled={loading || isLoggingIn}
                    loadingText="Signing in..."
                    style={styles.signInButton}
                  />

                  {biometricSupported && biometricEnabled && (
                    <PremiumButton
                      title="Sign In with Biometrics"
                      iconName="finger-print"
                      iconPosition="left"
                      variant="secondary"
                      onPress={() => handleLogin(true)}
                      disabled={loading || isLoggingIn}
                      style={styles.biometricButton}
                    />
                  )}
                </Animated.View>

                {/* Divider and social buttons - only shown when keyboard is not visible */}
                {contentLayout.footerVisible && (
                  <>
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialContainer}>
                      <Animated.View style={{ transform: [{ translateX: slideSocialLeft }] }}>
                        <AuthButton
                          title="Continue with Google"
                          onPress={() => handleSocialLogin('google')}
                          variant="social-google"
                          icon="logo-google"
                        />
                      </Animated.View>
                      
                      <Animated.View style={{ transform: [{ translateX: slideSocialRight }] }}>
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

                {/* Footer - only shown when keyboard is not visible */}
                {contentLayout.footerVisible && (
                  <Animated.View 
                    style={[
                      styles.footerContainer,
                      { opacity: fadeInFooter }
                    ]}
                  >
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <PremiumButton
                      title="Sign Up"
                      variant="text"
                      onPress={handleSignUp}
                      style={styles.signUpButton}
                    />
                  </Animated.View>
                )}
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
    overflow: 'hidden',
    // Height is set dynamically
  },
  logo: {
    width: 200,
    height: 200, 
    marginBottom: -50,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    width: '100%',
    height: 68, // Fixed height to prevent layout shifts
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    color: colors.darkGray,
    fontSize: 14,
  },
  forgotButton: {
    height: 32,
    marginVertical: 0,
  },
  signInButton: {
    marginTop: 10,
  },
  biometricButton: {
    marginTop: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightGray,
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
  signUpButton: {
    marginVertical: 0,
    height: 32,
  },
}); 