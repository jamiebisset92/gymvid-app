import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Toast durations
export const DURATIONS = {
  SHORT: 2000,
  MEDIUM: 3500,
  LONG: 5000,
};

// Toast types with their respective icons and colors
export const TOAST_TYPES = {
  SUCCESS: {
    backgroundColor: '#4CD964',
    icon: 'checkmark-circle',
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  ERROR: {
    backgroundColor: '#FF3B30',
    icon: 'alert-circle',
    haptic: Haptics.NotificationFeedbackType.Error,
  },
  INFO: {
    backgroundColor: '#007AFF',
    icon: 'information-circle',
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  WARNING: {
    backgroundColor: '#FFCC00',
    icon: 'warning',
    textColor: '#1A1A1A',
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  NEUTRAL: {
    backgroundColor: '#8E8E93', // iOS gray color
    icon: 'ellipsis-horizontal-circle',
    haptic: Haptics.NotificationFeedbackType.Success,
  },
};

const PremiumToast = ({ 
  message, 
  type = 'INFO', 
  duration = DURATIONS.MEDIUM, 
  onClose, 
  showIcon = true,
  allowDismiss = true,
  onPress = null,
  position = 'bottom',
  keyboardVisible = false,
  keyboardHeight = 0,
}) => {
  // Get safe area insets for proper positioning
  const insets = useSafeAreaInsets();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Get toast configuration
  const toastConfig = TOAST_TYPES[type];
  
  // Calculate position based on keyboard visibility and position preference
  const getToastPosition = () => {
    if (position === 'top') {
      return {
        top: insets.top + 10,
        bottom: undefined,
      };
    } else if (position === 'keyboard-aware' && keyboardVisible) {
      return {
        top: undefined,
        bottom: keyboardHeight + 10,
      };
    } else {
      return {
        top: undefined,
        bottom: insets.bottom + 20,
      };
    }
  };
  
  // Get correct slide direction
  const getSlideTransform = () => {
    if (position === 'top') {
      return { translateY: slideAnim };
    } else {
      return { translateY: slideAnim.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 100],
      })};
    }
  };
  
  // Function to hide toast
  const hideToast = () => {
    const hideValue = position === 'top' ? -100 : 100;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: hideValue,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };
  
  // Setup animations - using a ref to avoid scheduling updates during render
  const animationsStarted = useRef(false);
  
  useEffect(() => {
    // Only run this effect once
    if (animationsStarted.current) return;
    
    animationsStarted.current = true;
    
    // Trigger haptic feedback (safely)
    const triggerHaptic = async () => {
      try {
        await Haptics.notificationAsync(toastConfig.haptic);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    };
    
    triggerHaptic();
    
    // Show animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Hide animation after duration
    const hideTimer = setTimeout(() => {
      hideToast();
    }, duration);
    
    return () => clearTimeout(hideTimer);
  }, []);
  
  // Handle press on toast
  const handlePress = () => {
    if (onPress) {
      onPress();
      hideToast();
    } else if (allowDismiss) {
      hideToast();
    }
  };
  
  // Get position styles
  const positionStyle = getToastPosition();
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        {
          transform: [getSlideTransform()],
          opacity: opacityAnim,
          backgroundColor: toastConfig.backgroundColor,
          ...positionStyle,
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.content}>
          {showIcon && (
            <Ionicons 
              name={toastConfig.icon} 
              size={24} 
              color={toastConfig.textColor || '#FFFFFF'} 
              style={styles.icon} 
            />
          )}
          <Text 
            style={[
              styles.message, 
              { color: toastConfig.textColor || '#FFFFFF' },
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
          
          {allowDismiss && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={hideToast}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            >
              <Ionicons 
                name="close" 
                size={18} 
                color={toastConfig.textColor || '#FFFFFF'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast manager to show toasts programmatically
let toastQueue = [];
let isShowingToast = false;

// Function to handle showing the next toast in queue
const showNextToast = () => {
  if (toastQueue.length === 0) {
    isShowingToast = false;
    return;
  }
  
  isShowingToast = true;
  const { message, type, duration, onClose, showIcon, allowDismiss, onPress } = toastQueue.shift();
  
  // Render toast using React Native's ToastAndroid or a custom implementation
  // This would typically be handled by a toast manager library or a context provider
};

// Public function to show a toast
export const showToast = (message, options = {}) => {
  const toastOptions = {
    message,
    type: options.type || 'INFO',
    duration: options.duration || DURATIONS.MEDIUM,
    onClose: options.onClose || null,
    showIcon: options.showIcon !== undefined ? options.showIcon : true,
    allowDismiss: options.allowDismiss !== undefined ? options.allowDismiss : true,
    onPress: options.onPress || null,
  };
  
  toastQueue.push(toastOptions);
  
  if (!isShowingToast) {
    showNextToast();
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    // Top/Bottom position is set dynamically based on position prop
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  touchable: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default PremiumToast; 