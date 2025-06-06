import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export default function DateOfBirthScreen({ navigation, route }) {
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [age, setAge] = useState(0);
  const [loading, setLoading] = useState(false);
  const { updateProfile, forceCompleteOnboarding } = useAuth();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('DateOfBirthScreen - Received params:', route.params);
    if (userId) {
      debugLog('DateOfBirthScreen - Got userId:', userId);
    } else {
      console.warn('DateOfBirthScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  const isFocused = useIsFocused();
  // Entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;

  // Load existing date of birth if available
  useEffect(() => {
    const loadUserDateOfBirth = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) {
          debugLog('No user found, cannot load DOB.');
          return;
        } 

        debugLog('Loading user DOB for userId:', user.id);
        const { data: profile, error } = await supabase
          .from('users')
          .select('date_of_birth')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile in DateOfBirthScreen:', error.message);
          return;
        }

        if (profile && profile.date_of_birth) {
          debugLog('Loaded existing date of birth:', profile.date_of_birth);
          setDateOfBirth(new Date(profile.date_of_birth));
        } else {
          debugLog('No existing date of birth found for user.');
          // Keep default dateOfBirth (today) or set to a sensible default if desired
        }
      } catch (err) {
        console.error('Unexpected error in loadUserDateOfBirth (DateOfBirthScreen):', err);
      }
    };

    // Only load if focused to prevent unnecessary calls during navigation
    if (isFocused) {
        loadUserDateOfBirth();
    }
  }, [isFocused]);

  // Calculate age whenever date changes
  useEffect(() => {
    calculateAge(dateOfBirth);
  }, [dateOfBirth]);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    
    setAge(calculatedAge);
  };

  // Calculate age category based on age
  const getAgeCategory = (age) => {
    if (age < 18) {
      return 'Sub-Junior';
    } else if (age >= 18 && age < 23) {
      return 'Junior';
    } else if (age >= 40 && age < 50) {
      return 'Masters 1';
    } else if (age >= 50 && age < 60) {
      return 'Masters 2';
    } else if (age >= 60) {
      return 'Masters 3';
    } else {
      return 'Open'; // Default for ages 23-39
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateOfBirth;
    setDateOfBirth(currentDate);
  };

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      console.log('📅 DateOfBirthScreen: Current progress before update:', progress);
      updateProgress('DateOfBirth');
      console.log('📅 DateOfBirthScreen: Called updateProgress with DateOfBirth');
    }
  }, [isFocused, updateProgress]);

  const handleContinue = async () => {
    // Calculate if the user is at least 16 years old
    if (age < 16) {
      Alert.alert(
        "Age Restriction",
        "You must be at least 16 years old to use this app.",
        [{ text: "OK" }]
      );
      return;
    }

    // Update database first - before any animations
    try {
      setLoading(true);
      
      const updateData = {
        date_of_birth: dateOfBirth.toISOString(),
        onboarding_complete: false
      };
      debugLog('Updating profile with date of birth');
      debugLog('Using userId:', userId);
      
      // Save to AsyncStorage for future use
      await AsyncStorage.setItem('userDateOfBirth', dateOfBirth.toISOString());
      debugLog('Saved date of birth to AsyncStorage:', dateOfBirth.toISOString());
      
      let error = null;
      
      // Always try direct database update if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            date_of_birth: dateOfBirth.toISOString(),
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Date of birth saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile
        debugLog('No userId available, using updateProfile method');
        const result = await updateProfile(updateData);
        error = result?.error;
      }
      
      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', error.message || 'Could not save your date of birth. Please try again.');
        setLoading(false);
        return;
      }
      
      // Completely fade out this screen before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
        easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
        useNativeDriver: true
      }).start(() => {
        // Navigate to the next screen only after screen is completely hidden
        // Pass all necessary data to next screen
        navigation.navigate('UserWeight', {
          userId,
          email: userEmail,
          fromSignUp
        });
      });
    } catch (err) {
      console.error('Unexpected error in handleContinue:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Log navigation attempt
    console.log('DateOfBirth: handleBack called, navigating to Gender screen');

    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('Gender', { 
      userId,
      email: userEmail,
      fromSignUp
    });
  };

  // Calculate progress percentage
  const progressPercentage = progress.current / progress.total;

  // Format date for display
  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  // Run entrance animations (world-class pattern)
  useEffect(() => {
    let timer;
    if (isFocused) {
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        // Use the world-class animation utility for consistent, premium feel
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          slideAnim
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
    };
  }, [isFocused]);

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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
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
            When were you born?
          </Animated.Text>
          
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate(dateOfBirth)}</Text>
              <View style={styles.dateIconContainer}>
                <Ionicons name="calendar" size={24} color="#6b7280" />
              </View>
            </View>

            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                style={styles.datePicker}
              />
            </View>

            <View style={styles.ageContainer}>
              <Text style={styles.ageText}>
                You are <Text style={styles.ageNumber}>{age}</Text> years old
              </Text>
              {age < 16 && (
                <Text style={styles.ageWarning}>
                  You must be at least 16 years old to use this app
                </Text>
              )}
              {age >= 16 && (
                <Text style={styles.ageCategory}>
                  This places you in the <Text style={styles.ageCategoryName}>{getAgeCategory(age)}</Text> category.
                </Text>
              )}
            </View>
          </Animated.View>
        </View>
        
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={[styles.nextButton, age < 16 && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || age < 16}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
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
    height: 60, // Keep the same height for spacing
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
    paddingBottom: 0,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
  },
  dateContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    paddingHorizontal: 20,
  },
  dateText: {
    color: colors.darkGray,
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerContainer: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'center',
  },
  datePicker: {
    width: 320,
    height: 120,
    backgroundColor: 'white',
  },
  ageContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  ageText: {
    fontSize: 18,
    color: colors.darkGray,
    fontWeight: '500',
    textAlign: 'center',
  },
  ageNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  ageWarning: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginTop: 24,
    textAlign: 'center',
  },
  ageCategory: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  ageCategoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    backdropFilter: 'blur(10px)',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    position: 'absolute',
    left: 20,
    top: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  nextButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
}); 