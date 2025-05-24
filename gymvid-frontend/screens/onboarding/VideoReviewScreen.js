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
  Platform,
  Modal
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { API_ENDPOINTS, checkBackendHealth } from '../../config/api';
import { useToast } from '../../components/ToastProvider';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[VIDEO-REVIEW]', ...args);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 1.5; // 3:2 aspect ratio

// Add VideoPreviewModal component
const VideoPreviewModal = ({ visible, videoUri, onClose }) => {
  const videoRef = useRef(null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        </View>
      </View>
    </Modal>
  );
};

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
  const toast = useToast();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const videoAnim = useRef(new Animated.Value(0)).current;

  // Add states for thumbnail and video preview
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Add state to track if the set is completed
  const [isSetCompleted, setIsSetCompleted] = useState(false);

  // Add states for dynamic exercise data and loading
  const [exerciseName, setExerciseName] = useState('');
  const [repCount, setRepCount] = useState('');
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isLoadingReps, setIsLoadingReps] = useState(false);
  
  // Animation values for smooth data transitions
  const exerciseOpacity = useRef(new Animated.Value(0)).current;
  const repOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

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

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy && __DEV__) {
        console.warn('⚠️ Backend health check failed - API calls may not work');
        console.warn('📍 Make sure the backend is running at https://gymvid-app.onrender.com');
      }
    };
    
    checkBackend();
  }, []);

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
          exercise: exerciseName || 'Unknown Exercise',
          reps: Number(repCount) || 0,
          weight: Number(weight)
        },
        onboardingComplete: true, // Mark as complete since we've finished onboarding
        userId: userId
      });
    }, 1500);
  };

  // API function to predict exercise
  const predictExercise = async (videoUri) => {
    try {
      debugLog('Predicting exercise for video:', videoUri);
      debugLog('Using API endpoint:', API_ENDPOINTS.PREDICT_EXERCISE);
      
      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      });

      const response = await fetch(API_ENDPOINTS.PREDICT_EXERCISE, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.movement;
    } catch (error) {
      console.error('Error predicting exercise:', error);
      
      // Show user-friendly error message
      if (error.message && error.message.includes('Network request failed')) {
        console.error('⚠️ Network Error: Cannot connect to backend server');
        console.error('📍 Attempted URL:', API_ENDPOINTS.PREDICT_EXERCISE);
        
        // Show toast instead of alert
        toast.error('We couldn\'t reach the server — please try again.');
      } else {
        toast.error('Failed to analyze exercise. Please try again.');
      }
      
      // Return graceful fallback
      return 'Unknown Exercise';
    }
  };

  // API function to detect reps
  const detectReps = async (videoUri) => {
    try {
      debugLog('Detecting reps for video:', videoUri);
      debugLog('Using API endpoint:', API_ENDPOINTS.DETECT_REPS);
      
      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      });

      const response = await fetch(API_ENDPOINTS.DETECT_REPS, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.rep_count;
    } catch (error) {
      console.error('Error detecting reps:', error);
      
      // No need to show another toast if exercise prediction already showed one
      // Just return graceful fallback
      return '-';
    }
  };

  // Analyze video when it changes
  const analyzeVideo = async (videoUri) => {
    if (!videoUri) return;

    // Start exercise loading animation
    setIsLoadingExercise(true);
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(loadingScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Predict exercise
    const movement = await predictExercise(videoUri);
    setExerciseName(movement);
    
    // Fade out loading and fade in exercise name
    Animated.sequence([
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(exerciseOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLoadingExercise(false);
    });

    // Start rep detection immediately
    setIsLoadingReps(true);
    const reps = await detectReps(videoUri);
    setRepCount(reps.toString());
    
    // Fade in rep count
    Animated.timing(repOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoadingReps(false);
    });
  };

  // Function to generate thumbnail
  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.5,
      });
      setThumbnailUri(uri);
      return uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  };
  
  // Generate thumbnail and analyze video when videoUri changes
  useEffect(() => {
    if (videoUri) {
      generateThumbnail(videoUri);
      analyzeVideo(videoUri);
    }
  }, [videoUri]);
  
  // Function to select video from library
  const selectVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newVideoUri = result.assets[0].uri;
        
        // Reset states for new video
        setExerciseName('');
        setRepCount('');
        exerciseOpacity.setValue(0);
        repOpacity.setValue(0);
        
        // Generate thumbnail for the selected video
        await generateThumbnail(newVideoUri);
        // Analyze the new video
        await analyzeVideo(newVideoUri);
        // Pass the new video to the parent component
        navigation.setParams({ videoUri: newVideoUri });
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };
  
  // Function to preview video
  const handleVideoPreview = () => {
    if (videoUri) {
      setIsPreviewVisible(true);
    }
  };
  
  // Function to close preview
  const closePreview = () => {
    setIsPreviewVisible(false);
  };

  // Update the handleCompleteSet function
  const handleCompleteSet = () => {
    setIsSetCompleted(!isSetCompleted);
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
              How to Log Your Lifts:
            </Animated.Text>
            
            {/* Remove Video Player section and only show Exercise Card */}
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
              <View style={styles.exerciseTableCard}>
                <View style={styles.exerciseTableHeader}>
                  <Animated.Text style={[styles.exerciseTableTitle, { opacity: exerciseOpacity }]}>
                    {exerciseName || 'Loading...'}
                  </Animated.Text>
                </View>
                
                <View style={styles.tableContainer}>
                  {/* Table header row */}
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.tableCellSetHeader}>
                      <Text style={styles.headerText}>#</Text>
                    </View>
                    <View style={styles.tableCellIconHeader}>
                      <Text style={styles.headerText}>GymVid</Text>
                    </View>
                    <View style={styles.tableCellHeaderInput}>
                      <Text style={styles.headerText}>Weight (kg)</Text>
                    </View>
                    <View style={styles.tableCellHeaderInput}>
                      <Text style={styles.headerText}>Reps</Text>
                    </View>
                    <View style={styles.tableCellCheckHeader}>
                      <Text style={styles.headerText}></Text>
                    </View>
                  </View>
                  
                  {/* Table data row */}
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellSet}>1</Text>
                    {thumbnailUri ? (
                      <TouchableOpacity 
                        style={styles.thumbnailContainer}
                        onPress={handleVideoPreview}
                      >
                        <Image 
                          source={{ uri: thumbnailUri }} 
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={styles.cameraButtonContainer}
                        onPress={selectVideo}
                      >
                        <View style={styles.cameraButtonInner}>
                          <Ionicons name="camera-outline" size={24} color={colors.gray} />
                        </View>
                      </TouchableOpacity>
                    )}
                    <TextInput 
                      style={styles.tableCellInput}
                      placeholder="0"
                      placeholderTextColor="#AAAAAA"
                      keyboardType="decimal-pad"
                      value={weight}
                      onChangeText={setWeight}
                    />
                    <View style={styles.tableCellInput}>
                      {isLoadingReps ? (
                        <ActivityIndicator 
                          size="small" 
                          color={colors.primary} 
                          style={styles.repSpinner}
                        />
                      ) : (
                        <Animated.Text 
                          style={[
                            styles.repCountText, 
                            { opacity: repOpacity }
                          ]}
                        >
                          {repCount || '-'}
                        </Animated.Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.tableCellCheck}
                      onPress={handleCompleteSet}
                    >
                      <View style={[
                        styles.checkSquare,
                        isSetCompleted && styles.checkSquareCompleted
                      ]}>
                        <Ionicons 
                          name="checkmark-sharp" 
                          size={24} 
                          color={isSetCompleted ? colors.white : colors.lightGray} 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Loading overlay for exercise detection */}
                {isLoadingExercise && (
                  <Animated.View 
                    style={[
                      styles.loadingOverlay,
                      {
                        opacity: loadingOpacity,
                        transform: [{ scale: loadingScale }]
                      }
                    ]}
                  >
                    <View style={styles.loadingContent}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>Analyzing exercise...</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
              
              {/* Only show the Log Lift button if weight is entered and set is completed */}
              {weight && isSetCompleted && (
                <TouchableOpacity 
                  style={[
                    styles.logButton,
                    loading && styles.logButtonDisabled
                  ]}
                  onPress={handleLogLift}
                  disabled={loading}
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
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Video Preview Modal */}
      <VideoPreviewModal
        visible={isPreviewVisible}
        videoUri={videoUri}
        onClose={closePreview}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
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
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 0,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: colors.darkGray,
    width: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
  },
  exerciseTableCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  exerciseTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  exerciseTableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
  },
  tableContainer: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 48,
  },
  tableCellSet: {
    width: 20,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    fontWeight: '600',
    marginRight: 8,
  },
  tableCellSetHeader: {
    width: 20,
    marginRight: 8,
  },
  tableCellIconHeader: {
    width: 48,
    marginRight: 8,
  },
  tableCellHeaderInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  headerText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableCellInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 0,
    paddingHorizontal: 4,
    marginHorizontal: 4,
  },
  tableCellCheck: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tableCellCheckHeader: {
    width: 48,
    marginLeft: 4,
  },
  checkSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkSquareCompleted: {
    backgroundColor: '#4cd964',
    borderColor: '#4cd964',
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  cameraButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  cameraButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    padding: 10,
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
  repSpinner: {
    flex: 1,
  },
  repCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 48,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray,
    marginTop: 12,
  },
}); 