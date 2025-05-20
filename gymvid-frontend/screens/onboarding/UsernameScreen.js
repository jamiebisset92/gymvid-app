import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  Animated,
  TextInput,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

// Log directly to Expo Go console (easier to see than debugLog)
const logToConsole = (...args) => {
  console.log('[ONBOARDING]', ...args);
};

export default function UsernameScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateProfile, forceCompleteOnboarding } = useAuth();
  const inputRef = useRef(null); // Add ref for text input
  const isFocused = useIsFocused();
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('UsernameScreen - Received params:', route.params);
    if (userId) {
      debugLog('UsernameScreen - Got userId:', userId);
    } else {
      console.warn('UsernameScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const messageAnim = useRef(new Animated.Value(0)).current;

  // Run entrance animations
  useEffect(() => {
    const animationSequence = Animated.stagger(80, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Slide in the title from top
      Animated.spring(titleAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      
      // Slide in content from right
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      
      // Fade in input
      Animated.timing(inputAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    
    animationSequence.start(() => {
      // Focus the input after animations complete
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      inputAnim.setValue(0);
      messageAnim.setValue(0);
      
      // Restart the animation sequence
      animationSequence.start(() => {
        // Focus the input after animations complete
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);
  
  // Load existing username if available
  useEffect(() => {
    const loadUserUsername = async () => {
      try {
        // Get current user
        const user = supabase.auth.user();
        if (!user) return;

        // Try to fetch existing profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        // If we have a username, set it in the state
        if (!error && profile && profile.username) {
          debugLog('Loaded existing username:', profile.username);
          setUsername(profile.username);
          setIsValid(true);
        }
      } catch (err) {
        console.error('Error loading username:', err);
      }
    };

    loadUserUsername();
  }, []);

  // Validate username when it changes
  useEffect(() => {
    const validateUsername = async () => {
      // Skip validation if username is empty or too short
      if (!username || username.length < 3) {
        setIsValid(false);
        setErrorMessage(username ? 'Username must be at least 3 characters' : '');
        return;
      }
      
      // Check for valid characters (letters, numbers, underscores)
      const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!validUsernameRegex.test(username)) {
        setIsValid(false);
        setErrorMessage('Username can only contain letters, numbers, and underscores');
        return;
      }
      
      // Show validating state
      setValidating(true);
      setErrorMessage('');
      
      try {
        // Delay a bit for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check if username already exists in database
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .not('id', 'eq', supabase.auth.user()?.id || '') // Exclude current user
          .limit(1);
        
        if (error) {
          console.error('Error checking username:', error);
          setIsValid(false);
          setErrorMessage('Error checking username. Please try again.');
        } else if (data && data.length > 0) {
          setIsValid(false);
          setErrorMessage('Username already taken');
          
          // Animate the error message
          messageAnim.setValue(0);
          Animated.timing(messageAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          setIsValid(true);
          setErrorMessage('');
        }
      } catch (err) {
        console.error('Error in username validation:', err);
        setIsValid(false);
        setErrorMessage('Error checking username');
      } finally {
        setValidating(false);
      }
    };
    
    // Debounce the validation to prevent excessive API calls
    const timer = setTimeout(validateUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert('Please enter a valid username', errorMessage || 'Username must be unique and follow our guidelines.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User identification lost during onboarding. Please start over or contact support.');
      return;
    }

    try {
      setLoading(true);
      
      debugLog('Completing onboarding with userId:', userId);
      debugLog('Email:', userEmail);
      debugLog('Username:', username);
      
      // Get the user's name for the welcome message
      let userName = "";
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
        
      if (!userError && userData && userData.name) {
        userName = userData.name.split(' ')[0]; // Get first name
      }
      
      // Always use direct database update for the final step
      const { error: directError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          username: username,
          onboarding_complete: true,  // Mark onboarding as complete
        });
        
      if (directError) {
        console.error('Error completing onboarding:', directError);
        Alert.alert('Error', 'Failed to complete your profile setup. Please try again.');
        setLoading(false);
        return;
      }
      
      // Get current user from Supabase
      let currentUserId = userId; // Default to the userId we already have
      
      try {
        // Try v2 API format first (getUser)
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (user && user.id) {
          currentUserId = user.id;
          logToConsole('Using Supabase v2 user ID:', currentUserId);
        } else {
          // Try v1 API format (direct user method)
          const v1User = supabase.auth.user();
          if (v1User && v1User.id) {
            currentUserId = v1User.id;
            logToConsole('Using Supabase v1 user ID:', currentUserId);
          } else {
            // Fallback to route param
            logToConsole('Using route param user ID:', currentUserId);
          }
        }
      } catch (userError) {
        logToConsole('Error getting user ID, using fallback:', currentUserId);
        console.error('Error getting user ID:', userError);
      }
      
      logToConsole('Final user ID for onboarding:', currentUserId);
      
      // Collect onboarding data from AsyncStorage
      const onboardingData = {
        date_of_birth: '',
        gender: '',
        country: '',
        bodyweight: 0,
        unit_pref: 'kg'
      };
      
      try {
        // Retrieve stored onboarding data
        const storedDateOfBirth = await AsyncStorage.getItem('userDateOfBirth');
        const storedGender = await AsyncStorage.getItem('userGender');
        const storedCountry = await AsyncStorage.getItem('userCountry');
        const storedBodyweight = await AsyncStorage.getItem('userBodyweight');
        const storedUnitPref = await AsyncStorage.getItem('userUnitPreference');
        
        if (storedDateOfBirth) onboardingData.date_of_birth = storedDateOfBirth;
        if (storedGender) onboardingData.gender = storedGender;
        if (storedCountry) onboardingData.country = storedCountry;
        if (storedBodyweight) onboardingData.bodyweight = parseFloat(storedBodyweight);
        if (storedUnitPref) onboardingData.unit_pref = storedUnitPref;
        
        logToConsole('Retrieved onboarding data:', onboardingData);
        
        // Send onboarding data to backend
        const onboardingPayload = {
          user_id: currentUserId,
          ...onboardingData
        };
        
        // Log before submitting
        logToConsole('⭐ Onboarding submitted ⭐');
        logToConsole('Payload:', onboardingPayload);
        
        // Configure the API base URL
        // For production, we use the Render backend
        const API_BASE_URL = 'https://gymvid-app.onrender.com';
        const apiUrl = `${API_BASE_URL}/onboard`;
        
        logToConsole('Making POST request to:', apiUrl);
        
        // Make POST request to backend
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(onboardingPayload),
          timeout: 10000, // 10-second timeout
        });
        
        logToConsole('Fetch request completed, status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          logToConsole('Backend onboarding request failed:', errorText);
          console.error('Backend onboarding request failed:', errorText);
          // Continue with the flow even if backend fails - we'll sync data later
        } else {
          const responseData = await response.json();
          logToConsole('Backend onboarding response:', responseData);
          
          // If the backend returns age_category and weight_class, store them
          if (responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            const userData = responseData.data[0];
            if (userData.age_category) {
              await AsyncStorage.setItem('userAgeCategory', userData.age_category);
              logToConsole('Stored age category:', userData.age_category);
            }
            if (userData.weight_class) {
              await AsyncStorage.setItem('userWeightClass', userData.weight_class);
              logToConsole('Stored weight class:', userData.weight_class);
            }
          }
        }
      } catch (err) {
        logToConsole('Error with onboarding API request:', err.message);
        console.error('Error with onboarding API request:', err);
        // Continue with the flow - backend sync can happen later
      }
      
      // Show success message
      debugLog('Onboarding completed successfully!');
      
      // Store welcome info for HomeScreen
      try {
        // Set a flag in AsyncStorage that HomeScreen will check
        const currentSession = supabase.auth.session();
        if (currentSession) {
          // Use global.welcomeInfo to pass data between screens
          global.welcomeInfo = {
            showWelcomeToast: true,
            userName: userName || 'there'
          };
        }
      } catch (err) {
        console.error('Error storing welcome info:', err);
      }
      
      // Run elegant exit animation with smooth transition
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 400,
          useNativeDriver: true
        })
      ]).start(() => {
        setLoading(false);
        
        // Navigate to the MainApp component which will handle the transition to HomeScreen
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }]
        });
      });
    } catch (err) {
      logToConsole('Unexpected error in handleContinue:', err.message);
      console.error('Unexpected error in handleContinue:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Animate out before navigating back
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 100, // Slide out to the right
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      // Update progress for previous screen
      setProgress({ ...progress, current: 5 });
      // Navigate back to the Country screen
      navigation.goBack();
    });
  };

  // Calculate progress percentage
  const progressPercentage = progress.current / progress.total;

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
        {/* Progress bar */}
        <View style={styles.header}>
          <View style={styles.progressWrapper}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarFilled, { flex: progressPercentage || 0.5 }]} />
              <View style={[styles.progressBarEmpty, { flex: 1 - (progressPercentage || 0.5) }]} />
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Animated.Text
            style={[
              styles.titleText,
              { transform: [{ translateY: titleAnim }] }
            ]}
          >
            Choose your username
          </Animated.Text>
          
          <Animated.View 
            style={{ 
              width: '100%', 
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            }}
          >
            <View style={styles.formContainer}>
              <Animated.View 
                style={{ 
                  opacity: inputAnim
                }}
              >
                <View style={[
                  styles.inputContainer,
                  isValid && username.length > 0 && styles.inputContainerValid,
                  errorMessage && styles.inputContainerError
                ]}>
                  <Ionicons name="at-outline" size={24} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="Type your username..."
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    maxLength={20}
                    autoCorrect={false}
                    autoFocus={true}
                  />
                  {validating ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
                  ) : isValid && username.length > 0 ? (
                    <Ionicons name="checkmark-circle" size={24} color="green" style={styles.validIcon} />
                  ) : null}
                </View>
                
                <Animated.View 
                  style={[
                    styles.messageContainer,
                    { opacity: messageAnim }
                  ]}
                >
                  {errorMessage ? (
                    <Text style={styles.errorMessage}>
                      <Ionicons name="alert-circle" size={16} color="#FF3B30" /> {errorMessage}
                    </Text>
                  ) : null}
                </Animated.View>
                
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>
                    Your username will be visible to other users. Choose something memorable, but don't use personally identifiable information.
                  </Text>
                </View>
              </Animated.View>
            </View>
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
            style={styles.backButtonBottom} 
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              (!isValid || !username || loading) && styles.nextButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isValid || !username || loading || validating}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>Finish</Text>
                <Ionicons name="checkmark" size={24} color={colors.white} />
              </>
            )}
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
    position: 'relative',
    zIndex: 10, // Ensure progress bar is above animations
  },
  progressWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    width: '50%',
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  progressBarFilled: {
    backgroundColor: '#007BFF',
  },
  progressBarEmpty: {
    backgroundColor: '#F0F0F0',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
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
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    paddingHorizontal: 20,
  },
  inputContainerValid: {
    borderColor: 'green',
  },
  inputContainerError: {
    borderColor: '#FF3B30',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: colors.darkGray,
  },
  indicator: {
    marginLeft: 12,
  },
  validIcon: {
    marginLeft: 12,
  },
  messageContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  infoText: {
    color: colors.gray,
    fontSize: 14,
    lineHeight: 20,
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
}); 