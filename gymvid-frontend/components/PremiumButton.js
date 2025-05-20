import React, { useRef, useEffect } from 'react';
import { 
  TouchableWithoutFeedback, 
  Animated, 
  Text, 
  StyleSheet, 
  View 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { animateButtonPress } from '../utils/animationUtils';
import colors from '../config/colors';

export default function PremiumButton({
  title,
  onPress,
  iconName,
  iconPosition = 'right',
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingText = 'Please wait...',
  style,
  textStyle,
}) {
  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Loading animation values
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.7)).current;
  const dot3Opacity = useRef(new Animated.Value(1)).current;
  const dot1Scale = useRef(new Animated.Value(0.8)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Scale = useRef(new Animated.Value(0.8)).current;

  // Loading animation
  useEffect(() => {
    if (loading) {
      const createLoadingAnimation = () => {
        return Animated.sequence([
          // First stage
          Animated.parallel([
            Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot1Scale, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Opacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Opacity, { toValue: 0.7, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Scale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
          ]),
          // Second stage
          Animated.parallel([
            Animated.timing(dot1Opacity, { toValue: 0.7, duration: 300, useNativeDriver: true }),
            Animated.timing(dot1Scale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Scale, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Opacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
          ]),
          // Third stage
          Animated.parallel([
            Animated.timing(dot1Opacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(dot1Scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Opacity, { toValue: 0.7, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2Scale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3Scale, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
        ]);
      };

      // Create an infinite loop animation
      const loadingAnimation = createLoadingAnimation();
      const loopAnimation = Animated.loop(loadingAnimation);
      loopAnimation.start();

      return () => {
        loopAnimation.stop();
        // Reset values
        dot1Opacity.setValue(0.4);
        dot2Opacity.setValue(0.7);
        dot3Opacity.setValue(1);
        dot1Scale.setValue(0.8);
        dot2Scale.setValue(1);
        dot3Scale.setValue(0.8);
      };
    }
  }, [loading]);
  
  const handlePressIn = () => {
    animateButtonPress(scale, opacity, true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handlePressOut = () => {
    animateButtonPress(scale, opacity, false);
  };
  
  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };
  
  // Get styles based on variant
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'text':
        return styles.textButton;
      default:
        return styles.primaryButton;
    }
  };
  
  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButtonText;
      case 'outline':
        return styles.outlineButtonText;
      case 'text':
        return styles.textButtonText;
      default:
        return styles.primaryButtonText;
    }
  };
  
  const getIconColor = () => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'text':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };
  
  const getDotColor = () => {
    return variant === 'primary' ? '#FFFFFF' : colors.primary;
  };
  
  // Render icon if provided
  const renderIcon = () => {
    if (!iconName) return null;
    
    return (
      <Ionicons 
        name={iconName} 
        size={20} 
        color={getIconColor()} 
        style={iconPosition === 'left' ? styles.leftIcon : styles.rightIcon} 
      />
    );
  };
  
  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      <Animated.View 
        style={[
          styles.button,
          getButtonStyle(),
          {
            transform: [{ scale }],
            opacity
          },
          (disabled || loading) && styles.disabledButton,
          style,
        ]}
      >
        <View style={styles.contentContainer}>
          {iconPosition === 'left' && renderIcon()}
          
          <Text style={[getTextStyle(), textStyle]}>
            {loading ? loadingText : title}
          </Text>
          
          {iconPosition === 'right' && renderIcon()}
        </View>
        
        {loading && (
          <View style={styles.loadingDots}>
            <Animated.View 
              style={[
                styles.loadingDot, 
                { 
                  opacity: dot1Opacity,
                  transform: [{ scale: dot1Scale }],
                  backgroundColor: getDotColor()
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot, 
                {
                  opacity: dot2Opacity,
                  transform: [{ scale: dot2Scale }],
                  backgroundColor: getDotColor()
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot, 
                {
                  opacity: dot3Opacity,
                  transform: [{ scale: dot3Scale }],
                  backgroundColor: getDotColor()
                }
              ]} 
            />
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#F0F7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    height: 40,
    paddingHorizontal: 8,
    marginVertical: 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  loadingDots: {
    flexDirection: 'row',
    marginLeft: 10,
    height: 20,
    alignItems: 'center',
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
}); 