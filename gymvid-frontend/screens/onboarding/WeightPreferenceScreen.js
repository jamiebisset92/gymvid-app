import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Animated, Easing } from 'react-native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function WeightPreferenceScreen({ navigation, route }) {
  const [weightPreference, setWeightPreference] = useState('');
  const { updateProfile, loading } = useAuth();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('WeightPreferenceScreen - Received params:', route.params);
    if (userId) {
      debugLog('WeightPreferenceScreen - Got userId:', userId);
    } else {
      console.warn('WeightPreferenceScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  
  // Option animations
  const kgScale = useRef(new Animated.Value(1)).current;
  const lbsScale = useRef(new Animated.Value(1)).current;
  const kgOpacity = useRef(new Animated.Value(0)).current;
  const lbsOpacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Run entrance animation only after navigator transition is complete
  useEffect(() => {
    let timer;
    if (isFocused) {
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      kgOpacity.setValue(0);
      lbsOpacity.setValue(0);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        // Use the world-class animation utility for consistent, premium feel
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          slideAnim,
          elementsAnim: [kgOpacity, lbsOpacity]
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
      kgOpacity.stopAnimation();
      lbsOpacity.stopAnimation();
    };
  }, [isFocused]);

  // Animation for option selection
  const animateOption = (isSelected, animatedValue) => {
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
  
  // Load existing preference when the screen is focused
  useEffect(() => {
    const loadUserWeightPreference = async () => {
      try {
        // Get current user
        const user = supabase.auth.user();
        if (!user) return;

        // Try to fetch existing profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('unit_pref')
          .eq('id', user.id)
          .single();

        // If we have a preference, set it in the state
        if (!error && profile && profile.unit_pref) {
          debugLog('Loaded existing weight preference:', profile.unit_pref);
          setWeightPreference(profile.unit_pref);
          // Animate the selected option
          animateOption(true, profile.unit_pref === 'kg' ? kgScale : lbsScale);
        }
      } catch (err) {
        console.error('Error loading user weight preference:', err);
      }
    };

    loadUserWeightPreference();
  }, []);

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      updateProgress('WeightPreference');
    }
  }, [isFocused, updateProgress]);

  const handleSelectWeightPreference = (selectedPreference) => {
    setWeightPreference(selectedPreference);
    
    // Run animation
    if (selectedPreference === 'kg') {
      animateOption(true, kgScale);
    } else {
      animateOption(true, lbsScale);
    }
  };

  const handleContinue = async () => {
    if (!weightPreference) {
      Alert.alert('Error', 'Please select your weight unit preference');
      return;
    }
    
    // Update database first - before any animations
    debugLog('Updating profile with unit_pref:', weightPreference);
    debugLog('Using userId:', userId);
    
    let error = null;
    try {
      // Save to AsyncStorage for future use
      await AsyncStorage.setItem('userUnitPreference', weightPreference);
      debugLog('Saved weight preference to AsyncStorage:', weightPreference);
      
      // Always try direct database update if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            unit_pref: weightPreference,
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Weight preference saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile
        debugLog('No userId available, using updateProfile method');
        const result = await updateProfile({
          unit_pref: weightPreference,
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
      Alert.alert('Error', error.message || 'Could not save your preference. Please try again.');
      return;
    }
    
    // Completely fade out this screen before navigation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
      easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
      useNativeDriver: true
    }).start(() => {
      // Only navigate after animation is complete and screen is no longer visible
      debugLog('Profile updated, navigating to BodyWeight screen...');
      
      // Pass all necessary data to next screen
      navigation.navigate('BodyWeight', { 
        userId,
        email: userEmail,
        fromSignUp
      });
    });
  };

  const handleBack = () => {
    // Log navigation attempt
    console.log('WeightPreferenceScreen: handleBack called, navigating to DateOfBirth screen');

    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('DateOfBirth', { 
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
            How do you measure your weights?
          </Animated.Text>
          <Animated.View 
            style={{ 
              width: '100%', 
              opacity: fadeAnim
            }}
          >
            <View style={styles.formContainer}>
              <Animated.View 
                style={{ 
                  transform: [{ scale: kgScale }],
                  opacity: kgOpacity
                }}
              >
                <TouchableOpacity 
                  style={[styles.optionButton, weightPreference === 'kg' && styles.selectedButton]} 
                  onPress={() => handleSelectWeightPreference('kg')}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.optionButtonText, weightPreference === 'kg' && styles.selectedButtonText]}>Kilograms (kg)</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View 
                style={{ 
                  transform: [{ scale: lbsScale }],
                  opacity: lbsOpacity
                }}
              >
                <TouchableOpacity 
                  style={[styles.optionButton, weightPreference === 'lbs' && styles.selectedButton]} 
                  onPress={() => handleSelectWeightPreference('lbs')}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.optionButtonText, weightPreference === 'lbs' && styles.selectedButtonText]}>Pounds (lbs)</Text>
                </TouchableOpacity>
              </Animated.View>
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
            style={[styles.nextButton, !weightPreference && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !weightPreference}
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
    paddingHorizontal: 20,
  },
  optionButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
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
    borderWidth: 2,
  },
  optionButtonText: {
    color: colors.darkGray,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  selectedButtonText: {
    color: colors.primary,
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButtonBottom: {
    height: 56,
    width: 56,
    borderRadius: 16,
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
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonDisabled: {
    backgroundColor: '#AACEF5',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  nextButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
}); 