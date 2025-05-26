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
  Modal,
  Easing,
  Pressable,
  Keyboard,
  InputAccessoryView,
  TouchableWithoutFeedback
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
import { useToast } from '../../components/ToastProvider';
import CoachingFeedbackModal from '../../components/CoachingFeedbackModal';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[VIDEO-REVIEW]', ...args);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 1.5; // 3:2 aspect ratio

// InputAccessoryView ID for keyboard toolbar
const inputAccessoryViewID = 'VideoReviewKeyboardToolbar';

// Keyboard Toolbar Component
const KeyboardToolbar = () => (
  <InputAccessoryView nativeID={inputAccessoryViewID}>
    <View style={styles.keyboardToolbar}>
      <View style={styles.keyboardToolbarSpacer} />
      <TouchableOpacity 
        style={styles.keyboardDoneButton}
        onPress={() => {
          Keyboard.dismiss();
        }}
      >
        <Text style={styles.keyboardDoneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  </InputAccessoryView>
);

// World-Class GuidedPopup Component Definition
const GuidedPopup = ({ 
  visible, 
  text, 
  targetLayout, 
  onClose, 
  forcePositionBelow = false, 
  highlightLayout, 
  screenBackgroundColor = colors.background,
  showIconButton = false,
  verticalOffset = 0
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, width: 0 });
  const [arrowStyle, setArrowStyle] = useState({});
  
  const ARROW_SIZE = 10;
  const POPUP_MARGIN_FROM_TARGET = 15;
  const SCREEN_PADDING = 15;
  const HIGHLIGHT_PADDING = 12; 
  const HIGHLIGHT_BORDER_RADIUS = 16;
  const HIGHLIGHT_VERTICAL_OFFSET = -15;
  const screenDims = Dimensions.get('window');

  debugLog(`GuidedPopup RENDER: text="${text}" visible_PROP=${visible} targetLayout_EXISTS=${!!targetLayout} animValue=${animValue._value}`);

  useEffect(() => {
    debugLog(`GuidedPopup useEffect: text="${text}" visible_PROP=${visible} targetLayout_EXISTS=${!!targetLayout}`);
    if (visible && targetLayout) {
      debugLog(`GuidedPopup useEffect INSIDE IF: text="${text}" - Calculating position...`);
      const popupWidth = screenDims.width - (2 * SCREEN_PADDING);
      const estimatedPopupHeight = text.length > 70 ? (showIconButton ? 70 : 100) : (showIconButton ? 55 : 85);
      let pTop, pLeft = SCREEN_PADDING;
      let arrStyleLocal = {};

      if (forcePositionBelow) {
        pTop = targetLayout.y + targetLayout.height + POPUP_MARGIN_FROM_TARGET + verticalOffset;
        arrStyleLocal = {
          bottom: '100%',
          left: targetLayout.x + targetLayout.width / 2 - pLeft - ARROW_SIZE,
          borderBottomWidth: ARROW_SIZE, borderBottomColor: colors.white,
          borderLeftWidth: ARROW_SIZE, borderLeftColor: 'transparent',
          borderRightWidth: ARROW_SIZE, borderRightColor: 'transparent',
        };
      } else {
        pTop = targetLayout.y + targetLayout.height + POPUP_MARGIN_FROM_TARGET + verticalOffset;
        arrStyleLocal = {
          bottom: '100%',
          left: (popupWidth / 2) - ARROW_SIZE,
          borderBottomWidth: ARROW_SIZE, borderBottomColor: colors.white,
          borderLeftWidth: ARROW_SIZE, borderLeftColor: 'transparent',
          borderRightWidth: ARROW_SIZE, borderRightColor: 'transparent',
        };
        if (pTop + estimatedPopupHeight > screenDims.height - SCREEN_PADDING) {
          pTop = targetLayout.y - estimatedPopupHeight - POPUP_MARGIN_FROM_TARGET + verticalOffset;
          arrStyleLocal = {
            top: '100%',
            left: (popupWidth / 2) - ARROW_SIZE,
            borderTopWidth: ARROW_SIZE, borderTopColor: colors.white,
            borderLeftWidth: ARROW_SIZE, borderLeftColor: 'transparent',
            borderRightWidth: ARROW_SIZE, borderRightColor: 'transparent',
          };
        }
      }
      
      if (pTop < SCREEN_PADDING) pTop = SCREEN_PADDING;
      if (!forcePositionBelow && (pTop + estimatedPopupHeight > screenDims.height - SCREEN_PADDING)){
          pTop = screenDims.height - estimatedPopupHeight - SCREEN_PADDING;
      }

      setPopupPosition({ top: pTop, left: pLeft, width: popupWidth });
      setArrowStyle(arrStyleLocal);

      Animated.spring(animValue, {
        toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
      }).start(() => {
        debugLog(`GuidedPopup ANIMATION IN COMPLETE for text="${text}"`);
      });
    } else {
      debugLog(`GuidedPopup useEffect ELSE: text="${text}" - Animating out or not showing (visible=${visible}, targetLayout=${!!targetLayout}).`);
      Animated.timing(animValue, {
        toValue: 0, duration: 200, easing: Easing.ease, useNativeDriver: true,
      }).start(() => {
         debugLog(`GuidedPopup ANIMATION OUT COMPLETE for text="${text}"`);
      });
    }
  }, [visible, targetLayout, text, forcePositionBelow, screenDims, showIconButton, verticalOffset]);

  if (!targetLayout && visible) { 
      debugLog(`GuidedPopup PRE-RETURN: text="${text}" IS visible but targetLayout is MISSING. Returning null.`);
      return null; 
  }
  
  // Only render the modal if visible is true. If visible is false, animations will drive opacity to 0.
  // The modal itself being removed from tree is handled by parent not rendering this component OR Modal visible=false.
  if (!visible && animValue._value === 0) {
    debugLog(`GuidedPopup OPTIMIZED RETURN: text="${text}" - Not visible and animation value is 0.`);
    return null;
  }

  const overlayPartStyle = {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    opacity: animValue,
  };

  // Calculate expanded highlight area with padding AND vertical offset
  const expandedHighlight = highlightLayout ? {
    x: highlightLayout.x - HIGHLIGHT_PADDING,
    y: highlightLayout.y - HIGHLIGHT_PADDING + HIGHLIGHT_VERTICAL_OFFSET,
    width: highlightLayout.width + (HIGHLIGHT_PADDING * 2),
    height: highlightLayout.height + (HIGHLIGHT_PADDING * 2),
  } : null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.fullScreenContainerForPressable} onPress={onClose}>
        {expandedHighlight ? (
          <>
            {/* Main overlay parts */}
            <Animated.View style={[overlayPartStyle, { top: 0, left: 0, width: screenDims.width, height: expandedHighlight.y }]} />
            <Animated.View style={[overlayPartStyle, { top: expandedHighlight.y + expandedHighlight.height, left: 0, width: screenDims.width, height: screenDims.height - (expandedHighlight.y + expandedHighlight.height) }]} />
            <Animated.View style={[overlayPartStyle, { top: expandedHighlight.y, left: 0, width: expandedHighlight.x, height: expandedHighlight.height }]} />
            <Animated.View style={[overlayPartStyle, { top: expandedHighlight.y, left: expandedHighlight.x + expandedHighlight.width, width: screenDims.width - (expandedHighlight.x + expandedHighlight.width), height: expandedHighlight.height }]} />
          </>
        ) : (
          <Animated.View style={[styles.fullScreenTouchableOverlay, { opacity: animValue }]} />
        )}
        {targetLayout && (
            <Animated.View 
              style={[
                styles.popupContainerAdvanced,
                {
                  top: popupPosition.top, left: popupPosition.left, width: popupPosition.width,
                  opacity: animValue, 
                  transform: [
                    { scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                    { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }
                  ],
                },
              ]}
            >
              <View style={[styles.popupArrowAdvanced, arrowStyle]} />
              <View style={[styles.popupBodyAdvanced, showIconButton && styles.popupBodyIconButtonLayout]}>
                <Text style={[styles.popupTextAdvanced, showIconButton && styles.popupTextIconButtonLayout]}>{text}</Text>
                {showIconButton ? (
                  <TouchableOpacity onPress={onClose} style={styles.popupIconDismissButton}>
                    <Ionicons name="arrow-forward" size={28} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onClose} style={styles.popupDismissButtonAdvanced}>
                    <Text style={styles.popupDismissButtonTextAdvanced}>Got it!</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
};

// Add VideoPreviewModal component
const VideoPreviewModal = ({ visible, videoUri, onClose }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const managePlayback = async () => {
      if (videoRef.current) {
        if (visible && videoUri) {
          try {
            // Load and play the video. setPositionAsync(0) ensures it starts from the beginning.
            // Using shouldPlay: true with loadAsync is generally effective.
            await videoRef.current.loadAsync({ uri: videoUri }, { shouldPlay: true });
            await videoRef.current.setPositionAsync(0); // Ensure it starts from the beginning
            debugLog('Modal video play initiated via loadAsync');
          } catch (error) {
            debugLog('Error playing video in modal via loadAsync:', error);
            // Fallback attempt if loadAsync had issues or for re-playing
            try {
                if (videoRef.current?.getStatusAsync && (await videoRef.current.getStatusAsync()).isLoaded) {
                    await videoRef.current.setPositionAsync(0);
                    await videoRef.current.playAsync();
                    debugLog('Modal video play initiated via playAsync fallback');
                } else {
                    // If not loaded, try to set URI and play
                    await videoRef.current.setURIAsync(videoUri);
                    await videoRef.current.playAsync();
                    debugLog('Modal video play initiated via setURIAsync and playAsync');
                }
            } catch (fallbackError) {
                debugLog('Error in playAsync fallback for modal video:', fallbackError);
            }
          }
        } else {
          // If modal is not visible or no video URI, stop the video
          try {
            await videoRef.current.stopAsync();
            debugLog('Modal video stopped');
          } catch (error) {
            // Suppress or log minor errors if stopAsync is called when not needed
            debugLog('Minor error stopping video in modal (possibly already stopped):', error);
          }
        }
      }
    };

    managePlayback();

    // Cleanup: stop video when modal is hidden or component unmounts
    return () => {
      if (videoRef.current) {
        videoRef.current.stopAsync().catch(err => debugLog('Error stopping video on cleanup:', err));
      }
    };
  }, [visible, videoUri]); // Rerun effect if visibility or URI changes

  if (!visible) {
    return null; // Don't render the modal if not visible
  }

  return (
    <Modal
      transparent={true}
      animationType="fade"
      onRequestClose={onClose} // Allows hardware back button to close modal on Android
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              {/* Increased icon size and added subtle background for better UX */}
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          {videoUri ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video} // Style defined in StyleSheet
              useNativeControls
              resizeMode="contain"
              isLooping={false} // Previews are typically not looped
              onError={(error) => debugLog('Modal Video Error:', error.error)} // Expo AV error has error.error
              onLoadStart={() => debugLog('Modal video load started')}
              onLoad={() => debugLog('Modal video loaded')}
            />
          ) : (
            // Show a loading indicator if URI is not yet available or video is loading
            <View style={styles.centeredMessage}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingVideoText}>Loading video...</Text>
            </View>
          )}
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
  const [reps, setReps] = useState('');
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
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [tempExerciseName, setTempExerciseName] = useState('');
  
  // Add state for animated ellipsis
  const [ellipsisCount, setEllipsisCount] = useState(0);
  
  // Animation values for smooth data transitions
  const exerciseOpacity = useRef(new Animated.Value(0)).current;
  const exerciseTranslateY = useRef(new Animated.Value(5)).current;
  const exerciseScale = useRef(new Animated.Value(0.98)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pencilOpacity = useRef(new Animated.Value(0)).current;
  const exerciseBlur = useRef(new Animated.Value(0.3)).current;

  // State for tooltips/guided popups
  const [tooltipStep, setTooltipStep] = useState(0);
  const [inputsRowLayout, setInputsRowLayout] = useState(null);
  const [exerciseCardLayout, setExerciseCardLayout] = useState(null);
  const [exerciseHeaderLayout, setExerciseHeaderLayout] = useState(null);
  const [tableAreaLayout, setTableAreaLayout] = useState(null);
  const [hasSeenTooltips, setHasSeenTooltips] = useState(false);

  // New state and ref for more robust tooltip triggering
  const [canShowLoadingTooltip, setCanShowLoadingTooltip] = useState(false);
  const initialLoadingRelevantActionDoneRef = useRef(false); // Tracks if video analysis has started

  const inputsRowRef = useRef(null);
  const exerciseCardRef = useRef(null);
  const exerciseHeaderRef = useRef(null);
  const tableAreaRef = useRef(null);
  const thumbnailRef = useRef(null);

  // Add ellipsis animation effect
  useEffect(() => {
    let interval;
    if (isLoadingExercise) {
      interval = setInterval(() => {
        setEllipsisCount(prev => (prev + 1) % 4);
      }, 500);
      
      // Start shimmer animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
    return () => {
      if (interval) clearInterval(interval);
      shimmerAnim.stopAnimation();
    };
  }, [isLoadingExercise]);

  // useEffect to check AsyncStorage for tooltip preference
  useEffect(() => {
    const checkTooltipsSeen = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenVideoReviewTooltips_v2');
        if (seen === null) {
          debugLog("TOOLTIP_DEBUG: No tooltip preference found, showing tooltips.");
          setHasSeenTooltips(false);
        } else {
          debugLog("TOOLTIP_DEBUG: Tooltips have been seen before, not showing.");
          setHasSeenTooltips(true);
        }
      } catch (e) {
        debugLog('Error reading tooltip pref', e); 
        setHasSeenTooltips(false); // Default to showing tooltips if error
      }
    };
    checkTooltipsSeen();
  }, []);
  
  // REVISED useEffect for triggering the first tooltip with DETAILED LOGGING
  useEffect(() => {
    const cardReady = exerciseCardLayout && exerciseCardLayout.width > 0 && exerciseCardLayout.height > 0;
    const headerReady = exerciseHeaderLayout && exerciseHeaderLayout.width > 0 && exerciseHeaderLayout.height > 0;
    const inputsReady = inputsRowLayout && inputsRowLayout.width > 0 && inputsRowLayout.height > 0;

    if (tooltipStep === 0 && !hasSeenTooltips) {
      if (cardReady && headerReady && inputsReady) {
        debugLog('VideoReviewScreen TOOLTIP_DEBUG: ALL LAYOUTS READY & VALID. Showing first tooltip.', 
          { layoutCard: exerciseCardLayout, layoutHeader: exerciseHeaderLayout, layoutInputs: inputsRowLayout }
        );
        setTooltipStep(1);
      } else {
        // Log which specific layouts are not ready or have invalid dimensions
        debugLog('VideoReviewScreen TOOLTIP_DEBUG: Waiting for all valid layouts. Current states:', {
          tooltipStep,
          hasSeenTooltips,
          isCardLayoutValid: cardReady,
          isHeaderLayoutValid: headerReady,
          isInputsLayoutValid: inputsReady,
          // Log raw values if they exist to see dimensions
          cardDims: exerciseCardLayout ? {w: exerciseCardLayout.width, h: exerciseCardLayout.height} : null,
          headerDims: exerciseHeaderLayout ? {w: exerciseHeaderLayout.width, h: exerciseHeaderLayout.height} : null,
          inputsDims: inputsRowLayout ? {w: inputsRowLayout.width, h: inputsRowLayout.height} : null,
        });
      }
    } else if (hasSeenTooltips) {
      debugLog('VideoReviewScreen TOOLTIP_DEBUG: Tooltips have been seen before, not showing.');
    } else {
      // This log helps see if tooltipStep changed from 0 for other reasons or if it's stuck
      debugLog('VideoReviewScreen TOOLTIP_DEBUG: tooltipStep is not 0, current value is:', tooltipStep);
    }
  }, [tooltipStep, exerciseCardLayout, exerciseHeaderLayout, inputsRowLayout, hasSeenTooltips]);

  // Function to get the current user ID
  const getCurrentUserId = async () => {
    try {
      // If we have it from route params, use that
      if (userId) {
        return userId;
      }
      
      // Use Supabase v1 auth methods
      // Method 1: Try user() method (Supabase v1)
      const user = supabase.auth.user();
      if (user && user.id) {
        debugLog('Using userId from Supabase user():', user.id);
        return user.id;
      }
      
      // Method 2: Try session() method (Supabase v1)
      const session = supabase.auth.session();
      if (session && session.user && session.user.id) {
        debugLog('Using userId from Supabase session:', session.user.id);
        return session.user.id;
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
    // Force dismiss keyboard on component mount to prevent stuck keyboard
    Keyboard.dismiss();
    
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
      // Force dismiss keyboard when screen comes into focus
      Keyboard.dismiss();
      
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
      // Force dismiss keyboard on cleanup
      Keyboard.dismiss();
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
      
      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      });

      const response = await fetch('https://gymvid-app.onrender.com/analyze/quick_exercise_prediction', {
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
      return data.exercise_name;
    } catch (error) {
      console.error('Error predicting exercise:', error);
      
      // Show user-friendly error message
      if (error.message && error.message.includes('Network request failed')) {
        console.error('⚠️ Network Error: Cannot connect to backend server');
        console.error('📍 Attempted URL: https://gymvid-app.onrender.com/analyze/quick_exercise_prediction');
        
        // Show toast instead of alert
        toast.error('We couldn\'t reach the server — please try again.');
      } else {
        toast.error('Failed to analyze exercise. Please try again.');
      }
      
      // Return graceful fallback
      return 'Unknown Exercise';
    }
  };

  // Analyze video when it changes
  const analyzeVideo = async (videoUri) => {
    if (!videoUri) return;

    // Reset tooltip flags for new video analysis if tooltips haven't been globally dismissed
    if (!hasSeenTooltips) { // Only reset if they might show again
        debugLog('analyzeVideo: Resetting tooltip trigger flags for new video.');
        initialLoadingRelevantActionDoneRef.current = false;
        setCanShowLoadingTooltip(false); 
        // setTooltipStep(0); // Optional: if you want to ensure all tooltips restart from scratch per video
    }

    setIsLoadingExercise(true);
    setEllipsisCount(0); // Reset ellipsis animation
    
    // Reset exercise animations
    exerciseOpacity.setValue(0);
    exerciseTranslateY.setValue(5);
    exerciseScale.setValue(0.98);
    pencilOpacity.setValue(0);
    exerciseBlur.setValue(0.3);

    // Predict exercise
    const movement = await predictExercise(videoUri);
    setExerciseName(movement);
    setTempExerciseName(movement);
    
    // Elegant world-class transition animation
    Animated.sequence([
      // First, fade out loading state smoothly
      Animated.timing(shimmerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      // Then reveal the exercise name with multiple effects
      Animated.parallel([
        // Fade in
        Animated.timing(exerciseOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        // Subtle upward movement
        Animated.timing(exerciseTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.1)),
        }),
        // Gentle scale
        Animated.spring(exerciseScale, {
          toValue: 1,
          tension: 120,
          friction: 14,
          useNativeDriver: true,
        }),
        // Blur effect (simulated with opacity layers)
        Animated.timing(exerciseBlur, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ]).start(() => {
      setIsLoadingExercise(false);
      // Fade in pencil icon after exercise name appears
      Animated.timing(pencilOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
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
        exerciseOpacity.setValue(0);
        
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
    // Validate that both weight and reps are entered
    if (!weight || weight === '0' || !reps || reps === '0') {
      toast.error('Please enter weight and reps');
      return;
    }
    
    setIsSetCompleted(!isSetCompleted);
  };

  // Function to handle exercise name editing
  const handleStartEditExercise = () => {
    setIsEditingExercise(true);
    setTempExerciseName(exerciseName);
  };

  // Function to save edited exercise name
  const handleSaveExercise = () => {
    setExerciseName(tempExerciseName);
    setIsEditingExercise(false);
  };

  // Function to cancel editing
  const handleCancelEditExercise = () => {
    setTempExerciseName(exerciseName);
    setIsEditingExercise(false);
  };

  // Function to handle AI coaching feedback
  const handleShowCoachingFeedback = async () => {
    if (!videoUri) return;

    // Dismiss the keyboard first to prevent it from getting stuck
    Keyboard.dismiss();

    // Show modal with loading state
    setFeedbackModalVisible(true);
    setFeedbackLoading(true);
    setFeedbackData(null);
    setFeedbackThumbnail(thumbnailUri);
    setFeedbackVideoUrl(videoUri);

    try {
      // Use Supabase v1 auth methods
      let user_id = 'demo-user';
      
      // Method 1: Try user() method (Supabase v1)
      const user = supabase.auth.user();
      if (user?.id) {
        user_id = user.id;
      } else {
        // Method 2: Try session() method (Supabase v1)
        const session = supabase.auth.session();
        if (session?.user?.id) {
          user_id = session.user.id;
        }
      }

      debugLog('Sending coaching feedback request with user_id:', user_id);
      debugLog('Video URI:', videoUri);
      debugLog('Exercise name:', exerciseName || 'Unknown Exercise');

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add the video file
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'workout_video.mp4',
      });
      
      // Add other form fields
      formData.append('user_id', user_id);
      formData.append('movement', exerciseName || 'Unknown Exercise');

      debugLog('FormData created, making request to backend...');

      const response = await fetch('https://gymvid-app.onrender.com/analyze/feedback_upload', {
        method: 'POST',
        body: formData
      });

      debugLog('Response received, status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      debugLog('Response data:', data);
      
      if (!data.success) throw new Error('Failed to get coaching feedback');

      setFeedbackLoading(false);
      setFeedbackData(data.feedback);

    } catch (error) {
      console.error('Error getting coaching feedback:', error);
      debugLog('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      setFeedbackLoading(false);
      setFeedbackData(null);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to get coaching feedback. Please try again.';
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  // handleDismissTooltip (fixed to prevent premature marking as seen)
  const handleDismissTooltip = async () => {
    debugLog('handleDismissTooltip called with tooltipStep:', tooltipStep);
    
    if (tooltipStep === 1) {
      // First popup dismissed -> show second popup
      debugLog('Dismissing first popup, showing second popup');
      setTooltipStep(2);
    } else if (tooltipStep === 2) {
      // Second popup dismissed -> close all tooltips and mark as seen
      debugLog('Dismissing second popup, closing all tooltips');
      setTooltipStep(0);
      setHasSeenTooltips(true);
      try { 
        await AsyncStorage.setItem('hasSeenVideoReviewTooltips_v2', 'true'); 
        debugLog('Tooltips marked as seen after completing both popups.');
      } 
      catch (e) { debugLog('Error saving tooltip_v2 pref', e); }
    } else {
      // Fallback - close tooltips but don't mark as seen (so they can show again)
      debugLog('Unexpected tooltipStep, closing tooltips without marking as seen');
      setTooltipStep(0);
    }
  };
  
  // Enhanced measureElement with retry logic
  const measureElement = (ref, setLayoutCallback, retryCount = 0) => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (!isNaN(x) && !isNaN(y) && width > 0 && height > 0) {
          debugLog('Measured element:', { x, y, width, height });
          setLayoutCallback({ x, y, width, height });
        } else if (retryCount < 3) {
          // Retry measurement after a short delay
          setTimeout(() => {
            measureElement(ref, setLayoutCallback, retryCount + 1);
          }, 100);
        } else {
          debugLog('Failed to measure after retries:', {x, y, width, height});
        }
      });
    }
  };

  const onInputsRowLayout = () => measureElement(inputsRowRef, setInputsRowLayout);
  const onExerciseCardLayout = () => measureElement(exerciseCardRef, setExerciseCardLayout);
  const onExerciseHeaderLayout = () => measureElement(exerciseHeaderRef, setExerciseHeaderLayout);
  const onTableAreaLayout = () => measureElement(tableAreaRef, setTableAreaLayout);

  // Custom spotlight configuration - EASY TO EDIT
  const CUSTOM_SPOTLIGHT_CONFIG = {
    // Position adjustments
    offsetX: 0,        // Move left/right (negative = left, positive = right)
    offsetY: 60,      // Move up/down (negative = up, positive = down)
    
    // Size adjustments  
    paddingTop: 22,    // Space above the target area
    paddingBottom: -3, // Space below the target area
    paddingLeft: -93,   // Space to the left of target area
    paddingRight: -5,  // Space to the right of target area
    
    // Enable/disable
    enabled: true      // Set to false to disable custom spotlight
  };

  // First popup spotlight configuration - EASY TO EDIT
  const FIRST_POPUP_SPOTLIGHT_CONFIG = {
    // Position adjustments
    offsetX: 0,        // Move left/right (negative = left, positive = right)
    offsetY: 57,        // Move up/down (negative = up, positive = down)
    
    // Size adjustments  
    paddingTop: -5,    // Space above the target area
    paddingBottom: 0, // Space below the target area
    paddingLeft: 0,   // Space to the left of target area
    paddingRight: 0,  // Space to the right of target area
    
    // Enable/disable
    enabled: true      // Set to false to disable custom spotlight
  };

  // Function to calculate custom spotlight area - EASY TO EDIT
  const getCustomSpotlightArea = (baseLayout) => {
    if (!baseLayout || !CUSTOM_SPOTLIGHT_CONFIG.enabled) return null;
    
    return {
      x: baseLayout.x + CUSTOM_SPOTLIGHT_CONFIG.offsetX - CUSTOM_SPOTLIGHT_CONFIG.paddingLeft,
      y: baseLayout.y + CUSTOM_SPOTLIGHT_CONFIG.offsetY - CUSTOM_SPOTLIGHT_CONFIG.paddingTop,
      width: baseLayout.width + CUSTOM_SPOTLIGHT_CONFIG.paddingLeft + CUSTOM_SPOTLIGHT_CONFIG.paddingRight,
      height: baseLayout.height + CUSTOM_SPOTLIGHT_CONFIG.paddingTop + CUSTOM_SPOTLIGHT_CONFIG.paddingBottom,
    };
  };

  // Function to calculate first popup spotlight area - EASY TO EDIT
  const getFirstPopupSpotlightArea = (baseLayout) => {
    if (!baseLayout || !FIRST_POPUP_SPOTLIGHT_CONFIG.enabled) return null;
    
    return {
      x: baseLayout.x + FIRST_POPUP_SPOTLIGHT_CONFIG.offsetX - FIRST_POPUP_SPOTLIGHT_CONFIG.paddingLeft,
      y: baseLayout.y + FIRST_POPUP_SPOTLIGHT_CONFIG.offsetY - FIRST_POPUP_SPOTLIGHT_CONFIG.paddingTop,
      width: baseLayout.width + FIRST_POPUP_SPOTLIGHT_CONFIG.paddingLeft + FIRST_POPUP_SPOTLIGHT_CONFIG.paddingRight,
      height: baseLayout.height + FIRST_POPUP_SPOTLIGHT_CONFIG.paddingTop + FIRST_POPUP_SPOTLIGHT_CONFIG.paddingBottom,
    };
  };

  // Add states for AI coaching feedback
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackThumbnail, setFeedbackThumbnail] = useState(null);
  const [feedbackVideoUrl, setFeedbackVideoUrl] = useState(null);

  // Function to handle weight input (allow numbers and one decimal)
  const handleWeightChange = (text) => {
    let newText = text.replace(/[^0-9.]/g, ''); // Remove invalid chars
    const parts = newText.split('.');
    if (parts.length > 2) { // More than one decimal point
      newText = parts[0] + '.' + parts.slice(1).join('');
    }
    // Optional: Limit to 2 decimal places if needed
    // if (parts[1] && parts[1].length > 2) {
    //   newText = parts[0] + '.' + parts[1].substring(0, 2);
    // }
    setWeight(newText);
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.touchableContent}>
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
                  <View style={styles.exerciseTableCard} ref={exerciseCardRef} onLayout={onExerciseCardLayout}>
                    <View style={styles.exerciseTableHeader} ref={exerciseHeaderRef} onLayout={onExerciseHeaderLayout}>
                      {isLoadingExercise ? (
                        <View style={styles.exerciseLoadingContainer}>
                          <View style={styles.loadingSpinnerContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                          <Animated.Text style={[
                            styles.exerciseLoadingText,
                            {
                              opacity: shimmerAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.6, 1, 0.6]
                              }),
                              color: shimmerAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [colors.gray, colors.primary, colors.gray]
                              })
                            }
                          ]}>
                            AI Finding Exercise{'.'.repeat(ellipsisCount)}
                          </Animated.Text>
                        </View>
                      ) : isEditingExercise ? (
                        <View style={styles.exerciseEditContainer}>
                          <TouchableOpacity onPress={handleSaveExercise} style={styles.editButton}>
                            <Ionicons name="checkmark" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.exerciseEditInput}
                            value={tempExerciseName}
                            onChangeText={setTempExerciseName}
                            autoFocus
                            selectTextOnFocus
                            onBlur={handleCancelEditExercise}
                            onSubmitEditing={handleSaveExercise}
                            returnKeyType="done"
                          />
                        </View>
                      ) : (
                        <View style={styles.exerciseNameContainer}>
                          {exerciseName && !isLoadingExercise && (
                            <Animated.View style={{ opacity: pencilOpacity }}>
                              <TouchableOpacity onPress={handleStartEditExercise} style={styles.editButtonLeft}>
                                <Ionicons name="pencil" size={16} color={colors.gray} />
                              </TouchableOpacity>
                            </Animated.View>
                          )}
                          {(!exerciseName || isLoadingExercise) && !isEditingExercise && (
                            <View style={styles.editButtonPlaceholder} />
                          )}
                          <Animated.Text style={[
                            styles.exerciseTableTitle,
                            {
                              opacity: Animated.multiply(exerciseOpacity, exerciseBlur),
                              transform: [
                                { translateY: exerciseTranslateY },
                                { scale: exerciseScale }
                              ]
                            }
                          ]}>
                            {exerciseName || ''}
                          </Animated.Text>
                        </View>
                      )}
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
                      
                      {/* Table data row - TARGET FOR TOOLTIP 2 */}
                      <View style={styles.tableRow} ref={inputsRowRef} onLayout={onInputsRowLayout}>
                        <Text style={styles.tableCellSet}>1</Text>
                        {thumbnailUri ? (
                          // TARGET FOR TOOLTIP 1
                          <TouchableOpacity 
                            ref={thumbnailRef}
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
                            ref={thumbnailRef} // Also measure this as a fallback if no thumbnail
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
                          keyboardType="numeric"
                          value={weight}
                          onChangeText={handleWeightChange}
                          maxLength={5}
                          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />
                        <TextInput 
                          style={styles.tableCellInput}
                          placeholder="0"
                          placeholderTextColor="#AAAAAA"
                          keyboardType="number-pad"
                          value={reps}
                          onChangeText={setReps}
                          maxLength={3}
                          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />
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
                  </View>
                  
                  {/* AI Coaching Feedback Button */}
                  {isSetCompleted && videoUri && (
                    <TouchableOpacity
                      style={styles.aiCoachingButton}
                      onPress={handleShowCoachingFeedback}
                    >
                      <Ionicons name="analytics-outline" size={18} color="#6C3EF6" />
                      <Text style={styles.aiCoachingButtonText}>AI Coaching Feedback</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      <GuidedPopup
        visible={tooltipStep === 1}
        text="Our AI will detect the exercise for you!"
        targetLayout={exerciseCardLayout}
        highlightLayout={getFirstPopupSpotlightArea(exerciseHeaderLayout)}
        screenBackgroundColor={colors.background}
        onClose={handleDismissTooltip}
        forcePositionBelow={true}
        showIconButton={true}
      />
      <GuidedPopup
        visible={tooltipStep === 2}
        text="You can enter the weight & reps while you wait - then tap the ✓ to log the set."
        targetLayout={inputsRowLayout}
        highlightLayout={getCustomSpotlightArea(inputsRowLayout)} 
        screenBackgroundColor={colors.background}
        onClose={handleDismissTooltip}
        showIconButton={true}
        verticalOffset={90}
      />
      
      {/* Video Preview Modal */}
      <VideoPreviewModal
        visible={isPreviewVisible}
        videoUri={videoUri}
        onClose={closePreview}
      />
      
      {/* AI Coaching Feedback Modal */}
      <CoachingFeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        loading={feedbackLoading}
        feedback={feedbackData}
        videoThumbnail={feedbackThumbnail}
        exerciseName={exerciseName || 'Unknown Exercise'}
        setNumber={1}
        customSubtitle={`Set 1: ${weight || '0'}kg x ${reps || '0'} Reps`}
        metrics={{
          form_rating: feedbackData?.form_rating ?? '',
          weight: weight ?? '',
          reps: reps ?? '',
          rpe: '',
          tut: '',
        }}
        set={{
          weight: weight,
          reps: reps,
          video_url: feedbackVideoUrl,
          thumbnail_url: feedbackThumbnail,
        }}
      />
      
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
      
      {/* Keyboard Toolbar */}
      <KeyboardToolbar />
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
  touchableContent: {
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
    marginBottom: 15,
    height: 24,
  },
  exerciseTableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    lineHeight: 24,
    textAlignVertical: 'center',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
    letterSpacing: -0.3,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellIconHeader: {
    width: 48,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellHeaderInput: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    color: colors.gray,
    textAlign: 'center',
    fontWeight: '500',
    flexShrink: 1,
    flexWrap: 'nowrap',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'relative',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Adjust for status bar
    right: 15,
    zIndex: 10,
  },
  closeButton: {
    padding: 8, // Touch area
    borderRadius: 20, // Make it round
    backgroundColor: 'rgba(0,0,0,0.25)', // Subtle background for better visibility
  },
  video: { // Style for the Video component itself in the modal
    width: '100%', // Take full width of modalContent
    height: '70%', // Adjust height as preferred for video preview
    backgroundColor: '#000', // Background for the video area
  },
  centeredMessage: { // For loading text in modal
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingVideoText: { // For "Loading video..." text
    color: 'white',
    fontSize: 16,
    marginTop: 12,
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
  exerciseEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 24,
  },
  exerciseEditInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    padding: 0,
    marginRight: 8,
    height: 24,
    lineHeight: 24,
    textAlignVertical: 'center',
  },
  editButton: {
    width: 16,
    height: 16,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  exerciseLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  loadingSpinnerContainer: {
    marginRight: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseLoadingText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 24,
    textAlignVertical: 'center',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  editButtonLeft: {
    width: 16,
    height: 16,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonPlaceholder: {
    width: 16 + 10,
    height: 16,
  },
  // Styles for World-Class GuidedPopup
  fullScreenContainerForPressable: { // New style for the Pressable parent in Modal
    flex: 1, 
    // No background color here, overlay parts will handle dimming
  },
  fullScreenTouchableOverlay: { // Used as fallback when highlightLayout is null
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  popupContainerAdvanced: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20, 
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  popupArrowAdvanced: {
    position: 'absolute', width: 0, height: 0, borderStyle: 'solid',
  },
  popupBodyAdvanced: { 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  popupTextAdvanced: {
    fontSize: 15, 
    color: colors.darkGray, 
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20, 
    fontWeight: '400',
  },
  popupDismissButtonAdvanced: {
    backgroundColor: colors.primary,
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    alignSelf: 'center',
  },
  popupDismissButtonTextAdvanced: {
    color: colors.white, fontSize: 14, fontWeight: '600',
  },
  popupBodyIconButtonLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 40,
  },
  popupTextIconButtonLayout: {
    textAlign: 'center',
    marginRight: 8,
    marginBottom: 0,
    flex: 1,
  },
  popupIconDismissButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTextWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  inlineIconWrapper: {
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 1,
  },
  aiCoachingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: -2,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  aiCoachingButtonText: {
    color: '#6C3EF6',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    marginLeft: 6,
  },
  keyboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F7F7F7',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  keyboardToolbarSpacer: {
    flex: 1,
  },
  keyboardDoneButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  keyboardDoneButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
}); 