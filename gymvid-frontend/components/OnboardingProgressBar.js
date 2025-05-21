import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * OnboardingProgressBar - A premium, modern progress bar for the onboarding flow.
 * 
 * @param {Object} props
 * @param {number} props.current - Current step index (0-based)
 * @param {number} props.total - Total number of steps
 */
const OnboardingProgressBar = ({ current, total }) => {
  // Create animated values for progress transitions and effects
  const progressAnim = useRef(new Animated.Value(current / total)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  
  // Get screen dimensions for responsive sizing
  const { width } = Dimensions.get('window');
  const barWidth = width * 0.5; // 50% of screen width

  // Calculate safe padding based on device
  // Increase padding for devices with dynamic island or notch
  const hasNotch = Platform.OS === 'ios' && (width > 375 || Dimensions.get('window').height > 800);
  const topPadding = Platform.OS === 'ios' ? (hasNotch ? 64 : 60) : 45;

  // Start shimmer animation when component mounts
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Update progress bar smoothly when current changes
  useEffect(() => {
    // Only animate when screen is focused
    if (isFocused) {
      // Progress animation with spring for premium feel
      Animated.spring(progressAnim, {
        toValue: current / total,
        friction: 7,
        tension: 40,
        useNativeDriver: false,
      }).start();
      
      // Enhanced pulse animation sequence
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [current, total, isFocused]);

  return (
    <View style={[styles.progressWrapper, { paddingTop: topPadding }]} pointerEvents="none">
      <Animated.View 
        style={[
          styles.progressContainer,
          { 
            width: barWidth,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.progressBarBackground,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]} 
        >
          <LinearGradient
            colors={['#0088FF', '#00C6FF', '#0088FF']}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.gradientFill}
          />
          
          {/* Premium reflective highlight effect */}
          <Animated.View 
            style={[
              styles.shimmerEffect,
              {
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-barWidth, barWidth]
                    })
                  }
                ]
              }
            ]}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  progressContainer: {
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    borderRadius: 8,
  },
  shimmerEffect: {
    width: 40,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    top: 0,
    borderRadius: 8,
    transform: [{ skewX: '-20deg' }]
  }
});

export default OnboardingProgressBar; 