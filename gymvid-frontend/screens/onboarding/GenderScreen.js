import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Animated, Easing } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function GenderScreen({ navigation, route }) {
  const [gender, setGender] = useState('');
  const { updateProfile, loading } = useAuth();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('GenderScreen - Received params:', route.params);
    if (userId) {
      debugLog('GenderScreen - Got userId:', userId);
    } else {
      console.warn('GenderScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  
  // Button animations
  const maleScale = useRef(new Animated.Value(1)).current;
  const femaleScale = useRef(new Animated.Value(1)).current;
  const maleOpacity = useRef(new Animated.Value(0)).current;
  const femaleOpacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      updateProgress('Gender');
    }
  }, [isFocused, updateProgress]);

  // Run entrance animation only after navigator transition is complete
  useEffect(() => {
    let timer;
    if (isFocused) {
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      maleOpacity.setValue(0);
      femaleOpacity.setValue(0);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        // Use the world-class animation utility for consistent, premium feel
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          slideAnim,
          elementsAnim: [maleOpacity, femaleOpacity]
        });
      }, 100);
    }
    
    // Cleanup function - very important!
    return () => {
      clearTimeout(timer);
      // Reset animations when component unmounts
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      titleAnim.stopAnimation();
      maleOpacity.stopAnimation();
      femaleOpacity.stopAnimation();
    };
  }, [isFocused]);

  // Animation for button selection
  const animateButton = (isSelected, animatedValue) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Load existing gender when the screen is focused
  useEffect(() => {
    const loadUserGender = async () => {
      try {
        // First try to get user from route params (from signup flow)
        let userIdToUse = userId;
        
        // If not available, try to get from auth
        if (!userIdToUse) {
          const user = supabase.auth.user();
          if (user) {
            userIdToUse = user.id;
          }
        }
        
        if (!userIdToUse) {
          console.log('No user ID available for fetching profile');
          return;
        }

        // Try to fetch existing profile using available ID
        const { data: profile, error } = await supabase
          .from('users')
          .select('gender')
          .eq('id', userIdToUse)
          .maybeSingle();

        // If we have a gender, set it in the state
        if (!error && profile && profile.gender) {
          // Clean up gender value if needed
          const cleanGender = profile.gender.replace(/['"\\]/g, '').trim();
          if (['Male', 'Female'].includes(cleanGender)) {
            debugLog('Loaded existing gender:', cleanGender);
            setGender(cleanGender);
            // Animate the selected button
            animateButton(true, cleanGender === 'Male' ? maleScale : femaleScale);
          }
        }
      } catch (err) {
        console.error('Error loading user gender:', err);
      }
    };

    loadUserGender();
  }, [userId]);

  const handleSelectGender = (selectedGender) => {
    setGender(selectedGender);
    
    // Run animation
    if (selectedGender === 'Male') {
      animateButton(true, maleScale);
    } else {
      animateButton(true, femaleScale);
    }
  };

  const handleContinue = async () => {
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }
    
    // Update database first - before animation
    debugLog('Updating profile with gender:', gender);
    debugLog('Using userId:', userId);
    
    let error = null;
    try {
      // Save to AsyncStorage for future use
      await AsyncStorage.setItem('userGender', gender);
      debugLog('Saved gender to AsyncStorage:', gender);
      
      // Always try direct database update if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            gender: gender,
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Gender saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile
        debugLog('No userId available, using updateProfile method');
        const result = await updateProfile({
          gender: gender,
          onboarding_complete: false
        });
        
        error = result?.error;
      }
    } catch (err) {
      console.error('Error in update operation:', err);
      error = err;
    }
    
    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Could not save your gender. Please try again.');
      return;
    }
    
    // Let the next screen handle its own progress update
    
    // Completely fade out this screen before navigation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
        easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 30, // Positive value to slide to the right (forward navigation)
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: true
      })
    ]).start(() => {
      // Only navigate after animation is complete and screen is no longer visible
      debugLog('Profile updated, navigating to DateOfBirth with userId:', userId);
      
      // Pass all necessary data to next screen
      navigation.navigate('DateOfBirth', { 
        userId,
        email: userEmail,
        fromSignUp
      });
    });
  };

  const handleBack = () => {
    // Log the navigation attempt
    console.log('GenderScreen: handleBack called, navigating to Name screen');
    
    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('Name', { 
      userId,
      email: userEmail,
      fromSignUp
    });
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          backgroundColor: '#FFFFFF' 
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Header spacer - to account for the global progress bar */}
        <View style={styles.header} />
        
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
            What's your gender?
          </Animated.Text>
          <Animated.View 
            style={{ 
              width: '100%', 
              opacity: fadeAnim,
            }}
          >
            <View style={styles.formContainer}>
              <Animated.View 
                style={{ 
                  transform: [{ scale: maleScale }],
                  opacity: maleOpacity
                }}
              >
                <TouchableOpacity 
                  style={[styles.genderButton, gender === 'Male' && styles.selectedButton]} 
                  onPress={() => handleSelectGender('Male')}
                  activeOpacity={0.9}
                >
                  <Ionicons 
                    name="male" 
                    size={30}
                    color={gender === 'Male' ? colors.primary : colors.gray} 
                    style={styles.genderIcon}
                  />
                  <Text style={[styles.genderButtonText, gender === 'Male' && styles.selectedButtonText]}>Male</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View 
                style={{ 
                  transform: [{ scale: femaleScale }],
                  opacity: femaleOpacity
                }}
              >
                <TouchableOpacity 
                  style={[styles.genderButton, gender === 'Female' && styles.selectedButton]} 
                  onPress={() => handleSelectGender('Female')}
                  activeOpacity={0.9}
                >
                  <Ionicons 
                    name="female" 
                    size={30}
                    color={gender === 'Female' ? colors.primary : colors.gray} 
                    style={styles.genderIcon}
                  />
                  <Text style={[styles.genderButtonText, gender === 'Female' && styles.selectedButtonText]}>Female</Text>
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.genderHelper}>
                Your details will help us grade your lifts in the GymVid Games if you decide to play!
              </Text>
            </View>
          </Animated.View>
        </View>
        <Animated.View 
          style={[
            styles.bottomButtonContainer,
            { 
              opacity: fadeAnim
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButtonBottom} 
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, !gender && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !gender}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Text style={styles.nextButtonIcon}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeContainer: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32, // Increased size
    fontWeight: '700', // Made font slightly heavier
    marginBottom: 20, // Reduced from 40 to decrease space
    textAlign: 'center',
    letterSpacing: -0.5, // Tighter letter spacing for modern look
    color: '#1A1A1A', // Slightly softer than pure black
    width: '100%',
  },
  genderButton: {
    backgroundColor: colors.white,
    borderRadius: 16, // Increased from 12 to 16
    height: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedButton: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2, // Made selected border slightly thicker
  },
  genderButtonText: {
    color: colors.darkGray,
    fontSize: 22,
    fontWeight: '600', // Slightly heavier
    letterSpacing: -0.3, // Tighter letter spacing
  },
  selectedButtonText: {
    color: colors.primary, // Changed to primary color instead of darkGray
  },
  genderIcon: {
    marginRight: 15,
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30, // Increased from 20 to 30
    paddingTop: 10, // Added padding at the top
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)', // Slightly more transparent for blur effect
    borderTopWidth: 1, // Add a subtle top border
    borderTopColor: 'rgba(0, 0, 0, 0.05)', // Very subtle border color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    // Premium glass effect
    backdropFilter: 'blur(10px)', // Will only work on iOS with newer versions
  },
  backButtonBottom: {
    height: 56,
    width: 56,
    borderRadius: 16, // Increased from 12 to 16
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  nextButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16, // Increased from 12 to 16
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Increased for more premium feel
    shadowRadius: 6, // Increased for softer shadow spread
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#AACEF5', // Lighter color when disabled
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600', // Slightly heavier
    marginRight: 8,
  },
  nextButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  genderHelper: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    paddingHorizontal: 20,
  },
}); 