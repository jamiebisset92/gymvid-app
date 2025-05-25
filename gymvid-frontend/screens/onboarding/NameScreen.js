import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, Keyboard, Animated, Easing, Dimensions, Image } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[NAME]', ...args);
  }
};

export default function NameScreen({ navigation, route }) {
  
  try {
    const [name, setName] = useState('');
    const { updateProfile, loading } = useAuth();
    
    // Get the userId and email passed from SignUpScreen
    const userId = route.params?.userId;
    const userEmail = route.params?.email;
    
    // State for reveal animation
    const [isRevealed, setIsRevealed] = useState(false);
    
    // Log parameters immediately when component mounts
    useEffect(() => {
      console.log('📱 NameScreen initial render with userId:', userId);
      
      if (!userId) {
        console.warn('⚠️ NO USER ID PROVIDED TO NAMESCREEN');
      }
    }, []);
    
    // Get progress context
    const { updateProgress, setProgress } = useContext(ProgressContext);
    
    // Animations for original content
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const titleAnim = useRef(new Animated.Value(20)).current;
    const inputAnim = useRef(new Animated.Value(0)).current;
    
    // Animations for welcome screen
    const welcomeFadeAnim = useRef(new Animated.Value(0)).current;
    const welcomeTitleAnim = useRef(new Animated.Value(0)).current;
    const welcomeLogoAnim = useRef(new Animated.Value(0)).current;
    const welcomeSubtitleAnim = useRef(new Animated.Value(0)).current;
    const welcomeArrowAnim = useRef(new Animated.Value(0)).current;
    const arrowBounceAnim = useRef(new Animated.Value(0)).current;
    const getStartedButtonAnim = useRef(new Animated.Value(0)).current;
    const getStartedButtonScale = useRef(new Animated.Value(0.5)).current;
    const getStartedButtonPulse = useRef(new Animated.Value(1)).current;
    const contentRevealAnim = useRef(new Animated.Value(0)).current;
    const welcomeContentFadeOut = useRef(new Animated.Value(1)).current;
    
    const isFocused = useIsFocused();
    const inputRef = useRef(null);

    // Update progress tracking and bar visibility when screen focus or reveal state changes
    useEffect(() => {
      console.log('📱 NameScreen Focus/Reveal Effect: isFocused:', isFocused, 'isRevealed:', isRevealed);
      if (isFocused) {
        if (!isRevealed) {
          // Pre-reveal: Explicitly hide the progress bar by setting isOnboarding to false.
          // Keep currentScreen as 'Name' so context knows where we are logically.
          console.log('📱 NameScreen PRE-REVEAL: Hiding progress bar.');
          setProgress(prev => ({ 
            ...prev, 
            isOnboarding: false, 
            currentScreen: 'Name' 
          }));
        } else {
          // Post-reveal: Show progress bar immediately when revealed
          console.log('📱 NameScreen POST-REVEAL: Showing progress bar.');
          // Call updateProgress immediately without timeout
          updateProgress('Name');
        }
      }
    }, [isFocused, isRevealed, updateProgress, setProgress]); // setProgress is needed here

    // Run entrance animation logic (this effect mainly handles visual animations)
    useEffect(() => {
      let timer;
      if (isFocused) {
        // Reset animation values for entrance
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        titleAnim.setValue(20);
        inputAnim.setValue(0);
        welcomeFadeAnim.setValue(0);
        welcomeTitleAnim.setValue(0);
        welcomeLogoAnim.setValue(0);
        welcomeSubtitleAnim.setValue(0);
        welcomeArrowAnim.setValue(0);
        getStartedButtonAnim.setValue(0);
        getStartedButtonScale.setValue(0.5);
        contentRevealAnim.setValue(0);
        welcomeContentFadeOut.setValue(1);
        // isRevealed state is NOT reset here. It's controlled by its initial state and handleGetStarted.
        
        if (!isRevealed) {
            console.log('📱 NameScreen Entrance: Animating WELCOME part.');
            // timer = setTimeout(() => { ... welcome animations ... }, 100) // Full animation block here
            timer = setTimeout(() => {
            Animated.sequence([
                Animated.timing(welcomeFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                Animated.parallel([
                Animated.timing(welcomeTitleAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
                Animated.sequence([
                    Animated.delay(150),
                    Animated.timing(welcomeLogoAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
                ]),
                Animated.sequence([
                    Animated.delay(300),
                    Animated.timing(welcomeSubtitleAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
                ]),
                Animated.sequence([
                    Animated.delay(450), 
                    Animated.timing(welcomeArrowAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) })
                ]),
                Animated.sequence([
                    Animated.delay(600),
                    Animated.parallel([
                    Animated.timing(getStartedButtonAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
                    Animated.sequence([
                        Animated.spring(getStartedButtonScale, { toValue: 1.1, from: 0.5, tension: 100, friction: 8, useNativeDriver: true }),
                        Animated.spring(getStartedButtonScale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true })
                    ])
                    ])
                ])
                ])
            ]).start(() => {
                if (!isRevealed) { 
                  Animated.loop(Animated.sequence([ Animated.timing(getStartedButtonPulse, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }), Animated.timing(getStartedButtonPulse, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }) ])).start();
                  Animated.loop(Animated.sequence([ Animated.timing(arrowBounceAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }), Animated.timing(arrowBounceAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }) ])).start();
                }
            });
            }, 100);
        } else {
            // If screen is focused and already revealed, ensure form elements are instantly visible.
            console.log('📱 NameScreen Entrance: Form ALREADY REVEALED. Setting visuals.');
            welcomeFadeAnim.setValue(0); 
            welcomeContentFadeOut.setValue(0);
            contentRevealAnim.setValue(1); 
            titleAnim.setValue(0); 
            slideAnim.setValue(0); 
            inputAnim.setValue(1); 
        }
      }
      
      return () => {
        clearTimeout(timer);
        // Stop all animations 
        fadeAnim.stopAnimation(); slideAnim.stopAnimation(); titleAnim.stopAnimation(); inputAnim.stopAnimation();
        welcomeFadeAnim.stopAnimation(); welcomeTitleAnim.stopAnimation(); welcomeLogoAnim.stopAnimation();
        welcomeSubtitleAnim.stopAnimation(); welcomeArrowAnim.stopAnimation(); arrowBounceAnim.stopAnimation();
        getStartedButtonAnim.stopAnimation(); getStartedButtonScale.stopAnimation(); getStartedButtonPulse.stopAnimation();
        contentRevealAnim.stopAnimation(); welcomeContentFadeOut.stopAnimation();
      };
    }, [isFocused, isRevealed]); 
    
    // Load existing name when the screen is focused
    useEffect(() => {
      const loadUserName = async () => {
        try {
          debugLog('📱 Loading user name for userId:', userId);
          let userIdToUse = userId;
          
          if (!userIdToUse) {
            debugLog('📱 No userId from params, checking current session');
            const user = supabase.auth.user();
            if (user && user.id) {
              userIdToUse = user.id;
              debugLog('📱 Found userId from session:', userIdToUse);
            } else {
              debugLog('📱 No current user session, cannot load name.');
              return;
            }
          }
          
          const { data: profile, error } = await supabase
            .from('users')
            .select('name')
            .eq('id', userIdToUse)
            .maybeSingle(); // Changed to maybeSingle()

          if (error) {
            console.warn('📱 Error loading profile in NameScreen:', error.message);
            return;
          }

          if (profile && profile.name) {
            debugLog('📱 Loaded existing name:', profile.name);
            setName(profile.name);
          } else {
            debugLog('📱 No existing name found for user (profile null or no name).');
          }
        } catch (err) {
          console.error('📱 Unexpected error in loadUserName (NameScreen):', err);
        }
      };

      if (isFocused) {
        loadUserName();
      }
    }, [userId, isFocused]);

    // Handle Get Started button press
    const handleGetStarted = () => {
      if (isRevealed) return;
      
      getStartedButtonPulse.stopAnimation();
      arrowBounceAnim.stopAnimation();
      
      // Fade out welcome screen
      Animated.parallel([
        Animated.timing(getStartedButtonScale, { 
          toValue: 0.8, 
          duration: 150, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic) 
        }),
        Animated.timing(getStartedButtonAnim, { 
          toValue: 0, 
          duration: 300, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic) 
        }),
        Animated.timing(welcomeContentFadeOut, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.out(Easing.cubic) 
        }),
        Animated.timing(welcomeFadeAnim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.out(Easing.cubic) 
        })
      ]).start(() => {
        // Set isRevealed to true - this will trigger the progress bar to show
        setIsRevealed(true); 
        
        // Reset animation values for the form
        contentRevealAnim.setValue(0); 
        titleAnim.setValue(30); 
        slideAnim.setValue(50); 
        inputAnim.setValue(0);  

        // Animate in form elements with improved timing
        Animated.parallel([
          // Container fades in
          Animated.timing(contentRevealAnim, { 
            toValue: 1, 
            duration: 600, 
            useNativeDriver: true, 
            easing: Easing.out(Easing.cubic)
          }),
          // Title slides up and fades in
          Animated.sequence([
            Animated.delay(100),
            Animated.timing(titleAnim, { 
              toValue: 0, 
              duration: 700, 
              useNativeDriver: true, 
              easing: Easing.out(Easing.cubic)
            })
          ]),
          // Input container slides in from right
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(slideAnim, { 
              toValue: 0, 
              duration: 700, 
              useNativeDriver: true, 
              easing: Easing.out(Easing.cubic)
            })
          ]),
          // Input fades in
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(inputAnim, { 
              toValue: 1, 
              duration: 600, 
              useNativeDriver: true, 
              easing: Easing.out(Easing.cubic)
            })
          ])
        ]).start(() => {
          // Focus input after all animations complete
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 100);
        });
      });
    };

    // Handle Get Started button animations
    const handleGetStartedButtonPressIn = () => {
      if (!isRevealed) {
        Animated.spring(getStartedButtonScale, {
          toValue: 0.92,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    };

    const handleGetStartedButtonPressOut = () => {
      if (!isRevealed) {
        Animated.spring(getStartedButtonScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }
    };

    const handleNameChange = (text) => {
      setName(text);
    };

    const handleContinue = async () => {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      
      // Close keyboard if open
      Keyboard.dismiss();
      
      // Update database first - before any animations
      console.log('📱 Updating user profile with name:', name);
      console.log('📱 Using userId:', userId);
      
      let error = null;
      try {
        // Always try direct database update first if we have userId
        if (userId) {
          console.log('📱 Using direct database update with userId:', userId);
          const { error: directError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              name: name.trim(),
              email: userEmail,
              onboarding_complete: false
            });
            
          if (directError) {
            console.error('📱 Error in direct update:', directError);
            error = directError;
          } else {
            console.log('📱 Name saved successfully via direct update');
          }
        } else {
          // Fallback to updateProfile if we don't have userId
          console.log('📱 No userId available, trying updateProfile method');
          const result = await updateProfile({
            name: name.trim(),
            onboarding_complete: false
          });
          
          error = result?.error;
        }
      } catch (err) {
        console.error('📱 Error in update operation:', err);
        error = err;
      }
      
      if (error) {
        console.error('📱 Error updating profile:', error);
        Alert.alert('Error', error.message || 'Could not save your name. Please try again.');
        return;
      }
      
      // Let the next screen handle its own progress update
      
      // Completely fade out this screen before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
        easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
        useNativeDriver: true
      }).start(() => {
        // Only navigate after animation is complete and screen is no longer visible
        console.log('📱 Profile updated, navigating to Gender screen with userId:', userId);
        
        // Pass all relevant data to the next screen
        navigation.navigate('Gender', { 
          userId,
          email: userEmail,
          fromSignUp: route.params?.fromSignUp
        });
      });
    };

    // Handle back button press
    const handleBack = () => {
      // Since Name is the first screen, we can simply go to Login if back is pressed
      console.log('📱 Going back to Login from Name screen');
      
      // Fade out completely before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
        easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
        useNativeDriver: true
      }).start(() => {
        navigation.navigate('Login');
      });
    };

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeContainer}>
          {/* Header spacer - to account for the global progress bar */}
          <View style={styles.header} />
          
          {/* Welcome screen content - conditionally rendered or animated out */}
          {!isRevealed && (
            <Animated.View
              style={[
                styles.welcomeContainer,
                {
                  opacity: welcomeFadeAnim,
                }
              ]}
            >
              <Animated.View style={styles.welcomeContent}>
                <Animated.Text
                  style={[
                    styles.welcomeTitle,
                    {
                      opacity: welcomeTitleAnim,
                      transform: [
                        {
                          translateY: welcomeTitleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          })
                        },
                        {
                          scale: welcomeTitleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.9, 1.05, 1],
                          })
                        }
                      ]
                    }
                  ]}
                >
                  Welcome to
                </Animated.Text>
                
                <Animated.Image
                  source={require('../../assets/images/logo.png')}
                  style={[
                    styles.logoImage,
                    {
                      opacity: welcomeLogoAnim,
                      transform: [
                        {
                          scale: welcomeLogoAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.8, 1.1, 1],
                          })
                        },
                        {
                          translateY: welcomeLogoAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          })
                        }
                      ]
                    }
                  ]}
                  resizeMode="contain"
                />
                
                <Animated.Text
                  style={[
                    styles.welcomeSubtitle,
                    {
                      opacity: welcomeSubtitleAnim,
                      transform: [
                        {
                          translateY: welcomeSubtitleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          })
                        }
                      ]
                    }
                  ]}
                >
                  Help us get to know you!
                </Animated.Text>

                {/* Animated Arrow */}
                <Animated.View
                  style={[
                    styles.arrowContainer,
                    {
                      opacity: welcomeArrowAnim,
                      transform: [
                        {
                          translateY: welcomeArrowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0], // Initial slide up
                          })
                        },
                        {
                          translateY: arrowBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 8], // Bounces 8px up and down
                          })
                        },
                        {
                          scale: welcomeArrowAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.5, 1.1, 1], // Initial scale in
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <Ionicons name="arrow-down" size={32} color={colors.primary} />
                </Animated.View>

              </Animated.View>
              
              {/* Get Started button */}
              <Animated.View
                style={[
                  styles.getStartedButtonContainer,
                  {
                    opacity: getStartedButtonAnim,
                    transform: [
                      {
                        scale: Animated.multiply(getStartedButtonScale, getStartedButtonPulse)
                      },
                      {
                        translateY: getStartedButtonAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        })
                      }
                    ],
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleGetStarted}
                  onPressIn={handleGetStartedButtonPressIn}
                  onPressOut={handleGetStartedButtonPressOut}
                  activeOpacity={0.9}
                  disabled={isRevealed}
                >
                  <LinearGradient
                    colors={['#0099FF', '#0066DD', '#0044BB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.getStartedGradient}
                  >
                    <Text style={styles.getStartedButtonText}>Get Started</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
          
          {/* Original content that reveals after Get Started is pressed */}
          {isRevealed && (
            <Animated.View
              style={[
                styles.contentContainer, 
                {
                  opacity: contentRevealAnim,
                }
              ]}
            >
              <Animated.Text
                style={[
                  styles.titleText,
                  { 
                    opacity: inputAnim,
                    transform: [{ translateY: titleAnim }] 
                  }
                ]}
              >
                What's your name?
              </Animated.Text>
              <Animated.View 
                style={{ 
                  width: '100%', 
                  transform: [{ translateX: slideAnim }],
                  opacity: inputAnim
                }}
              >
                <View style={styles.formContainer}>
                  <Animated.View 
                    style={{ 
                      opacity: inputAnim
                    }}
                  >
                    <View style={styles.nameInputContainer}>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          ref={inputRef}
                          style={styles.nameInput}
                          value={name}
                          onChangeText={handleNameChange}
                          placeholder="Enter your name"
                          placeholderTextColor="#AAAAAA"
                          autoCapitalize="words"
                          autoCorrect={false}
                          textAlign="center"
                          returnKeyType="done"
                          onSubmitEditing={handleContinue}
                        />
                        <TouchableOpacity 
                          style={styles.nextButton}
                          onPress={handleContinue}
                          disabled={loading || !name.trim()}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="arrow-forward" 
                            size={24} 
                            color={!name.trim() ? colors.lightGray : colors.primary} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.nameHelper}>
                      This is how we'll address you in the app
                    </Text>
                  </Animated.View>
                </View>
              </Animated.View>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    );
  } catch (error) {
    // Error boundary to prevent the app from crashing
    console.error("📱 ERROR rendering NameScreen:", error);
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Something went wrong. Please try again.</Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10, backgroundColor: colors.primary, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeContainer: {
    flex: 1,
  },
  header: {
    height: 60, // Reverted to original value
    paddingTop: 15, // Reverted to original value
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40, // Reverted to original value
    paddingBottom: 20,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
  },
  nameInputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.darkGray,
    flex: 1,
    marginHorizontal: 24, // Add padding on both sides to account for button width
  },
  nameHelper: {
    marginTop: 15,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  nextButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
  welcomeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 36 * 1.2,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
  },
  logoImage: {
    width: 200 * 1.2,
    height: 60 * 1.2,
    marginBottom: 24,
  },
  welcomeSubtitle: {
    fontSize: 22.5,
    fontWeight: '400',
    textAlign: 'center',
    color: '#505050',
    opacity: 0.9,
    letterSpacing: -0.2,
    marginBottom: 20,
  },
  arrowContainer: {
    padding: 8,
    marginBottom: 20,
  },
  getStartedButtonContainer: {
    marginTop: 0,
  },
  getStartedButton: {
    borderRadius: 50,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  getStartedGradient: {
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
}); 