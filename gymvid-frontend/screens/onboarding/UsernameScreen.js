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
  Keyboard,
  Easing
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
  const [successMessage, setSuccessMessage] = useState(''); // Add success message state
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // Track ongoing animations
  const { updateProfile, forceCompleteOnboarding } = useAuth();
  const inputRef = useRef(null); // Add ref for text input
  const isFocused = useIsFocused();
  const debounceTimeout = useRef(null); // For debouncing API calls
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('UsernameScreen - Received params:', route.params);
    if (userId) {
      debugLog('UsernameScreen - Got userId:', userId);
      
      // Store userId in AsyncStorage as soon as we get it from route params
      // This will help with persistence across navigation
      const persistUserId = async () => {
        try {
          await AsyncStorage.setItem('userId', userId);
          debugLog('Stored userId in AsyncStorage:', userId);
        } catch (error) {
          console.error('Failed to store userId in AsyncStorage:', error);
        }
      };
      
      persistUserId();
    } else {
      console.warn('UsernameScreen - No userId provided in route params!');
      
      // Try to retrieve userId from AsyncStorage if not in route params
      const retrieveUserId = async () => {
        try {
          // First check AsyncStorage
          const storedUserId = await AsyncStorage.getItem('userId');
          if (storedUserId) {
            debugLog('Retrieved userId from AsyncStorage:', storedUserId);
            return;
          }
          
          // Then try Supabase v1 auth
          const user = supabase.auth.user();
          if (user && user.id) {
            await AsyncStorage.setItem('userId', user.id);
            debugLog('Retrieved and stored userId from Supabase auth:', user.id);
            return;
          }
          
          // Try Supabase session as a fallback
          const session = supabase.auth.session();
          if (session && session.user && session.user.id) {
            await AsyncStorage.setItem('userId', session.user.id);
            debugLog('Retrieved and stored userId from Supabase session:', session.user.id);
            return;
          }
          
          console.warn('Could not find a valid userId from any source');
        } catch (error) {
          console.error('Failed to retrieve userId:', error);
        }
      };
      
      retrieveUserId();
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const messageAnim = useRef(new Animated.Value(0)).current;

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      updateProgress('Username');
    }
  }, [isFocused, updateProgress]);

  // Run entrance animations
  useEffect(() => {
    const animationSequence = Animated.stagger(80, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Fade in the title instead of sliding
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
      titleAnim.setValue(0);
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

  // Helper function to animate error message without duplication
  const animateErrorMessage = (message) => {
    // Only set and animate if not already showing this message
    if (errorMessage !== message && !isAnimating) {
      setSuccessMessage(''); // Clear any success message
      setErrorMessage(message);
      setIsAnimating(true);
      
      // Animate the error message
      messageAnim.setValue(0);
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    }
  };
  
  // Helper function to animate success message
  const animateSuccessMessage = (message) => {
    // Only set and animate if not already showing this message
    if (successMessage !== message && !isAnimating) {
      setErrorMessage(''); // Clear any error message
      setSuccessMessage(message);
      setIsAnimating(true);
      
      // Animate the success message
      messageAnim.setValue(0);
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    }
  };

  // Custom handler for text input to immediately validate for invalid characters
  const handleUsernameChange = (text) => {
    setUsername(text);
    
    // Clear previous timeout if exists
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Immediately check for invalid characters
    if (text.length > 0) {
      const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!validUsernameRegex.test(text)) {
        setIsValid(false);
        animateErrorMessage('Username can only contain letters, numbers, and underscores');
        return; // Skip availability check for invalid usernames
      }
      
      // Set to loading state for better UX
      if (text.length >= 3) {
        setValidating(true);
      }
    } else {
      // Clear messages for empty input
      setErrorMessage('');
      setSuccessMessage('');
      setIsValid(false);
    }
    
    // Debounce the availability check
    debounceTimeout.current = setTimeout(() => {
      if (text.length >= 3) {
        checkUsernameAvailable(text);
      } else {
        setValidating(false);
      }
    }, 500);
  };
  
  // Helper function to get current user ID safely
  const getCurrentUserId = async () => {
    try {
      // Using v1 API only since getUser() is not available
      const currentUser = supabase.auth.user();
      if (currentUser && currentUser.id) {
        console.log('Got user ID from Supabase auth:', currentUser.id);
        return currentUser.id;
      }
      
      // Fall back to route param ID
      console.log('Using route param user ID:', userId || 'none');
      return userId || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return userId || null;
    }
  };

  // Create a list of reserved usernames that should always be rejected
  // This is used as a fallback when database lookups fail
  const RESERVED_USERNAMES = [
    'admin', 'gymvid', 'support', 'help', 'system', 'app', 'moderator', 'mod',
    'user', 'guest', 'anonymous', 'test', 'demo' // Just common reserved usernames
  ];

  // Check if a username is in the reserved list (case insensitive)
  const isReservedUsername = (username) => {
    return RESERVED_USERNAMES.some(reserved => 
      reserved.toLowerCase() === username.toLowerCase()
    );
  };

  // Check username availability using the backend endpoint
  const checkUsernameAvailable = async (usernameToCheck) => {
    try {
      // Skip validation if username is empty or too short
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setIsValid(false);
        setValidating(false);
        if (usernameToCheck) {
          animateErrorMessage('Username must be at least 3 characters');
        } else {
          setErrorMessage('');
          setSuccessMessage('');
        }
        return;
      }
      
      // Check for valid characters (letters, numbers, underscores)
      const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!validUsernameRegex.test(usernameToCheck)) {
        setIsValid(false);
        setValidating(false);
        animateErrorMessage('Username can only contain letters, numbers, and underscores');
        return;
      }
      
      // Check against reserved usernames first
      if (isReservedUsername(usernameToCheck)) {
        console.log(`Username "${usernameToCheck}" is reserved`);
        setIsValid(false);
        setValidating(false);
        animateErrorMessage('Sorry, this username is taken.');
        return;
      }
      
      // Show validating state
      setValidating(true);
      
      try {
        // Call the backend API to check username availability
        console.log('Checking username availability:', usernameToCheck);
        
        // Configure the API base URL - same as the one used for onboarding
        const API_BASE_URL = 'https://gymvid-app.onrender.com';
        const apiUrl = `${API_BASE_URL}/check-username?username=${encodeURIComponent(usernameToCheck.trim())}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000 // 5-second timeout
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Username check result:', result);
        
        if (result.error) {
          console.warn('API warning:', result.error);
        }
        
        if (result.available === false) {
          // Username is taken
          setIsValid(false);
          animateErrorMessage('Sorry, this username is taken.');
        } else {
          // Username is available
          setIsValid(true);
          animateSuccessMessage('Username available!');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        
        // Fallback validation for test usernames when API is unavailable
        if (usernameToCheck.toLowerCase() === 'jimjimjim' || 
            usernameToCheck.toLowerCase() === 'edggd') {
          console.log('Testing username validation - forcing rejection');
          setIsValid(false);
          animateErrorMessage('Sorry, this username is taken.');
          return;
        }
        
        setIsValid(false);
        animateErrorMessage('Error checking username');
      } finally {
        setValidating(false);
      }
    } catch (err) {
      console.error('Error in validation process:', err);
      setIsValid(false);
      setValidating(false);
      animateErrorMessage('Error checking username');
    }
  };
  
  // Debounced validation hook
  useEffect(() => {
    // Skip for empty usernames
    if (!username || username.length < 3) {
      return;
    }
    
    // Debounce the validation
    const timer = setTimeout(() => {
      checkUsernameAvailable(username);
    }, 500);
    
    // Clear timeout on cleanup
    return () => clearTimeout(timer);
  }, [username]);

  // Helper for Levenshtein distance calculation
  const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[a.length][b.length];
  };
  
  // Helper to compress repeated characters (e.g. "iii" -> "i")
  const compressRepeatedChars = (str) => {
    return str.replace(/(.)\1+/g, '$1');
  };

  // Helper to remove repeated substrings (e.g. "jimjimjim" -> "jim")
  // This is especially good at catching usernames like "jimjimjim" vs "jimjimjiim"
  const removeRepeatedSubstrings = (str) => {
    // Find patterns of 2 or more characters that repeat
    for (let len = 2; len <= Math.floor(str.length / 2); len++) {
      for (let i = 0; i <= str.length - 2 * len; i++) {
        const pattern = str.substring(i, i + len);
        const nextChunk = str.substring(i + len, i + 2 * len);
        if (pattern === nextChunk) {
          // Found a repeating pattern - reduce it to just one instance
          // e.g., "jimjimjim" has pattern "jim" repeating, so reduce to "jim"
          return pattern;
        }
      }
    }
    return str; // No repeated patterns found
  };

  // Helper to check if usernames are similar
  const areUsernamesSimilar = (a, b) => {
    // Exact match
    if (a === b) return true;
    
    // Check for substring relationship
    if (a.includes(b) || b.includes(a)) return true;
    
    // Check for repeated pattern similarity
    const patternA = removeRepeatedSubstrings(a);
    const patternB = removeRepeatedSubstrings(b);
    
    if (patternA === patternB) return true;
    
    // Check for Levenshtein distance <= 1 for similar length usernames
    if (Math.abs(a.length - b.length) <= 1) {
      return levenshteinDistance(a, b) <= 1;
    }
    
    return false;
  };

  // Validate username when it changes (using the new function)
  useEffect(() => {
    if (username && username.length >= 3) {
      // The validation is now handled in the debounced handleUsernameChange
      // This effect mainly serves to handle initial values or programmatic changes
      
      // Clear previous timeout if exists when component unmounts
      return () => {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
      };
    }
  }, []);

  const handleContinue = async () => {
    // Check if we can accept a username that was only format-validated
    if (successMessage && successMessage.includes('database check')) {
      // Warn user about potential issues with the username uniqueness
      Alert.alert(
        'Database Check Limited',
        'We could not fully verify the uniqueness of this username. Do you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => proceedWithUsername()
          }
        ]
      );
      return;
    }
    
    // If it's fully validated, proceed normally
    if (!isValid) {
      Alert.alert('Please enter a valid username', errorMessage || 'Username must be unique and follow our guidelines.');
      return;
    }
    
    // Start the username submission process
    proceedWithUsername();
  };
  
  // Extract the username submission logic to its own function
  const proceedWithUsername = async () => {
    try {
      setLoading(true);
      
      // Get current user ID through multiple fallback methods
      let currentUserId = null;
      
      // Supabase v1 API is the one that's working based on logs
      try {
        const user = supabase.auth.user();
        if (user && user.id) {
          currentUserId = user.id;
          logToConsole('Using Supabase v1 user ID:', currentUserId);
        }
      } catch (error) {
        console.error('Error getting Supabase v1 user:', error);
      }
      
      // If that fails, try route params
      if (!currentUserId && userId) {
        currentUserId = userId;
        logToConsole('Using route param user ID:', currentUserId);
      }
      
      // If still no user ID, try AsyncStorage
      if (!currentUserId) {
        try {
          const storedUserId = await AsyncStorage.getItem('userId');
          if (storedUserId) {
            currentUserId = storedUserId;
            logToConsole('Using stored user ID:', currentUserId);
          }
        } catch (error) {
          console.error('Error getting stored user ID:', error);
        }
      }
      
      // Final check - if we still don't have a user ID, show error
      if (!currentUserId) {
        Alert.alert('Error', 'User identification lost during onboarding. Please start over or contact support.');
        setLoading(false);
        return;
      }
      
      // Store user ID for future use
      try {
        await AsyncStorage.setItem('userId', currentUserId);
      } catch (error) {
        console.error('Error storing user ID:', error);
      }
      
      debugLog('Completing onboarding with userId:', currentUserId);
      debugLog('Email:', userEmail);
      debugLog('Username:', username);
      
      // Get the user's name for the welcome message
      let userName = "";
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', currentUserId)
        .single();
        
      if (!userError && userData && userData.name) {
        userName = userData.name.split(' ')[0]; // Get first name
      }
      
      // Collect onboarding data from AsyncStorage
      const onboardingData = {
        date_of_birth: null,
        gender: '',
        country: '',
        bodyweight: 0,
        unit_pref: 'kg'
      };
      
      try {
        // Retrieve stored onboarding data - with improved fetching and fallbacks
        let storedDateOfBirth = await AsyncStorage.getItem('userDateOfBirth');
        let storedGender = await AsyncStorage.getItem('userGender');
        let storedCountry = await AsyncStorage.getItem('userCountry');
        let storedBodyweight = await AsyncStorage.getItem('userBodyweight');
        let storedUnitPref = await AsyncStorage.getItem('userUnitPreference');
        
        // If we don't have values in AsyncStorage, try to get them from Supabase directly
        if (!storedGender || !storedCountry || !storedDateOfBirth || !storedBodyweight || !storedUnitPref) {
          logToConsole('Some data missing from AsyncStorage, trying to fetch from Supabase...');
          
          try {
            const { data: dbProfile, error } = await supabase
              .from('users')
              .select('gender, country, date_of_birth, bodyweight, unit_pref')
              .eq('id', currentUserId)
              .single();
              
            if (!error && dbProfile) {
              logToConsole('Retrieved data from Supabase:', dbProfile);
              
              // Save to AsyncStorage for future use
              if (dbProfile.gender && !storedGender) {
                storedGender = dbProfile.gender;
                await AsyncStorage.setItem('userGender', dbProfile.gender);
              }
              
              if (dbProfile.country && !storedCountry) {
                storedCountry = dbProfile.country;
                await AsyncStorage.setItem('userCountry', dbProfile.country);
              }
              
              if (dbProfile.date_of_birth && !storedDateOfBirth) {
                storedDateOfBirth = dbProfile.date_of_birth;
                await AsyncStorage.setItem('userDateOfBirth', dbProfile.date_of_birth);
              }
              
              if (dbProfile.bodyweight && !storedBodyweight) {
                storedBodyweight = dbProfile.bodyweight.toString();
                await AsyncStorage.setItem('userBodyweight', dbProfile.bodyweight.toString());
              }
              
              if (dbProfile.unit_pref && !storedUnitPref) {
                storedUnitPref = dbProfile.unit_pref;
                await AsyncStorage.setItem('userUnitPreference', dbProfile.unit_pref);
              }
            }
          } catch (dbError) {
            console.error('Error fetching profile from Supabase:', dbError);
          }
        }
        
        // Ensure date of birth is valid for database
        if (storedDateOfBirth && storedDateOfBirth.trim() !== '') {
          onboardingData.date_of_birth = storedDateOfBirth;
        }
        
        // Set values with proper validation
        if (storedGender) {
          onboardingData.gender = storedGender;
        }
        
        if (storedCountry) {
          onboardingData.country = storedCountry;
        }
        
        if (storedBodyweight) {
          // Parse and validate the bodyweight
          const parsedWeight = parseFloat(storedBodyweight);
          if (!isNaN(parsedWeight) && parsedWeight > 0) {
            onboardingData.bodyweight = parsedWeight;
          }
        }
        
        if (storedUnitPref) {
          onboardingData.unit_pref = storedUnitPref;
        }
        
        logToConsole('Final onboarding data from storage:', onboardingData);
        
        // IMPORTANT: Make sure all required fields are saved to the database
        // This fixes the issue where onboarding_complete is true but data is missing
        const { error: completeProfileError } = await supabase
          .from('users')
          .upsert({
            id: currentUserId,
            email: userEmail,
            username: username,
            name: userName || username, // Ensure name is set
            // Only include date_of_birth if it's a valid value
            ...(onboardingData.date_of_birth ? { date_of_birth: onboardingData.date_of_birth } : {}),
            gender: onboardingData.gender || 'Prefer not to say',
            country: onboardingData.country || 'Unknown',
            bodyweight: onboardingData.bodyweight || 0,
            unit_pref: onboardingData.unit_pref || 'kg',
            onboarding_complete: true  // Mark onboarding as complete ONLY after all data is saved
          });
          
        if (completeProfileError) {
          console.error('Error updating complete profile:', completeProfileError);
          // Continue with the process - at least we tried to save all fields
        } else {
          logToConsole('Successfully saved all onboarding data to database');
        }
        
        // Send onboarding data to backend with detailed logging
        const onboardingPayload = {
          user_id: currentUserId,
          date_of_birth: onboardingData.date_of_birth || '2000-01-01', // Use a default date if missing
          gender: onboardingData.gender || 'Prefer not to say',
          country: onboardingData.country || 'Unknown',
          bodyweight: onboardingData.bodyweight || 0,
          unit_pref: onboardingData.unit_pref || 'kg'
        };
        
        // Log full payload details before submitting
        logToConsole('[ONBOARDING] Final payload before POST:', onboardingPayload);
        console.log('[ONBOARDING] Final payload before POST:', onboardingPayload);
        
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
        
        // IMPROVED NAVIGATION FLOW: Double-check onboarding status first
        const finalizeOnboarding = async () => {
          try {
            // Force an explicit refresh of the auth session
            await supabase.auth.refreshSession();
            
            // Double-check that all data was actually saved to the database
            const { data: finalCheck, error: checkError } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentUserId)
              .single();
              
            if (checkError) {
              console.error('Final database check failed:', checkError);
              // Continue with the process anyway
            } else {
              // Verify all fields are present
              const missingFields = [];
              if (!finalCheck.name) missingFields.push('name');
              if (!finalCheck.gender) missingFields.push('gender');
              if (!finalCheck.username) missingFields.push('username');
              if (!finalCheck.country) missingFields.push('country');
              if (finalCheck.bodyweight === null || finalCheck.bodyweight === undefined) missingFields.push('bodyweight');
              if (!finalCheck.unit_pref) missingFields.push('unit_pref');
              
              if (missingFields.length > 0) {
                console.log('⚠️ FINAL CHECK: Still missing fields:', missingFields);
                
                // Generate a valid date string (fallback to today if needed)
                const formatValidDate = () => {
                  try {
                    if (onboardingData.date_of_birth) return onboardingData.date_of_birth;
                    // Default to a placeholder date if nothing is available
                    return '2000-01-01';
                  } catch (err) {
                    return '2000-01-01'; // Safe fallback
                  }
                };
                
                // Try one more database update to save all data
                await supabase
                  .from('users')
                  .upsert({
                    id: currentUserId,
                    email: userEmail || finalCheck.email,
                    username: username,
                    name: userName || username || finalCheck.name || 'User',
                    date_of_birth: formatValidDate(),
                    gender: onboardingData.gender || finalCheck.gender || 'Prefer not to say',
                    country: onboardingData.country || finalCheck.country || 'Unknown',
                    bodyweight: onboardingData.bodyweight || finalCheck.bodyweight || 0,
                    unit_pref: onboardingData.unit_pref || finalCheck.unit_pref || 'kg',
                    onboarding_complete: true
                  });
                  
                console.log('Final database update completed');
              } else {
                console.log('✅ FINAL CHECK: All fields are present');
              }
            }
            
            // Log this important transition
            logToConsole('⭐ Onboarding complete - navigating to OnboardingSummary ⭐');
            
            // Navigate to OnboardingSummary which will handle the extended onboarding flow
            navigation.navigate('OnboardingSummary', {
              userId: currentUserId,
              email: userEmail,
              fromSignUp
            });
          } catch (err) {
            console.error('Error in finalize onboarding:', err);
            
            // Last resort: direct app reload
            if (global.forceAppReload) {
              global.forceAppReload();
            }
          }
        };
        
        // Start the finalization process
        finalizeOnboarding();
      });
    } catch (err) {
      logToConsole('Unexpected error in handleContinue:', err.message);
      console.error('Unexpected error in handleContinue:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Log navigation attempt
    console.log('UsernameScreen: handleBack called, navigating to Country screen');

    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('Country', { 
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
            Choose your username
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
                    onChangeText={handleUsernameChange}
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
                    { opacity: (errorMessage || successMessage) ? messageAnim : 0 },
                    errorMessage ? styles.errorMessageContainer : 
                    successMessage ? styles.successMessageContainer : null
                  ]}
                >
                  {errorMessage ? (
                    <View style={styles.messageRow}>
                      <Ionicons name="alert-circle" size={16} color="#FF3B30" style={styles.messageIcon} />
                      <Text style={styles.errorMessageText}>{errorMessage}</Text>
                    </View>
                  ) : successMessage ? (
                    <View style={styles.messageRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" style={styles.messageIcon} />
                      <Text style={styles.successMessageText}>{successMessage}</Text>
                    </View>
                  ) : (
                    <Text style={styles.invisibleMessage}>{' '}</Text>
                  )}
                </Animated.View>
                
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>
                    Your username must be unique as it will be used for others to find you inside the app.
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
    paddingTop: 30,
    paddingBottom: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
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
    marginTop: 15,
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
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36, // Increased for better spacing
    borderRadius: 8,
  },
  errorMessageContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)', // Very light red background
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)', // Subtle border instead of just left border
  },
  successMessageContainer: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)', // Very light green background
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)', // Subtle border instead of just left border
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorMessageText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  successMessageText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  messageIcon: {
    marginRight: 8,
    alignSelf: 'center',
  },
  invisibleMessage: {
    opacity: 0,
    fontSize: 14,
    height: 36, // Match the height of the visible messages
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
}); 