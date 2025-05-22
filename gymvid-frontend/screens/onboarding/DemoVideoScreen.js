import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[DEMO-VIDEO]', ...args);
  }
};

// Sample video from S3
const SAMPLE_VIDEO_URL = 'https://gymvid-user-uploads.s3.amazonaws.com/manual_logs/videos/Jamie_Deadlift.mov';
const THUMBNAIL_URL = 'https://gymvid-user-uploads.s3.amazonaws.com/manual_logs/thumbnails/Jamie_Deadlift.jpg'; // Create a thumbnail if needed

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 1.5; // 3:2 aspect ratio

export default function DemoVideoScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const isFocused = useIsFocused();
  const videoRef = useRef(null);
  const { updateProfile } = useAuth();
  
  // Get route params
  const userId = route.params?.userId;
  const continueOnboarding = route.params?.continueOnboarding === true;
  const forceFlow = route.params?.forceFlow === true;
  
  debugLog('DemoVideoScreen params:', { userId, continueOnboarding, forceFlow });
  
  // CRITICAL: Force onboarding to be incomplete when this screen loads
  useEffect(() => {
    if (isFocused) {
      const forceOnboardingIncomplete = async () => {
        try {
          const currentUserId = await getCurrentUserId();
          if (currentUserId) {
            // Force-update onboarding_complete to false in Supabase
            await supabase
              .from('users')
              .update({ onboarding_complete: false })
              .eq('id', currentUserId);
            
            debugLog('Force-set onboarding_complete=false in DemoVideoScreen');
            
            // Also clear any local completion flags
            await AsyncStorage.setItem('onboardingInProgress', 'true');
            await AsyncStorage.removeItem('onboardingComplete');
          }
        } catch (error) {
          console.error('Error in forceOnboardingIncomplete:', error);
        }
      };
      
      forceOnboardingIncomplete();
    }
  }, [isFocused]);

  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Function to get the current user ID
  const getCurrentUserId = async () => {
    try {
      // Try to get user from route params first
      if (route.params?.userId) {
        debugLog('Using userId from route params:', route.params.userId);
        return route.params.userId;
      }
      
      // Try to get user from Supabase auth
      try {
        const user = supabase.auth.user();
        if (user && user.id) {
          debugLog('Using userId from Supabase auth:', user.id);
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

  // Function to mark onboarding as complete
  const markOnboardingComplete = async () => {
    try {
      debugLog('Marking onboarding as complete');
      
      // Get the user ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('Cannot mark onboarding as complete: No user ID available');
        return;
      }
      
      // Set flag in AsyncStorage
      await AsyncStorage.setItem('onboardingComplete', 'true');
      await AsyncStorage.removeItem('onboardingInProgress');
      
      // Update Supabase
      const { error } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', userId);
        
      if (error) {
        console.error('Error marking onboarding as complete in Supabase:', error);
      } else {
        debugLog('Successfully marked onboarding as complete in Supabase');
      }
      
      // Also try with the updateProfile function from auth context
      try {
        await updateProfile({ onboarding_complete: true });
        debugLog('Successfully marked onboarding as complete via updateProfile');
      } catch (err) {
        console.error('Error in updateProfile:', err);
      }
      
      // Force refresh auth session to ensure the new onboarding state is picked up
      try {
        await supabase.auth.refreshSession();
        debugLog('Refreshed auth session');
      } catch (refreshErr) {
        console.error('Error refreshing auth session:', refreshErr);
      }
    } catch (err) {
      console.error('Error in markOnboardingComplete:', err);
    }
  };

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('DemoVideo');
    }
  }, [isFocused, updateProgress]);

  // Handle playback status changes
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      if (status.isPlaying) {
        setPlaying(true);
      } else {
        setPlaying(false);
      }
      
      if (loading && status.isLoaded) {
        setLoading(false);
        setVideoReady(true);
      }
    } else if (status.error) {
      console.error('Video playback error:', status.error);
      setLoading(false);
      Alert.alert('Video Error', 'There was a problem playing this video');
    }
  };

  // Run entrance animations
  useEffect(() => {
    const animationSequence = Animated.stagger(100, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Fade in the title
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Slide in content from right
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      
      // Fade in content
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    
    // Start the animation sequence
    animationSequence.start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(0);
      contentAnim.setValue(0);
      
      // Restart the animation sequence
      animationSequence.start();
    });
    
    return () => {
      unsubFocus();
      // Stop video playback when leaving the screen
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    };
  }, [navigation]);

  // Toggle video playback
  const togglePlayback = async () => {
    if (videoRef.current) {
      if (playing) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };
  
  // Use the demo video
  const handleUseVideo = async () => {
    // Only mark onboarding as complete when the user is actually going to finish
    // the flow in VideoReview. Don't mark it complete here yet.
    
    // Get current user ID
    const currentUserId = await getCurrentUserId();
    
    // Force onboarding to be incomplete before navigating away
    if (currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', currentUserId);
        
        debugLog('Set onboarding_complete=false before navigating from DemoVideo');
        
        // Also clear any local completion flags
        await AsyncStorage.setItem('onboardingInProgress', 'true');
        await AsyncStorage.removeItem('onboardingComplete');
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
    
    // Pass demo video info to the next screen
    navigation.navigate('VideoReview', {
      videoUri: SAMPLE_VIDEO_URL,
      isDemo: true,
      onboardingComplete: false, // We'll mark it complete in VideoReview
      userId: currentUserId,
      continueOnboarding: true,
      forceFlow: true
    });
  };

  const handleContinue = async () => {
    // Only mark onboarding as complete when the user is actually going to finish
    // the flow in Paywall. Don't mark it complete here yet.
    
    // Get current user ID
    const currentUserId = await getCurrentUserId();
    
    // Force onboarding to be incomplete before navigating away
    if (currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', currentUserId);
        
        debugLog('Set onboarding_complete=false before navigating from DemoVideo');
        
        // Also clear any local completion flags
        await AsyncStorage.setItem('onboardingInProgress', 'true');
        await AsyncStorage.removeItem('onboardingComplete');
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
    
    // Navigate to Paywall screen with flag indicating onboarding is still in progress
    navigation.navigate('Paywall', {
      exerciseLogged: {
        exercise: 'Bench Press',
        weight: '225 lbs',
        reps: 8,
        date: new Date().toDateString()
      },
      onboardingComplete: false, // This will be marked at the end of the flow
      userId: currentUserId,
      continueOnboarding: true,
      forceFlow: true
    });
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
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sample Video</Text>
        </View>

        <View style={styles.contentContainer}>
          <Animated.Text
            style={[
              styles.titleText,
              { 
                opacity: titleAnim,
                transform: [
                  { 
                    scale: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            Let's see how GymVid works
          </Animated.Text>
          
          <Animated.View 
            style={[
              styles.videoContainer, 
              { 
                opacity: contentAnim,
                transform: [
                  { 
                    translateY: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }
            ]}
          >
            <Video
              ref={videoRef}
              source={{ uri: SAMPLE_VIDEO_URL }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="cover"
              shouldPlay={false}
              isLooping={false}
              style={styles.video}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              useNativeControls={false}
            />
            
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}
            
            {!playing && videoReady && (
              <TouchableOpacity
                style={styles.playButtonOverlay}
                onPress={togglePlayback}
                activeOpacity={0.7}
              >
                <View style={styles.playButton}>
                  <Ionicons name="play" size={40} color="#FFF" />
                </View>
              </TouchableOpacity>
            )}
            
            {playing && (
              <TouchableOpacity
                style={styles.pauseOverlay}
                onPress={togglePlayback}
                activeOpacity={0.9}
              >
                {/* Transparent overlay to capture taps */}
              </TouchableOpacity>
            )}
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.descriptionContainer,
              {
                opacity: contentAnim,
                transform: [
                  {
                    translateY: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }
            ]}
          >
            <Text style={styles.exerciseLabel}>Exercise:</Text>
            <Text style={styles.exerciseName}>Barbell Deadlift</Text>
            
            <TouchableOpacity 
              style={styles.useVideoButton}
              onPress={handleUseVideo}
              activeOpacity={0.8}
            >
              <Text style={styles.useVideoButtonText}>Use this video</Text>
              <Ionicons name="arrow-forward" size={24} color={colors.white} style={styles.buttonIcon} />
            </TouchableOpacity>
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
    height: 60,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
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
    top: 15,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
  },
  videoContainer: {
    width: SCREEN_WIDTH - 40,
    height: VIDEO_HEIGHT,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    marginBottom: 20,
  },
  exerciseLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 20,
  },
  useVideoButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  useVideoButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 5,
  },
}); 