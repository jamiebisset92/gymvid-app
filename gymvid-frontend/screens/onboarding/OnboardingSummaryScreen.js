import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

// Debug logging function for development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[ONBOARDING-SUMMARY]', ...args);
  }
};

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
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  
  // Profile data animations
  const countryAnim = useRef(new Animated.Value(0)).current;
  const genderAnim = useRef(new Animated.Value(0)).current;
  const ageAnim = useRef(new Animated.Value(0)).current;
  const weightAnim = useRef(new Animated.Value(0)).current;

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('OnboardingSummary');
    }
  }, [isFocused, updateProgress]);

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
      
      // Log the supabase data
      logProfileData(profile, 'Supabase');
      
      // Save all data to AsyncStorage for future reference
      await saveProfileToAsyncStorage(profile);
      
      // If we're missing backend calculated fields, try to get them from AsyncStorage
      let completeProfile = { ...profile };
      
      if (!profile.age_category) {
        const storedAgeCategory = await AsyncStorage.getItem('userAgeCategory');
        if (storedAgeCategory) {
          completeProfile.age_category = storedAgeCategory;
          debugLog('Retrieved age_category from AsyncStorage:', storedAgeCategory);
        }
      }
      
      if (!profile.weight_class) {
        const storedWeightClass = await AsyncStorage.getItem('userWeightClass');
        if (storedWeightClass) {
          completeProfile.weight_class = storedWeightClass;
          debugLog('Retrieved weight_class from AsyncStorage:', storedWeightClass);
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
      logProfileData(completeProfile, 'Combined');
      
      return { data: completeProfile, error: null };
      
    } catch (err) {
      console.error('Error getting complete profile data:', err);
      return { data: null, error: err };
    }
  };

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!isFocused) return;
      
      try {
        setLoading(true);
        setFetchError(false);
        debugLog('Starting to fetch user profile data (attempt:', fetchRetryCount + 1, ')');
        
        // Get current user ID
        const userId = await getCurrentUserId();
        
        if (!userId) {
          console.error('No authenticated user found');
          setLoading(false);
          setFetchError(true);
          
          // Set default values if there's no user
          setUserData({
            country: '🌍 Unknown',
            gender: 'Not specified',
            ageCategory: 'Open',
            weightClass: 'Open'
          });
          return;
        }
        
        debugLog('Fetching user profile data from Supabase for user ID:', userId);
        
        // Fetch user profile data with improved function that combines Supabase and AsyncStorage
        const { data: profile, error } = await getCompleteProfileData(userId);
        
        if (error) {
          console.error('Error fetching user profile:', error);
          
          // If this is not our final retry, increment the counter and stop
          if (fetchRetryCount < 3) {
            setFetchRetryCount(prev => prev + 1);
            setLoading(false);
            return;
          }
          
          setLoading(false);
          setFetchError(true);
          
          // Set default values if there's an error
          setUserData({
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
          if (fetchRetryCount < 3) {
            debugLog('Missing fields, will retry shortly. Attempt:', fetchRetryCount + 1);
            setFetchRetryCount(prev => prev + 1);
            setLoading(false);
            
            // Wait and try again
            setTimeout(() => {
              loadUserData();
            }, 2000); // Wait 2 seconds before retrying
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
        
        // Update state with the fetched data from Supabase
        setUserData({
          country: formattedCountry,
          gender: profile.gender || 'Not specified',
          ageCategory: profile.age_category || 'Open',
          weightClass: profile.weight_class || 'Open'
        });
        
        // For final logging, show what we're displaying
        debugLog('Final display data:', {
          country: formattedCountry,
          gender: profile.gender || 'Not specified',
          ageCategory: profile.age_category || 'Open',
          weightClass: profile.weight_class || 'Open'
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading user data:', err);
        setLoading(false);
        setFetchError(true);
        
        // Set default values if there's an error
        setUserData({
          country: '🌍 Unknown',
          gender: 'Not specified',
          ageCategory: 'Open',
          weightClass: 'Open'
        });
      }
    };

    loadUserData();
    
    // Set up a retry timer if needed (this handles cases where backend processing is delayed)
    const retryTimer = setTimeout(() => {
      if (loading && fetchRetryCount < 3) {
        debugLog('Still loading, retrying fetch...');
        loadUserData();
      }
    }, 3000); // 3 second retry timer
    
    return () => clearTimeout(retryTimer);
  }, [isFocused, fetchRetryCount]);

  // Run entrance animations
  useEffect(() => {
    const animationSequence = Animated.stagger(100, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Fade in the title
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Slide in content from right
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      
      // Staggered fade in for profile items with a slight delay
      Animated.sequence([
        Animated.delay(200), // Add a delay before starting profile items animation
        
        Animated.stagger(120, [ // Increase stagger time between items
          Animated.timing(countryAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          
          Animated.timing(genderAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          
          Animated.timing(ageAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          
          Animated.timing(weightAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
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
  }, [navigation, userData]); // Re-run animations when user data changes

  const handleContinue = () => {
    // Navigate to the next screen
    navigation.navigate('VideoPrompt');
  };

  const handleBack = () => {
    // Navigate back to Username screen
    navigation.navigate('Username');
  };

  // Create an animated profile item component
  const ProfileItem = ({ label, value, animValue }) => {
    let displayValue = value || '-';
    
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
                translateX: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                  extrapolate: 'clamp'
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.profileItemRow}>
          <Text style={styles.profileItemLabel}>{label}:</Text>
          <Text style={styles.profileItemValue}>{displayValue}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Header spacer */}
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
            Welcome to GymVid!
          </Animated.Text>
          
          <Animated.Text
            style={[
              styles.subtitleText,
              { 
                opacity: titleAnim,
                transform: [
                  { 
                    translateY: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [5, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            Let's review your details...
          </Animated.Text>
          
          <Animated.View 
            style={{ 
              width: '100%', 
              opacity: fadeAnim,
              marginTop: 30
            }}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {fetchRetryCount > 0 
                    ? `Loading your profile (attempt ${fetchRetryCount + 1}/4)...` 
                    : 'Loading your profile...'}
                </Text>
                {fetchRetryCount > 0 && (
                  <Text style={styles.loadingSubText}>
                    Waiting for backend calculation...
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
                />
                
                <ProfileItem 
                  label="Gender"
                  value={userData.gender}
                  animValue={genderAnim}
                />
                
                <ProfileItem 
                  label="Age Class"
                  value={userData.ageCategory}
                  animValue={ageAnim}
                />
                
                <ProfileItem 
                  label="Weight Class"
                  value={userData.weightClass}
                  animValue={weightAnim}
                />
              </View>
            )}
          </Animated.View>
        </View>
        
        <Animated.View 
          style={[
            styles.bottomButtonContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideAnim, 0.3) }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={24} color={colors.white} />
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
    paddingTop: 30,
    paddingBottom: 20,
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
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 20,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileItemLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
  },
  profileItemValue: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
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
  nextButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 56,
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
    backgroundColor: '#AACEF5',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  errorIcon: {
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: colors.error || '#FF3B30',
    marginBottom: 20,
  },
  errorSubText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  retryIcon: {
    marginLeft: 4,
  },
}); 