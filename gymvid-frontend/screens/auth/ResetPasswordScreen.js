import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  SafeAreaView, 
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Easing
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import PremiumInput from '../../components/PremiumInput';
import PremiumButton from '../../components/PremiumButton';
import AuthBackground from '../../components/AuthBackground';
import { useToast } from '../../components/ToastProvider';
import { 
  createAnimationValues, 
  runEntranceAnimations, 
  resetAnimations, 
  runExitAnimations,
  TOAST_STYLES,
  ANIMATION_CONFIG
} from '../../utils/animationUtils';

const { width, height } = Dimensions.get('window');

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const { resetPassword, loading } = useAuth();
  const toast = useToast();
  const [isExiting, setIsExiting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start hidden for smooth entrance
  const titleSlideAnim = useRef(new Animated.Value(-50)).current; // Start off-screen
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current; // Start transparent
  const formScaleAnim = useRef(new Animated.Value(0.9)).current; // Start slightly smaller
  const formTranslateAnim = useRef(new Animated.Value(30)).current; // Start slightly below
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const backButtonSlideAnim = useRef(new Animated.Value(-width/2)).current; // Start off-screen
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation has started flag
  const hasAnimatedRef = useRef(false);

  // Particles animation for success effect
  const particles = useRef(Array(20).fill().map(() => ({
    position: new Animated.ValueXY({ x: 0, y: 0 }),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    color: Math.random() > 0.5 ? colors.primary : '#5DB5FF',
    rotation: new Animated.Value(0)
  }))).current;

  // Handle back button navigation with animation  
  useEffect(() => {
    const handleBackPress = (e) => {
      if (isExiting) return;
      
      // Prevent default navigation
      e.preventDefault();
      
      // Perform custom animation and navigation
      handleBackToLogin();
    };

    // Add listener for hardware back button/gesture
    const unsubscribe = navigation.addListener('beforeRemove', handleBackPress);
    return unsubscribe;
  }, [navigation, isExiting]);

  useEffect(() => {
    // Entrance animations - immediately run on mount for smooth transition
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      runEntranceAnimation();
    }

    // Add a focus listener for coming back to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Only run if we've already animated once (returning to screen)
      if (hasAnimatedRef.current) {
        // Reset exiting state
        setIsExiting(false);
        // Rerun animations with shorter duration for re-focus
        runEntranceAnimation(true);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  const runEntranceAnimation = (isRefocus = false) => {
    // Use different timing for initial vs refocus animations
    const timing = {
      fade: isRefocus ? 250 : 400,
      title: isRefocus ? 300 : 450,
      subtitle: isRefocus ? 250 : 400,
      form: isRefocus ? 300 : 450,
      back: isRefocus ? 200 : 350,
      delay: {
        fade: isRefocus ? 0 : 50,
        title: isRefocus ? 50 : 100,
        subtitle: isRefocus ? 100 : 200,
        form: isRefocus ? 100 : 250,
        back: isRefocus ? 150 : 300
      }
    };

    // Reset animations if returning to screen
    if (isRefocus) {
      fadeAnim.setValue(0.5);
      titleSlideAnim.setValue(-30);
      subtitleFadeAnim.setValue(0);
      formScaleAnim.setValue(0.95);
      formTranslateAnim.setValue(20);
      backButtonSlideAnim.setValue(-width/3);
    }

    // Orchestrate smooth entrance animations
    
    // 1. Main fade in (quick to establish screen)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: timing.fade,
      useNativeDriver: true,
      easing: ANIMATION_CONFIG.fade.easing,
      delay: timing.delay.fade,
    }).start();

    // 2. Title slides down with bounce effect
    Animated.spring(titleSlideAnim, {
      toValue: 0,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
      delay: timing.delay.title,
    }).start();

    // 3. Subtitle fades in 
    Animated.timing(subtitleFadeAnim, {
      toValue: 1,
      duration: timing.subtitle,
      useNativeDriver: true,
      easing: ANIMATION_CONFIG.fade.easing,
      delay: timing.delay.subtitle,
    }).start();

    // 4. Form slides up and scales with polish
    Animated.parallel([
      Animated.timing(formTranslateAnim, {
        toValue: 0,
        duration: timing.form,
        useNativeDriver: true,
        easing: Easing.bezier(0.17, 0.67, 0.37, 0.99),
        delay: timing.delay.form,
      }),
      Animated.spring(formScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
        delay: timing.delay.form + 50,
      })
    ]).start();

    // 5. Back button slides in last
    Animated.spring(backButtonSlideAnim, {
      toValue: 0,
      friction: 6,
      tension: 40,
      delay: timing.delay.back,
      useNativeDriver: true,
    }).start();

    // Start button pulse animation
    startButtonPulse();
  };

  // Continuous pulse animation for the button
  const startButtonPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Glowing effect for input when focused
  const handleInputFocus = (focused) => {
    Animated.timing(inputFocusAnim, {
      toValue: focused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Function to trigger the celebration animation
  const playCelebrationAnimation = () => {
    // Animate each particle
    particles.forEach((particle, i) => {
      // Random direction and distance
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 150;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Reset particle
      particle.position.setValue({ x: 0, y: 0 });
      particle.scale.setValue(0);
      particle.opacity.setValue(0);
      particle.rotation.setValue(0);

      // Animation sequence for each particle with staggered delay
      Animated.sequence([
        Animated.delay(i * 20), // Staggered start
        Animated.parallel([
          // Expand and fade in
          Animated.timing(particle.scale, {
            toValue: 0.5 + Math.random() * 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0.6 + Math.random() * 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
          // Fly outward
          Animated.timing(particle.position, {
            toValue: { x, y },
            duration: 1000 + Math.random() * 500,
            easing: Easing.bezier(0.1, 0.25, 0.1, 1),
            useNativeDriver: true,
          }),
          // Rotate
          Animated.timing(particle.rotation, {
            toValue: Math.random() > 0.5 ? 1 : -1,
            duration: 1000 + Math.random() * 500,
            useNativeDriver: true,
          }),
          // Fade out towards the end
          Animated.sequence([
            Animated.delay(700),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    const { error } = await resetPassword(email);
    
    if (error) {
      // Map technical errors to user-friendly messages
      let errorMessage = 'Failed to send reset instructions';
      
      // Check for specific error messages and provide user-friendly alternatives
      if (error.message) {
        if (error.message.includes('valid email') || error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address';
        } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
          errorMessage = 'Email not found. Please check and try again';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection';
        }
      }
      
      toast.error(errorMessage);
    } else {
      // Play confetti celebration animation
      playCelebrationAnimation();
      
      // Show success message
      toast.success('Check your email for password reset instructions');
      
      // Return to login after a brief delay to let the user see the animation
      setTimeout(() => {
        // Animate out before navigating
        handleExitAnimation(() => {
          navigation.navigate('Login');
        });
      }, 2500);
    }
  };

  // Simple exit animation that's less likely to cause issues
  const handleExitAnimation = (callback) => {
    // Mark as exiting to prevent multiple navigation attempts
    setIsExiting(true);
    
    // Coordinated exit animations
    Animated.parallel([
      // Fade out the entire screen
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      // Slightly scale down form
      Animated.timing(formScaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handleBackToLogin = () => {
    if (isExiting) return;
    
    // Animate out before navigating
    handleExitAnimation(() => {
      navigation.navigate('Login');
    });
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const shadowColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 0, 0, 0.1)', `rgba(${parseInt(colors.primary.slice(1, 3), 16)}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.25)`]
  });

  return (
    <AuthBackground>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.safeContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardContainer}
          >
            <Animated.View 
              style={[
                styles.container, 
                { 
                  opacity: fadeAnim,
                }
              ]}
            >
              <Animated.Text
                style={[
                  styles.title,
                  { transform: [{ translateY: titleSlideAnim }] }
                ]}
              >
                Reset Password
              </Animated.Text>
              
              <Animated.Text
                style={[
                  styles.subtitle,
                  { 
                    opacity: subtitleFadeAnim,
                    marginBottom: 30
                  }
                ]}
              >
                Enter your email address and we'll send you instructions to reset your password.
              </Animated.Text>
              
              <Animated.View 
                style={[
                  styles.formContainer,
                  {
                    transform: [
                      { translateY: formTranslateAnim },
                      { scale: formScaleAnim }
                    ]
                  }
                ]}
              >
                <Animated.View
                  style={[
                    styles.inputContainer,
                    {
                      shadowColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 0.3]
                      }),
                      shadowRadius: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 8]
                      }),
                      elevation: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 4]
                      })
                    }
                  ]}
                >
                  <PremiumInput
                    icon="mail-outline"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                    onFocus={() => handleInputFocus(true)}
                    onBlur={() => handleInputFocus(false)}
                  />
                </Animated.View>

                <Animated.View 
                  style={[
                    styles.buttonWrapper,
                    { transform: [{ scale: buttonPulseAnim }] }
                  ]}
                >
                  <PremiumButton 
                    title="Send Reset Instructions"
                    iconName="send-outline"
                    onPress={handleResetPassword}
                    disabled={loading || isExiting}
                    loading={loading}
                    loadingText="Sending..."
                    style={styles.resetButton}
                  />
                </Animated.View>

                <Animated.View style={{ transform: [{ translateX: backButtonSlideAnim }] }}>
                  <PremiumButton
                    title="Back to Login"
                    variant="text"
                    iconName="arrow-back-outline"
                    iconPosition="left"
                    onPress={handleBackToLogin}
                    disabled={isExiting}
                    style={styles.backButton}
                  />
                </Animated.View>
              </Animated.View>

              {/* Particle container */}
              <View style={styles.particlesContainer}>
                {particles.map((particle, index) => {
                  // Create rotation for particle
                  const rotate = particle.rotation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-360deg', '360deg']
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.particle,
                        {
                          backgroundColor: particle.color,
                          transform: [
                            { translateX: particle.position.x },
                            { translateY: particle.position.y },
                            { scale: particle.scale },
                            { rotate: rotate }
                          ],
                          opacity: particle.opacity
                        }
                      ]}
                    />
                  );
                })}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  resetButton: {
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 24,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none', // Don't interfere with touch
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
}); 