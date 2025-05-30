import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Animated, Easing, Dimensions } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function GenderScreen({ navigation, route }) {
  debugLog('GenderScreen rendering...');
  
  const [gender, setGender] = useState('');
  const [userName, setUserName] = useState('');
  const { updateProfile, loading } = useAuth();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // State for reveal animation
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('GenderScreen - Received params:', route.params);
    if (userId) {
      debugLog('GenderScreen - Got userId:', userId);
    } else {
      console.warn('GenderScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animations for original content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  
  // Button animations
  const maleScale = useRef(new Animated.Value(1)).current;
  const femaleScale = useRef(new Animated.Value(1)).current;
  const maleOpacity = useRef(new Animated.Value(0)).current;
  const femaleOpacity = useRef(new Animated.Value(0)).current;
  
  // Animations for pre-reveal screen
  const welcomeFadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeNameAnim = useRef(new Animated.Value(0)).current;
  const welcomeSubtitleAnim = useRef(new Animated.Value(0)).current;
  const line1Anim = useRef(new Animated.Value(0)).current;
  const line2Anim = useRef(new Animated.Value(0)).current;
  const line3Anim = useRef(new Animated.Value(0)).current;
  const line4Anim = useRef(new Animated.Value(0)).current;
  const helpTextAnim = useRef(new Animated.Value(0)).current;
  const letsDoItButtonAnim = useRef(new Animated.Value(0)).current;
  const letsDoItButtonScale = useRef(new Animated.Value(0.5)).current;
  const letsDoItButtonPulse = useRef(new Animated.Value(1)).current;
  const contentRevealAnim = useRef(new Animated.Value(0)).current;
  const welcomeContentFadeOut = useRef(new Animated.Value(1)).current;
  const trophyBounceAnim = useRef(new Animated.Value(0)).current;
  
  const isFocused = useIsFocused();

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      if (!isRevealed) {
        // Pre-reveal: Hide progress bar
        debugLog('GenderScreen PRE-REVEAL: Hiding progress bar.');
        setProgress(prev => ({ 
          ...prev, 
          isOnboarding: false, 
          currentScreen: 'Gender' 
        }));
      } else {
        // Post-reveal: Show progress bar
        debugLog('GenderScreen POST-REVEAL: Showing progress bar.');
        console.log('👫 GenderScreen: Current progress before update:', progress);
        setProgress(prev => ({ 
          ...prev, 
          isOnboarding: true, 
          currentScreen: 'Gender' 
        }));
        updateProgress('Gender');
        console.log('👫 GenderScreen: Called updateProgress with Gender');
      }
    }
  }, [isFocused, isRevealed, updateProgress, setProgress]);

  // Load user's name when component mounts
  useEffect(() => {
    const loadUserName = async () => {
      try {
        let userIdToUse = userId;
        
        if (!userIdToUse) {
          const user = supabase.auth.user();
          if (user) {
            userIdToUse = user.id;
          }
        }
        
        if (!userIdToUse) {
          debugLog('No user ID available for fetching name');
          return;
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', userIdToUse)
          .maybeSingle();

        if (!error && profile && profile.name) {
          debugLog('Loaded user name:', profile.name);
          setUserName(profile.name);
        }
      } catch (err) {
        console.error('Error loading user name:', err);
      }
    };

    loadUserName();
  }, [userId]);

  // Run entrance animation only after navigator transition is complete
  useEffect(() => {
    let timer;
    if (isFocused) {
      debugLog('GenderScreen focused, isRevealed:', isRevealed);
      
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      maleOpacity.setValue(0);
      femaleOpacity.setValue(0);
      welcomeFadeAnim.setValue(0);
      welcomeNameAnim.setValue(0);
      welcomeSubtitleAnim.setValue(0);
      line1Anim.setValue(0);
      line2Anim.setValue(0);
      line3Anim.setValue(0);
      line4Anim.setValue(0);
      helpTextAnim.setValue(0);
      letsDoItButtonAnim.setValue(0);
      letsDoItButtonScale.setValue(0.5);
      contentRevealAnim.setValue(0);
      welcomeContentFadeOut.setValue(1);
      
      // Ensure screen is visible immediately
      fadeAnim.setValue(1);
      
      if (!isRevealed) {
        debugLog('GenderScreen Entrance: Animating WELCOME part.');
      timer = setTimeout(() => {
          // Phase 1: Quick header appearance
          Animated.sequence([
            Animated.timing(welcomeFadeAnim, { 
              toValue: 1, 
              duration: 400, 
              useNativeDriver: true, 
              easing: Easing.out(Easing.quad) 
            }),
            // Phase 2: Header (name) loads quickly
            Animated.timing(welcomeNameAnim, { 
              toValue: 1, 
              duration: 600, 
              useNativeDriver: true, 
              easing: Easing.out(Easing.cubic) 
            }),
            // Phase 3: Subtitle and blue text follow shortly after
            Animated.parallel([
              Animated.timing(welcomeSubtitleAnim, { 
                toValue: 1, 
                duration: 500, 
                useNativeDriver: true, 
                easing: Easing.out(Easing.cubic) 
              }),
              Animated.sequence([
                Animated.delay(200),
                Animated.timing(line1Anim, { 
                  toValue: 1, 
                  duration: 500, 
                  useNativeDriver: true, 
                  easing: Easing.out(Easing.cubic) 
                })
              ])
            ]),
            // Phase 4: Cards load slowly one at a time with longer delays
            Animated.sequence([
              Animated.delay(400),
              Animated.timing(line2Anim, { 
                toValue: 1, 
                duration: 600, 
                useNativeDriver: true, 
                easing: Easing.out(Easing.cubic) 
              }),
              Animated.delay(500),
              Animated.timing(line3Anim, { 
                toValue: 1, 
                duration: 600, 
                useNativeDriver: true, 
                easing: Easing.out(Easing.cubic) 
              }),
              Animated.delay(500),
              Animated.timing(line4Anim, { 
                toValue: 1, 
                duration: 600, 
                useNativeDriver: true, 
                easing: Easing.out(Easing.cubic) 
              }),
              // Phase 5: Help text and button animation last
              Animated.delay(600),
              Animated.parallel([
                Animated.timing(helpTextAnim, { 
                  toValue: 1, 
                  duration: 500, 
                  useNativeDriver: true, 
                  easing: Easing.out(Easing.cubic) 
                }),
                Animated.timing(letsDoItButtonAnim, { 
                  toValue: 1, 
                  duration: 500, 
                  useNativeDriver: true, 
                  easing: Easing.out(Easing.cubic) 
                }),
                Animated.sequence([
                  Animated.spring(letsDoItButtonScale, { 
                    toValue: 1.05, 
                    from: 0.5, 
                    tension: 100, 
                    friction: 8, 
                    useNativeDriver: true 
                  }),
                  Animated.spring(letsDoItButtonScale, { 
                    toValue: 1, 
                    tension: 80, 
                    friction: 10, 
                    useNativeDriver: true 
                  })
                ])
              ])
            ])
          ]).start(() => {
            if (!isRevealed) { 
              // Start pulse animation for button
              Animated.loop(
                Animated.sequence([
                  Animated.timing(letsDoItButtonPulse, { 
                    toValue: 1.05, 
                    duration: 1000, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.sin) 
                  }), 
                  Animated.timing(letsDoItButtonPulse, { 
                    toValue: 1, 
                    duration: 1000, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.sin) 
                  })
                ])
              ).start();
              
              // Start trophy bounce animation
              Animated.loop(
                Animated.sequence([
                  Animated.timing(trophyBounceAnim, { 
                    toValue: 1, 
                    duration: 800, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.sin) 
                  }), 
                  Animated.timing(trophyBounceAnim, { 
                    toValue: 0, 
                    duration: 800, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.sin) 
                  })
                ])
              ).start();
            }
        });
      }, 100);
      } else {
        // If screen is focused and already revealed, ensure form elements are instantly visible
        debugLog('GenderScreen Entrance: Form ALREADY REVEALED. Setting visuals.');
        fadeAnim.setValue(1); // Make sure main container is visible
        welcomeFadeAnim.setValue(0); 
        welcomeContentFadeOut.setValue(0);
        contentRevealAnim.setValue(1); 
        titleAnim.setValue(0); 
        slideAnim.setValue(0); 
        maleOpacity.setValue(1);
        femaleOpacity.setValue(1);
      }
    }
    
    // Cleanup function - very important!
    return () => {
      clearTimeout(timer);
      // Reset animations when component unmounts
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      titleAnim.stopAnimation();
      maleOpacity.stopAnimation();
      femaleOpacity.stopAnimation();
      welcomeFadeAnim.stopAnimation();
      welcomeNameAnim.stopAnimation();
      welcomeSubtitleAnim.stopAnimation();
      line1Anim.stopAnimation();
      line2Anim.stopAnimation();
      line3Anim.stopAnimation();
      line4Anim.stopAnimation();
      helpTextAnim.stopAnimation();
      letsDoItButtonAnim.stopAnimation();
      letsDoItButtonScale.stopAnimation();
      letsDoItButtonPulse.stopAnimation();
      contentRevealAnim.stopAnimation();
      welcomeContentFadeOut.stopAnimation();
      trophyBounceAnim.stopAnimation();
    };
  }, [isFocused, isRevealed]);

  // Animation for button selection
  const animateButton = (isSelected, animatedValue) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Load existing gender when the screen is focused
  useEffect(() => {
    const loadUserGender = async () => {
      try {
        // First try to get user from route params (from signup flow)
        let userIdToUse = userId;
        
        // If not available, try to get from auth
        if (!userIdToUse) {
          const user = supabase.auth.user();
          if (user) {
            userIdToUse = user.id;
          }
        }
        
        if (!userIdToUse) {
          console.log('No user ID available for fetching profile');
          return;
        }

        // Try to fetch existing profile using available ID
        const { data: profile, error } = await supabase
          .from('users')
          .select('gender')
          .eq('id', userIdToUse)
          .maybeSingle();

        // If we have a gender, set it in the state
        if (!error && profile && profile.gender) {
          // Clean up gender value if needed
          const cleanGender = profile.gender.replace(/['"\\]/g, '').trim();
          if (['Male', 'Female'].includes(cleanGender)) {
            debugLog('Loaded existing gender:', cleanGender);
            setGender(cleanGender);
            // Animate the selected button
            animateButton(true, cleanGender === 'Male' ? maleScale : femaleScale);
          }
        }
      } catch (err) {
        console.error('Error loading user gender:', err);
      }
    };

    loadUserGender();
  }, [userId]);

  // Handle Let's Do It button press
  const handleLetsDoIt = () => {
    if (isRevealed) return;
    
    letsDoItButtonPulse.stopAnimation();
    trophyBounceAnim.stopAnimation();
    
    // World-class transition with overlapping animations
    Animated.sequence([
      // Phase 1: Button press feedback and initial fade
      Animated.parallel([
        Animated.timing(letsDoItButtonScale, { 
          toValue: 0.85, 
          duration: 200, 
          useNativeDriver: true, 
          easing: Easing.out(Easing.cubic) 
        }),
        Animated.timing(letsDoItButtonAnim, { 
          toValue: 0.3, 
          duration: 300, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic) 
        })
      ]),
      
      // Phase 2: Elegant content fade out with stagger
      Animated.parallel([
        Animated.timing(welcomeContentFadeOut, { 
          toValue: 0, 
          duration: 500, 
          useNativeDriver: true, 
          easing: Easing.bezier(0.4, 0.0, 0.2, 1) // Material Design easing
        }),
        Animated.timing(welcomeFadeAnim, { 
          toValue: 0, 
          duration: 600, 
          useNativeDriver: true, 
          easing: Easing.bezier(0.4, 0.0, 0.2, 1)
        }),
        // Scale down effect for dramatic transition
        Animated.timing(welcomeNameAnim, { 
          toValue: 0.8, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
        })
      ])
    ]).start(() => {
      // Set isRevealed to true - this will trigger the progress bar to show
      setIsRevealed(true); 
      
      // Reset animation values for the form with dramatic entrance setup
      contentRevealAnim.setValue(0); 
      titleAnim.setValue(50); // Start further down for more dramatic effect
      slideAnim.setValue(80); 
      maleOpacity.setValue(0);
      femaleOpacity.setValue(0);

      // Phase 3: Dramatic form entrance with world-class timing
      Animated.sequence([
        // Slight delay for anticipation
        Animated.delay(150),
        
        Animated.parallel([
          // Container reveals with elegant ease
          Animated.timing(contentRevealAnim, { 
            toValue: 1, 
            duration: 800, 
            useNativeDriver: true, 
            easing: Easing.bezier(0.0, 0.0, 0.2, 1) // Decelerate easing
          }),
          
          // Title entrance with bounce effect
          Animated.sequence([
            Animated.delay(100),
            Animated.parallel([
              Animated.timing(titleAnim, { 
                toValue: 0, 
                duration: 900, 
                useNativeDriver: true, 
                easing: Easing.bezier(0.0, 0.0, 0.2, 1)
              }),
              // Subtle scale effect for premium feel
              Animated.sequence([
                Animated.timing(fadeAnim, { 
                  toValue: 0.95, 
                  duration: 200, 
                  useNativeDriver: true 
                }),
                Animated.spring(fadeAnim, { 
                  toValue: 1, 
                  tension: 80, 
                  friction: 8, 
                  useNativeDriver: true 
                })
              ])
            ])
          ]),
          
          // Buttons entrance with staggered luxury timing
          Animated.sequence([
            Animated.delay(400),
            Animated.stagger(150, [
              Animated.parallel([
                Animated.timing(maleOpacity, { 
                  toValue: 1, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                // Subtle slide up effect
                Animated.timing(slideAnim, { 
                  toValue: 0, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                })
              ]),
              Animated.timing(femaleOpacity, { 
                toValue: 1, 
                duration: 700, 
                useNativeDriver: true, 
                easing: Easing.bezier(0.0, 0.0, 0.2, 1)
              })
            ])
          ])
        ])
      ]).start();
    });
  };

  // Handle button animations
  const handleLetsDoItButtonPressIn = () => {
    if (!isRevealed) {
      Animated.spring(letsDoItButtonScale, {
        toValue: 0.92,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLetsDoItButtonPressOut = () => {
    if (!isRevealed) {
      Animated.spring(letsDoItButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSelectGender = (selectedGender) => {
    setGender(selectedGender);
    
    // Run animation
    if (selectedGender === 'Male') {
      animateButton(true, maleScale);
    } else {
      animateButton(true, femaleScale);
    }
  };

  const handleContinue = async () => {
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }
    
    // Update database first - before animation
    debugLog('Updating profile with gender:', gender);
    debugLog('Using userId:', userId);
    
    let error = null;
    try {
      // Save to AsyncStorage for future use
      await AsyncStorage.setItem('userGender', gender);
      debugLog('Saved gender to AsyncStorage:', gender);
      
      // Always try direct database update if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            gender: gender,
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Gender saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile
        debugLog('No userId available, using updateProfile method');
        const result = await updateProfile({
          gender: gender,
          onboarding_complete: false
        });
        
        error = result?.error;
      }
    } catch (err) {
      console.error('Error in update operation:', err);
      error = err;
    }
    
    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Could not save your gender. Please try again.');
      return;
    }
    
    // Let the next screen handle its own progress update
    
    // Completely fade out this screen before navigation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
        easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 30, // Positive value to slide to the right (forward navigation)
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: true
      })
    ]).start(() => {
      // Only navigate after animation is complete and screen is no longer visible
      debugLog('Profile updated, navigating to DateOfBirth with userId:', userId);
      
      // Pass all necessary data to next screen
      navigation.navigate('DateOfBirth', { 
        userId,
        email: userEmail,
        fromSignUp
      });
    });
  };

  const handleBack = () => {
    // Log the navigation attempt
    console.log('GenderScreen: handleBack called, navigating to Name screen');
    
    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('Name', { 
      userId,
      email: userEmail,
      fromSignUp
    });
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          backgroundColor: '#FFFFFF' 
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Header spacer - to account for the global progress bar */}
        <View style={styles.header}>
        </View>
        
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
                    opacity: welcomeNameAnim,
                    transform: [
                      {
                        translateY: welcomeNameAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        })
                      },
                      {
                        scale: welcomeNameAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.9, 1.05, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                Hey {userName || 'there'}!
              </Animated.Text>
              
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
                Ready to level up your workouts?
              </Animated.Text>
              
              <Animated.Text
                style={[
                  styles.welcomeText,
                  {
                    opacity: line1Anim,
                    transform: [
                      {
                        translateY: line1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        })
                      }
                    ]
                  }
                ]}
              >
                Here's what you're about to unlock:
              </Animated.Text>
              
              <Animated.View
                style={[
                  styles.featureItem,
                  {
                    opacity: line2Anim,
                    transform: [
                      {
                        translateY: line2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, 0],
                        })
                      },
                      {
                        scale: line2Anim.interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.8, 1.05, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#ffffff', '#fafbff']}
                  style={styles.featureItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureItemContent}>
                    <Animated.Text style={[
                      styles.featureEmoji,
                      {
                        transform: [{
                          translateY: trophyBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -3],
                          })
                        }]
                      }
                    ]}>🏆</Animated.Text>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>The GymVid Games</Text>
                      <Text style={styles.featureDescription}>Join the leaderboard with verified lifts.</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.featureItem,
                  {
                    opacity: line3Anim,
                    transform: [
                      {
                        translateY: line3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, 0],
                        })
                      },
                      {
                        scale: line3Anim.interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.8, 1.05, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#ffffff', '#fafbff']}
                  style={styles.featureItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureItemContent}>
                    <Text style={styles.featureEmoji}>🎥</Text>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Video-Based Logging</Text>
                      <Text style={styles.featureDescription}>Log sets fast - no typing, just lifting.</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.featureItem,
                  {
                    opacity: line3Anim,
                    transform: [
                      {
                        translateY: line3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, 0],
                        })
                      },
                      {
                        scale: line3Anim.interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.8, 1.05, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#ffffff', '#fafbff']}
                  style={styles.featureItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureItemContent}>
                    <Text style={styles.featureEmoji}>✨</Text>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>AI Coaching Feedback</Text>
                      <Text style={styles.featureDescription}>Improve your form instantly.</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.featureItem,
                  {
                    opacity: line4Anim,
                    transform: [
                      {
                        translateY: line4Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, 0],
                        })
                      },
                      {
                        scale: line4Anim.interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.8, 1.05, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#ffffff', '#fafbff']}
                  style={styles.featureItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureItemContent}>
                    <Text style={styles.featureEmoji}>📊</Text>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Track Progress Like Never Before</Text>
                      <Text style={styles.featureDescription}>Watch your strength improve over time.</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
            
            <Animated.Text
              style={[
                styles.preRevealHelpText,
                {
                  opacity: helpTextAnim,
                  transform: [
                    {
                      translateY: helpTextAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      })
                    }
                  ]
                }
              ]}
            >
              Create your profile to get started!
            </Animated.Text>
            
            {/* Let's Do It button */}
            <Animated.View
              style={[
                styles.letsDoItButtonContainer,
                {
                  opacity: letsDoItButtonAnim,
                  transform: [
                    {
                      scale: Animated.multiply(letsDoItButtonScale, letsDoItButtonPulse)
                    },
                    {
                      translateY: letsDoItButtonAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }
                  ],
                }
              ]}
            >
              <TouchableOpacity
                style={styles.letsDoItButton}
                onPress={handleLetsDoIt}
                onPressIn={handleLetsDoItButtonPressIn}
                onPressOut={handleLetsDoItButtonPressOut}
                activeOpacity={0.9}
                disabled={isRevealed}
              >
                <LinearGradient
                  colors={['#0099FF', '#0066DD', '#0044BB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.letsDoItGradient}
                >
                  <Text style={styles.letsDoItButtonText}>Create Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
        
        {/* Original content that reveals after Let's Do It is pressed */}
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
                  opacity: titleAnim.interpolate({
                    inputRange: [0, 30],
                    outputRange: [1, 0],
                  }),
                transform: [
                    { translateY: titleAnim },
                  { 
                    scale: titleAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [1, 0.98],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            What's your gender?
          </Animated.Text>
          <Animated.View 
            style={{ 
              width: '100%', 
              opacity: fadeAnim,
            }}
          >
            <View style={styles.formContainer}>
                <View style={styles.genderButtonsRow}>
              <Animated.View 
                    style={[
                      styles.genderButtonContainer,
                      { 
                  transform: [{ scale: maleScale }],
                  opacity: maleOpacity
                      }
                    ]}
              >
                <TouchableOpacity 
                  style={[styles.genderButton, gender === 'Male' && styles.selectedButton]} 
                  onPress={() => handleSelectGender('Male')}
                  activeOpacity={0.9}
                >
                        <LinearGradient
                          colors={gender === 'Male' ? ['#f0f8ff', '#e6f3ff'] : ['#ffffff', '#f8faff']}
                          style={styles.genderButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.genderButtonContent}>
                            <View style={styles.genderIconContainer}>
                  <Ionicons 
                                name="man" 
                                size={64}
                    color={gender === 'Male' ? colors.primary : colors.gray} 
                  />
                            </View>
                  <Text style={[styles.genderButtonText, gender === 'Male' && styles.selectedButtonText]}>Male</Text>
                          </View>
                        </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
                  
              <Animated.View 
                    style={[
                      styles.genderButtonContainer,
                      { 
                  transform: [{ scale: femaleScale }],
                  opacity: femaleOpacity
                      }
                    ]}
              >
                <TouchableOpacity 
                  style={[styles.genderButton, gender === 'Female' && styles.selectedButton]} 
                  onPress={() => handleSelectGender('Female')}
                  activeOpacity={0.9}
                >
                        <LinearGradient
                          colors={gender === 'Female' ? ['#f0f8ff', '#e6f3ff'] : ['#ffffff', '#f8faff']}
                          style={styles.genderButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.genderButtonContent}>
                            <View style={styles.genderIconContainer}>
                  <Ionicons 
                                name="woman" 
                                size={64}
                    color={gender === 'Female' ? colors.primary : colors.gray} 
                  />
                            </View>
                  <Text style={[styles.genderButtonText, gender === 'Female' && styles.selectedButtonText]}>Female</Text>
                          </View>
                        </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
                </View>
              <Text style={styles.genderHelper}>
                  Your gender will help us categorise your lifts in the GymVid Games!
              </Text>
            </View>
          </Animated.View>
          </Animated.View>
        )}
        
        {/* Bottom buttons - only show when revealed */}
        {isRevealed && (
        <Animated.View 
          style={[
            styles.bottomButtonContainer,
            { 
                opacity: contentRevealAnim
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButtonBottom} 
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, !gender && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !gender}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Text style={styles.nextButtonIcon}>→</Text>
          </TouchableOpacity>
        </Animated.View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
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
    height: 60,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 15,
  },
  titleText: {
    fontSize: 32, // Increased size
    fontWeight: '700', // Made font slightly heavier
    marginBottom: 10, // Reduced from 20 to decrease space
    textAlign: 'center',
    letterSpacing: -0.5, // Tighter letter spacing for modern look
    color: '#1A1A1A', // Slightly softer than pure black
    width: '100%',
  },
  genderButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 10,
  },
  genderButtonContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  genderButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    height: 255,
    position: 'relative',
  },
  selectedButton: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  genderButtonGradient: {
    borderRadius: 20,
    padding: 20,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    position: 'relative',
  },
  genderIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 80,
    width: 80,
  },
  genderButtonText: {
    color: colors.darkGray,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  selectedButtonText: {
    color: colors.primary,
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30, // Increased from 20 to 30
    paddingTop: 10, // Added padding at the top
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)', // Slightly more transparent for blur effect
    borderTopWidth: 1, // Add a subtle top border
    borderTopColor: 'rgba(0, 0, 0, 0.05)', // Very subtle border color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    // Premium glass effect
    backdropFilter: 'blur(10px)', // Will only work on iOS with newer versions
  },
  backButtonBottom: {
    height: 56,
    width: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  nextButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16, // Increased from 12 to 16
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Increased for more premium feel
    shadowRadius: 6, // Increased for softer shadow spread
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#AACEF5', // Lighter color when disabled
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600', // Slightly heavier
    marginRight: 8,
  },
  nextButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  genderHelper: {
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 26,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
    color: '#1A1A1A',
    lineHeight: 44,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 28,
    textAlign: 'center',
    color: colors.primary,
    width: '100%',
    paddingHorizontal: 20,
  },
  welcomeTextBold: {
    fontWeight: '700',
    fontSize: 19,
    color: '#1A1A1A',
    marginBottom: 24,
  },
  welcomeFeature: {
    fontWeight: '600',
    fontSize: 17,
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  letsDoItButtonContainer: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  letsDoItButton: {
    borderRadius: 16,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    width: '100%',
  },
  letsDoItGradient: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  letsDoItButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  letsDoItButtonIcon: {
    fontSize: 22,
    marginLeft: 10,
  },
  featureItem: {
    borderRadius: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: 380,
  },
  featureItemGradient: {
    borderRadius: 20,
    padding: 14,
  },
  featureItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  featureDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  welcomeSubtitle: {
    fontWeight: '400',
    fontSize: 22,
    color: '#505050',
    opacity: 0.9,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 30,
    paddingHorizontal: 10,
  },
  preRevealHelpText: {
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
}); 