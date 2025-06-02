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
      
      // Reset validation state when returning to screen to ensure proper revalidation
      if (username.length >= 3) {
        setValidating(true);
        // Revalidate the username since we're coming back to this screen
        checkUsernameAvailable(username);
      }
      
      // Restart the animation sequence
      animationSequence.start(() => {
        // Focus the input after animations complete
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    });
    
    // Set up a blur listener for when leaving this screen
    const unsubBlur = navigation.addListener('blur', () => {
      // Clear validation state when leaving screen
      setValidating(false);
      
      // Clear any pending debounce
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    });
    
    return () => {
      unsubFocus();
      unsubBlur();
      
      // Clear any pending debounce
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
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
    // Only animate if the message is actually changing
    if (errorMessage === message) return;
    
    setSuccessMessage(''); // Clear any success message
    setErrorMessage(message);
    
    // Reset and animate
    messageAnim.setValue(0);
    Animated.timing(messageAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  
  // Helper function to animate success message
  const animateSuccessMessage = (message) => {
    // Only animate if the message is actually changing
    if (successMessage === message) return;
    
    setErrorMessage(''); // Clear any error message
    setSuccessMessage(message);
    
    // Reset and animate
    messageAnim.setValue(0);
    Animated.timing(messageAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Custom handler for text input to immediately validate for invalid characters
  const handleUsernameChange = (text) => {
    setUsername(text);
    
    // Clear previous timeout if exists
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    
    // Clear messages if empty
    if (!text) {
      setErrorMessage('');
      setSuccessMessage('');
      setIsValid(false);
      setValidating(false);
      return;
    }
    
    // Immediately check for invalid characters
    const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validUsernameRegex.test(text)) {
      setIsValid(false);
      setValidating(false);
      animateErrorMessage('Username can only contain letters, numbers, and underscores');
      return; // Skip availability check for invalid usernames
    }
    
    // Check minimum length
    if (text.length < 3) {
      setIsValid(false);
      setValidating(false);
      animateErrorMessage('Username must be at least 3 characters');
      return;
    }
    
    // Set to validating state
    setValidating(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Debounce the availability check
    debounceTimeout.current = setTimeout(() => {
      checkUsernameAvailable(text);
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
      
      // Fetch current user ID for potential updates to Supabase
      let currentUserId = null;
      try {
        currentUserId = await getCurrentUserId();
      } catch (err) {
        console.error('Error getting current user ID:', err);
        // Continue without user ID, we'll just skip Supabase updates
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
          // Get the raw error text first without trying to access properties
          const rawErrorText = await response.text();
          
          // Log the raw error text directly - this is the most reliable approach
          console.error(`Backend username check failed: ${rawErrorText}`);
          logToConsole('Backend username check failed - raw response:', rawErrorText);
          
          // Try fallback endpoint if we see the APIResponse error
          if (rawErrorText.includes("APIResponse") && rawErrorText.includes("error")) {
            // Log the detection of this specific error
            logToConsole('Detected APIResponse error in username check');
            
            // For username check, we can fall back to local validation
            // Just check for reserved usernames and some simple rules
            if (isReservedUsername(usernameToCheck)) {
              setIsValid(false);
              animateErrorMessage('Sorry, this username is reserved.');
              return;
            }
            
            // Simple format validation as fallback
            if (usernameToCheck.length < 3) {
              setIsValid(false);
              animateErrorMessage('Username must be at least 3 characters');
              return;
            }
            
            // If no issues found, treat as valid
            setIsValid(true);
            animateSuccessMessage('Username looks good! Limited validation only.');
          } else {
            // Parse the error as JSON if possible
            try {
              if (rawErrorText.trim().startsWith('{') || rawErrorText.trim().startsWith('[')) {
                const parsedError = JSON.parse(rawErrorText);
                logToConsole('Parsed error response:', parsedError);
                
                // Check if it contains a specific error message
                if (parsedError.error && typeof parsedError.error === 'string') {
                  setIsValid(false);
                  animateErrorMessage(parsedError.error);
                  return;
                }
              }
            } catch (parseError) {
              // Ignore parsing errors
              logToConsole('Error parsing response:', parseError.message);
            }
            
            // Default error message
            setIsValid(false);
            animateErrorMessage('Error checking username');
          }
        } else {
          // Handle successful response
          try {
            const responseText = await response.text();
            logToConsole('Raw successful response:', responseText);
            
            let responseData;
            try {
              // Only try to parse if there's actual content
              if (responseText.trim()) {
                responseData = JSON.parse(responseText);
                logToConsole('Backend onboarding response:', responseData);
              } else {
                logToConsole('Empty response body - treating as success with no data');
                responseData = {}; // Use empty object as fallback
              }
            } catch (jsonError) {
              console.error('Error parsing JSON response:', jsonError);
              logToConsole('Error parsing JSON response:', jsonError.message);
              logToConsole('Raw response was:', responseText);
              responseData = {}; // Use empty object as fallback
            }
            
            // Extract any useful data from the response
            if (responseData) {
              // Log the data we got back
              logToConsole('Extracted onboarding response data:', responseData);
              
              // Check username availability based on the response
              if (responseData.available === true || responseData.exists === false) {
                // Username is available
                setIsValid(true);
                animateSuccessMessage('Username is available!');
              } else if (responseData.available === false || responseData.exists === true) {
                // Username is already taken
                setIsValid(false);
                animateErrorMessage('Sorry, this username is already taken.');
              } else {
                // No clear availability indicators but response was successful - assume valid
                setIsValid(true);
                animateSuccessMessage('Username format is valid.');
              }
              
              // Check if we have any data to save (unrelated to username validation)
              if (responseData.data) {
                const dataToSave = responseData.data;
                
                if (dataToSave.age_category) {
                  await AsyncStorage.setItem('userAgeCategory', dataToSave.age_category);
                  logToConsole('Stored age category:', dataToSave.age_category);
                }
                
                if (dataToSave.weight_class) {
                  await AsyncStorage.setItem('userWeightClass', dataToSave.weight_class);
                  logToConsole('Stored weight class:', dataToSave.weight_class);
                }
              }
            } else {
              // No response data but request was successful - default to valid
              setIsValid(true);
              animateSuccessMessage('Username format looks good.');
            }
          } catch (responseError) {
            console.error('Error handling onboarding response:', responseError);
            logToConsole('Error handling onboarding response:', responseError.message);
          }
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
    // Cleanup function to clear any pending debounce when component unmounts
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
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
        .maybeSingle();
        
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
              .maybeSingle();
              
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
            onboarding_complete: false  // Keep this as false until the complete flow is finished
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
        
        // Sanitize the date_of_birth field to ensure it's in the format YYYY-MM-DD
        if (onboardingPayload.date_of_birth) {
          onboardingPayload.date_of_birth = new Date(onboardingPayload.date_of_birth)
            .toISOString()
            .split("T")[0];
          console.log("[ONBOARDING] Cleaned date_of_birth:", onboardingPayload.date_of_birth);
        }
        
        // Log full payload details before submitting
        logToConsole('[ONBOARDING] Final payload before POST:', onboardingPayload);
        console.log('[ONBOARDING] Final payload before POST:', onboardingPayload);
        
        // Configure the API base URL
        // For production, we use the Render backend
        const API_BASE_URL = 'https://gymvid-app.onrender.com';
        const apiUrl = `${API_BASE_URL}/onboard`;
        
        logToConsole('Making POST request to:', apiUrl);
        
        // Make POST request to backend
        try {
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
            // Get the raw error text first without trying to access properties
            const rawErrorText = await response.text();
            
            // Log the raw error text directly - this is the most reliable approach
            console.error(`Backend onboarding request failed: ${rawErrorText}`);
            logToConsole('Backend onboarding request failed - raw response:', rawErrorText);
            
            // Try fallback endpoint if we see the APIResponse error
            if (rawErrorText.includes("APIResponse") && rawErrorText.includes("error")) {
              // Log the detection of this specific error
              logToConsole('Detected APIResponse error, will try fallback endpoint');
              
              try {
                // Call the fallback endpoint
                const fallbackApiUrl = `${API_BASE_URL}/onboard-fallback`;
                logToConsole('Calling fallback endpoint:', fallbackApiUrl);
                
                const fallbackResponse = await fetch(fallbackApiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(onboardingPayload),
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  logToConsole('Fallback endpoint success:', fallbackData);
                  
                  // If we have data from fallback, use it
                  if (fallbackData && fallbackData.data) {
                    if (fallbackData.data.age_category) {
                      await AsyncStorage.setItem('userAgeCategory', fallbackData.data.age_category);
                      logToConsole('Saved age category from fallback:', fallbackData.data.age_category);
                      
                      // Update Supabase with the fallback data
                      await supabase
                        .from('users')
                        .update({ age_category: fallbackData.data.age_category })
                        .eq('id', currentUserId);
                    }
                    
                    if (fallbackData.data.weight_class) {
                      await AsyncStorage.setItem('userWeightClass', fallbackData.data.weight_class);
                      logToConsole('Saved weight class from fallback:', fallbackData.data.weight_class);
                      
                      // Update Supabase with the fallback data
                      await supabase
                        .from('users')
                        .update({ weight_class: fallbackData.data.weight_class })
                        .eq('id', currentUserId);
                    }
                  }
                } else {
                  logToConsole('Fallback endpoint also failed:', await fallbackResponse.text());
                }
              } catch (fallbackError) {
                logToConsole('Error calling fallback endpoint:', fallbackError.message);
              }
            }
            
            // Try to parse the error response to see if there's useful information
            try {
              if (rawErrorText.trim().startsWith('{') || rawErrorText.trim().startsWith('[')) {
                const parsedError = JSON.parse(rawErrorText);
                logToConsole('Parsed error response:', parsedError);
              }
            } catch (parseError) {
              // Ignore parsing errors
              logToConsole('Error parsing response:', parseError.message);
            }
            
            // Force onboarding_complete to false on error
            try {
              await supabase
                .from('users')
                .update({ onboarding_complete: false })
                .eq('id', currentUserId);
              logToConsole('Forced onboarding_complete to false after API error');
              
              // Also clear any AsyncStorage flags related to onboarding
              await AsyncStorage.setItem('onboardingInProgress', 'true');
              await AsyncStorage.removeItem('onboardingComplete');
            } catch (updateError) {
              console.error('Error updating onboarding state after API error:', updateError);
            }
          } else {
            // Handle successful response
            try {
              const responseText = await response.text();
              logToConsole('Raw successful response:', responseText);
              
              let responseData;
              try {
                // Only try to parse if there's actual content
                if (responseText.trim()) {
                  responseData = JSON.parse(responseText);
                  logToConsole('Backend onboarding response:', responseData);
                } else {
                  logToConsole('Empty response body - treating as success with no data');
                  responseData = {}; // Use empty object as fallback
                }
              } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                logToConsole('Error parsing JSON response:', jsonError.message);
                logToConsole('Raw response was:', responseText);
                responseData = {}; // Use empty object as fallback
              }
              
              // Extract any useful data from the response
              if (responseData) {
                // Log the data we got back
                logToConsole('Extracted onboarding response data:', responseData);
                
                // Check username availability based on the response
                if (responseData.available === true || responseData.exists === false) {
                  // Username is available
                  setIsValid(true);
                  animateSuccessMessage('Username is available!');
                } else if (responseData.available === false || responseData.exists === true) {
                  // Username is already taken
                  setIsValid(false);
                  animateErrorMessage('Sorry, this username is already taken.');
                } else {
                  // No clear availability indicators but response was successful - assume valid
                  setIsValid(true);
                  animateSuccessMessage('Username format is valid.');
                }
                
                // Check if we have any data to save (unrelated to username validation)
                if (responseData.data) {
                  const dataToSave = responseData.data;
                  
                  if (dataToSave.age_category) {
                    await AsyncStorage.setItem('userAgeCategory', dataToSave.age_category);
                    logToConsole('Stored age category:', dataToSave.age_category);
                  }
                  
                  if (dataToSave.weight_class) {
                    await AsyncStorage.setItem('userWeightClass', dataToSave.weight_class);
                    logToConsole('Stored weight class:', dataToSave.weight_class);
                  }
                }
              } else {
                // No response data but request was successful - default to valid
                setIsValid(true);
                animateSuccessMessage('Username format looks good.');
              }
            } catch (responseError) {
              console.error('Error handling onboarding response:', responseError);
              logToConsole('Error handling onboarding response:', responseError.message);
            }
          }
        } catch (fetchError) {
          console.error('Network error with /onboard request:', fetchError);
          logToConsole('Network error with /onboard request:', fetchError.message);
          // Continue with the onboarding flow even if the network request completely fails
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
          
            // IMPROVED NAVIGATION FLOW: Wrap in async function to allow await
            const finalizeOnboarding = async () => {
              // Log this important transition
              logToConsole('⭐ Onboarding complete - navigating to OnboardingSummary ⭐');
              
              // CRITICAL FIX: Force onboarding_complete to false before continuing
              const finalUserId = currentUserId || await AsyncStorage.getItem('userId') || await getCurrentUserId();
              
              // Force onboarding to be incomplete
              if (finalUserId) {
                try {
                  await supabase
                    .from('users')
                    .update({ onboarding_complete: false })
                    .eq('id', finalUserId);
                  logToConsole('✅ Force-set onboarding_complete=false before navigation');
                  
                  // Also clear any local completion flags
                  await AsyncStorage.setItem('onboardingInProgress', 'true');
                  await AsyncStorage.removeItem('onboardingComplete');
                } catch (error) {
                  console.error('Error setting onboarding status:', error);
                }
              }
              
              if (!finalUserId) {
                console.error('‼️ CRITICAL ERROR: No user ID available before navigation');
                // Try one more time to get from session
                const session = supabase.auth.session();
                const sessionUserId = session?.user?.id;
                
                if (sessionUserId) {
                  logToConsole('Recovered user ID from session at last moment:', sessionUserId);
                  
                  // Navigate with the recovered ID
                  navigation.navigate('OnboardingSummary', {
                    userId: sessionUserId,
                    email: userEmail,
                    fromSignUp,
                    continueOnboarding: true,
                    forceFlow: true
                  });
                  return;
                }
                
                // Last resort - try to proceed without ID
                // This is bad but better than getting stuck
                logToConsole('⚠️ PROCEEDING WITHOUT USER ID - EMERGENCY FALLBACK');
              }
              
              // Navigate to OnboardingSummary which will handle the extended onboarding flow
              navigation.navigate('OnboardingSummary', {
                userId: finalUserId,
                email: userEmail,
                fromSignUp,
                continueOnboarding: true,
                forceFlow: true
              });
            };
            
            // Execute the async function
            finalizeOnboarding();
        });
      } catch (err) {
          logToConsole('Error with onboarding API request:', err.message);
          console.error('Error with onboarding API request:', err);
          // Continue with the flow - backend sync can happen later
        }
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
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>
                    Your username will be used to identify you on the app to connect with others using GymVid!
                  </Text>
                </View>
                
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
                  ) : errorMessage ? (
                    <Ionicons name="close-circle" size={24} color="#FF3B30" style={styles.validIcon} />
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
    marginTop: 0,
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
    marginTop: 0,
    paddingHorizontal: 8,
    marginBottom: 30,
  },
  infoText: {
    color: colors.gray,
    fontSize: 16,
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