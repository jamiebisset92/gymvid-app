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
  Keyboard,
  Animated,
  Easing
} from 'react-native';
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
    console.log('[USER-WEIGHT]', ...args);
  }
};

// Get screen width
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function UserWeightScreen({ navigation, route }) {
  const [weight, setWeight] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('kg'); // 'kg' or 'lbs'
  const { updateProfile, loading } = useAuth();
  
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  useEffect(() => {
    debugLog('UserWeightScreen - Received params:', route.params);
    if (!userId) console.warn('UserWeightScreen - No userId provided!');
  }, [route.params]);
  
  const { updateProgress } = useContext(ProgressContext);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  const switchAnim = useRef(new Animated.Value(0)).current; // For unit switch
  const inputAnim = useRef(new Animated.Value(0)).current;
  
  const isFocused = useIsFocused();
  const inputRef = useRef(null);

  const handleWeightChange = (text) => {
    if (/^(\d+\.?\d*|\.\d+)$/.test(text) || text === '') {
      setWeight(text);
    }
  };

  useEffect(() => {
    let timer;
    if (isFocused) {
      fadeAnim.setValue(0);
      titleAnim.setValue(20);
      switchAnim.setValue(0);
      inputAnim.setValue(0);
      
      timer = setTimeout(() => {
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          elementsAnim: [switchAnim, inputAnim] 
        });
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
    return () => {
      clearTimeout(timer);
      fadeAnim.stopAnimation();
      titleAnim.stopAnimation();
      switchAnim.stopAnimation();
      inputAnim.stopAnimation();
    };
  }, [isFocused]);
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) return;

        debugLog('Loading user weight data...');
        const { data: profile, error } = await supabase
          .from('users')
          .select('bodyweight, unit_pref')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          if (profile.bodyweight) {
            setWeight(profile.bodyweight.toString());
            debugLog('Loaded existing bodyweight:', profile.bodyweight);
          }
          if (profile.unit_pref) {
            setSelectedUnit(profile.unit_pref);
            debugLog('Loaded existing unit_pref:', profile.unit_pref);
          } else {
             // Default to 'kg' if no preference is stored
            setSelectedUnit('kg');
            debugLog('No unit_pref found, defaulting to kg');
          }
        } else if (error) {
          debugLog('Error loading user data, or no data found:', error.message);
           setSelectedUnit('kg'); // Default if error or no profile
        } else {
          setSelectedUnit('kg'); // Default if no profile
        }
      } catch (err) {
        console.error('Error loading user weight data:', err);
        setSelectedUnit('kg'); // Default on catch
      }
    };

    if (isFocused) { // Load data when screen is focused
        loadUserData();
        updateProgress('UserWeight'); // Update progress
    }
  }, [isFocused, updateProgress]); // Added updateProgress to dependencies

  const handleContinue = async () => {
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight < 20 || numWeight > 300) { // Adjusted validation range
      Alert.alert('Invalid Weight', 'Please enter a valid weight (e.g., 20-300).');
      return;
    }
    Keyboard.dismiss();
    
    debugLog('Updating profile with weight:', numWeight, 'and unit:', selectedUnit);
    
    let error = null;
    try {
      await AsyncStorage.setItem('userBodyweight', numWeight.toString());
      await AsyncStorage.setItem('userUnitPreference', selectedUnit);
      debugLog('Saved weight and unit to AsyncStorage');
      
      if (userId) {
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail, // Ensure email is passed if available and needed for upsert
            bodyweight: numWeight,
            unit_pref: selectedUnit,
            onboarding_complete: false
          });
        if (directError) error = directError;
      } else {
        const result = await updateProfile({
          bodyweight: numWeight,
          unit_pref: selectedUnit,
          onboarding_complete: false
        });
        error = result?.error;
      }
    } catch (err) {
      error = err;
    }
    
    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Could not save your weight. Please try again.');
      return;
    }
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
      easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
      useNativeDriver: true
    }).start(() => {
      debugLog('Profile updated, navigating to Country screen...');
      navigation.navigate('Country', { userId, email: userEmail, fromSignUp });
    });
  };

  const handleBack = () => {
    debugLog('UserWeightScreen: handleBack called, navigating to DateOfBirth screen');
    navigation.navigate('DateOfBirth', { userId, email: userEmail, fromSignUp });
  };

  const UnitSwitch = () => (
    <Animated.View style={[styles.switchContainer, { opacity: switchAnim, transform: [{ translateY: switchAnim.interpolate({ inputRange: [0,1], outputRange: [20,0]}) }] }]}>
      <TouchableOpacity
        style={[styles.switchButton, selectedUnit === 'kg' && styles.switchButtonActive]}
        onPress={() => setSelectedUnit('kg')}
        activeOpacity={0.7}
      >
        <Text style={[styles.switchButtonText, selectedUnit === 'kg' && styles.switchButtonTextActive]}>kg</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.switchButton, selectedUnit === 'lbs' && styles.switchButtonActive]}
        onPress={() => setSelectedUnit('lbs')}
        activeOpacity={0.7}
      >
        <Text style={[styles.switchButtonText, selectedUnit === 'lbs' && styles.switchButtonTextActive]}>lbs</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          <Animated.Text style={[styles.titleText, { opacity: titleAnim, transform: [{ scale: titleAnim.interpolate({ inputRange: [0,1], outputRange: [0.95,1]}) }] }]}>
            What's your current bodyweight?
          </Animated.Text>
          
          <UnitSwitch />

          <Animated.View style={[styles.formContainer, { opacity: inputAnim, transform: [{ translateY: inputAnim.interpolate({ inputRange: [0,1], outputRange: [20,0]}) }] }]}>
            <View style={styles.weightInputContainer}>
              <View style={styles.weightWithUnitContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.weightInput}
                  value={weight}
                  onChangeText={handleWeightChange}
                  keyboardType="numeric"
                  selectTextOnFocus
                  maxLength={5} // e.g., 3 digits + 1 decimal + 1 digit = 123.4
                  placeholder="0"
                  placeholderTextColor={colors.mediumGray} // Changed for better visibility
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  autoFocus={true}
                />
                <Text style={styles.weightUnitTextInline}>{selectedUnit}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.nextButton, (!weight.trim() || parseFloat(weight) < 20 || parseFloat(weight) > 300) && styles.nextButtonDisabled]}
                onPress={handleContinue}
                disabled={loading || !weight.trim() || parseFloat(weight) < 20 || parseFloat(weight) > 300}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="arrow-forward" 
                  size={24} 
                  color={(!weight.trim() || parseFloat(weight) < 20 || parseFloat(weight) > 300) ? colors.lightGray : colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.weightHelper}>
              This helps us personalize your experience.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white, // Consistent background
    position: 'absolute', // Ensure it covers the whole screen if used as a top-level view in navigator
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    // Removed justifyContent: 'space-between' as back button is positioned absolutely now for consistency
  },
  backButtonHeader: { // Consistent with NameScreen and DateOfBirthScreen back button style
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray, // or colors.lightBorder if that's standard
    position: 'absolute', // Position absolutely like other screens
    left: 20,
    top: 10, // Adjust top to align with global header/progress bar
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40, // Standard paddingTop
    paddingHorizontal: 20,
    paddingBottom: 20, // Standard paddingBottom
  },
  titleText: {
    fontSize: 32, // Consistent with NameScreen, DateOfBirthScreen titles
    fontWeight: '700',
    marginBottom: 30, // Adjusted for new switch style
    textAlign: 'center',
    letterSpacing: -0.5,
    color: colors.darkGray, // Standard dark gray
    width: '100%', // Ensure it takes full width for centering
  },
  switchContainer: { // Redesigned for a more polished, segmented control look
    flexDirection: 'row',
    marginBottom: 40, 
    backgroundColor: colors.lightBackground, // A very light, almost white-ish gray or a subtle off-white
    borderRadius: 16, 
    padding: 6, 
    width: '70%', // Make it wide but not full screen width
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  switchButton: {
    flex: 1, // Each button takes half the space
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  switchButtonText: {
    fontSize: 18, // Larger, clearer text
    fontWeight: '600',
    color: colors.mediumGray, 
  },
  switchButtonTextActive: {
    color: colors.primary, 
  },
  formContainer: {
    width: '100%',
    alignItems: 'center', // Center the input container
  },
  weightInputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.lightGray, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center', 
    paddingHorizontal: 20,
    position: 'relative', // Added for absolute positioning of the arrow button
  },
  weightWithUnitContainer: {
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center', 
    marginRight: 48, // Ensure space for the absolutely positioned arrow button
  },
  weightInput: {
    fontSize: 28, 
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'right',
    minWidth: 60, 
    paddingRight: 8, // Add padding to separate from unit
  },
  weightUnitTextInline: {
    fontSize: 22, // Slightly larger for better balance
    color: colors.mediumGray,
    fontWeight: '500',
    marginLeft: 0, // Let weightInput's paddingRight handle space
  },
  weightHelper: {
    marginTop: 20, 
    textAlign: 'center',
    color: colors.gray, // Standard helper text color
    fontSize: 16, // Standard helper text size
    paddingHorizontal: 20, 
  },
  nextButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute', // Position it absolutely within the input container
    right: 10, // Adjust as needed for padding from the right edge
    top: (70 - 48) / 2, // Vertically center it
    // Removed backgroundColor and borderRadius to make it just an icon
  },
  nextButtonDisabled: {
    // Opacity can be handled by the icon color directly or by wrapping TouchableOpacity style
    // For now, icon color will change based on disabled state
  }
}); 