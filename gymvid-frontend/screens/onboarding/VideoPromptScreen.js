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
  ImageBackground
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

  // Create floating animation for video frames
  useEffect(() => {
    // Start subtle floating animations for the video frames
    const createFloatingAnimation = (animValue, duration, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          })
        ])
      );
    };

    // Create animations with different durations and delays for natural movement
    const float1 = createFloatingAnimation(videoFrame1FloatAnim, 3000, 0);
    const float2 = createFloatingAnimation(videoFrame2FloatAnim, 3500, 500);
    const float3 = createFloatingAnimation(videoFrame3FloatAnim, 2800, 1000);

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
    const animationSequence = Animated.stagger(120, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Animate in the video frames
      Animated.parallel([
        Animated.timing(videoFrameAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(videoFrameScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]),
      
      // Fade in the title with improved animation
      Animated.parallel([
        Animated.timing(titleOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        })
      ]),
      
      // Fade in buttons
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);
    
    // Start the animation sequence
    animationSequence.start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      titleAnim.setValue(0);
      titleOpacityAnim.setValue(0);
      buttonsAnim.setValue(0);
      videoFrameAnim.setValue(0);
      videoFrameScaleAnim.setValue(0.95);
      
      // Restart the animation sequence
      animationSequence.start();
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
  
  const handleBack = () => {
    // Navigate back to OnboardingSummary screen
    navigation.navigate('OnboardingSummary');
  };

  // Get the image source based on gender
  const getImageSource = (position, defaultSource) => {
    // Determine if we should use male or female images
    const showMaleImages = userGender === 'Male'; // Default to male if gender is null
    const showFemaleImages = userGender === 'Female';
    
    // Define the image sources based on gender
    if (showMaleImages) {
      if (position === 'main') return require('../../assets/male-video-1.jpg');
      if (position === 'left') return require('../../assets/male-video-2.jpg');
      if (position === 'right') return require('../../assets/male-video-3.jpg');
    } else if (showFemaleImages) {
      if (position === 'main') return require('../../assets/female-video-1.jpg');
      if (position === 'left') return require('../../assets/female-video-2.jpg');
      if (position === 'right') return require('../../assets/female-video-3.jpg');
    }
    
    // Default fallback images if gender is not set or doesn't match
    if (position === 'main') return require('../../assets/video-placeholder-1.jpg');
    if (position === 'left') return require('../../assets/video-placeholder-2.jpg');
    if (position === 'right') return require('../../assets/video-placeholder-3.jpg');
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
              { scale: videoFrameScaleAnim }
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
                    inputRange: [0, 1],
                    outputRange: [0, -8],
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
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
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
                { rotate: '-5deg' },
                { 
                  translateY: videoFrame2FloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
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
                { rotate: '8deg' },
                { 
                  translateY: videoFrame3FloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
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
          {/* Video frames placeholder component - placed directly below header with safe margin */}
          <View style={styles.videoSection}>
            <Text style={styles.headerTitle}>How GymVid Works...</Text>
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
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                          extrapolate: 'clamp'
                        })
                      }
                    ] 
                  }
                ]}
              >
                Do you have any vids already on your phone?
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
                        outputRange: [20, 0],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={openMediaPicker}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="videocam" size={24} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Yes, Choose Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={handleNoVideos}
                disabled={loading}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="video-off" size={24} color={colors.darkGray} style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>No, I'll Record Later</Text>
              </TouchableOpacity>
              
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            </Animated.View>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoSection: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.45, // Increased to fit header
    marginTop: 10, // Reduced from 20
    marginBottom: 10,
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
    marginBottom: 30, // Space at bottom
  },
  questionContainer: {
    width: '100%',
    marginBottom: 25, // Space between question and buttons
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    lineHeight: 36,
  },
  videoFramesContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFrameMain: {
    width: SCREEN_WIDTH * 0.45, // Reduced from 0.52
    height: SCREEN_WIDTH * 0.45 * 1.78, // 16:9 aspect ratio
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: '#000',
    zIndex: 2,
  },
  videoFrameLeft: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.24, // Reduced from 0.28
    height: SCREEN_WIDTH * 0.24 * 1.78,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#000',
    left: -10,
    top: 60, // Adjusted position
    zIndex: 1,
  },
  videoFrameRight: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.21, // Reduced from 0.24
    height: SCREEN_WIDTH * 0.21 * 1.78,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#000',
    right: 0,
    top: 80, // Adjusted position
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
    height: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 0,
  },
  primaryButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  secondaryButtonText: {
    color: colors.darkGray,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
}); 