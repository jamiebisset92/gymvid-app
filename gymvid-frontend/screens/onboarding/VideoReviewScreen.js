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
import * as FileSystem from 'expo-file-system';
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
      <TouchableOpacity 
        style={styles.keyboardDoneButton}
        onPress={() => {
          Keyboard.dismiss();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
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
  verticalOffset = 0,
  iconType = 'arrow'
}) => {
  // ✅ ALL HOOKS MUST BE AT THE TOP - Rules of Hooks
  const animValue = useRef(new Animated.Value(0)).current;
  const spotlightScale = useRef(new Animated.Value(0.8)).current;
  const popupScale = useRef(new Animated.Value(0.9)).current;
  const popupTranslateY = useRef(new Animated.Value(20)).current;
  const arrowScale = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const spotlightOpacity = useRef(new Animated.Value(0)).current;
  
  // Add animation values for each layer
  const mainStrokeOpacity = useRef(new Animated.Value(0)).current;
  const layer1Opacity = useRef(new Animated.Value(0)).current;
  const layer2Opacity = useRef(new Animated.Value(0)).current;
  
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, width: 0 });
  const [arrowStyle, setArrowStyle] = useState({});
  
  // Constants can be here after hooks
  const ARROW_SIZE = 10;
  const POPUP_MARGIN_FROM_TARGET = 15;
  const SCREEN_PADDING = 15;
  const HIGHLIGHT_PADDING = 12; 
  const HIGHLIGHT_BORDER_RADIUS = 16;
  const HIGHLIGHT_VERTICAL_OFFSET = -15;
  const screenDims = Dimensions.get('window');

  // ✅ ALL useEffect hooks must be here too!
  // Start glow pulse animation
  useEffect(() => {
    if (visible) {
      // Simple smooth flashing animation for the main stroke
      Animated.loop(
        Animated.sequence([
          Animated.timing(mainStrokeOpacity, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mainStrokeOpacity, {
            toValue: 0.3,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset stroke opacity
      mainStrokeOpacity.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    // debugLog(`GuidedPopup useEffect: text="${text}" visible_PROP=${visible} targetLayout_EXISTS=${!!targetLayout}`);
    if (visible && targetLayout) {
      // debugLog(`GuidedPopup useEffect INSIDE IF: text="${text}" - Calculating position...`);
      const popupWidth = screenDims.width - (2 * SCREEN_PADDING);
      const estimatedPopupHeight = text.length > 70 ? (showIconButton ? 70 : 100) : (showIconButton ? 55 : 85);
      
      // Position popup just below the target element with small gap
      const pTop = targetLayout.y + targetLayout.height + POPUP_MARGIN_FROM_TARGET + verticalOffset;
      const pLeft = SCREEN_PADDING;
      
      // Arrow points up to the target element
      const arrStyleLocal = {
        top: -ARROW_SIZE,
        left: (popupWidth / 2) - ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE, 
        borderBottomColor: colors.white,
        borderLeftWidth: ARROW_SIZE, 
        borderLeftColor: 'transparent',
        borderRightWidth: ARROW_SIZE, 
        borderRightColor: 'transparent',
      };

      setPopupPosition({ top: pTop, left: pLeft, width: popupWidth });
      setArrowStyle(arrStyleLocal);

      // Enhanced entrance animation sequence with world-class polish
      Animated.sequence([
        // Phase 1: Graceful spotlight appearance
        Animated.parallel([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400, // Longer for more elegance
            easing: Easing.out(Easing.back(1.1)), // Subtle bounce
            useNativeDriver: true,
          }),
          Animated.spring(spotlightScale, {
            toValue: 1,
            tension: 70, // Slightly softer spring
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(spotlightOpacity, {
            toValue: 1,
            duration: 500, // Longer fade-in for smooth appearance
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Phase 2: Sophisticated popup content animation
        Animated.parallel([
          // Popup scale with refined spring
          Animated.spring(popupScale, {
            toValue: 1,
            tension: 85, // Tighter spring for crispness
            friction: 11,
            delay: 80, // Slightly shorter delay
            useNativeDriver: true,
          }),
          // Refined upward slide movement
          Animated.timing(popupTranslateY, {
            toValue: 0,
            duration: 450, // Longer for smoothness
            delay: 80,
            easing: Easing.out(Easing.back(1.4)), // More pronounced but controlled bounce
            useNativeDriver: true,
          }),
          // Polished arrow animation
          Animated.spring(arrowScale, {
            toValue: 1,
            tension: 120, // Crisper arrow appearance
            friction: 9,
            delay: 200, // Slightly earlier appearance
            useNativeDriver: true,
          }),
        ]),
        // Stroke opacity animation
        Animated.timing(mainStrokeOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // debugLog(`GuidedPopup ANIMATION IN COMPLETE for text="${text}"`);
      });
    } else {
      // debugLog(`GuidedPopup useEffect ELSE: text="${text}" - Animating out or not showing (visible=${visible}, targetLayout=${!!targetLayout}).`);
      // Enhanced exit animation with improved timing and easing
      Animated.timing(mainStrokeOpacity, {
        toValue: 0,
        duration: 300, // Slightly longer for smoother fade
        easing: Easing.out(Easing.cubic), // Smoother easing curve
        useNativeDriver: true,
      }).start();
      
      // Sophisticated exit animation sequence
      Animated.parallel([
        // Main popup fade out
        Animated.timing(animValue, {
          toValue: 0,
          duration: 350, // Longer duration for elegance
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Spotlight scale down with bounce
        Animated.spring(spotlightScale, {
          toValue: 0.85, // Less dramatic scale change
          tension: 60, // Softer spring
          friction: 12,
          useNativeDriver: true,
        }),
        // Popup scale with elegant ease-in
        Animated.timing(popupScale, {
          toValue: 0.94, // Less dramatic scale for smoother feel
          duration: 280,
          easing: Easing.in(Easing.back(0.8)), // Gentle ease-in-back
          useNativeDriver: true,
        }),
        // Refined slide down movement
        Animated.timing(popupTranslateY, {
          toValue: 15, // Smaller movement for subtlety
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Arrow fade out
        Animated.timing(arrowScale, {
          toValue: 0,
          duration: 200, // Faster arrow disappearance
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Spotlight opacity with smooth fade
        Animated.timing(spotlightOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
         // debugLog(`GuidedPopup ANIMATION OUT COMPLETE for text="${text}"`);
      });
    }
  }, [visible, targetLayout, text, forcePositionBelow, screenDims, showIconButton, verticalOffset]);

  // Early return AFTER all hooks are defined
  if (!visible || !targetLayout) {
    return null;
  }
  
  // Remove excessive debug logging
  // debugLog(`GuidedPopup RENDER: text="${text}" visible_PROP=${visible} targetLayout_EXISTS=${!!targetLayout} animValue=${animValue._value}`);

  // Calculate expanded highlight area with padding AND vertical offset
  const expandedHighlight = highlightLayout ? {
    x: highlightLayout.x - HIGHLIGHT_PADDING,
    y: highlightLayout.y - HIGHLIGHT_PADDING + HIGHLIGHT_VERTICAL_OFFSET,
    width: highlightLayout.width + (HIGHLIGHT_PADDING * 2),
    height: highlightLayout.height + (HIGHLIGHT_PADDING * 2),
  } : null;

  // Glow pulse effect
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.fullScreenContainerForPressable} onPress={onClose}>
        {/* Subtle Glowing Spotlight Effect - No Background Overlay */}
        {expandedHighlight && (
          <Animated.View
            style={{
              position: 'absolute',
              left: expandedHighlight.x,
              top: expandedHighlight.y,
              width: expandedHighlight.width,
              height: expandedHighlight.height,
              opacity: spotlightOpacity,
              transform: [{ scale: spotlightScale }],
            }}
            pointerEvents="none"
          >
            {/* Main highlight stroke - simple blue border that flashes */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: expandedHighlight.width,
                height: expandedHighlight.height,
                borderRadius: HIGHLIGHT_BORDER_RADIUS,
                borderWidth: 2,
                borderColor: colors.primary,
                backgroundColor: 'transparent',
                opacity: mainStrokeOpacity,
              }}
            />
          </Animated.View>
        )}
        
        {/* Popup with enhanced shadow */}
        {targetLayout && (
            <Animated.View 
              style={[
                styles.popupContainerAdvanced,
                {
                  top: popupPosition.top, 
                  left: popupPosition.left, 
                  width: popupPosition.width,
                  opacity: animValue, 
                  transform: [
                    { scale: popupScale },
                    { translateY: popupTranslateY }
                  ],
                  // Enhanced shadow for better visibility
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: 24,
                  // Add subtle border for definition
                  borderWidth: 0.5,
                  borderColor: 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <Animated.View style={[styles.popupArrowAdvanced, arrowStyle, { 
                transform: [{ scale: arrowScale }],
              }]} />
              <View style={[styles.popupBodyAdvanced, showIconButton && styles.popupBodyIconButtonLayout]}>
                <Text style={[styles.popupTextAdvanced, showIconButton && styles.popupTextIconButtonLayout]}>{text}</Text>
                {showIconButton ? (
                  <TouchableOpacity onPress={onClose} style={[styles.popupIconDismissButton, {
                    backgroundColor: 'rgba(0, 122, 255, 0.08)',
                    borderRadius: 20,
                  }]}>
                    {iconType === 'tick' ? (
                      <Ionicons name="checkmark" size={28} color={colors.primary} />
                    ) : (
                      <Ionicons name="arrow-forward" size={28} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onClose} style={[styles.popupDismissButtonAdvanced, {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 6,
                  }]}>
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
  
  // Only log params once on mount
  useEffect(() => {
    debugLog('VideoReviewScreen params:', { isDemo, fromGallery, continueOnboarding, userId });
  }, []); // Empty dependency array to run only once
  
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
  const [predictionDetails, setPredictionDetails] = useState(null); // Store prediction details from API
  
  // Add state for animated ellipsis
  const [ellipsisCount, setEllipsisCount] = useState(0);
  
  // State for smart abbreviation system and full exercise names
  const [fullExerciseName, setFullExerciseName] = useState('');
  const [displayExerciseName, setDisplayExerciseName] = useState('');
  const [showInfoIcon, setShowInfoIcon] = useState(false);
  
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

  // Animation values for AI Coaching Feedback button
  const aiButtonOpacity = useRef(new Animated.Value(0)).current;
  const aiButtonScale = useRef(new Animated.Value(0.9)).current;
  const aiButtonTranslateY = useRef(new Animated.Value(10)).current;

  // Add button press animations to match VideoPromptScreen.js
  const [primaryButtonScale] = useState(new Animated.Value(1));
  const [secondaryButtonScale] = useState(new Animated.Value(1));

  // State for tooltips/guided popups
  const [tooltipStep, setTooltipStep] = useState(0);
  
  // Add debug logging for tooltip step changes
  useEffect(() => {
    debugLog('🎯 TOOLTIP STEP CHANGED:', tooltipStep);
  }, [tooltipStep]);

  const [isTransitioningTooltips, setIsTransitioningTooltips] = useState(false); // New state for smooth transitions
  const [inputsRowLayout, setInputsRowLayout] = useState(null);
  const [exerciseCardLayout, setExerciseCardLayout] = useState(null);
  const [exerciseHeaderLayout, setExerciseHeaderLayout] = useState(null);
  const [tableAreaLayout, setTableAreaLayout] = useState(null);
  const [aiCoachingButtonLayout, setAiCoachingButtonLayout] = useState(null); // New layout for AI button
  const [hasSeenTooltips, setHasSeenTooltips] = useState(false);

  // New state and ref for more robust tooltip triggering
  const [canShowLoadingTooltip, setCanShowLoadingTooltip] = useState(false);
  const initialLoadingRelevantActionDoneRef = useRef(false); // Tracks if video analysis has started

  const inputsRowRef = useRef(null);
  const exerciseCardRef = useRef(null);
  const exerciseHeaderRef = useRef(null);
  const tableAreaRef = useRef(null);
  const thumbnailRef = useRef(null);
  const aiCoachingButtonRef = useRef(null); // New ref for AI button

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
        debugLog("🎯 TOOLTIP_DEBUG: Stored tooltip preference:", seen);
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
  
  // Debug function to clear tooltip preferences - FOR TESTING ONLY
  const clearTooltipPreferences = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenVideoReviewTooltips_v2');
      setHasSeenTooltips(false);
      setTooltipStep(0);
      debugLog('🎯 Tooltip preferences cleared, tooltips will show again');
    } catch (e) {
      debugLog('Error clearing tooltip preferences:', e);
    }
  };
  
  // Development function to reset app state and test server connectivity - FOR TESTING ONLY
  const resetAppStateAndTestServer = async () => {
    if (__DEV__) {
      try {
        // Clear all cached feedback
        setCachedFeedback({});
        setCurrentVideoFeedbackKey(null);
        setIsPreloadingFeedback(false);
        
        // Clear tooltip preferences
        await clearTooltipPreferences();
        
        // Reset exercise states
        setExerciseName('');
        setFullExerciseName('');
        setDisplayExerciseName('');
        setShowInfoIcon(false);
        setIsLoadingExercise(false);
        setIsEditingExercise(false);
        setIsSetCompleted(false);
        
        // Reset form
        setWeight('');
        setReps('');
        
        // Test server health
        const serverHealthy = await checkServerHealth();
        const healthMessage = serverHealthy ? 'Server is responsive ✅' : 'Server is unavailable ❌';
        
        debugLog('🔄 App state reset for testing');
        debugLog('🌐 Server health:', healthMessage);
        toast.success(`App state reset. ${healthMessage}`);
      } catch (e) {
        debugLog('Error resetting app state:', e);
        toast.error('Error resetting app state');
      }
    }
  };
  
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
        
        // Add elegant delay to let screen animations complete first
        setTimeout(() => {
          setTooltipStep(1);
        }, 1200); // Delay to ensure screen entrance animations have completed
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

  // Smart abbreviation system for exercise names
  const ABBREVIATIONS = {
    // Equipment
    'Barbell': 'BB',
    'Dumbbell': 'DB', 
    'Dumbell': 'DB',
    'Cable': 'Cbl',
    'Machine': 'Mch',
    'Kettlebell': 'KB',
    'Resistance': 'Res',
    'Band': 'Bd',
    'Bodyweight': 'BW',
    'Smith': 'Sm',
    'Hammer': 'Hmr',
    'Preacher': 'Prch',
    
    // Variations
    'Romanian': 'Rom',
    'Bulgarian': 'Bulg', 
    'Sumo': 'Sumo',
    'Conventional': 'Conv',
    'Close-Grip': 'CG',
    'Close Grip': 'CG',
    'Wide-Grip': 'WG',
    'Wide Grip': 'WG',
    'Reverse': 'Rev',
    'Overhead': 'OH',
    'Underhand': 'UH',
    'Overhand': 'OH',
    'Single-Arm': 'SA',
    'Single Arm': 'SA',
    'Alternating': 'Alt',
    'Incline': 'Inc',
    'Decline': 'Dec',
    'Deficit': 'Def',
    'Paused': 'Psd',
    'Tempo': 'Tmp',
    'Eccentric': 'Ecc',
    'Isometric': 'Iso',
    'Explosive': 'Exp',
    'Jump': 'Jmp',
    'Plyometric': 'Plyo',
    'Assisted': 'Ast',
    'Unassisted': 'Unast',
    'Lateral': 'Lat',
    'Medial': 'Med',
    'Front': 'Fr',
    'Back': 'Bk',
    'Side': 'Sd',
    'Cross': 'X',
    'High': 'Hi',
    'Low': 'Lo',
    'Mid': 'Mid',
    'Upper': 'Up',
    'Lower': 'Lwr',
    'Inner': 'In',
    'Outer': 'Out',
    'Seated': 'Std',
    'Standing': 'Stnd',
    'Lying': 'Ly',
    'Prone': 'Pr',
    'Supine': 'Sup',
    
    // Common words
    'Exercise': 'Ex',
    'Workout': 'WO',
    'Training': 'Tr',
    'Strength': 'Str',
    'Power': 'Pwr',
    'Cardio': 'Card',
    'Isolation': 'Iso',
    'Compound': 'Comp',
    'with': 'w/',
    'and': '&',
    'the': '',
    'of': '',
    'for': '',
    'in': '',
    'on': '',
    'at': '',
    'to': '',
    'from': '',
    'Chain': 'Chn',
    'Chains': 'Chns',
    'Weight': 'Wt',
    'Plate': 'Pl',
    'Plates': 'Pls'
  };

  const smartAbbreviate = (text) => {
    if (!text || text.length <= 33) return text;
    
    let abbreviated = text;
    
    // Apply abbreviations
    for (const [full, abbrev] of Object.entries(ABBREVIATIONS)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      abbreviated = abbreviated.replace(regex, abbrev);
    }
    
    // If still too long, truncate at word boundary
    if (abbreviated.length > 33) {
      const words = abbreviated.split(' ');
      let truncated = '';
      
      for (let i = 0; i < words.length; i++) {
        const testString = truncated + (truncated ? ' ' : '') + words[i];
        if (testString.length <= 30) { // Leave room for "..."
          truncated = testString;
        } else {
          break;
        }
      }
      
      if (truncated !== abbreviated) {
        abbreviated = truncated + '...';
      }
    }
    
    return abbreviated;
  };

  const buildFullExerciseName = (data) => {
    debugLog('🔍 Building exercise name from data:', data);
    
    // Handle different response formats - backend returns exercise_name as the movement
    const equipment = data.equipment || data.Equipment || '';
    const variation = data.variation || data.Variation || '';
    const exerciseName = data.exercise_name || data.Exercise_name || data.exercise || data.predicted_exercise || data.movement || '';
    
    debugLog('🔍 Extracted components:', { equipment, variation, exerciseName });
    
    // Filter out "Unknown", "None", null, or empty values
    const components = [equipment, variation, exerciseName]
      .filter(component => 
        component && 
        component.trim() !== '' && 
        component.toLowerCase() !== 'unknown' && 
        component.toLowerCase() !== 'none'
      );
    
    debugLog('🔍 Filtered components:', components);
    
    if (components.length === 0) {
      return 'Unable to Detect: Enter Manually';
    }
    
    // Join components with spaces for "Equipment Variation Movement" format
    const fullName = components.join(' ');
    debugLog('🔍 Full exercise name:', fullName);
    
    return fullName;
  };

  const processExerciseName = (fullName) => {
    debugLog('🔍 Processing exercise name:', fullName);
    
    // Handle special case
    if (fullName === 'Unable to Detect: Enter Manually') {
      setFullExerciseName(fullName);
      setDisplayExerciseName('Tap to Enter Exercise');
      setExerciseName('Tap to Enter Exercise');
      setShowInfoIcon(false);
      return 'Tap to Enter Exercise';
    }
    
    // Create abbreviated version
    const abbreviated = smartAbbreviate(fullName);
    const isTruncated = abbreviated !== fullName;
    
    debugLog('🔍 Abbreviated name:', abbreviated, 'isTruncated:', isTruncated);
    
    // Update states
    setFullExerciseName(fullName);
    setDisplayExerciseName(abbreviated);
    setExerciseName(abbreviated);
    setShowInfoIcon(isTruncated);
    
    return abbreviated;
  };

  const handleExerciseNameTap = () => {
    if (fullExerciseName && fullExerciseName !== displayExerciseName) {
      toast.info(fullExerciseName);
    }
  };

  // Function to check server health before making requests
  const checkServerHealth = async () => {
    try {
      debugLog('Checking server health...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for health check
      
      const response = await fetch('https://gymvid-app.onrender.com/', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      debugLog('Server health check result:', isHealthy ? 'HEALTHY' : 'UNHEALTHY', 'Status:', response.status);
      
      return isHealthy;
    } catch (error) {
      debugLog('Server health check failed:', error.message);
      return false;
    }
  };

  // API function to predict exercise
  const predictExercise = async (videoUri, retryCount = 0) => {
    const MAX_RETRIES = 3; // Increased from 2
    // Progressive timeout - longer for first attempt (cold start), shorter for retries
    const TIMEOUT_MS = retryCount === 0 ? 45000 : 30000; // 45s first try, 30s for retries
    
    try {
      debugLog('Predicting exercise for video:', videoUri, `(attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      // Show appropriate user feedback based on attempt
      if (retryCount === 0) {
        // First attempt - normal loading
        debugLog('First attempt at exercise prediction');
      } else if (retryCount === 1) {
        toast.info('Server is starting up, please wait...');
      } else if (retryCount === 2) {
        toast.info('Almost there, trying one more time...');
      }
      
      // Verify the video file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found at URI: ' + videoUri);
      }
      debugLog('Video file verified - Size:', fileInfo.size, 'URI:', fileInfo.uri);
      
      // Check file size - if too large, it might cause timeouts
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // Increased to 100MB
      if (fileInfo.size > MAX_FILE_SIZE) {
        console.warn('Video file is very large:', (fileInfo.size / 1024 / 1024).toFixed(2), 'MB');
        toast.error('Video file is too large. Please use a shorter video.');
        return 'Unable to Detect: Enter Manually';
      }
      
      const formData = new FormData();
      
      // Ensure proper URI format
      let properUri = fileInfo.uri;
      if (Platform.OS === 'ios' && !properUri.startsWith('file://')) {
        properUri = `file://${properUri}`;
      }
      
      formData.append('video', {
        uri: properUri,
        name: 'workout_video.mp4',
        type: 'video/mp4',
      });

      debugLog('FormData prepared with video URI:', properUri);
      debugLog('Making request to:', 'https://gymvid-app.onrender.com/quick_exercise_prediction');

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        debugLog(`Request aborted after ${TIMEOUT_MS}ms timeout`);
      }, TIMEOUT_MS);

      try {
        const response = await fetch('https://gymvid-app.onrender.com/quick_exercise_prediction', {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        debugLog('Response received - Status:', response.status, 'OK:', response.ok);
        
        if (!response.ok) {
          // Handle different HTTP errors
          if (response.status === 504 || response.status === 502) {
            throw new Error('Gateway timeout - server is overloaded');
          } else if (response.status === 503) {
            throw new Error('Service unavailable - server is down');
          } else if (response.status >= 500) {
            throw new Error(`Server error (${response.status}) - please try again`);
          }
          
          const errorText = await response.text();
          debugLog('Error response body:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        debugLog('🔍 PREDICTION RESPONSE:', JSON.stringify(data, null, 2));
        
        // Store the full prediction details in state
        setPredictionDetails(data);
        
        // Clear any retry messages on success
        if (retryCount > 0) {
          toast.success('Exercise detected successfully!');
        }
        
        // Handle different possible response formats with enhanced processing
        const fullExerciseName = buildFullExerciseName(data);
        debugLog('Built full exercise name:', fullExerciseName);
        
        return fullExerciseName;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Check if it's an abort error
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${TIMEOUT_MS / 1000}s - server is taking too long`);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error predicting exercise:', error);
      debugLog('Full error details:', {
        message: error.message,
        name: error.name,
        retryCount: retryCount
      });
      
      // Determine if we should retry based on the error type
      const shouldRetry = (
        (error.message.includes('timeout') || 
         error.message.includes('504') || 
         error.message.includes('502') ||
         error.message.includes('503') ||
         error.message.includes('Gateway timeout') ||
         error.message.includes('Service unavailable') ||
         error.message.includes('overloaded')) && 
        retryCount < MAX_RETRIES
      );
      
      if (shouldRetry) {
        debugLog(`Retrying exercise prediction (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        
        // Exponential backoff: wait longer between retries
        const backoffDelay = Math.min(2000 * Math.pow(2, retryCount), 8000); // 2s, 4s, 8s max
        debugLog(`Waiting ${backoffDelay}ms before retry...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        return predictExercise(videoUri, retryCount + 1);
      }
      
      // Show user-friendly error message based on error type
      if (error.message && (error.message.includes('timeout') || error.message.includes('504') || error.message.includes('Gateway timeout'))) {
        console.error('⚠️ Backend server is overloaded or cold-starting');
        toast.error('Server is busy. Exercise detection unavailable - please enter manually.');
      } else if (error.message && error.message.includes('Network request failed')) {
        console.error('⚠️ Network Error: Cannot connect to backend server');
        toast.error('Network error. Please check your connection.');
      } else if (error.message && (error.message.includes('503') || error.message.includes('Service unavailable'))) {
        console.error('⚠️ Backend service is temporarily unavailable');
        toast.error('Service temporarily down. Please enter exercise manually.');
      } else {
        console.error('⚠️ Unknown error during exercise prediction:', error.message);
        toast.error('Unable to detect exercise. Please enter manually.');
      }
      
      // Return graceful fallback
      return 'Unable to Detect: Enter Manually';
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
    setPredictionDetails(null); // Reset prediction details for new video
    setEllipsisCount(0); // Reset ellipsis animation
    
    // Reset exercise animations
    exerciseOpacity.setValue(0);
    exerciseTranslateY.setValue(5);
    exerciseScale.setValue(0.98);
    pencilOpacity.setValue(0);
    exerciseBlur.setValue(0.3);

    // Directly call prediction API - let it handle server availability
    const movement = await predictExercise(videoUri);
    
    // Process the exercise name with smart abbreviation system
    const processedMovement = processExerciseName(movement);
    
    // If prediction failed, show helpful message
    if (movement === 'Unable to Detect: Enter Manually') {
      // Show a helpful message
      setTimeout(() => {
        toast.info('Please tap the pencil to enter the exercise name');
      }, 1000);
    } else {
      // Start preloading coaching feedback in the background (non-blocking)
      preloadCoachingFeedback(videoUri, fullExerciseName).catch(err => {
        debugLog('Background feedback preload failed (non-critical):', err);
      });
    }
    
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
      }).start(() => {
        // If exercise is unknown, automatically open the editor
        if (movement === 'Unknown Exercise') {
          setTimeout(() => {
            handleStartEditExercise();
          }, 500);
        }
      });
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
      
      // Clear all cached feedback when video changes
      setCachedFeedback({});
      setCurrentVideoFeedbackKey(null);
      setIsPreloadingFeedback(false);
      debugLog('Cleared all cached feedback for new video');
      
      // Reset AI button animation state for new video
      aiButtonOpacity.setValue(0);
      aiButtonScale.setValue(0.9);
      aiButtonTranslateY.setValue(10);
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
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Validate that both weight and reps are entered
    if (!weight || weight === '0' || !reps || reps === '0') {
      toast.error('Please enter weight and reps');
      return;
    }
    
    const wasCompleted = isSetCompleted;
    setIsSetCompleted(!isSetCompleted);
    
    debugLog('🎯 handleCompleteSet - wasCompleted:', wasCompleted, 'isSetCompleted becoming:', !isSetCompleted);
    debugLog('🎯 handleCompleteSet - hasSeenTooltips:', hasSeenTooltips, 'tooltipStep:', tooltipStep);
    debugLog('🎯 handleCompleteSet - videoUri exists:', !!videoUri);
    debugLog('🎯 handleCompleteSet - aiCoachingButtonLayout:', aiCoachingButtonLayout);
    
    // If the set is being completed (not uncompleted), trigger AI button animation
    if (!wasCompleted) {
      debugLog('🎯 Set being completed - starting AI button animation');
      // World-class fade-in animation for AI Coaching Feedback button
      setTimeout(() => {
        Animated.parallel([
          // Elegant fade in
          Animated.timing(aiButtonOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Gentle scale up with subtle bounce
          Animated.spring(aiButtonScale, {
            toValue: 1,
            tension: 80,
            friction: 12,
            useNativeDriver: true,
          }),
          // Smooth upward slide
          Animated.timing(aiButtonTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]).start((finished) => {
          debugLog('🎯 AI button animation completed, finished:', finished);
          debugLog('🎯 Checking tooltip conditions - hasSeenTooltips:', hasSeenTooltips, 'tooltipStep:', tooltipStep);
          debugLog('🎯 aiCoachingButtonLayout when animation done:', aiCoachingButtonLayout); 
        });
      }, 100); // Small delay to let the checkmark animation settle
    } else {
      debugLog('🎯 Set being uncompleted - hiding AI button');
      // If uncompleting the set, hide the AI button
      Animated.parallel([
        Animated.timing(aiButtonOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(aiButtonScale, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(aiButtonTranslateY, {
          toValue: 10,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Function to handle exercise name editing
  const handleStartEditExercise = () => {
    setIsEditingExercise(true);
    setTempExerciseName(exerciseName);
  };

  // Function to save edited exercise name
  const handleSaveExercise = () => {
    // Process the manually entered exercise name through smart abbreviation system
    const processedName = processExerciseName(tempExerciseName);
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
    
    // Create a unique key for this video + exercise + weight + reps combination
    const feedbackKey = `${videoUri}_${exerciseName}_${weight}_${reps}`;
    setCurrentVideoFeedbackKey(feedbackKey);
    
    // Check if we already have cached feedback for this exact combination
    if (cachedFeedback[feedbackKey]) {
      debugLog('Using cached feedback for:', feedbackKey);
      
      // Show modal with cached data
      setFeedbackModalVisible(true);
      setFeedbackLoading(false);
      setFeedbackData(cachedFeedback[feedbackKey]);
      setFeedbackThumbnail(thumbnailUri);
      setFeedbackVideoUrl(videoUri);
      return;
    }
    
    // Check if we have preloaded feedback for this video + exercise (without weight/reps)
    const preloadKey = `${videoUri}_${exerciseName}_preload`;
    if (cachedFeedback[preloadKey]) {
      debugLog('Using preloaded feedback for:', preloadKey);
      
      // Show modal with preloaded data
      setFeedbackModalVisible(true);
      setFeedbackLoading(false);
      setFeedbackData(cachedFeedback[preloadKey]);
      setFeedbackThumbnail(thumbnailUri);
      setFeedbackVideoUrl(videoUri);
      
      // Cache it also under the specific weight/reps key for future use
      setCachedFeedback(prev => ({
        ...prev,
        [feedbackKey]: cachedFeedback[preloadKey]
      }));
      
      return;
    }

    // Show modal with loading state for new feedback
    setFeedbackModalVisible(true);
    setFeedbackLoading(true);
    setFeedbackData(null);
    setFeedbackThumbnail(thumbnailUri);
    setFeedbackVideoUrl(videoUri);
    
    // Let users know this will take some time
    toast.info('AI analysis in progress - this may take a few minutes...');

    // Retry logic for coaching feedback
    const MAX_RETRIES = 2;
    let retryCount = 0;
    
    const attemptFeedbackRequest = async () => {
      try {
        // Get current user ID
        const currentUserId = await getCurrentUserId();
        if (!currentUserId) {
          throw new Error('User not authenticated');
        }

        debugLog('Sending coaching feedback request with user_id:', currentUserId, `(attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        debugLog('Video URI:', videoUri);
        debugLog('Exercise name:', exerciseName || 'Unknown Exercise');

        // Use expo-file-system to confirm the file exists and retrieve proper URI
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          throw new Error('Video file not found');
        }

        debugLog('File verified, exists:', fileInfo.exists, 'URI:', fileInfo.uri, 'Size:', fileInfo.size);

        // Create FormData for file upload with proper React Native/Expo formatting
        const formData = new FormData();
        
        // Ensure proper URI format for iOS/Expo
        let properUri = fileInfo.uri;
        if (Platform.OS === 'ios' && !properUri.startsWith('file://')) {
          properUri = `file://${properUri}`;
        }
        
        // Add the video file with exact structure required for React Native FormData
        formData.append('video', {
          uri: properUri,
          name: 'workout_video.mp4',
          type: 'video/mp4',
        });
        
        // Add other form fields as plain text
        formData.append('user_id', currentUserId);
        formData.append('movement', exerciseName);

        debugLog('FormData created with proper URI:', properUri);
        debugLog('Making request to backend - no timeout, allowing full processing time...');

        // Make the request without any timeout - let backend take as long as needed
        const response = await fetch('https://gymvid-app.onrender.com/analyze/feedback_upload', {
          method: 'POST',
          body: formData,
          // No AbortController or timeout - let the AI analysis complete naturally
        });

        debugLog('Response received, status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          debugLog('Response error text:', errorText);
          
          // Handle different HTTP errors
          if (response.status === 504 || response.status === 502) {
            throw new Error('Gateway timeout - server is overloaded');
          } else if (response.status === 503) {
            throw new Error('Service unavailable - server is down');
          } else if (response.status >= 500) {
            throw new Error(`Server error (${response.status}) - please try again`);
          }
          
          throw new Error(`Upload failed with status: ${response.status}`);
        }

        const data = await response.json();
        debugLog('✅ Coaching feedback received:', data);
        
        if (!data.success) {
          // If the backend explicitly says it failed, throw an error
          if (data.error_type === 'feedback_generation_error') {
            throw new Error(data.error || 'Failed to generate coaching feedback');
          } else {
            throw new Error(data.error || 'Failed to get coaching feedback');
          }
        }

        setFeedbackLoading(false);
        
        // Structure the feedback data with the specified fields
        const feedbackResponse = {
          form_rating: data.feedback?.form_rating || '',
          observations: data.feedback?.observations || '',
          summary: data.feedback?.summary || '',
          // Keep other fields for compatibility
          ...data.feedback
        };
        
        // Check if this is an error feedback (form_rating of 0)
        if (feedbackResponse.form_rating === 0) {
          debugLog('⚠️ Received error feedback with form_rating 0');
          // Still show the feedback modal with the error message
          // This allows users to see what went wrong
        }
        
        setFeedbackData(feedbackResponse);
        
        // Cache the feedback for this specific combination
        setCachedFeedback(prev => ({
          ...prev,
          [feedbackKey]: feedbackResponse
        }));
        
        debugLog('Feedback cached for key:', feedbackKey);

      } catch (error) {
        debugLog('Coaching feedback error:', {
          message: error.message,
          name: error.name,
          retryCount: retryCount
        });
        
        // Determine if we should retry - only for server errors, not timeouts
        const shouldRetry = (
          (error.message.includes('504') || 
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('Gateway timeout') ||
           error.message.includes('Service unavailable') ||
           error.message.includes('overloaded')) && 
          retryCount < MAX_RETRIES
        );
        
        if (shouldRetry) {
          retryCount++;
          debugLog(`Retrying coaching feedback (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
          
          // Show user feedback
          if (retryCount === 1) {
            toast.info('Server is starting up, retrying...');
          } else if (retryCount === 2) {
            toast.info('Last attempt, please wait...');
          }
          
          // Exponential backoff
          const backoffDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
          debugLog(`Waiting ${backoffDelay}ms before retry...`);
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return attemptFeedbackRequest();
        }
        
        // All retries failed - show error and close modal
        console.error('❌ Error uploading video for feedback after all retries:', error);
        
        setFeedbackLoading(false);
        setFeedbackData(null);
        setFeedbackModalVisible(false);
        
        // Show specific error message based on error type
        if (error.message && error.message.includes('Network request failed')) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message && (error.message.includes('503') || error.message.includes('Service unavailable'))) {
          toast.error("Service temporarily down. Please try again later.");
        } else if (error.message && (error.message.includes('504') || error.message.includes('Gateway timeout'))) {
          toast.error("Server is busy. Please try again later or enter feedback manually.");
        } else {
          toast.error("We couldn't generate feedback for this video. Try uploading a clearer angle or a different set.");
        }
      }
    };

    // Start the attempt
    await attemptFeedbackRequest();
  };

  // Enhanced handleDismissTooltip with elegant transitions
  const handleDismissTooltip = async () => {
    debugLog('handleDismissTooltip called with tooltipStep:', tooltipStep);
    
    if (tooltipStep === 1) {
      // First popup dismissed -> smoothly transition to second popup
      debugLog('Dismissing first popup, preparing second popup');
      setIsTransitioningTooltips(true); // Indicate transition is in progress
      
      // Add a graceful delay for the transition
      // This allows the first popup's exit animation to complete 
      // before the second popup starts its entrance animation
      setTimeout(() => {
        debugLog('Starting second popup after transition delay');
        setTooltipStep(2);
        setIsTransitioningTooltips(false); // Transition complete
      }, 450); // Slightly increased delay to match our enhanced exit animation
      
    } else if (tooltipStep === 2) {
      // Second popup dismissed -> close all tooltips
      debugLog('Dismissing second popup');
      setIsTransitioningTooltips(true);
      
      // Close all tooltips after second popup
      setTooltipStep(0);
      setHasSeenTooltips(true);
      setIsTransitioningTooltips(false);
      try { 
        await AsyncStorage.setItem('hasSeenVideoReviewTooltips_v2', 'true'); 
        debugLog('Tooltips marked as seen after completing both popups.');
      } 
      catch (e) { debugLog('Error saving tooltip_v2 pref', e); }
      
    } else {
      // Fallback - close tooltips but don't mark as seen (so they can show again)
      debugLog('Unexpected tooltipStep, closing tooltips without marking as seen');
      setTooltipStep(0);
      setIsTransitioningTooltips(false); // Ensure transition state is reset
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
  const onAiCoachingButtonLayout = () => {
    debugLog('🎯 onAiCoachingButtonLayout called');
    measureElement(aiCoachingButtonRef, (layout) => {
      debugLog('🎯 AI button layout measured:', layout);
      setAiCoachingButtonLayout(layout);
    });
  };

  // Custom spotlight configuration - EASY TO EDIT
  const CUSTOM_SPOTLIGHT_CONFIG = {
    // Position adjustments
    offsetX: 0,        // Move left/right (negative = left, positive = right)
    offsetY: 0,      // Move up/down (negative = up, positive = down) - moved up from 60
    
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
    offsetY: 52,      // Move up/down (negative = up, positive = down) - moved higher from 57
    
    // Size adjustments  
    paddingTop: -4,     // Space above the target area - increased from -5
    paddingBottom: 8,  // Space below the target area - increased from 0
    paddingLeft: 2,   // Space to the left of target area - increased from 0
    paddingRight: 2,  // Space to the right of target area - increased from 0
    
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
  
  // Add state to cache feedback for current video
  const [cachedFeedback, setCachedFeedback] = useState({});
  const [currentVideoFeedbackKey, setCurrentVideoFeedbackKey] = useState(null);
  const [isPreloadingFeedback, setIsPreloadingFeedback] = useState(false);

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

  // Function to preload coaching feedback in the background
  const preloadCoachingFeedback = async (videoUri, exerciseName) => {
    if (!videoUri || !exerciseName || isPreloadingFeedback) return;
    
    try {
      setIsPreloadingFeedback(true);
      debugLog('Starting background coaching feedback preload for:', exerciseName);
      
      // Get current user ID
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        debugLog('Cannot preload feedback: User not authenticated');
        return;
      }

      // Create a unique key for this video + exercise combination (without weight/reps for preload)
      const preloadKey = `${videoUri}_${exerciseName}_preload`;
      
      // Check if we already have preloaded feedback for this combination
      if (cachedFeedback[preloadKey]) {
        debugLog('Feedback already preloaded for:', preloadKey);
        return;
      }

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        debugLog('Cannot preload feedback: Video file not found');
        return;
      }

      // Create FormData
      const formData = new FormData();
      
      // Ensure proper URI format for iOS/Expo
      let properUri = fileInfo.uri;
      if (Platform.OS === 'ios' && !properUri.startsWith('file://')) {
        properUri = `file://${properUri}`;
      }
      
      // Add the video file
      formData.append('video', {
        uri: properUri,
        name: 'workout_video.mp4',
        type: 'video/mp4',
      });
      
      // Add other form fields
      formData.append('user_id', currentUserId);
      formData.append('movement', exerciseName);

      debugLog('Making background request to feedback endpoint...');

      // Background preload - no timeout, let it run as long as needed
      debugLog('Background request started - no timeout applied for better success rate');

      // Make the request in the background without any timeout
      const response = await fetch('https://gymvid-app.onrender.com/analyze/feedback_upload', {
        method: 'POST',
        body: formData,
        // No AbortController or timeout for background preload
      });

      if (!response.ok) {
        debugLog('Background feedback request failed with status:', response.status);
        return;
      }

      const data = await response.json();
      debugLog('✅ Background coaching feedback received:', data);
      
      if (data.success && data.feedback) {
        // Structure the feedback data
        const feedbackResponse = {
          form_rating: data.feedback?.form_rating || '',
          observations: data.feedback?.observations || '',
          summary: data.feedback?.summary || '',
          ...data.feedback
        };
        
        // Cache the preloaded feedback
        setCachedFeedback(prev => ({
          ...prev,
          [preloadKey]: feedbackResponse
        }));
        
        debugLog('Feedback preloaded and cached for key:', preloadKey);
      }
    } catch (error) {
      // Silently fail - this is a background optimization
      debugLog('Background feedback preload error (non-blocking):', error.message);
    } finally {
      setIsPreloadingFeedback(false);
    }
  };

  // Button press animation handlers to match VideoPromptScreen.js
  const handlePrimaryButtonPressIn = () => {
    Animated.spring(primaryButtonScale, {
      toValue: 0.95,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePrimaryButtonPressOut = () => {
    Animated.spring(primaryButtonScale, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleSecondaryButtonPressIn = () => {
    Animated.spring(secondaryButtonScale, {
      toValue: 0.95,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleSecondaryButtonPressOut = () => {
    Animated.spring(secondaryButtonScale, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
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
                          <TouchableOpacity 
                            onPress={handleExerciseNameTap}
                            style={styles.exerciseNameTouchable}
                            activeOpacity={showInfoIcon ? 0.7 : 1}
                            disabled={!showInfoIcon}
                          >
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
                            {showInfoIcon && (
                              <Animated.View style={{ opacity: pencilOpacity, marginLeft: 6 }}>
                                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                              </Animated.View>
                            )}
                          </TouchableOpacity>
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
                          editable={!isSetCompleted}
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
                          editable={!isSetCompleted}
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
                  
                  {/* Remove buttons from inline content - they will be positioned at bottom */}
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      <GuidedPopup
        visible={tooltipStep === 1}
        text="Our AI will detect the exercise that's being performed in the vid for you!"
        targetLayout={exerciseCardLayout}
        highlightLayout={getFirstPopupSpotlightArea(exerciseHeaderLayout)}
        screenBackgroundColor={colors.background}
        onClose={handleDismissTooltip}
        forcePositionBelow={true}
        showIconButton={true}
      />
      <GuidedPopup
        visible={tooltipStep === 2}
        text="Enter the weight & reps while you wait - then tap the ✓ to log the set."
        targetLayout={inputsRowLayout}
        highlightLayout={getCustomSpotlightArea(inputsRowLayout)} 
        screenBackgroundColor={colors.background}
        onClose={handleDismissTooltip}
        showIconButton={true}
        verticalOffset={30}
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
        onClose={() => {
          // Only allow closing if not loading
          if (!feedbackLoading) {
            setFeedbackModalVisible(false);
          }
        }}
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
      
      {/* Keyboard Toolbar */}
      <KeyboardToolbar />
      
      {/* Bottom Buttons - positioned at bottom of screen */}
      {weight && isSetCompleted && (
        <Animated.View
          style={[
            styles.bottomButtonsContainer,
            {
              opacity: aiButtonOpacity,
              transform: [
                { scale: aiButtonScale },
                { translateY: aiButtonTranslateY }
              ]
            }
          ]}
        >
          {/* AI Coaching Feedback Button - Blue Primary */}
          <Animated.View
            style={{
              transform: [{ scale: primaryButtonScale }],
              width: '100%',
            }}
          >
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleShowCoachingFeedback}
              onPressIn={handlePrimaryButtonPressIn}
              onPressOut={handlePrimaryButtonPressOut}
              disabled={loading}
              activeOpacity={0.9}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="analytics-outline" size={24} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>AI Coaching Feedback</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Log Lift Button - White Secondary */}
          <Animated.View
            style={{
              transform: [{ scale: secondaryButtonScale }],
              width: '100%',
            }}
          >
            <TouchableOpacity 
              style={[
                styles.secondaryButton,
                loading && styles.secondaryButtonDisabled
              ]}
              onPress={handleLogLift}
              onPressIn={handleSecondaryButtonPressIn}
              onPressOut={handleSecondaryButtonPressOut}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#333333" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark" size={24} color="#333333" style={styles.buttonIcon} />
                  <Text style={styles.secondaryButtonText}>Log Lift</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
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
  tableCellInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999999',
    opacity: 0.6,
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
    // No background color here, transparent to show app content
  },
  fullScreenTouchableOverlay: { // No longer used - removed background overlay
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  popupContainerAdvanced: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20, 
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  popupArrowAdvanced: {
    position: 'absolute', 
    width: 0, 
    height: 0, 
    borderStyle: 'solid',
  },
  popupBodyAdvanced: { 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  popupTextAdvanced: {
    fontSize: 16, 
    color: colors.darkGray, 
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22, 
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  popupDismissButtonAdvanced: {
    backgroundColor: colors.primary,
    paddingVertical: 10, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    alignSelf: 'center',
  },
  popupDismissButtonTextAdvanced: {
    color: colors.white, 
    fontSize: 15, 
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  popupBodyIconButtonLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 40,
  },
  popupTextIconButtonLayout: {
    textAlign: 'left',
    marginRight: 12,
    marginBottom: 0,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  popupIconDismissButton: {
    padding: 8,
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
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 44,
  },
  keyboardDoneButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    height: 28,
    justifyContent: 'center',
  },
  keyboardDoneButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 0,
  },
  primaryButton: {
    backgroundColor: '#0070E0', // Matches VideoPromptScreen.js
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
    fontSize: 17, // Matches VideoPromptScreen.js
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
    borderColor: '#E0E0E0', // Matches VideoPromptScreen.js
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#333333', // Dark gray for contrast
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCCCCC',
    shadowOpacity: 0,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 12,
  },
  exerciseNameTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 40, // Increased from 20 to add more space below buttons
    left: 20,
    right: 20,
    zIndex: 10,
  },
}); 