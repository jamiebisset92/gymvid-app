import React, { useState, useRef, useEffect, useContext, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  ImageBackground,
  Easing
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Debug logging function for development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[ONBOARDING-SUMMARY]', ...args);
  }
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingSummaryScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    country: null,
    gender: null,
    ageCategory: null,
    weightClass: null
  });
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Profile data animations
  const countryAnim = useRef(new Animated.Value(0)).current;
  const genderAnim = useRef(new Animated.Value(0)).current;
  const ageAnim = useRef(new Animated.Value(0)).current;
  const weightAnim = useRef(new Animated.Value(0)).current;
  
  // Check if we should continue onboarding after this screen
  const continueOnboarding = route.params?.continueOnboarding === true;
  
  // Log route params to see what we're getting
  useEffect(() => {
    if (route.params) {
      debugLog('OnboardingSummaryScreen - Received params:', route.params);
      debugLog('Will continue onboarding flow:', continueOnboarding);
    }
  }, [route.params, continueOnboarding]);

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('OnboardingSummary');
      
      // Show regular statusbar for white background
      StatusBar.setBarStyle('dark-content');
    }
    
    return () => {
      // Maintain statusbar when leaving
      StatusBar.setBarStyle('dark-content');
    };
  }, [isFocused, updateProgress]);
  
  // Pulse animation for the next button
  useEffect(() => {
    if (!loading && !fetchError) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [loading, fetchError]);
  
  // Replace Confetti with custom celebration elements
  const [celebrationActive, setCelebrationActive] = useState(false);
  // Increase number of confetti pieces for a more impressive effect
  const celebrationItems = useRef(Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -20 - Math.random() * 100,
    size: 4 + Math.random() * 12, // Varied sizes for better visual
    // More vibrant confetti colors for premium feel
    color: [
      '#FFD700', // Gold
      '#FF4D8F', // Pink
      '#00CCFF', // Cyan
      '#8A2BE2', // Purple
      '#FF6B33', // Orange
      '#33CC61', // Green
      '#FF3355', // Red
      '#4D33FF'  // Blue
    ][Math.floor(Math.random() * 8)],
    speed: 2 + Math.random() * 4,
    angle: Math.random() * 2 * Math.PI,
    rotation: Math.random() * 360,
    rotationSpeed: -5 + Math.random() * 10,
    // Add different shapes for more varied confetti
    shape: ['circle', 'square', 'triangle', 'rectangle'][Math.floor(Math.random() * 4)]
  }))).current;
  
  // Initialize animation refs outside of any effect
  const celebrationAnims = useRef(
    celebrationItems.map(() => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0.3 + Math.random() * 0.7) // Add scale variation
    }))
  ).current;
  
  // Add a ref to track if celebration has occurred
  const hasShownCelebration = useRef(false);
  
  // Update the celebration effect to only run once with improved animation
  const playCelebrationEffect = () => {
    // Skip if celebration has already been shown
    if (hasShownCelebration.current) {
      debugLog('Celebration already shown, skipping');
      return;
    }
    
    // Mark celebration as shown
    hasShownCelebration.current = true;
    setShowCelebration(true);
    setCelebrationActive(true);
    
    // Trigger haptic feedback for a premium feel
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animate the celebration items with more dynamic effects
    celebrationAnims.forEach((anim, i) => {
      // Reset position
      anim.y.setValue(0);
      anim.opacity.setValue(0);
      anim.rotation.setValue(0);
      
      // Create animation sequence with staggered timing for more natural effect
      Animated.sequence([
        // Wait a staggered delay
        Animated.delay(i * 30), // Faster sequence
        // Start animation
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: 1,
            duration: 2500 + Math.random() * 3000,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic easing
            useNativeDriver: true
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300, // Faster fade-in
            useNativeDriver: true
          }),
          Animated.timing(anim.rotation, {
            toValue: 1,
            duration: 2000 + Math.random() * 3000,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          // Add subtle scale animation
          Animated.sequence([
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true
            }),
            Animated.timing(anim.scale, {
              toValue: 0.7 + Math.random() * 0.5,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
          ])
        ])
      ]).start(() => {
        // Fade out at the end of the animation
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 700, // Slower fade out for smoother finish
          useNativeDriver: true
        }).start();
      });
    });
    
    // Stop celebration after a period of time
    setTimeout(() => {
      setCelebrationActive(false);
    }, 6000);
    
    // Remove sparkle animations
  };

  // Render a single celebration item with improved visuals
  const renderCelebrationItem = (item, index) => {
    const { y, opacity, rotation, scale } = celebrationAnims[index];
    
    // Determine shape of confetti piece based on item.shape
    let shapeStyle = {};
    switch(item.shape) {
      case 'square':
        shapeStyle = { borderRadius: 0 };
        break;
      case 'triangle':
        // Use a simple square with border radius for performance reasons
        shapeStyle = { borderRadius: item.size / 5, transform: [{ rotate: '45deg' }] };
        break;
      case 'rectangle':
        shapeStyle = { borderRadius: 0, width: item.size * 1.5, height: item.size * 0.7 };
        break;
      default: // circle
        shapeStyle = { borderRadius: item.size / 2 };
    }
    
    return (
      <Animated.View
        key={item.id}
        style={[
          styles.celebrationItem,
          shapeStyle,
          {
            left: `${item.x}%`,
            width: item.size,
            height: item.size,
            backgroundColor: item.color,
            transform: [
              {
                translateY: y.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_HEIGHT]
                })
              },
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${item.rotationSpeed * 360}deg`]
                })
              },
              {
                scale: scale
              }
            ],
            opacity: opacity,
            // Add subtle shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 2,
          }
        ]}
      />
    );
  };

  // Helper function to get the current user ID from multiple sources
  const getCurrentUserId = async () => {
    // Try to get user from route params first
    if (route.params?.userId) {
      debugLog('Using userId from route params:', route.params.userId);
      return route.params.userId;
    }
    
    // Try to get user from Supabase auth
    try {
      const user = supabase.auth.user();
      if (user && user.id) {
        debugLog('Using userId from Supabase auth:', user.id);
        return user.id;
      }
    } catch (err) {
      console.error('Error getting user from Supabase auth:', err);
    }
    
    // Try to get session from Supabase
    try {
      const session = supabase.auth.session();
      if (session && session.user && session.user.id) {
        debugLog('Using userId from Supabase session:', session.user.id);
        return session.user.id;
      }
    } catch (err) {
      console.error('Error getting session from Supabase:', err);
    }
    
    // Last resort: try to get from AsyncStorage
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        debugLog('Using userId from AsyncStorage:', storedUserId);
        return storedUserId;
      }
    } catch (err) {
      console.error('Error getting userId from AsyncStorage:', err);
    }
    
    return null;
  };

  // Function to manually retry loading data if it fails
  const handleRetryFetch = () => {
    setFetchError(false);
    setFetchRetryCount(0); // Reset retry count
    setLoading(true);
    // The effect will automatically run again due to the dependency change
  };

  // Modify to ensure we directly check AsyncStorage as a last resort
  const setFinalUserData = async (baseData) => {
    try {
      debugLog('Setting final user data with fallback checks');
      // Start with the base data
      let finalData = { ...baseData };
      
      // First check if user data already contains the values
      const needsAgeCategory = !finalData.ageCategory || finalData.ageCategory === 'Open' || finalData.ageCategory === 'null';
      const needsWeightClass = !finalData.weightClass || finalData.weightClass === 'Open' || finalData.weightClass === 'null';
      
      // Check if we need to get values from AsyncStorage
      if (needsAgeCategory) {
        const storedAgeCategory = await AsyncStorage.getItem('userAgeCategory');
        if (storedAgeCategory && storedAgeCategory !== 'null') {
          finalData.ageCategory = storedAgeCategory;
          debugLog('Using age_category from AsyncStorage:', storedAgeCategory);
          
          // Try to update Supabase as well for consistency
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              await supabase
                .from('users')
                .update({ age_category: storedAgeCategory })
                .eq('id', userId);
              debugLog('Updated Supabase with AsyncStorage age_category');
            }
          } catch (err) {
            console.error('Error updating Supabase with age_category:', err);
          }
        }
      }
      
      if (needsWeightClass) {
        const storedWeightClass = await AsyncStorage.getItem('userWeightClass');
        if (storedWeightClass && storedWeightClass !== 'null') {
          finalData.weightClass = storedWeightClass;
          debugLog('Using weight_class from AsyncStorage:', storedWeightClass);
          
          // Try to update Supabase as well for consistency
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              await supabase
                .from('users')
                .update({ weight_class: storedWeightClass })
                .eq('id', userId);
              debugLog('Updated Supabase with AsyncStorage weight_class');
            }
          } catch (err) {
            console.error('Error updating Supabase with weight_class:', err);
          }
        }
      }
      
      // If we still don't have values, do a calculation as a last resort
      if (needsAgeCategory || needsWeightClass) {
        try {
          const userId = await getCurrentUserId();
          if (userId) {
            // Get user profile for raw data to calculate from
            const { data: profile, error } = await supabase
              .from('users')
              .select('gender, bodyweight, date_of_birth, unit_pref')
              .eq('id', userId)
              .single();
              
            if (!error && profile) {
              // Calculate age category from date of birth if needed
              if (needsAgeCategory && profile.date_of_birth) {
                const birthDate = new Date(profile.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                
                // Adjust age if birthday hasn't occurred yet this year
                if (today.getMonth() < birthDate.getMonth() || 
                    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                
                // Determine age category based on age
                let ageCategory = 'Open'; // Default
                
                if (age < 18) {
                  ageCategory = 'Sub-Junior';
                } else if (age >= 18 && age < 23) {
                  ageCategory = 'Junior';
                } else if (age >= 40 && age < 50) {
                  ageCategory = 'Masters 1';
                } else if (age >= 50 && age < 60) {
                  ageCategory = 'Masters 2';
                } else if (age >= 60) {
                  ageCategory = 'Masters 3';
                }
                
                finalData.ageCategory = ageCategory;
                await AsyncStorage.setItem('userAgeCategory', ageCategory);
                debugLog('Calculated and stored age category as fallback:', ageCategory);
                
                // Update Supabase
                await supabase
                  .from('users')
                  .update({ age_category: ageCategory })
                  .eq('id', userId);
              }
              
              // Calculate weight class from gender and bodyweight if needed
              if (needsWeightClass && profile.gender && profile.bodyweight) {
                const gender = profile.gender;
                const weight = profile.bodyweight;
                const unitPref = profile.unit_pref || 'kg';
                let weightClass = 'Open'; // Default
                
                // Convert weight to kg if it's in lbs for calculation
                let weightInKg = weight;
                if (unitPref === 'lbs') {
                  weightInKg = weight / 2.20462; // Convert lbs to kg
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
                if (unitPref === 'lbs') {
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
                
                finalData.weightClass = weightClass;
                await AsyncStorage.setItem('userWeightClass', weightClass);
                debugLog('Calculated and stored weight class as fallback:', weightClass);
                debugLog('Weight:', weight, unitPref, '-> Weight in kg:', weightInKg, '-> Class:', weightClass);
                
                // Update Supabase
                await supabase
                  .from('users')
                  .update({ weight_class: weightClass })
                  .eq('id', userId);
              }
            }
          }
        } catch (err) {
          console.error('Error calculating fallback values:', err);
        }
      }
      
      // Set the final user data
      setUserData(finalData);
      
      // Log final data after last resort checks
      debugLog('FINAL DATA AFTER LAST RESORT CHECKS:', finalData);
      
      // Play celebration effect when data is loaded successfully
      // This is called only once and the effect checks hasShownCelebration.current
      playCelebrationEffect();
    } catch (err) {
      console.error('Error in setFinalUserData:', err);
      // Use the base data as fallback
      setUserData(baseData);
    }
  };

  // Helper function to log profile data for debugging
  const logProfileData = (profile, source) => {
    debugLog(`Profile data from ${source}:`, {
      id: profile.id || 'N/A',
      gender: profile.gender || 'N/A',
      country: profile.country || 'N/A',
      bodyweight: profile.bodyweight || 'N/A',
      unit_pref: profile.unit_pref || 'N/A',
      date_of_birth: profile.date_of_birth || 'N/A',
      age_category: profile.age_category || 'N/A',
      weight_class: profile.weight_class || 'N/A'
    });
  };

  // Function to save profile data to AsyncStorage for backup/recovery
  const saveProfileToAsyncStorage = async (profile) => {
    try {
      if (profile.gender) await AsyncStorage.setItem('userGender', profile.gender);
      if (profile.country) await AsyncStorage.setItem('userCountry', profile.country);
      if (profile.bodyweight) await AsyncStorage.setItem('userBodyweight', profile.bodyweight.toString());
      if (profile.unit_pref) await AsyncStorage.setItem('userUnitPreference', profile.unit_pref);
      if (profile.date_of_birth) await AsyncStorage.setItem('userDateOfBirth', profile.date_of_birth);
      if (profile.age_category) await AsyncStorage.setItem('userAgeCategory', profile.age_category);
      if (profile.weight_class) await AsyncStorage.setItem('userWeightClass', profile.weight_class);
      
      debugLog('Saved profile data to AsyncStorage');
    } catch (err) {
      console.error('Error saving profile to AsyncStorage:', err);
    }
  };

  // Helper function to get profile data from both Supabase and AsyncStorage
  const getCompleteProfileData = async (userId) => {
    try {
      // Get data from Supabase first
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        throw error;
      }
      
      // Log the Supabase data
      debugLog('Profile data from Supabase:', {
        id: profile.id || 'N/A',
        gender: profile.gender || 'N/A',
        country: profile.country || 'N/A',
        bodyweight: profile.bodyweight || 'N/A',
        unit_pref: profile.unit_pref || 'N/A',
        date_of_birth: profile.date_of_birth || 'N/A',
        age_category: profile.age_category || 'N/A',
        weight_class: profile.weight_class || 'N/A'
      });
      
      // Save all data to AsyncStorage for future reference
      await saveProfileToAsyncStorage(profile);
      
      // If we're missing backend calculated fields, try to get them from AsyncStorage
      let completeProfile = { ...profile };
      let mergedFromAsyncStorage = false;
      
      // Check for age_category in AsyncStorage if missing from Supabase
      if (!profile.age_category || profile.age_category === 'null') {
        const storedAgeCategory = await AsyncStorage.getItem('userAgeCategory');
        if (storedAgeCategory) {
          completeProfile.age_category = storedAgeCategory;
          debugLog('Retrieved age_category from AsyncStorage:', storedAgeCategory);
          mergedFromAsyncStorage = true;
          
          // Update Supabase with the value from AsyncStorage
          try {
            await supabase
              .from('users')
              .update({ age_category: storedAgeCategory })
              .eq('id', userId);
            debugLog('Updated Supabase with age_category from AsyncStorage');
          } catch (err) {
            console.error('Error updating Supabase with age_category:', err);
          }
        }
      }
      
      // Check for weight_class in AsyncStorage if missing from Supabase
      if (!profile.weight_class || profile.weight_class === 'null') {
        const storedWeightClass = await AsyncStorage.getItem('userWeightClass');
        if (storedWeightClass) {
          completeProfile.weight_class = storedWeightClass;
          debugLog('Retrieved weight_class from AsyncStorage:', storedWeightClass);
          mergedFromAsyncStorage = true;
          
          // Update Supabase with the value from AsyncStorage
          try {
            await supabase
              .from('users')
              .update({ weight_class: storedWeightClass })
              .eq('id', userId);
            debugLog('Updated Supabase with weight_class from AsyncStorage');
          } catch (err) {
            console.error('Error updating Supabase with weight_class:', err);
          }
        }
      }
      
      // For every field, check AsyncStorage if Supabase data is missing
      if (!profile.gender) {
        const storedGender = await AsyncStorage.getItem('userGender');
        if (storedGender) {
          completeProfile.gender = storedGender;
          debugLog('Retrieved gender from AsyncStorage:', storedGender);
        }
      }
      
      if (!profile.country) {
        const storedCountry = await AsyncStorage.getItem('userCountry');
        if (storedCountry) {
          completeProfile.country = storedCountry;
          debugLog('Retrieved country from AsyncStorage:', storedCountry);
        }
      }
      
      if (!profile.bodyweight) {
        const storedBodyweight = await AsyncStorage.getItem('userBodyweight');
        if (storedBodyweight) {
          completeProfile.bodyweight = parseFloat(storedBodyweight);
          debugLog('Retrieved bodyweight from AsyncStorage:', storedBodyweight);
        }
      }
      
      if (!profile.unit_pref) {
        const storedUnitPref = await AsyncStorage.getItem('userUnitPreference');
        if (storedUnitPref) {
          completeProfile.unit_pref = storedUnitPref;
          debugLog('Retrieved unit_pref from AsyncStorage:', storedUnitPref);
        }
      }
      
      if (!profile.date_of_birth) {
        const storedDateOfBirth = await AsyncStorage.getItem('userDateOfBirth');
        if (storedDateOfBirth) {
          completeProfile.date_of_birth = storedDateOfBirth;
          debugLog('Retrieved date_of_birth from AsyncStorage:', storedDateOfBirth);
        }
      }
      
      // Log the complete data
      debugLog('Profile data from Combined:', {
        id: completeProfile.id || 'N/A',
        gender: completeProfile.gender || 'N/A',
        country: completeProfile.country || 'N/A',
        bodyweight: completeProfile.bodyweight || 'N/A',
        unit_pref: completeProfile.unit_pref || 'N/A',
        date_of_birth: completeProfile.date_of_birth || 'N/A',
        age_category: completeProfile.age_category || 'N/A',
        weight_class: completeProfile.weight_class || 'N/A'
      });
      
      if (mergedFromAsyncStorage) {
        debugLog('⚠️ Had to merge data from AsyncStorage because some fields were missing in Supabase');
      }
      
      return { data: completeProfile, error: null };
      
    } catch (err) {
      console.error('Error getting complete profile data:', err);
      return { data: null, error: err };
    }
  };

  // Load user data
  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;
    
    const loadUserData = async () => {
      if (!isFocused || !isMounted) return;
      
      // Don't set loading again if we're already loading
      if (!loading) {
        setLoading(true);
      }
      
      setFetchError(false);
      debugLog('Starting to fetch user profile data (attempt:', fetchRetryCount + 1, ')');
      
      try {
        // Get current user ID
        const userId = await getCurrentUserId();
        
        if (!userId) {
          console.error('No authenticated user found');
          if (isMounted) {
            setLoading(false);
            setFetchError(true);
            
            // Set default values if there's no user
            await setFinalUserData({
              country: '🌍 Unknown',
              gender: 'Not specified',
              ageCategory: 'Open',
              weightClass: 'Open'
            });
          }
          return;
        }
        
        debugLog('Fetching user profile data from Supabase for user ID:', userId);
        
        // Fetch user profile data with improved function that combines Supabase and AsyncStorage
        const { data: profile, error } = await getCompleteProfileData(userId);
        
        // Check if component is still mounted before updating state
        if (!isMounted) return;
        
        if (error) {
          console.error('Error fetching user profile:', error);
          
          // If this is not our final retry, increment the counter and stop
          if (fetchRetryCount < 2) {
            setFetchRetryCount(prev => prev + 1);
            setLoading(false);
            return;
          }
          
          setLoading(false);
          setFetchError(true);
          
          // Set default values if there's an error
          await setFinalUserData({
            country: '🌍 Unknown',
            gender: 'Not specified',
            ageCategory: 'Open',
            weightClass: 'Open'
          });
          return;
        }
        
        debugLog('User profile data retrieved successfully');
        
        // If we don't have all the fields, it could be that the backend process hasn't completed yet
        if (!profile.age_category || !profile.weight_class) {
          debugLog('Missing required fields. age_category:', profile.age_category, 'weight_class:', profile.weight_class);
          
          // If this is not our final retry, increment the counter and try again
          if (fetchRetryCount < 2) {
            debugLog('Missing fields, will retry shortly. Attempt:', fetchRetryCount + 1);
            setFetchRetryCount(prev => prev + 1);
            setLoading(false);
            return;
          }
        }
        
        debugLog('All fields received, proceeding to display profile');
        
        // Format country with flag if available
        let formattedCountry = profile.country || 'Unknown';
        // If country doesn't already include a flag emoji, append the flag if we have a mapping
        if (formattedCountry && !(/\p{Emoji}/u.test(formattedCountry))) {
          // This is a simplified check - in a real app, you'd have a complete mapping of countries to flag emojis
          const countryFlags = {
            'Australia': '🇦🇺',
            'United States': '🇺🇸',
            'UK': '🇬🇧',
            'Canada': '🇨🇦',
            // Add more as needed
          };
          
          const flag = countryFlags[formattedCountry];
          if (flag) {
            formattedCountry = `${formattedCountry} ${flag}`;
          }
        }
        
        // Instead of directly setting user data, use our enhanced function
        // that does additional checks against AsyncStorage
        await setFinalUserData({
          country: formattedCountry,
          gender: profile.gender || 'Not specified',
          ageCategory: profile.age_category || 'Open',
          weightClass: profile.weight_class || 'Open'
        });
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        if (isMounted) {
          setLoading(false);
          setFetchError(true);
          
          // Set default values if there's an error
          await setFinalUserData({
            country: '🌍 Unknown',
            gender: 'Not specified',
            ageCategory: 'Open',
            weightClass: 'Open'
          });
        }
      }
    };
    
    // Initial load
    loadUserData();
    
    // Only set up a retry if we're still loading and haven't retried too many times
    // This prevents multiple loads on mount
    if (fetchRetryCount < 1) {
      retryTimer = setTimeout(() => {
        if (isMounted && loading) {
          debugLog('Still loading, doing ONE retry...');
          loadUserData();
        }
      }, 3000); // 3 second retry timer
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isFocused, fetchRetryCount]); // Remove loading from dependencies to prevent double execution

  // Update the animation timing for profile cards to make them perfectly even
  useEffect(() => {
    const animationSequence = Animated.stagger(100, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, 
        useNativeDriver: true,
      }),
      
      // Enhanced title animation with opacity and scale
      Animated.parallel([
        // Opacity animation
        Animated.timing(titleOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Scale animation with bounce
        Animated.spring(titleAnim, {
          toValue: 1,
          tension: 40, 
          friction: 7,
          useNativeDriver: true,
        })
      ]),
      
      // Slide in content from right with spring physics
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 30, // Lower tension for slower movement
        friction: 8, // Higher friction for smoother deceleration
        useNativeDriver: true,
      }),
      
      // Use a single delay followed by 4 simultaneous animations with consistent timing
      Animated.sequence([
        // Single delay before any profile items appear
        Animated.delay(200),
        
        // Start all 4 animations at the same time with precise timing
        Animated.parallel([
          // Country item
          Animated.timing(countryAnim, {
            toValue: 1,
            duration: 600,
            delay: 0,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          
          // Gender item
          Animated.timing(genderAnim, {
            toValue: 1,
            duration: 600,
            delay: 150,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          
          // Age Class item
          Animated.timing(ageAnim, {
            toValue: 1,
            duration: 600,
            delay: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          
          // Weight Class item
          Animated.timing(weightAnim, {
            toValue: 1,
            duration: 600,
            delay: 450,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          })
        ])
      ])
    ]);
    
    // Start the animation sequence
    animationSequence.start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(0);
      titleOpacityAnim.setValue(0);
      countryAnim.setValue(0);
      genderAnim.setValue(0);
      ageAnim.setValue(0);
      weightAnim.setValue(0);
      
      // Restart the animation sequence
      animationSequence.start();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation, userData, fadeAnim, slideAnim, titleAnim, titleOpacityAnim, countryAnim, genderAnim, ageAnim, weightAnim]);

  const handleContinue = () => {
    // Trigger haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    debugLog('Continue button pressed, navigating to VideoPrompt screen');
    
    // Set a flag to prevent the onboarding from being marked complete
    // until the full flow is completed
    const persistOnboardingState = async () => {
      try {
        await AsyncStorage.setItem('onboardingInProgress', 'true');
        await AsyncStorage.removeItem('onboardingComplete');
        debugLog('Set onboardingInProgress flag in AsyncStorage');
        
        // Make sure the user is not marked as having completed onboarding yet
        // This ensures they won't get directed to Home screen
        const userId = await getCurrentUserId();
        if (userId) {
          await supabase
            .from('users')
            .update({ 
              onboarding_complete: false // Keep the flag as false until full onboarding is complete
            })
            .eq('id', userId);
          debugLog('Set onboarding_complete=false in Supabase to continue flow');
        }
      } catch (err) {
        console.error('Error persisting onboarding state:', err);
      }
    };
    
    persistOnboardingState().then(() => {
      // Run exit animation then navigate
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        // Navigate to the VideoPrompt screen to continue onboarding
        navigation.navigate('VideoPrompt', {
          continueOnboarding: true,  // Add this flag to ensure proper routing
          userId: route.params?.userId,  // Pass along the user ID
          forceFlow: true  // Special flag to indicate forced flow
        });
      });
    });
  };

  const handleBack = () => {
    // Trigger haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Navigate back to Username screen
    navigation.navigate('Username');
  };

  // Create a premium animated profile item component with enhanced animations
  const ProfileItem = ({ label, value, animValue, icon }) => {
    let displayValue = value || '-';
    let iconName = icon || 'information-outline';
    
    // Extra formatting for country (just in case it doesn't already have a flag)
    if (label === 'Team' && displayValue === 'Australia') {
      displayValue = 'Australia 🇦🇺';
    }
    
    return (
      <Animated.View 
        style={[
          styles.profileItem, 
          { 
            opacity: animValue,
            transform: [
              { 
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0], // More vertical movement for dramatic entry
                  extrapolate: 'clamp'
                })
              },
              { 
                translateX: animValue.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [20, 10, 0], // Smoother horizontal movement with easing
                  extrapolate: 'clamp'
                })
              },
              {
                scale: animValue.interpolate({
                  inputRange: [0, 0.8, 1],
                  outputRange: [0.9, 1.03, 1], // Subtle scale up and settle for premium feel
                  extrapolate: 'clamp'
                })
              },
              {
                rotateX: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['5deg', '0deg'], // Subtle 3D rotation for depth
                  extrapolate: 'clamp'
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8faff']}
          style={styles.profileItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileItemRow}>
            <View style={styles.profileItemLabelContainer}>
              <MaterialCommunityIcons name={iconName} size={20} color={colors.primary} style={styles.profileItemIcon} />
              <Text style={styles.profileItemLabel}>{label}</Text>
            </View>
            <Text style={styles.profileItemValue}>{displayValue}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Updated to elegant white background with subtle gradient */}
      <LinearGradient
        colors={['#ffffff', '#f8f9ff', '#f0f2ff']}
        style={styles.backgroundGradient}
      />
      
      <Animated.View 
        style={[
          styles.container, 
          { 
            opacity: fadeAnim,
          }
        ]}
      >
        <SafeAreaView style={styles.safeContainer}>
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Custom celebration effect container */}
          {celebrationActive && (
            <View style={styles.celebrationContainer}>
              {celebrationItems.map(renderCelebrationItem)}
            </View>
          )}

          <View style={styles.contentContainer}>
            {/* Animated title with celebration effect */}
            <View style={styles.titleContainer}>
              <Animated.Text
                style={[
                  styles.titleText,
                  { 
                    opacity: titleOpacityAnim,
                    transform: [
                      { 
                        scale: titleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                          extrapolate: 'clamp'
                        })
                      }
                    ] 
                  }
                ]}
              >
                Your Profile is Done!
              </Animated.Text>
              
              <Animated.Text
                style={[
                  styles.subtitleText,
                  { 
                    opacity: titleOpacityAnim,
                    transform: [
                      { 
                        translateY: titleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                          extrapolate: 'clamp'
                        })
                      }
                    ] 
                  }
                ]}
              >
                Here's a summary of your details...
              </Animated.Text>
            </View>
            
            <Animated.View 
              style={{ 
                width: '100%', 
                opacity: fadeAnim,
                marginTop: 20
              }}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>
                    {fetchRetryCount > 0 
                      ? `Loading your profile (attempt ${fetchRetryCount + 1}/3)...` 
                      : 'Loading your profile...'}
                  </Text>
                  {fetchRetryCount > 0 && (
                    <Text style={styles.loadingSubText}>
                      Waiting for calculations...
                    </Text>
                  )}
                </View>
              ) : fetchError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={40} color={colors.error} style={styles.errorIcon} />
                  <Text style={styles.errorText}>Could not load your profile data</Text>
                  <Text style={styles.errorSubText}>
                    We encountered an issue retrieving your profile. This may happen if your 
                    data is still being processed.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={handleRetryFetch}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                    <Ionicons name="refresh" size={16} color={colors.primary} style={styles.retryIcon} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.profileContainer}>
                  <ProfileItem 
                    label="Team"
                    value={userData.country}
                    animValue={countryAnim}
                    icon="flag-outline"
                  />
                  
                  <ProfileItem 
                    label="Gender"
                    value={userData.gender}
                    animValue={genderAnim}
                    icon="human-male-female"
                  />
                  
                  <ProfileItem 
                    label="Age Class"
                    value={userData.ageCategory}
                    animValue={ageAnim}
                    icon="calendar-outline"
                  />
                  
                  <ProfileItem 
                    label="Weight Class"
                    value={userData.weightClass}
                    animValue={weightAnim}
                    icon="weight"
                  />
                  
                  <Text style={styles.helpText}>
                    These details will be used if you decide to participate in the <Text style={styles.helpTextBold}>GymVid Games</Text> <Text style={styles.helpTextItalic}>~ (more on this later)</Text>
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
          
          <View style={styles.bottomSpacer}>
            <View style={styles.bottomButtonContainer}>
              <Animated.View 
                style={[
                  styles.buttonWrapper,
                  { 
                    opacity: fadeAnim,
                    transform: [
                      { scale: pulseAnim }
                    ]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={handleContinue}
                  activeOpacity={0.9}
                  disabled={loading || fetchError}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={24} color={colors.white} />
                </TouchableOpacity>
              </Animated.View>
              
              <Text style={styles.hintText}>Let's get started with your training journey!</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeContainer: {
    flex: 1,
    paddingBottom: 0,
  },
  header: {
    height: 70,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 0,
    textAlign: 'center',
    color: colors.gray,
    width: '100%',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.gray,
    fontWeight: '500',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
  },
  profileContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  profileItem: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  profileItemGradient: {
    borderRadius: 16,
    padding: 18,
  },
  profileItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileItemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemIcon: {
    marginRight: 8,
  },
  profileItemLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
  },
  profileItemValue: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.darkGray,
    maxWidth: '65%',
    textAlign: 'right',
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 26, // Increase from 20 to add more space at bottom
    paddingTop: 16, // Increase from 8 to add more space at top
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.03)',
    marginBottom: 0,
    position: 'relative',
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 6, // Add margin to move button down within footer
  },
  nextButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 50,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
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
  hintText: {
    marginTop: 14, // Increased from 10
    marginBottom: 4, // Add bottom margin
    color: colors.gray,
    fontSize: 13,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  errorIcon: {
    marginBottom: 10,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: 15,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  retryIcon: {
    marginLeft: 4,
  },
  sparkle: {
    position: 'absolute',
    width: 24,
    height: 24,
    zIndex: 10,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 10,
    pointerEvents: 'none',
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  celebrationItem: {
    position: 'absolute',
    // Default styles only, specific styles applied in render function
  },
  bottomSpacer: {
    backgroundColor: '#ffffff',
    width: '100%',
    marginTop: 0,
    marginBottom: 0,
  },
  helpText: {
    marginTop: 15,
    marginBottom: 20,
    color: colors.gray,
    fontSize: 14,
    lineHeight: 25,
    textAlign: 'center',
  },
  helpTextItalic: {
    fontStyle: 'italic',
  },
  helpTextBold: {
    fontWeight: 'bold',
  },
}); 