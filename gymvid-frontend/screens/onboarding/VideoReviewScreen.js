import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[VIDEO-REVIEW]', ...args);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 1.5; // 3:2 aspect ratio

export default function VideoReviewScreen({ navigation, route }) {
  // Get video URI from route params
  const videoUri = route.params?.videoUri;
  const isDemo = route.params?.isDemo || false;
  const fromGallery = route.params?.fromGallery || false;
  const onboardingComplete = route.params?.onboardingComplete || false;
  const continueOnboarding = route.params?.continueOnboarding || false;
  const userId = route.params?.userId;
  
  debugLog('VideoReviewScreen params:', { isDemo, fromGallery, continueOnboarding, userId });
  
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isFocused = useIsFocused();
  const videoRef = useRef(null);
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const videoAnim = useRef(new Animated.Value(0)).current;

  // Function to get the current user ID
  const getCurrentUserId = async () => {
    try {
      // If we have it from route params, use that
      if (userId) {
        return userId;
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
      debugLog('Marking onboarding as complete - FINAL STEP');
      
      // Get the user ID
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error('Cannot mark onboarding as complete: No user ID available');
        return;
      }
      
      // Set flag in AsyncStorage
      await AsyncStorage.setItem('onboardingComplete', 'true');
      await AsyncStorage.removeItem('onboardingInProgress');
      
      // Update Supabase - THIS IS THE CRITICAL STEP
      const { error } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', currentUserId);
        
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
      updateProgress('VideoReview');
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
      
      if (!videoReady && status.isLoaded) {
        setVideoReady(true);
      }
    } else if (status.error) {
      console.error('Video playback error:', status.error);
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
      
      // Fade in video
      Animated.timing(videoAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      
      // Fade in form
      Animated.timing(formAnim, {
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
      videoAnim.setValue(0);
      formAnim.setValue(0);
      
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
  }, [navigation, videoUri]);

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

  // Validate the weight input
  const validateForm = () => {
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return false;
    }
    
    return true;
  };

  // Handle logging the lift
  const handleLogLift = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    // If this is part of the onboarding flow, mark onboarding as complete NOW
    // This is the final step where we should set onboarding_complete to true
    if (continueOnboarding) {
      debugLog('This is part of onboarding flow - marking onboarding as complete');
      await markOnboardingComplete();
    }
    
    // Simulate processing the video and logging the lift
    setTimeout(() => {
      setLoading(false);
      
      // Navigate to PaywallScreen
      navigation.navigate('Paywall', {
        videoLogged: {
          videoUri,
          exercise: 'Barbell Bench Press', // Placeholder exercise name
          reps: 5, // Placeholder reps count
          weight: Number(weight)
        },
        onboardingComplete: true, // Mark as complete since we've finished onboarding
        userId: userId
      });
    }, 1500);
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
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.gray} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isDemo ? 'Demo Video' : fromGallery ? 'Your Video' : 'Review Video'}
            </Text>
            <View style={styles.headerSpacer} />
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
              {isDemo ? 'Review Demo Lift' : 'Review Your Lift'}
            </Animated.Text>
            
            {/* Video Player */}
            <Animated.View 
              style={[
                styles.videoContainer, 
                { 
                  opacity: videoAnim,
                  transform: [
                    { 
                      translateY: videoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            >
              {videoUri ? (
                <>
                  <Video
                    ref={videoRef}
                    source={{ uri: videoUri }}
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
                  
                  {!videoReady && (
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
                </>
              ) : (
                <View style={styles.noVideoContainer}>
                  <Ionicons name="videocam-off" size={60} color={colors.gray} />
                  <Text style={styles.noVideoText}>No video available</Text>
                </View>
              )}
            </Animated.View>
            
            {/* Exercise Info and Input Form */}
            <Animated.View 
              style={[
                styles.formContainer, 
                { 
                  opacity: formAnim,
                  transform: [
                    { 
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.exerciseInfoContainer}>
                <View style={styles.exerciseInfoRow}>
                  <Text style={styles.exerciseInfoLabel}>Exercise:</Text>
                  <Text style={styles.exerciseInfoValue}>Barbell Bench Press</Text>
                </View>
                
                <View style={styles.exerciseInfoRow}>
                  <Text style={styles.exerciseInfoLabel}>Reps:</Text>
                  <Text style={styles.exerciseInfoValue}>5</Text>
                </View>
              </View>
              
              <View style={styles.weightInputContainer}>
                <Text style={styles.weightInputLabel}>Enter weight lifted (kg/lb)</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="weight" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Enter weight"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.logButton,
                  (!weight || loading) && styles.logButtonDisabled
                ]}
                onPress={handleLogLift}
                disabled={!weight || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.logButtonText}>Log Lift</Text>
                    <Ionicons name="checkmark" size={24} color={colors.white} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
  },
  headerSpacer: {
    width: 40, // Same width as back button for alignment
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
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
    height: SCREEN_WIDTH,
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
  noVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoText: {
    color: colors.gray,
    fontSize: 16,
    marginTop: 10,
  },
  formContainer: {
    width: '100%',
  },
  exerciseInfoContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseInfoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray,
  },
  exerciseInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  weightInputContainer: {
    marginBottom: 20,
  },
  weightInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 10,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    height: '100%',
  },
  logButton: {
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
  logButtonDisabled: {
    backgroundColor: '#AACEF5',
    shadowOpacity: 0,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 5,
  },
}); 