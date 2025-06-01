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
  Easing,
  KeyboardAvoidingView,
  Platform
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
  const [userGender, setUserGender] = useState(null); // Add state for user gender
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

  // Calculate weight class based on gender, weight, and unit preference
  const getWeightClass = (gender, weight, unit) => {
    if (!gender || !weight || isNaN(parseFloat(weight))) {
      return 'Open'; // Default
    }

    const numWeight = parseFloat(weight);
    let weightClass = 'Open'; // Default
    
    // Convert weight to kg if it's in lbs for calculation
    let weightInKg = numWeight;
    if (unit === 'lbs') {
      weightInKg = numWeight / 2.20462; // Convert lbs to kg
    }
    
    // Weight class calculation based on kg
    if (gender === 'Female') {
      if (weightInKg <= 47) weightClass = '43–47kg';
      else if (weightInKg <= 52) weightClass = '47–52kg';
      else if (weightInKg <= 57) weightClass = '50–57kg';
      else if (weightInKg <= 63) weightClass = '57–63kg';
      else if (weightInKg <= 69) weightClass = '63–69kg';
      else if (weightInKg <= 76) weightClass = '69–76kg';
      else if (weightInKg <= 84) weightClass = '76–84kg';
      else weightClass = '84kg+';
    } else {
      // For Male or other
      if (weightInKg <= 59) weightClass = '53–59kg';
      else if (weightInKg <= 66) weightClass = '59–66kg';
      else if (weightInKg <= 74) weightClass = '66–74kg';
      else if (weightInKg <= 83) weightClass = '74–83kg';
      else if (weightInKg <= 93) weightClass = '83–93kg';
      else if (weightInKg <= 105) weightClass = '93–105kg';
      else if (weightInKg <= 120) weightClass = '105–120kg';
      else weightClass = '120kg+';
    }
    
    // If user prefers lbs, convert the weight class display to lbs
    if (unit === 'lbs') {
      // Convert kg ranges to lbs for display
      const kgToLbsRanges = {
        // Female weight classes
        '43–47kg': '95–104lbs',
        '47–52kg': '104–115lbs',
        '50–57kg': '110–126lbs',
        '57–63kg': '126–139lbs',
        '63–69kg': '139–152lbs',
        '69–76kg': '152–168lbs',
        '76–84kg': '168–185lbs',
        '84kg+': '185lbs+',
        // Male weight classes
        '53–59kg': '117–130lbs',
        '59–66kg': '130–146lbs',
        '66–74kg': '146–163lbs',
        '74–83kg': '163–183lbs',
        '83–93kg': '183–205lbs',
        '93–105kg': '205–231lbs',
        '105–120kg': '231–265lbs',
        '120kg+': '265lbs+'
      };
      
      weightClass = kgToLbsRanges[weightClass] || weightClass;
    }
    
    return weightClass;
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
        setTimeout(() => {
          if (inputRef.current && isFocused) {
            inputRef.current.focus();
          }
        }, 600);
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
        if (!user) {
          debugLog('No user found, cannot load data.');
          setSelectedUnit('kg'); // Default if no user
          return;
        }

        debugLog('Loading user weight data for userId:', user.id);
        const { data: profile, error } = await supabase
          .from('users')
          .select('bodyweight, unit_pref, gender')
          .eq('id', user.id)
          .maybeSingle(); // Changed from .single() to .maybeSingle()

        if (error) {
          // Handle actual errors, but not PGRST116 as .maybeSingle() won't throw it for 0 rows
          console.error('Error fetching user profile in UserWeightScreen:', error.message);
          setSelectedUnit('kg'); // Default on error
          return;
        }

        if (profile) { // Profile exists
          if (profile.bodyweight) {
            setWeight(profile.bodyweight.toString());
            debugLog('Loaded existing bodyweight:', profile.bodyweight);
          }
          if (profile.unit_pref) {
            setSelectedUnit(profile.unit_pref);
            debugLog('Loaded existing unit_pref:', profile.unit_pref);
          } else {
            setSelectedUnit('kg');
            debugLog('No unit_pref found, defaulting to kg');
          }
          if (profile.gender) {
            setUserGender(profile.gender);
            debugLog('Loaded existing gender:', profile.gender);
          }
        } else { // No profile found (profile is null)
          debugLog('No profile data found for user, defaulting unit to kg.');
          setSelectedUnit('kg');
          setWeight(''); // Ensure weight is empty if no profile
        }
      } catch (err) {
        console.error('Unexpected error in loadUserData (UserWeightScreen):', err);
        setSelectedUnit('kg'); // Default on catch
      }
    };

    if (isFocused) { 
        loadUserData();
        updateProgress('UserWeight');
    }
  }, [isFocused, updateProgress]);

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
            <View style={styles.weightClassContainer}>
              {weight && userGender && parseFloat(weight) >= 20 && parseFloat(weight) <= 300 && (
                <Text style={styles.weightClassText}>
                  This places you in the <Text style={styles.weightClassName}>{getWeightClass(userGender, weight, selectedUnit)}</Text> category.
                </Text>
              )}
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
    marginBottom: 25, // Reduced from 40
    backgroundColor: colors.lightBackground, // A very light, almost white-ish gray or a subtle off-white
    borderRadius: 12, // Reduced from 16
    padding: 4, // Reduced from 6
    width: '60%', // Reduced from 70%
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  switchButton: {
    flex: 1, // Each button takes half the space
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 12, // Reduced from 15
    borderRadius: 10, // Reduced from 12
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
    fontSize: 16, // Reduced from 18
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
    marginRight: 0, // Changed from 48 to 0 - no need for margin since we're centering
  },
  weightInput: {
    fontSize: 28, 
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center', // Changed from 'right' to 'center'
    minWidth: 60, 
    paddingRight: 8, // Add padding to separate from unit
  },
  weightUnitTextInline: {
    fontSize: 22, // Slightly larger for better balance
    color: colors.mediumGray,
    fontWeight: '500',
    marginLeft: 0, // Let weightInput's paddingRight handle space
  },
  weightClassContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  weightClassText: {
    fontSize: 16,
    color: colors.gray,
  },
  weightClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
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