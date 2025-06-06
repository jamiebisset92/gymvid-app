import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import colors from '../config/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WorkoutOptionCard = ({ icon, title, onPress, twoLineTitle, animatedStyle, index }) => {
  const pressAnimation = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    Animated.spring(pressAnimation, {
      toValue: 0.96,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnimation, {
      toValue: 1,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (e) => {
    e.stopPropagation();
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    onPress();
  };

  // Define subtle color themes for each card
  const getCardTheme = (index) => {
    const themes = [
      { iconBg: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.12)' }, // Blue
      { iconBg: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.12)' }, // Green
      { iconBg: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.12)' }, // Amber
      { iconBg: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.12)' }, // Purple
    ];
    return themes[index] || themes[0];
  };

  const theme = getCardTheme(index);

  return (
    <Animated.View style={[styles.optionCard, { borderColor: theme.borderColor }, animatedStyle]}>
      <TouchableOpacity 
        style={styles.cardTouchable}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[
          styles.cardContent,
          {
            transform: [{ scale: pressAnimation }]
          }
        ]}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={28} color={colors.darkGray} />
          </View>
          {twoLineTitle ? (
            <View style={styles.twoLineContainer}>
              <Text style={styles.optionTitle}>Record a</Text>
              <Text style={styles.optionTitle}>New PR</Text>
            </View>
          ) : (
            <Text style={styles.optionTitle}>{title}</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function WorkoutStack({ visible, onClose, navigation }) {
  // Animation values - simplified for better coordination
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const containerTranslateY = useRef(new Animated.Value(100)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  const handleOptionPress = (screenName) => {
    // Ultra-smooth exit animation
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerTranslateY, {
        toValue: 50,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      navigation.navigate(screenName);
    });
  };

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    // Ultra-smooth exit animation
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerTranslateY, {
        toValue: 50,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // World-class entrance animation
  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Reset all values
      backgroundOpacity.setValue(0);
      containerTranslateY.setValue(100);
      containerOpacity.setValue(0);

      // Single coordinated animation - no sequences or delays
      Animated.parallel([
        // Background appears smoothly
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        
        // Container slides up with perfect spring physics
        Animated.spring(containerTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        
        // Container fades in smoothly
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        {Platform.OS === 'ios' ? (
          <Animated.View 
            style={[
              styles.blurContainer,
              {
                opacity: backgroundOpacity,
              }
            ]}
          >
            <BlurView
              intensity={20}
              tint="systemMaterialDark"
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity 
              style={styles.overlayTouchable}
              activeOpacity={1} 
              onPress={handleClose}
            />
          </Animated.View>
        ) : (
          <Animated.View 
            style={[
              styles.overlay,
              {
                opacity: backgroundOpacity,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.overlayTouchable}
              activeOpacity={1} 
              onPress={handleClose}
            />
          </Animated.View>
        )}
        
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: containerOpacity,
              transform: [{ translateY: containerTranslateY }],
            }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <WorkoutOptionCard
                icon="barbell-outline"
                title="Start New Workout"
                onPress={() => handleOptionPress('NewBlankWorkout')}
                index={0}
              />
              <WorkoutOptionCard
                icon="camera-outline"
                title="Record a"
                twoLineTitle={true}
                onPress={() => handleOptionPress('QuickLog')}
                index={1}
              />
            </View>
            <View style={styles.gridRow}>
              <WorkoutOptionCard
                icon="bookmarks-outline"
                title="Your Saved Routines"
                onPress={() => handleOptionPress('SavedWorkouts')}
                index={2}
              />
              <WorkoutOptionCard
                icon="search-outline"
                title="Explore Routines"
                onPress={() => handleOptionPress('ExploreWorkouts')}
                index={3}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: 'relative',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 140,
    paddingTop: 20,
  },
  gridContainer: {
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    minHeight: 130,
    // Enhanced multi-layer shadows for dramatic depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
      },
      android: {
        elevation: 30,
      },
    }),
    // Premium border treatment
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)', // Will be overridden by theme
    // Add subtle inner glow effect
    ...Platform.select({
      ios: {
        // Secondary shadow for extra depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.50,
        shadowRadius: 16,
      },
    }),
  },
  cardTouchable: {
    flex: 1,
    borderRadius: 20,
    // Add subtle background gradient effect
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  cardContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    // Add subtle inner highlight
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  iconContainer: {
    marginBottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    // Add subtle shadow to icon container
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.2,
    // Add subtle text shadow for better contrast
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  twoLineContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
}); 