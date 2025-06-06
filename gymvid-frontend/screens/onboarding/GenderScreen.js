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
  const line5Anim = useRef(new Animated.Value(0)).current;
  const profileTextAnim = useRef(new Animated.Value(0)).current;
  const emojiBouncedAnim = useRef(new Animated.Value(0)).current;
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
      // Always show progress bar during onboarding - GenderScreen is at 15%
      debugLog('GenderScreen: Showing progress bar at 15%');
      setProgress(prev => ({ 
        ...prev, 
        isOnboarding: true, 
        currentScreen: 'Gender' 
      }));
      updateProgress('Gender');
    }
  }, [isFocused, updateProgress, setProgress]);

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
      line5Anim.setValue(0);
      profileTextAnim.setValue(0);
      emojiBouncedAnim.setValue(0);
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
          // SECTION 1: Header and Sub-Header with Auto Fade-Out
          Animated.sequence([
            // Phase 1: Immediate header appearance
            Animated.timing(welcomeFadeAnim, { 
              toValue: 1, 
              duration: 420, // Increased from 300ms by 40%
              useNativeDriver: true, 
              easing: Easing.out(Easing.cubic) 
            }),
            
            // Phase 2: Header (name) appears
            Animated.timing(welcomeNameAnim, { 
              toValue: 1, 
              duration: 560, // Increased from 400ms by 40%
              useNativeDriver: true, 
              easing: Easing.bezier(0.0, 0.0, 0.2, 1)
            }),
            
            // Phase 3: Sub-header appears
            Animated.timing(welcomeSubtitleAnim, { 
              toValue: 1, 
              duration: 700, // Increased from 500ms by 40%
              useNativeDriver: true, 
              easing: Easing.bezier(0.0, 0.0, 0.2, 1)
            }),
            
            // Phase 3.5: Additional delay after both texts are fully visible
            Animated.delay(800), // 800ms delay after texts appear
            
            // Phase 4: Auto fade out header and sub-header (removed duplicate delay)
            Animated.parallel([
              Animated.timing(welcomeNameAnim, { 
                toValue: 0, 
                duration: 840, // Increased from 600ms by 40%
                useNativeDriver: true, 
                easing: Easing.in(Easing.cubic)
              }),
              Animated.timing(welcomeSubtitleAnim, { 
                toValue: 0, 
                duration: 840, // Increased from 600ms by 40%
                useNativeDriver: true, 
                easing: Easing.in(Easing.cubic)
              })
            ]),
            
            // Phase 5: Small pause before Section 2
            Animated.delay(300),
            
            // Phase 6: Make sure container is visible for SECTION 2
            Animated.timing(welcomeFadeAnim, { 
              toValue: 1, 
              duration: 1,
              useNativeDriver: true
            }),
            
            // Phase 7: SECTION 2 - Show typing text container
            Animated.timing(line1Anim, { 
              toValue: 1, 
              duration: 800, // Smooth fade-in instead of instant
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic)
            })
          ]).start(() => {
            // SECTION 2: Start smooth fade-in instead of typing effect
            
            // Start cards appearing after text fades in
            setTimeout(() => {
              // Cards appear one by one with 75ms delays
              Animated.sequence([
                // First card
                Animated.timing(line2Anim, { 
                  toValue: 1, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                
                // 75ms delay before second card
                Animated.delay(75),
                Animated.timing(line3Anim, { 
                  toValue: 1, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                
                // 75ms delay before third card
                Animated.delay(75),
                Animated.timing(line4Anim, { 
                  toValue: 1, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                
                // 75ms delay before fourth card
                Animated.delay(75),
                Animated.timing(line5Anim, { 
                  toValue: 1, 
                  duration: 700, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                
                // Profile text appears after last card
                Animated.delay(150),
                Animated.timing(profileTextAnim, { 
                  toValue: 1, 
                  duration: 600, 
                  useNativeDriver: true, 
                  easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                }),
                
                // Final button appears after profile text
                Animated.delay(200),
                Animated.parallel([
                  Animated.timing(letsDoItButtonAnim, { 
                    toValue: 1, 
                    duration: 600, 
                    useNativeDriver: true, 
                    easing: Easing.bezier(0.0, 0.0, 0.2, 1)
                  }),
                  // Premium button entrance with scale
                  Animated.sequence([
                    Animated.spring(letsDoItButtonScale, { 
                      toValue: 1.08, 
                      from: 0.5, 
                      tension: 120, 
                      friction: 8, 
                      useNativeDriver: true 
                    }),
                    Animated.spring(letsDoItButtonScale, { 
                      toValue: 1, 
                      tension: 100, 
                      friction: 10, 
                      useNativeDriver: true 
                    })
                  ])
                ])
              ]).start(() => {
                if (!isRevealed) { 
                  // Start premium pulse animation for button
                  Animated.loop(
                    Animated.sequence([
                      Animated.timing(letsDoItButtonPulse, { 
                        toValue: 1.03, 
                        duration: 1500, 
                        useNativeDriver: true, 
                        easing: Easing.bezier(0.4, 0.0, 0.6, 1)
                      }), 
                      Animated.timing(letsDoItButtonPulse, { 
                        toValue: 1, 
                        duration: 1500, 
                        useNativeDriver: true, 
                        easing: Easing.bezier(0.4, 0.0, 0.6, 1)
                      })
                    ])
                  ).start();
                  
                  // Start continuous emoji bounce animation
                  emojiBouncedAnim.setValue(0); // Reset to initial value
                  Animated.loop(
                    Animated.sequence([
                      Animated.timing(emojiBouncedAnim, { 
                        toValue: 1, 
                        duration: 600, 
                        useNativeDriver: true, 
                        easing: Easing.out(Easing.quad)
                      }), 
                      Animated.timing(emojiBouncedAnim, { 
                        toValue: 0, 
                        duration: 600, 
                        useNativeDriver: true, 
                        easing: Easing.in(Easing.quad)
                      })
                    ])
                  ).start();
                  
                  // Start subtle trophy bounce animation
                  Animated.loop(
                    Animated.sequence([
                      Animated.timing(trophyBounceAnim, { 
                        toValue: 1, 
                        duration: 1200, 
                        useNativeDriver: true, 
                        easing: Easing.bezier(0.4, 0.0, 0.6, 1)
                      }), 
                      Animated.timing(trophyBounceAnim, { 
                        toValue: 0, 
                        duration: 1200, 
                        useNativeDriver: true, 
                        easing: Easing.bezier(0.4, 0.0, 0.6, 1)
                      })
                    ])
                  ).start();
                }
              });
            }, 400);
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
      // Clean up global callback
      if (window.typingCompleteCallback) {
        delete window.typingCompleteCallback;
      }
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
      line5Anim.stopAnimation();
      profileTextAnim.stopAnimation();
      emojiBouncedAnim.stopAnimation();
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
    console.log('🔥 handleLetsDoIt called! isRevealed:', isRevealed);
    
    if (isRevealed) {
      console.log('❌ Button press blocked - isRevealed is true');
      return;
    }
    
    console.log('✅ Proceeding with transition animation');
    
    // Stop all running animations
    letsDoItButtonPulse.stopAnimation();
    trophyBounceAnim.stopAnimation();
    profileTextAnim.stopAnimation(); // Stop the new profile text animation
    
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
        }),
        // Fade out profile text
        Animated.timing(profileTextAnim, { 
          toValue: 0, 
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
        // Fade out all SECTION 2 elements
        Animated.timing(line1Anim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
        }),
        Animated.timing(line2Anim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
        }),
        Animated.timing(line3Anim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
        }),
        Animated.timing(line4Anim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
        }),
        Animated.timing(line5Anim, { 
          toValue: 0, 
          duration: 400, 
          useNativeDriver: true, 
          easing: Easing.in(Easing.cubic)
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
      
      // Reset animation values for the form with more elegant initial positions
      contentRevealAnim.setValue(0); 
      titleAnim.setValue(40); // Start from a more subtle position
      slideAnim.setValue(60); // Less dramatic starting position
      maleOpacity.setValue(0);
      femaleOpacity.setValue(0);

      // Phase 3: World-class smooth form entrance with premium timing
      Animated.sequence([
        // Longer anticipation delay for premium feel
        Animated.delay(200),
        
        // Container and content reveal with overlapping animations
        Animated.parallel([
          // Container reveals with luxury ease-out curve
          Animated.timing(contentRevealAnim, { 
            toValue: 1, 
            duration: 1000, // Increased duration for smoother feel
            useNativeDriver: true, 
            easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Custom luxury easing
          }),
          
          // Title entrance with gentle float-in effect
          Animated.sequence([
            Animated.delay(150), // Slight delay for layered entrance
            Animated.parallel([
              Animated.timing(titleAnim, { 
                toValue: 0, 
                duration: 1200, // Longer, more graceful
                useNativeDriver: true, 
                easing: Easing.bezier(0.19, 1, 0.22, 1) // Smooth deceleration
              }),
              // Gentle scale and fade effect for premium feel
              Animated.sequence([
                Animated.timing(fadeAnim, { 
                  toValue: 0.92, 
                  duration: 300, 
                  useNativeDriver: true,
                  easing: Easing.out(Easing.cubic)
                }),
                Animated.spring(fadeAnim, { 
                  toValue: 1, 
                  tension: 60,  // Gentler spring
                  friction: 10, 
                  useNativeDriver: true 
                })
              ])
            ])
          ]),
          
          // Buttons entrance with world-class staggered timing
          Animated.sequence([
            Animated.delay(500), // Longer delay for dramatic effect
            
            // First, slide elements up smoothly
            Animated.timing(slideAnim, { 
              toValue: 0, 
              duration: 1000, // Smooth slide duration
              useNativeDriver: true, 
              easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Luxury ease-out
            }),
            
            // Then fade in buttons with elegant stagger
            Animated.delay(100), // Small pause before buttons appear
            Animated.stagger(200, [ // Increased stagger for more premium feel
              Animated.timing(maleOpacity, { 
                toValue: 1, 
                duration: 800, // Slower, more elegant
                useNativeDriver: true, 
                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
              }),
              Animated.timing(femaleOpacity, { 
                toValue: 1, 
                duration: 800, // Slower, more elegant
                useNativeDriver: true, 
                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
              })
            ])
          ])
        ])
      ]).start();
    });
  };

  // Handle button animations
  const handleLetsDoItButtonPressIn = () => {
    console.log('🔥 Button PressIn detected! isRevealed:', isRevealed);
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
    console.log('🔥 Button PressOut detected! isRevealed:', isRevealed);
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
        </View>
        
        {/* Welcome screen content - conditionally rendered or animated out */}
        {!isRevealed && (
          <Animated.View
            style={[
              styles.welcomeContainer,
              {
                opacity: welcomeFadeAnim,
                pointerEvents: 'box-none', // Allow touches to pass through to children
              }
            ]}
          >
            {/* SECTION 1 - Centered Header Content */}
            <Animated.View style={[
              styles.section1Container,
              {
                opacity: welcomeFadeAnim, // Simplified - just use the main container fade
              }
            ]}>
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
            </Animated.View>

            {/* SECTION 2 - Feature Content */}
            <Animated.View style={styles.welcomeContent}>
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
                Here's what you're about to unlock...
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
                    opacity: line5Anim,
                    transform: [
                      {
                        translateY: line5Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, 0],
                        })
                      },
                      {
                        scale: line5Anim.interpolate({
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
            
            {/* Profile creation text */}
            <Animated.Text
              style={[
                styles.profileCreateText,
                {
                  opacity: profileTextAnim,
                  transform: [
                    {
                      translateY: profileTextAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                      })
                    }
                  ]
                }
              ]}
            >
              Create your profile now to get started{' '}
              <Animated.Text
                style={{
                  transform: [{
                    translateY: emojiBouncedAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    })
                  }]
                }}
              >
                👇
              </Animated.Text>
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
                  pointerEvents: 'auto', // Ensure touch events work
                  zIndex: 100, // Bring to front
                }
              ]}
            >
              <TouchableOpacity
                style={[styles.letsDoItButton, { 
                  backgroundColor: 'rgba(255,0,0,0.1)', // Temporary red tint to see button bounds
                  zIndex: 101 
                }]}
                onPress={() => {
                  console.log('🚨 DIRECT BUTTON PRESS DETECTED!');
                  handleLetsDoIt();
                }}
                onPressIn={() => {
                  console.log('🚨 DIRECT BUTTON PRESS IN!');
                  handleLetsDoItButtonPressIn();
                }}
                onPressOut={() => {
                  console.log('🚨 DIRECT BUTTON PRESS OUT!');
                  handleLetsDoItButtonPressOut();
                }}
                activeOpacity={0.9}
                // disabled={isRevealed} // Temporarily disabled for testing
              >
                <LinearGradient
                  colors={['#27272a', '#27272a', '#27272a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.letsDoItGradient}
                >
                  <Text style={styles.letsDoItButtonText}>Let's Go!</Text>
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
                          colors={['#ffffff', '#f8faff']}
                          style={styles.genderButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.genderButtonContent}>
                            <View style={styles.genderIconContainer}>
                              <Ionicons 
                                name="man" 
                                size={64}
                                color={colors.gray} 
                              />
                            </View>
                  <Text style={[styles.genderButtonText]}>Male</Text>
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
                          colors={['#ffffff', '#f8faff']}
                          style={styles.genderButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.genderButtonContent}>
                            <View style={styles.genderIconContainer}>
                  <Ionicons 
                                name="woman" 
                                size={64}
                    color={colors.gray} 
                  />
                            </View>
                  <Text style={[styles.genderButtonText]}>Female</Text>
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
            style={[styles.nextButton, !gender && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !gender}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
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
    alignItems: 'center',
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
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    position: 'absolute',
    left: 20,
    top: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  nextButton: {
    backgroundColor: '#27272a',
    borderRadius: 16, // Increased from 12 to 16
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d5db', // Light neutral grey when disabled
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600', // Slightly heavier
    marginRight: 8,
  },
  nextButtonIcon: {
    color: '#F9FAFB',
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
  section1Container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20, // Much less padding - higher position
    paddingBottom: 120, // More bottom padding to push content up
    zIndex: 10,
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 28,
    textAlign: 'center',
    color: '#1A1A1A',
    width: '100%',
    paddingHorizontal: 20,
    letterSpacing: -1,
    lineHeight: 44,
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
    position: 'relative',
    zIndex: 10,
  },
  letsDoItButton: {
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    height: 56,
  },
  letsDoItButtonText: {
    color: '#F9FAFB',
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
    marginBottom: 12,
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
    height: 94,
  },
  featureItemGradient: {
    borderRadius: 20,
    padding: 20,
    height: '100%',
    justifyContent: 'center',
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
  profileCreateText: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 18,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
}); 