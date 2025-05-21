import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView,
  TextInput,
  Dimensions,
  Keyboard
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Animated, Easing } from 'react-native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

// Get screen width
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function BodyWeightScreen({ navigation, route }) {
  // Default to empty string to allow placeholder to show
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const { updateProfile, loading } = useAuth();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('BodyWeightScreen - Received params:', route.params);
    if (userId) {
      debugLog('BodyWeightScreen - Got userId:', userId);
    } else {
      console.warn('BodyWeightScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  
  const isFocused = useIsFocused();
  const inputRef = useRef(null);

  // Function to validate and update weight
  const handleWeightChange = (text) => {
    // Only allow numbers and a single decimal point
    if (/^(\d+\.?\d*|\.\d+)$/.test(text) || text === '') {
      setWeight(text);
    }
  };

  // Format displayed weight
  const getFormattedWeight = () => {
    const num = parseFloat(weight);
    if (isNaN(num)) return '80';
    
    // Show up to 1 decimal place, but remove trailing zeros
    return num.toFixed(1).replace(/\.0$/, '');
  };

  // Run entrance animation only after navigator transition is complete
  useEffect(() => {
    let timer;
    if (isFocused) {
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      inputAnim.setValue(0);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        // Use the world-class animation utility for consistent, premium feel
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          slideAnim,
          elementsAnim: [inputAnim]
        });
        
        // Focus the input after animations
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
    
    // Cleanup function - very important!
    return () => {
      clearTimeout(timer);
      // Reset animations when component unmounts
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      titleAnim.stopAnimation();
      inputAnim.stopAnimation();
    };
  }, [isFocused]);
  
  // Load existing weight and preference when the screen is focused
  useEffect(() => {
    const loadUserWeight = async () => {
      try {
        // Get current user
        const user = supabase.auth.user();
        if (!user) return;

        debugLog('Loading user weight data...');
        
        // Try to fetch existing profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('bodyweight, unit_pref')
          .eq('id', user.id)
          .single();

        // If we have weight data, set it in the state
        if (!error && profile) {
          if (profile.bodyweight) {
            debugLog('Loaded existing weight:', profile.bodyweight);
            setWeight(profile.bodyweight.toString());
          }
          if (profile.unit_pref) {
            debugLog('Loaded existing weight unit:', profile.unit_pref);
            setWeightUnit(profile.unit_pref);
          }
        }
      } catch (err) {
        console.error('Error loading user weight data:', err);
      }
    };

    loadUserWeight();
  }, []);

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      updateProgress('BodyWeight');
    }
  }, [isFocused, updateProgress]);

  const handleContinue = async () => {
    // Parse and validate weight
    const numWeight = parseFloat(weight);
    
    if (isNaN(numWeight) || numWeight < 30 || numWeight > 700) {
      Alert.alert('Error', 'Please enter a valid weight between 30 and 700');
      return;
    }
    
    // Close keyboard if open
    Keyboard.dismiss();
    
    // Update database first - before any animations
    debugLog('Updating profile with weight:', numWeight);
    debugLog('Using userId:', userId);
    
    let error = null;
    try {
      // Always try direct database update if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            bodyweight: numWeight,
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Weight saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile
        debugLog('No userId available, using updateProfile method');
        const result = await updateProfile({
          bodyweight: numWeight,
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
      Alert.alert('Error', error.message || 'Could not save your weight. Please try again.');
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
      debugLog('Profile updated, navigating to Country screen...');
      
      // Pass all necessary data to next screen
      navigation.navigate('Country', { 
        userId,
        email: userEmail,
        fromSignUp
      });
    });
  };

  const handleBack = () => {
    // Log navigation attempt
    console.log('BodyWeightScreen: handleBack called, navigating to WeightPreference screen');

    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('WeightPreference', { 
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
        <View style={styles.header}>
          {/* Back button in top left corner */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
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
            What's your current body weight?
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
                  opacity: inputAnim
                }}
              >
                {/* Simplified weight input with integrated Next button */}
                <View style={styles.weightInputContainer}>
                  <View style={styles.inputWrapper}>
                    <View style={styles.weightWithUnitContainer}>
                      <TextInput
                        ref={inputRef}
                        style={styles.weightInput}
                        value={weight}
                        onChangeText={handleWeightChange}
                        keyboardType="numeric"
                        selectTextOnFocus
                        maxLength={5}
                        placeholder="0"
                        placeholderTextColor="#AAAAAA"
                        returnKeyType="done"
                        onSubmitEditing={handleContinue}
                        autoFocus={true}
                      />
                      <Text style={styles.weightUnitTextInline}>{weightUnit}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.nextButton}
                      onPress={handleContinue}
                      disabled={loading || !weight.trim()}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name="arrow-forward" 
                        size={24} 
                        color={!weight.trim() ? colors.lightGray : colors.primary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.weightHelper}>
                  This helps us personalize your experience. You can always change it later.
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
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
  weightInputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  weightWithUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  weightInput: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.darkGray,
    textAlign: 'right',
    paddingRight: 5,
  },
  weightUnitTextInline: {
    fontSize: 22,
    color: colors.gray,
    fontWeight: '500',
    textAlign: 'left',
  },
  weightHelper: {
    marginTop: 15,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  nextButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
  backButton: {
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
    top: 15,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});