import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  ImageBackground,
  Easing
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[VIDEO-PROMPT]', ...args);
  }
};

export default function VideoPromptScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get user ID from route params or try to retrieve it
  const [userId, setUserId] = useState(route.params?.userId);
  const continueOnboarding = route.params?.continueOnboarding === true;
  const forceFlow = route.params?.forceFlow === true;
  
  // Add state for user gender
  const [userGender, setUserGender] = useState(null);
  
  // Ref to track if we've already updated onboarding state
  const hasUpdatedRef = useRef(false);
  
  debugLog('VideoPromptScreen params:', { userId, continueOnboarding, forceFlow });
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const videoFrameAnim = useRef(new Animated.Value(0)).current;
  const videoFrameScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Animation for the video frames that float
  const videoFrame1FloatAnim = useRef(new Animated.Value(0)).current;
  const videoFrame2FloatAnim = useRef(new Animated.Value(0)).current;
  const videoFrame3FloatAnim = useRef(new Animated.Value(0)).current;

  // Add state for the header text animations
  const firstLineAnim = useRef(new Animated.Value(0)).current;
  const secondLineAnim = useRef(new Animated.Value(0)).current;
  const headerTitleAnimation = useRef(new Animated.Value(0)).current;

  // Add state for interactive reveal
  const [isRevealed, setIsRevealed] = useState(false);
  const headerPositionAnim = useRef(new Animated.Value(0)).current; // 0 = center, 1 = top
  const showMeButtonAnim = useRef(new Animated.Value(0)).current;
  const showMeButtonScale = useRef(new Animated.Value(0.5)).current;
  const contentRevealAnim = useRef(new Animated.Value(0)).current;
  const showMeButtonPulse = useRef(new Animated.Value(1)).current; // For pulse animation
  const headerShimmer = useRef(new Animated.Value(0)).current; // For shimmer effect
  const headerFadeOut = useRef(new Animated.Value(1)).current; // For header fade out

  // Add a hover/press animation for the buttons
  const [primaryButtonScale] = useState(new Animated.Value(1));
  const [secondaryButtonScale] = useState(new Animated.Value(1));

  // Add touch handlers for button animations
  const handlePrimaryButtonPressIn = () => {
    Animated.parallel([
      Animated.spring(primaryButtonScale, {
        toValue: 0.95,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePrimaryButtonPressOut = () => {
    Animated.parallel([
      Animated.spring(primaryButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSecondaryButtonPressIn = () => {
    Animated.parallel([
      Animated.spring(secondaryButtonScale, {
        toValue: 0.95,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSecondaryButtonPressOut = () => {
    Animated.parallel([
      Animated.spring(secondaryButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Function to get current user ID
  const getCurrentUserId = async () => {
    try {
      // If we already have it from route params, use that
      if (userId) {
        return userId;
      }

      // Try to get user from route params
      if (route.params?.userId) {
        const id = route.params.userId;
        setUserId(id);
        return id;
      }
      
      // Try to get user from Supabase auth
      try {
        const user = supabase.auth.user();
        if (user && user.id) {
          debugLog('Using userId from Supabase auth:', user.id);
          setUserId(user.id);
          return user.id;
        }
      } catch (err) {
        console.error('Error getting user from Supabase auth:', err);
      }
      
      // Try to get session from Supabase
      try {
        const session = supabase.auth.session();
        if (session && session.user && session.user.id) {
          debugLog('Using userId from Supabase session:', session.user.id);
          setUserId(session.user.id);
          return session.user.id;
        }
      } catch (err) {
        console.error('Error getting session from Supabase:', err);
      }
      
      // Last resort: try to get from AsyncStorage
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          debugLog('Using userId from AsyncStorage:', storedUserId);
          setUserId(storedUserId);
          return storedUserId;
        }
      } catch (err) {
        console.error('Error getting userId from AsyncStorage:', err);
      }
      
      return null;
    } catch (err) {
      console.error('Error in getCurrentUserId:', err);
      return null;
    }
  };

  // Get user gender from AsyncStorage or Supabase
  const fetchUserGender = async () => {
    try {
      // First try to get from AsyncStorage as it's faster
      const storedGender = await AsyncStorage.getItem('userGender');
      if (storedGender) {
        debugLog('Found gender in AsyncStorage:', storedGender);
        setUserGender(storedGender);
        return;
      }
      
      // If not in AsyncStorage, try to get from Supabase
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('gender')
        .eq('id', currentUserId)
        .single();
        
      if (error) {
        console.error('Error fetching user gender:', error);
        return;
      }
      
      if (data && data.gender) {
        debugLog('Found gender in Supabase:', data.gender);
        setUserGender(data.gender);
        
        // Save to AsyncStorage for future reference
        await AsyncStorage.setItem('userGender', data.gender);
      }
    } catch (err) {
      console.error('Error fetching user gender:', err);
      // Default to null, we'll handle this in the UI
    }
  };

  // Get user ID and gender on mount
  useEffect(() => {
    const initUser = async () => {
      await getCurrentUserId();
      await fetchUserGender();
      debugLog('VideoPromptScreen using userId:', userId);
      debugLog('User gender:', userGender);
      debugLog('continueOnboarding flag:', continueOnboarding);
    };
    
    initUser();
  }, []);

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('VideoPrompt');
      
      // Fetch gender if not already set
      if (!userGender) {
        fetchUserGender();
      }
    }
  }, [isFocused, updateProgress, userGender]);

  // Request media library permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to make this work!',
            [{ text: 'OK' }]
          );
        }
      }
    })();
  }, []);

  // CRITICAL: Force onboarding to be incomplete when this screen loads
  useEffect(() => {
    if (isFocused) {
      // Use the ref from component body
      
      const forceOnboardingIncomplete = async () => {
        // Don't update if we've already done it for this session
        if (hasUpdatedRef.current) {
          debugLog('Already updated onboarding state, skipping duplicate update');
          return;
        }
        
        try {
          const currentUserId = await getCurrentUserId();
          if (currentUserId) {
            // Force-update onboarding_complete to false
            await supabase
              .from('users')
              .update({ onboarding_complete: false })
              .eq('id', currentUserId);
            
            debugLog('Force-set onboarding_complete=false in VideoPromptScreen');
            
            // Also clear any local completion flags
            await AsyncStorage.setItem('onboardingInProgress', 'true');
            await AsyncStorage.removeItem('onboardingComplete');
            
            // Mark that we've updated
            hasUpdatedRef.current = true;
          }
        } catch (error) {
          console.error('Error in forceOnboardingIncomplete:', error);
        }
      };
      
      forceOnboardingIncomplete();
    }
  }, [isFocused]);

  // Enhance floating animations for even more natural movement
  useEffect(() => {
    // Create more sophisticated floating animations with bezier curves
    const createFloatingAnimation = (animValue, duration, delay, outputRange = [0, 1]) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design easing
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          })
        ])
      );
    };

    // Create animations with different durations and delays for organic movement
    const float1 = createFloatingAnimation(videoFrame1FloatAnim, 4000, 0);
    const float2 = createFloatingAnimation(videoFrame2FloatAnim, 4500, 800);
    const float3 = createFloatingAnimation(videoFrame3FloatAnim, 3800, 1600);

    // Start all floating animations
    float1.start();
    float2.start();
    float3.start();

    return () => {
      // Stop animations on unmount
      float1.stop();
      float2.stop();
      float3.stop();
    };
  }, []);

  // Run entrance animations
  useEffect(() => {
    // Enhanced animation sequence with interactive reveal
    const runEntranceAnimation = () => {
      // Reset all animations to initial state
      fadeAnim.setValue(0);
      titleAnim.setValue(0);
      titleOpacityAnim.setValue(0);
      buttonsAnim.setValue(0);
      videoFrameAnim.setValue(0);
      videoFrameScaleAnim.setValue(0.8);
      headerTitleAnimation.setValue(0);
      firstLineAnim.setValue(0);
      secondLineAnim.setValue(0);
      headerPositionAnim.setValue(0);
      showMeButtonAnim.setValue(0);
      showMeButtonScale.setValue(0.5);
      contentRevealAnim.setValue(0);
      headerFadeOut.setValue(1); // Reset header opacity
      setIsRevealed(false);
      
      // Initial entrance - just header and Show Me button
      Animated.sequence([
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        
        // Header title animations with more sophisticated choreography
        Animated.parallel([
          // Overall header container fade and scale
          Animated.parallel([
            Animated.timing(headerTitleAnimation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.spring(headerTitleAnimation, {
              toValue: 1,
              from: 0.85,
              tension: 40,
              friction: 8,
              useNativeDriver: true,
            })
          ]),
          
          // Staggered text lines with character-like animation
          Animated.sequence([
            Animated.parallel([
              Animated.timing(firstLineAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
              Animated.sequence([
                Animated.delay(100),
                Animated.timing(secondLineAnim, {
                  toValue: 1,
                  duration: 900,
                  useNativeDriver: true,
                  easing: Easing.out(Easing.back(1.5)),
                })
              ])
            ])
          ])
        ]),
        
        // Show Me button appears with enhanced animation
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(showMeButtonAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.sequence([
              Animated.spring(showMeButtonScale, {
                toValue: 1.1,
                from: 0.5,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
              Animated.spring(showMeButtonScale, {
                toValue: 1,
                tension: 80,
                friction: 10,
                useNativeDriver: true,
              })
            ])
          ])
        ])
      ]).start(() => {
        // Start pulse animation after entrance completes
        if (!isRevealed) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(showMeButtonPulse, {
                toValue: 1.05,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              }),
              Animated.timing(showMeButtonPulse, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              })
            ])
          ).start();
          
          // Start shimmer animation for header
          Animated.loop(
            Animated.sequence([
              Animated.timing(headerShimmer, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.quad),
              }),
              Animated.timing(headerShimmer, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.quad),
              })
            ])
          ).start();
        }
      });
    };
    
    // Run animation on mount
    runEntranceAnimation();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      runEntranceAnimation();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  // Open media library to pick a video
  const openMediaPicker = async () => {
    try {
      setLoading(true);
      
      const currentUserId = await getCurrentUserId();
      
      // Force onboarding to be incomplete
      if (currentUserId) {
        try {
          await supabase
            .from('users')
            .update({ onboarding_complete: false })
            .eq('id', currentUserId);
          
          // Also clear any local completion flags
          await AsyncStorage.setItem('onboardingInProgress', 'true');
          await AsyncStorage.removeItem('onboardingComplete');
        } catch (error) {
          console.error('Error updating onboarding status:', error);
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });
      
      setLoading(false);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const videoUri = result.assets[0].uri;
        debugLog('Selected video URI:', videoUri);
        
        // Navigate to VideoReviewScreen with the selected video
        navigation.navigate('VideoReview', {
          videoUri,
          fromGallery: true,
          userId: currentUserId,
          continueOnboarding: true, // Pass the flag along
          forceFlow: true // Pass the force flag along
        });
      }
    } catch (error) {
      setLoading(false);
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  // Navigate to demo path screen when user doesn't have videos
  const handleNoVideos = async () => {
    const currentUserId = await getCurrentUserId();
    
    // Force onboarding to be incomplete
    if (currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', currentUserId);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
    
    navigation.navigate('ChooseDemoPath', {
      userId: currentUserId,
      continueOnboarding: true, // Pass the flag along
      forceFlow: true // Pass the force flag along
    });
  };
  
  // Handle back button press
  const handleBack = () => {
    // Navigate back to OnboardingSummary screen
    navigation.navigate('OnboardingSummary');
  };

  // Handle Show Me button press - triggers the reveal sequence
  const handleShowMe = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    
    // Stop the pulse animation
    showMeButtonPulse.stopAnimation();
    showMeButtonPulse.setValue(1);
    
    // Stop the shimmer animation
    headerShimmer.stopAnimation();
    headerShimmer.setValue(1);
    
    // Create the magical reveal sequence
    Animated.sequence([
      // First, scale down the Show Me button and fade out header
      Animated.parallel([
        Animated.timing(showMeButtonScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(showMeButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        // Fade out the header
        Animated.timing(headerFadeOut, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]),
      
      // Small delay before content appears
      Animated.delay(200),
      
      // Reveal content with staggered animations
      Animated.parallel([
        // Set content reveal for overall opacity
        Animated.timing(contentRevealAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        
        // Video frames with enhanced entrance
        Animated.sequence([
          Animated.parallel([
            Animated.timing(videoFrameAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.spring(videoFrameScaleAnim, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            })
          ])
        ]),
        
        // Question and buttons with delay
        Animated.sequence([
          Animated.delay(400),
          Animated.parallel([
            // Title fade and scale
            Animated.parallel([
              Animated.timing(titleOpacityAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
              Animated.spring(titleAnim, {
                toValue: 1,
                tension: 55,
                friction: 9,
                useNativeDriver: true,
              })
            ]),
            
            // Buttons entrance
            Animated.sequence([
              Animated.delay(200),
              Animated.timing(buttonsAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              })
            ])
          ])
        ])
      ])
    ]).start();
  };

  // Handle Show Me button animations
  const handleShowMeButtonPressIn = () => {
    if (!isRevealed) {
      Animated.spring(showMeButtonScale, {
        toValue: 0.92,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleShowMeButtonPressOut = () => {
    if (!isRevealed) {
      Animated.spring(showMeButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  };

  // Get the image source based on gender
  const getImageSource = (position, defaultSource) => {
    // Determine if we should use male or female images
    const showMaleImages = userGender === 'Male'; // Default to male if gender is null
    const showFemaleImages = userGender === 'Female';
    
    // Define the image sources based on gender
    if (showMaleImages) {
      // High-quality male weightlifting images - specific exercises (CORRECTED)
      if (position === 'main') return { uri: 'https://source.unsplash.com/GXTfOkAQLZA?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (from user)
      if (position === 'left') return { uri: 'https://source.unsplash.com/ui45PyGUsBY?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (from user)
      if (position === 'right') return { uri: 'https://source.unsplash.com/fGAgXh6QQEU?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (from user)
    } else if (showFemaleImages) {
      // High-quality female weightlifting images - specific exercises 
      if (position === 'main') return { uri: 'https://source.unsplash.com/LT4bLdgtBug?auto=format&fit=crop&w=1000&q=80' }; // Woman lifting (from user)
      if (position === 'left') return { uri: 'https://source.unsplash.com/E1DKyChPV0o?auto=format&fit=crop&w=1000&q=80' }; // Woman lifting (from user)
      if (position === 'right') return { uri: 'https://source.unsplash.com/aHqe_NrxrUk?auto=format&fit=crop&w=1000&q=80' }; // Woman lifting (from user)
    }
    
    // Default fallback images if gender is not set - use new MALE images as fallback
    if (position === 'main') return { uri: 'https://source.unsplash.com/GXTfOkAQLZA?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (fallback)
    if (position === 'left') return { uri: 'https://source.unsplash.com/ui45PyGUsBY?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (fallback)
    if (position === 'right') return { uri: 'https://source.unsplash.com/fGAgXh6QQEU?auto=format&fit=crop&w=1000&q=80' }; // Man lifting (fallback)
  };

  // Video placeholder frames
  const renderVideoFrames = () => {
    return (
      <Animated.View 
        style={[
          styles.videoFramesContainer,
          {
            opacity: videoFrameAnim,
            transform: [
              { scale: videoFrameScaleAnim },
              { 
                translateY: videoFrameAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }) 
              }
            ]
          }
        ]}
      >
        {/* Video frame 1 - Main central frame */}
        <Animated.View 
          style={[
            styles.videoFrameMain,
            {
              transform: [
                { 
                  translateY: videoFrame1FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -12, 0],
                  }) 
                },
                {
                  scale: videoFrame1FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.02, 1],
                  })
                },
                {
                  rotate: videoFrame1FloatAnim.interpolate({
                    inputRange: [0, 0.25, 0.5, 0.75, 1],
                    outputRange: ['0deg', '1deg', '0deg', '-1deg', '0deg'],
                  })
                }
              ]
            }
          ]}
        >
          <ImageBackground 
            source={getImageSource('main')} 
            style={styles.videoImage}
            imageStyle={styles.videoImageStyle}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
              style={styles.videoGradient}
            >
              <View style={styles.playIconContainer}>
                <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </ImageBackground>
        </Animated.View>
        
        {/* Video frame 2 - Left tilted frame */}
        <Animated.View 
          style={[
            styles.videoFrameLeft,
            {
              transform: [
                { 
                  rotate: videoFrame2FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['-5deg', '-7deg', '-5deg'],
                  })
                },
                { 
                  translateY: videoFrame2FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -15, 0],
                  }) 
                },
                {
                  translateX: videoFrame2FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -5, 0],
                  })
                },
                {
                  scale: videoFrame2FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.98, 1],
                  })
                }
              ]
            }
          ]}
        >
          <Image 
            source={getImageSource('left')} 
            style={styles.videoImageSmall}
            resizeMode="cover"
          />
        </Animated.View>
        
        {/* Video frame 3 - Right tilted frame */}
        <Animated.View 
          style={[
            styles.videoFrameRight,
            {
              transform: [
                { 
                  rotate: videoFrame3FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['8deg', '10deg', '8deg'],
                  })
                },
                { 
                  translateY: videoFrame3FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -10, 0],
                  }) 
                },
                {
                  translateX: videoFrame3FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 3, 0],
                  })
                },
                {
                  scale: videoFrame3FloatAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.03, 1],
                  })
                }
              ]
            }
          ]}
        >
          <Image 
            source={getImageSource('right')} 
            style={styles.videoImageSmall}
            resizeMode="cover"
          />
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Animated header that moves from center to top */}
          <Animated.View 
            style={[
              styles.animatedHeaderContainer,
              {
                opacity: headerFadeOut,
                transform: [
                  {
                    translateY: headerPositionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_HEIGHT * 0.25, 0], // More centered position
                    })
                  },
                  {
                    scale: headerFadeOut.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    })
                  }
                ],
                pointerEvents: isRevealed ? 'none' : 'auto',
              }
            ]}
          >
            <Animated.Text 
              style={[
                styles.headerTitle,
                {
                  opacity: headerTitleAnimation,
                  transform: [
                    {
                      scale: Animated.multiply(
                        headerPositionAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.15, 1], // Slightly smaller when centered for better fit
                        }),
                        headerTitleAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.9, 1.05, 1],
                        })
                      )
                    }
                  ]
                }
              ]}
            >
              <Animated.Text 
                style={[
                  styles.headerTitleLight,
                  {
                    opacity: firstLineAnim,
                    transform: [
                      {
                        translateY: firstLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-12, 0],
                        })
                      },
                      {
                        translateX: firstLineAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [-20, 5, 0],
                        })
                      }
                    ]
                  }
                ]}
              >
                Now, let us show you{'\n'}
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.headerTitleBold,
                  {
                    opacity: Animated.multiply(
                      secondLineAnim,
                      headerShimmer.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.85, 1, 0.85],
                      })
                    ),
                    transform: [
                      {
                        translateY: secondLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        })
                      },
                      {
                        scale: secondLineAnim.interpolate({
                          inputRange: [0, 0.7, 1],
                          outputRange: [0.8, 1.1, 1],
                        })
                      },
                      {
                        rotate: secondLineAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['-2deg', '1deg', '0deg'],
                        })
                      }
                    ]
                  }
                ]}
              >
                How GymVid Works!
              </Animated.Text>
            </Animated.Text>
          </Animated.View>

          {/* Show Me button - appears below centered header */}
          <Animated.View
            style={[
              styles.showMeButtonContainer,
              {
                opacity: showMeButtonAnim,
                transform: [
                  {
                    scale: Animated.multiply(showMeButtonScale, showMeButtonPulse)
                  },
                  {
                    translateY: showMeButtonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }
                ],
                pointerEvents: isRevealed ? 'none' : 'auto',
              }
            ]}
          >
            <TouchableOpacity
              style={styles.showMeButton}
              onPress={handleShowMe}
              onPressIn={handleShowMeButtonPressIn}
              onPressOut={handleShowMeButtonPressOut}
              activeOpacity={0.9}
              disabled={isRevealed}
            >
              <LinearGradient
                colors={['#0099FF', '#0066DD', '#0044BB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.showMeGradient}
              >
                <Text style={styles.showMeButtonText}>Show Me</Text>
                <Ionicons name="sparkles" size={20} color="#fff" style={styles.showMeIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Content that reveals after Show Me is pressed */}
          <Animated.View
            style={[
              styles.revealContent,
              {
                opacity: contentRevealAnim,
                transform: [
                  {
                    translateY: contentRevealAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }
                ],
                pointerEvents: isRevealed ? 'auto' : 'none',
              }
            ]}
          >
            {/* Video frames section */}
            <View style={styles.videoSection}>
              {renderVideoFrames()}
            </View>
            
            {/* Bottom section with question and buttons */}
            <View style={styles.bottomSection}>
              {/* Question text */}
              <View style={styles.questionContainer}>
                <Animated.Text
                  style={[
                    styles.titleText,
                    { 
                      opacity: titleOpacityAnim,
                      transform: [
                        { 
                          scale: titleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.9, 1.02, 1],
                            extrapolate: 'clamp'
                          })
                        },
                        {
                          translateY: titleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                            extrapolate: 'clamp'
                          })
                        }
                      ] 
                    }
                  ]}
                >
                  {'Do you have any videos of you lifting?'}
                </Animated.Text>
              </View>
              
              {/* Buttons */}
              <Animated.View 
                style={[
                  styles.buttonsContainer, 
                  { 
                    opacity: buttonsAnim,
                    transform: [
                      { 
                        translateY: buttonsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                          extrapolate: 'clamp'
                        })
                      },
                      {
                        scale: buttonsAnim.interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.95, 1.01, 1],
                          extrapolate: 'clamp'
                        })
                      }
                    ]
                  }
                ]}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: primaryButtonScale }],
                    width: '100%',
                  }}
                >
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={openMediaPicker}
                    onPressIn={handlePrimaryButtonPressIn}
                    onPressOut={handlePrimaryButtonPressOut}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons name="videocam" size={24} color={colors.white} style={styles.buttonIcon} />
                      <Text style={styles.primaryButtonText}>Yes, I have a GymVid Ready!</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
                
                <Animated.View
                  style={{
                    transform: [{ scale: secondaryButtonScale }],
                    width: '100%',
                  }}
                >
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={handleNoVideos}
                    onPressIn={handleSecondaryButtonPressIn}
                    onPressOut={handleSecondaryButtonPressOut}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <MaterialCommunityIcons name="video-off" size={24} color={colors.darkGray} style={styles.buttonIcon} />
                    <Text style={styles.secondaryButtonText}>No, I don't have any vids yet</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeContainer: {
    flex: 1,
  },
  header: {
    height: 70, 
    paddingTop: 20, 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20, // Ensure header is above video frames
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  videoSection: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.4, // Increased height for better use of space
    marginTop: 25, // Reduced from 50 to shift content up
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 5,
  },
  bottomSection: {
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 10,
    marginTop: 0, // Reduced margin since we have more space
    paddingTop: 0,
  },
  questionContainer: {
    width: '100%',
    marginBottom: 35,
    paddingHorizontal: 0,
    paddingTop: 20, // Reduced from 20 to bring question text closer to videos
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    lineHeight: 40,
    marginHorizontal: 0,
    width: '100%',
    paddingHorizontal: 10,
  },
  videoFramesContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFrameMain: {
    width: SCREEN_WIDTH * 0.48, // Slightly increased
    height: SCREEN_WIDTH * 0.48 * 1.78, // 16:9 aspect ratio
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', // Subtle border
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  videoFrameLeft: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.26, // Slightly increased
    height: SCREEN_WIDTH * 0.26 * 1.78,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#000',
    left: -15,
    top: 55, // Adjusted position
    zIndex: 1,
  },
  videoFrameRight: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.23, // Slightly increased
    height: SCREEN_WIDTH * 0.23 * 1.78,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#000',
    right: -5,
    top: 75, // Adjusted position
    zIndex: 1,
  },
  videoImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  videoImageStyle: {
    borderRadius: 14,
  },
  videoImageSmall: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  videoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%', // Increased from 40%
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 0,
  },
  primaryButton: {
    backgroundColor: '#0070E0', // Slightly deeper blue for better contrast
    borderRadius: 16,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // Slightly reduced for better fit
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0', // Slightly darker border for better definition
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: colors.darkGray,
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(220, 220, 220, 0.8)',
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 26,
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
    paddingHorizontal: 20,
  },
  headerTitleLight: {
    fontWeight: '400',
    fontSize: 24,
    color: '#505050',
    opacity: 0.9,
  },
  headerTitleBold: {
    fontWeight: '800',
    fontSize: 27,
    color: '#1A1A1A',
    letterSpacing: -1,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  animatedHeaderContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  showMeButtonContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25 + 120, // Position below centered header
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  showMeButton: {
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
  showMeButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  showMeIcon: {
    marginLeft: 10,
  },
  revealContent: {
    flex: 1,
    width: '100%',
  },
  showMeGradient: {
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 