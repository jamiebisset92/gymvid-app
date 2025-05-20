import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../utils/animationUtils';

const { width } = Dimensions.get('window');

// Enhanced Menu Option Component with animations
const MenuOption = ({ icon, title, description, onPress, animValue, delay, index }) => {
  // Calculate animations based on index to create staggered effect
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50 + (index * 10), 0],
  });
  
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  const scale = animValue.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.95, 1.02, 1],
  });

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <TouchableOpacity 
        style={styles.menuOption} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.menuOptionContent}>
          <Text style={styles.menuOptionTitle}>{title}</Text>
          <Text style={styles.menuOptionDescription}>{description}</Text>
        </View>
        <View style={styles.menuOptionIconContainer}>
          <View style={styles.menuOptionIcon}>
            <Ionicons name={icon} size={28} color={colors.white} />
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.gray} style={styles.menuChevron} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function LogWorkoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  
  // Individual animations for menu items
  const menuAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  // Run entrance animations
  useEffect(() => {
    // Main animations
    runWorldClassEntranceAnimation({
      fadeAnim,
      titleAnim,
      slideAnim,
      elementsAnim: menuAnimations,
    });
    
    // Sequential animations for menu items
    Animated.stagger(100, menuAnimations.map(anim => 
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    )).start();
  }, []);

  const handleStartNewWorkout = () => {
    navigation.navigate('Workout', { screen: 'NewBlankWorkout' });
  };

  const handleLogNewPR = () => {
    navigation.navigate('LogNewPR');
  };

  const handleSavedWorkouts = () => {
    navigation.navigate('SavedWorkouts');
  };

  const handleExploreWorkouts = () => {
    navigation.navigate('ExploreWorkouts');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[
        styles.header,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: titleAnim }]
        }
      ]}>
        <Text style={styles.title}>Log Workout</Text>
        <Text style={styles.subtitle}>Choose an option to get started</Text>
      </Animated.View>

      <Animated.View style={[
        styles.contentContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <MenuOption
            icon="barbell-outline"
            title="Start New Workout"
            description="Create a new workout session from scratch"
            onPress={handleStartNewWorkout}
            animValue={menuAnimations[0]}
            index={0}
          />
          
          <MenuOption
            icon="trophy-outline"
            title="Log a New PR"
            description="Record a new personal record achievement"
            onPress={handleLogNewPR}
            animValue={menuAnimations[1]}
            index={1}
          />
          
          <MenuOption
            icon="bookmark-outline"
            title="Saved Workouts"
            description="View and repeat your saved workout routines"
            onPress={handleSavedWorkouts}
            animValue={menuAnimations[2]}
            index={2}
          />
          
          <MenuOption
            icon="compass-outline"
            title="Explore Workouts"
            description="Discover new workout programs and templates"
            onPress={handleExploreWorkouts}
            animValue={menuAnimations[3]}
            index={3}
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    letterSpacing: -0.2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  menuOptionContent: {
    flex: 1,
    paddingRight: 20,
  },
  menuOptionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  menuOptionDescription: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    lineHeight: 20,
  },
  menuOptionIconContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  menuOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  menuChevron: {
    marginLeft: 4,
  }
}); 