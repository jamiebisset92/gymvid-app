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
  FlatList,
  Keyboard,
  Easing,
  Platform,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import CountryFlag from 'react-native-country-flag';
import { useIsFocused } from '@react-navigation/native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

// List of countries for dropdown with ISO codes
const COUNTRIES = [
  { name: "Afghanistan", code: "AF" },
  { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" },
  { name: "Andorra", code: "AD" },
  { name: "Angola", code: "AO" },
  { name: "Antigua and Barbuda", code: "AG" },
  { name: "Argentina", code: "AR" },
  { name: "Armenia", code: "AM" },
  { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" },
  { name: "Azerbaijan", code: "AZ" },
  { name: "Bahamas", code: "BS" },
  { name: "Bahrain", code: "BH" },
  { name: "Bangladesh", code: "BD" },
  { name: "Barbados", code: "BB" },
  { name: "Belarus", code: "BY" },
  { name: "Belgium", code: "BE" },
  { name: "Belize", code: "BZ" },
  { name: "Benin", code: "BJ" },
  { name: "Bhutan", code: "BT" },
  { name: "Bolivia", code: "BO" },
  { name: "Bosnia and Herzegovina", code: "BA" },
  { name: "Botswana", code: "BW" },
  { name: "Brazil", code: "BR" },
  { name: "Brunei", code: "BN" },
  { name: "Bulgaria", code: "BG" },
  { name: "Burkina Faso", code: "BF" },
  { name: "Burundi", code: "BI" },
  { name: "Cabo Verde", code: "CV" },
  { name: "Cambodia", code: "KH" },
  { name: "Cameroon", code: "CM" },
  { name: "Canada", code: "CA" },
  { name: "Central African Republic", code: "CF" },
  { name: "Chad", code: "TD" },
  { name: "Chile", code: "CL" },
  { name: "China", code: "CN" },
  { name: "Colombia", code: "CO" },
  { name: "Comoros", code: "KM" },
  { name: "Congo", code: "CG" },
  { name: "Costa Rica", code: "CR" },
  { name: "Croatia", code: "HR" },
  { name: "Cuba", code: "CU" },
  { name: "Cyprus", code: "CY" },
  { name: "Czech Republic", code: "CZ" },
  { name: "Denmark", code: "DK" },
  { name: "Djibouti", code: "DJ" },
  { name: "Dominica", code: "DM" },
  { name: "Dominican Republic", code: "DO" },
  { name: "Ecuador", code: "EC" },
  { name: "Egypt", code: "EG" },
  { name: "El Salvador", code: "SV" },
  { name: "Equatorial Guinea", code: "GQ" },
  { name: "Eritrea", code: "ER" },
  { name: "Estonia", code: "EE" },
  { name: "Eswatini", code: "SZ" },
  { name: "Ethiopia", code: "ET" },
  { name: "Fiji", code: "FJ" },
  { name: "Finland", code: "FI" },
  { name: "France", code: "FR" },
  { name: "Gabon", code: "GA" },
  { name: "Gambia", code: "GM" },
  { name: "Georgia", code: "GE" },
  { name: "Germany", code: "DE" },
  { name: "Ghana", code: "GH" },
  { name: "Greece", code: "GR" },
  { name: "Grenada", code: "GD" },
  { name: "Guatemala", code: "GT" },
  { name: "Guinea", code: "GN" },
  { name: "Guinea-Bissau", code: "GW" },
  { name: "Guyana", code: "GY" },
  { name: "Haiti", code: "HT" },
  { name: "Honduras", code: "HN" },
  { name: "Hungary", code: "HU" },
  { name: "Iceland", code: "IS" },
  { name: "India", code: "IN" },
  { name: "Indonesia", code: "ID" },
  { name: "Iran", code: "IR" },
  { name: "Iraq", code: "IQ" },
  { name: "Ireland", code: "IE" },
  { name: "Israel", code: "IL" },
  { name: "Italy", code: "IT" },
  { name: "Ivory Coast", code: "CI" },
  { name: "Jamaica", code: "JM" },
  { name: "Japan", code: "JP" },
  { name: "Jordan", code: "JO" },
  { name: "Kazakhstan", code: "KZ" },
  { name: "Kenya", code: "KE" },
  { name: "Kiribati", code: "KI" },
  { name: "Kuwait", code: "KW" },
  { name: "Kyrgyzstan", code: "KG" },
  { name: "Laos", code: "LA" },
  { name: "Latvia", code: "LV" },
  { name: "Lebanon", code: "LB" },
  { name: "Lesotho", code: "LS" },
  { name: "Liberia", code: "LR" },
  { name: "Libya", code: "LY" },
  { name: "Liechtenstein", code: "LI" },
  { name: "Lithuania", code: "LT" },
  { name: "Luxembourg", code: "LU" },
  { name: "Madagascar", code: "MG" },
  { name: "Malawi", code: "MW" },
  { name: "Malaysia", code: "MY" },
  { name: "Maldives", code: "MV" },
  { name: "Mali", code: "ML" },
  { name: "Malta", code: "MT" },
  { name: "Marshall Islands", code: "MH" },
  { name: "Mauritania", code: "MR" },
  { name: "Mauritius", code: "MU" },
  { name: "Mexico", code: "MX" },
  { name: "Micronesia", code: "FM" },
  { name: "Moldova", code: "MD" },
  { name: "Monaco", code: "MC" },
  { name: "Mongolia", code: "MN" },
  { name: "Montenegro", code: "ME" },
  { name: "Morocco", code: "MA" },
  { name: "Mozambique", code: "MZ" },
  { name: "Myanmar", code: "MM" },
  { name: "Namibia", code: "NA" },
  { name: "Nauru", code: "NR" },
  { name: "Nepal", code: "NP" },
  { name: "Netherlands", code: "NL" },
  { name: "New Zealand", code: "NZ" },
  { name: "Nicaragua", code: "NI" },
  { name: "Niger", code: "NE" },
  { name: "Nigeria", code: "NG" },
  { name: "North Korea", code: "KP" },
  { name: "North Macedonia", code: "MK" },
  { name: "Norway", code: "NO" },
  { name: "Oman", code: "OM" },
  { name: "Pakistan", code: "PK" },
  { name: "Palau", code: "PW" },
  { name: "Panama", code: "PA" },
  { name: "Papua New Guinea", code: "PG" },
  { name: "Paraguay", code: "PY" },
  { name: "Peru", code: "PE" },
  { name: "Philippines", code: "PH" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "Qatar", code: "QA" },
  { name: "Romania", code: "RO" },
  { name: "Russia", code: "RU" },
  { name: "Rwanda", code: "RW" },
  { name: "Saint Kitts and Nevis", code: "KN" },
  { name: "Saint Lucia", code: "LC" },
  { name: "Saint Vincent and the Grenadines", code: "VC" },
  { name: "Samoa", code: "WS" },
  { name: "San Marino", code: "SM" },
  { name: "Sao Tome and Principe", code: "ST" },
  { name: "Saudi Arabia", code: "SA" },
  { name: "Senegal", code: "SN" },
  { name: "Serbia", code: "RS" },
  { name: "Seychelles", code: "SC" },
  { name: "Sierra Leone", code: "SL" },
  { name: "Singapore", code: "SG" },
  { name: "Slovakia", code: "SK" },
  { name: "Slovenia", code: "SI" },
  { name: "Solomon Islands", code: "SB" },
  { name: "Somalia", code: "SO" },
  { name: "South Africa", code: "ZA" },
  { name: "South Korea", code: "KR" },
  { name: "South Sudan", code: "SS" },
  { name: "Spain", code: "ES" },
  { name: "Sri Lanka", code: "LK" },
  { name: "Sudan", code: "SD" },
  { name: "Suriname", code: "SR" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Syria", code: "SY" },
  { name: "Taiwan", code: "TW" },
  { name: "Tajikistan", code: "TJ" },
  { name: "Tanzania", code: "TZ" },
  { name: "Thailand", code: "TH" },
  { name: "Timor-Leste", code: "TL" },
  { name: "Togo", code: "TG" },
  { name: "Tonga", code: "TO" },
  { name: "Trinidad and Tobago", code: "TT" },
  { name: "Tunisia", code: "TN" },
  { name: "Turkey", code: "TR" },
  { name: "Turkmenistan", code: "TM" },
  { name: "Tuvalu", code: "TV" },
  { name: "Uganda", code: "UG" },
  { name: "Ukraine", code: "UA" },
  { name: "United Arab Emirates", code: "AE" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "Uruguay", code: "UY" },
  { name: "Uzbekistan", code: "UZ" },
  { name: "Vanuatu", code: "VU" },
  { name: "Vatican City", code: "VA" },
  { name: "Venezuela", code: "VE" },
  { name: "Vietnam", code: "VN" },
  { name: "Yemen", code: "YE" },
  { name: "Zambia", code: "ZM" },
  { name: "Zimbabwe", code: "ZW" }
];

// Most commonly used countries for flag preloading
const POPULAR_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'BR', 'IN', 'CN', 'JP', 'KR', 'MX', 'RU', 'ZA'];

// Flag component with loading state and fallback
const FlagComponent = ({ isoCode, size = 24, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // Reset states when isoCode changes
    setIsLoading(true);
    setHasError(false);
    
    // Set a timeout to hide loading state after a reasonable delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [isoCode]);
  
  if (hasError) {
    // Fallback to text-based country indicator
    return (
      <View style={[styles.flagFallback, { width: size, height: size * 0.75 }, style]}>
        <Text style={[styles.flagFallbackText, { fontSize: size * 0.4 }]}>
          {isoCode}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={style}>
      {isLoading && (
        <View style={[styles.flagPlaceholder, { width: size, height: size * 0.75 }]} />
      )}
      <CountryFlag 
        isoCode={isoCode} 
        size={size}
        style={{ opacity: isLoading ? 0 : 1 }}
      />
    </View>
  );
};

export default function CountryScreen({ navigation, route }) {
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationUsed, setLocationUsed] = useState(false);
  const { updateProfile } = useAuth();
  const inputRef = useRef(null); // Add ref for text input
  const inputContainerRef = useRef(null); // Add ref for the input container
  const [inputLayout, setInputLayout] = useState({ height: 0, width: 0, x: 0, y: 0 });
  
  // Get userId and other params from route
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  const fromSignUp = route.params?.fromSignUp;
  
  // Log received parameters for debugging
  useEffect(() => {
    debugLog('CountryScreen - Received params:', route.params);
    if (userId) {
      debugLog('CountryScreen - Got userId:', userId);
    } else {
      console.warn('CountryScreen - No userId provided!');
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const locationButtonAnim = useRef(new Animated.Value(0)).current;
  const locationButtonScale = useRef(new Animated.Value(0.8)).current;
  const locationIconRotate = useRef(new Animated.Value(0)).current;
  const locationElementsOpacity = useRef(new Animated.Value(1)).current;
  const locationElementsHeight = useRef(new Animated.Value(1)).current;
  const inputSlideUp = useRef(new Animated.Value(0)).current;

  // Add isFocused hook
  const isFocused = useIsFocused();

  // Add state to track currently highlighted item
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);

  // Update progress tracking when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen name
      updateProgress('Country');
      console.log('[COUNTRY] Screen focused, updating progress to Country');
    }
  }, [isFocused, updateProgress]); // Keep dependencies minimal

  // Run entrance animations only when focused
  useEffect(() => {
    let timer;
    if (isFocused) {
      console.log('[COUNTRY] Running entrance animations');
      // Reset animations when the component focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(0);
      inputAnim.setValue(0);
      dropdownAnim.setValue(0);
      locationButtonAnim.setValue(0);
      locationButtonScale.setValue(0.8);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        const animationSequence = Animated.stagger(80, [
          // Fade in the entire view first
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          
          // Slide in the title from top - use opacity only, no translation
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
          
          // Animate location button
          Animated.parallel([
            Animated.timing(locationButtonAnim, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(locationButtonScale, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            })
          ])
        ]);
        
        animationSequence.start(() => {
          // Focus the input after animations complete
          if (inputRef.current) {
            inputRef.current.focus();
          }
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
      inputAnim.stopAnimation();
      dropdownAnim.stopAnimation();
      locationButtonAnim.stopAnimation();
      locationButtonScale.stopAnimation();
      locationIconRotate.stopAnimation();
    };
  }, [isFocused]); // Only re-run when focused state changes

  // Load existing country if available
  useEffect(() => {
    const loadUserCountry = async () => {
      try {
        // Get current user
        const user = supabase.auth.user();
        if (!user) return;

        // Try to fetch existing profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('country')
          .eq('id', user.id)
          .single();

        // If we have a country, set it in the state
        if (!error && profile && profile.country) {
          debugLog('Loaded existing country:', profile.country);
          setCountry(profile.country);
          
          // Find country code for the saved country
          const foundCountry = COUNTRIES.find(c => c.name === profile.country);
          if (foundCountry) {
            setCountryCode(foundCountry.code);
          }
        }
      } catch (err) {
        console.error('Error loading user country:', err);
      }
    };

    loadUserCountry();
  }, []);

  // Filter countries based on input
  useEffect(() => {
    if (country.length > 0) {
      // Check if user has manually selected a country (not just typed it)
      const isSelectionComplete = COUNTRIES.some(c => 
        c.name === country && c.code === countryCode
      );
      
      // If selection is complete, don't show dropdown
      if (isSelectionComplete) {
        setShowDropdown(false);
        return;
      }
      
      // Otherwise, filter countries and show dropdown
      const filtered = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(country.toLowerCase())
      ).slice(0, 10); // Limit to 10 results
      
      setFilteredCountries(filtered);
      setShowDropdown(filtered.length > 0);
      
      // If exact match exists, set the country code
      const exactMatch = filtered.find(c => 
        c.name.toLowerCase() === country.toLowerCase()
      );
      
      if (exactMatch) {
        setCountryCode(exactMatch.code);
      }
      
      // Animate dropdown
      Animated.timing(dropdownAnim, {
        toValue: filtered.length > 0 ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      setFilteredCountries([]);
      setShowDropdown(false);
      setCountryCode('');
      
      // Animate dropdown closed
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [country, countryCode]);

  // Modify animation for dropdown to make it more premium
  useEffect(() => {
    if (showDropdown) {
      // Reset any highlighted item when dropdown appears
      setHighlightedItemIndex(-1);
      
      // Premium dropdown animation - eases in
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // Fast fade out animation
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showDropdown]);

  const handleSelectCountry = (selectedCountry) => {
    // Flag to track that this is a manual selection
    const isManualSelection = true;
    
    // Update state with the selected country
    setCountryCode(selectedCountry.code);
    setCountry(selectedCountry.name);
    
    // Immediately hide dropdown
    setShowDropdown(false);
    
    // Dismiss keyboard
    Keyboard.dismiss();
  };

  // Custom handler for text input to differentiate between typing and selecting
  const handleCountryTextChange = (text) => {
    // Clear the country code if text was modified
    if (text !== country) {
      setCountryCode('');
    }
    
    setCountry(text);
    
    // If user clears the field after using location, show location button again
    if (text === '' && locationUsed) {
      setLocationUsed(false);
      
      // Reset animations for next use
      locationElementsOpacity.setValue(1);
      locationElementsHeight.setValue(1);
      inputSlideUp.setValue(0);
    }
  };

  // Handle location-based country detection
  const handleUseLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Animate the location icon
      Animated.loop(
        Animated.timing(locationIconRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to automatically detect your country.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
        locationIconRotate.stopAnimation();
        locationIconRotate.setValue(0);
        return;
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Reverse geocode to get country
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address && address.country) {
        // Find the country in our list
        const foundCountry = COUNTRIES.find(c => 
          c.name.toLowerCase() === address.country.toLowerCase() ||
          c.name.toLowerCase().includes(address.country.toLowerCase())
        );
        
        if (foundCountry) {
          // Stop the loading rotation
          locationIconRotate.stopAnimation();
          locationIconRotate.setValue(0);
          
          // Set the country data
          setCountry(foundCountry.name);
          setCountryCode(foundCountry.code);
          setShowDropdown(false);
          
          // Dismiss keyboard if open
          Keyboard.dismiss();
          
          // Create world-class animation sequence
          Animated.sequence([
            // Success feedback
            Animated.parallel([
              Animated.sequence([
                Animated.timing(locationButtonScale, {
                  toValue: 1.2,
                  duration: 250,
                  easing: Easing.out(Easing.back(1.5)),
                  useNativeDriver: true,
                }),
                Animated.timing(locationButtonScale, {
                  toValue: 1.05,
                  duration: 200,
                  easing: Easing.inOut(Easing.cubic),
                  useNativeDriver: true,
                })
              ])
            ]),
            
            // Hold success state
            Animated.delay(500),
            
            // Elegant exit
            Animated.parallel([
              Animated.timing(locationElementsOpacity, {
                toValue: 0,
                duration: 800,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                useNativeDriver: true,
              }),
              
              Animated.timing(locationElementsHeight, {
                toValue: 0.01,
                duration: 900,
                easing: Easing.bezier(0.4, 0.0, 0.6, 1),
                useNativeDriver: true,
              }),
              
              Animated.sequence([
                Animated.delay(150),
                Animated.timing(locationButtonScale, {
                  toValue: 0.8,
                  duration: 700,
                  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                  useNativeDriver: true,
                })
              ]),
              
              // Input slide starts in parallel but with gradual ease-in
              Animated.timing(inputSlideUp, {
                toValue: -5,
                duration: 100, // Even longer for ultra-smooth
                easing: Easing.bezier(0.0, 0.0, 0.1, 1), // Even gentler start
                useNativeDriver: true,
              })
            ])
          ]).start(() => {
            setLocationUsed(true);
            debugLog('Location-based country selection animation completed');
          });
          
          debugLog('Location detected country:', foundCountry.name);
        } else {
          Alert.alert(
            'Country Not Found',
            `We detected "${address.country}" but couldn't match it to our list. Please select manually.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Location Error',
          'Could not determine your country from your location. Please select manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your location. Please select your country manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocationLoading(false);
      locationIconRotate.stopAnimation();
      locationIconRotate.setValue(0);
    }
  };

  // Improve submit handling from input
  const handleInputSubmit = () => {
    if (filteredCountries.length > 0) {
      const bestMatch = filteredCountries[0];
      handleSelectCountry(bestMatch);
    }
  };

  const handleContinue = async () => {
    // Validate country
    if (!country) {
      Alert.alert('Please enter your country', 'Enter your country to continue.');
      return;
    }
    
    // Find the matching country object
    const selectedCountry = COUNTRIES.find(c => 
      c.name.toLowerCase() === country.toLowerCase() || 
      (countryCode && c.code === countryCode)
    );
    
    if (!selectedCountry) {
      Alert.alert('Invalid country', 'Please select a valid country from the dropdown.');
      return;
    }

    try {
      setLoading(true);
      
      // Save to AsyncStorage for future use
      await AsyncStorage.setItem('userCountry', selectedCountry.name);
      debugLog('Saved country to AsyncStorage:', selectedCountry.name);
      
      // Update database with country
      debugLog('Updating profile with country:', selectedCountry.name);
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
              country: selectedCountry.name,
              onboarding_complete: false
            });
            
          if (directError) {
            console.error('Error in direct update:', directError);
            error = directError;
          } else {
            debugLog('Country saved successfully via direct update');
          }
        } else {
          // Fallback to updateProfile
          debugLog('No userId available, using updateProfile method');
          const result = await updateProfile({
            country: selectedCountry.name,
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
        Alert.alert('Error', error.message || 'Could not save your country. Please try again.');
        setLoading(false);
        return;
      }
      
      // After database update is successful, handle UI transition
      debugLog('Profile updated, navigating to Username screen...');
      setLoading(false);
      
      // Completely fade out this screen before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      }).start(() => {
        // Navigate to the Username screen with all necessary data
        navigation.navigate('Username', { 
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
    console.log('CountryScreen: handleBack called, navigating to UserWeight screen');

    // Instead of animating, simply navigate and let the Navigator handle the transition
    // This prevents timing issues and double animations
    navigation.navigate('UserWeight', { 
      userId,
      email: userEmail,
      fromSignUp
    });
  };

  // Calculate progress percentage
  const progressPercentage = progress.current / progress.total;

  // Enhanced render item for dropdown with highlight effect
  const renderCountryItem = ({ item, index }) => (
    <Pressable
      style={({ pressed }) => [
        styles.dropdownItem,
        index === 0 && styles.dropdownItemFirst,
        index === filteredCountries.length - 1 && styles.dropdownItemLast,
        (pressed || index === highlightedItemIndex) && styles.dropdownItemHighlighted
      ]}
      onPress={() => handleSelectCountry(item)}
      onHoverIn={() => setHighlightedItemIndex(index)}
      onHoverOut={() => setHighlightedItemIndex(-1)}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
      key={item.code}
    >
      <View style={styles.countryFlagContainer}>
        <FlagComponent isoCode={item.code} size={24} />
      </View>
      <Text style={styles.dropdownItemText}>{item.name}</Text>
    </Pressable>
  );

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
                      outputRange: [0.95, 1],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            Where do you live?
          </Animated.Text>
          
          {/* Location Button */}
          {!locationUsed && (
            <Animated.View
              style={[
                styles.locationButtonContainer,
                {
                  opacity: Animated.multiply(locationButtonAnim, locationElementsOpacity),
                  transform: [
                    {
                      scale: Animated.multiply(locationButtonScale, 
                        locationElementsHeight.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        })
                      )
                    },
                    {
                      translateY: Animated.add(
                        locationButtonAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                        locationElementsHeight.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        })
                      )
                    }
                  ]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  locationLoading && styles.locationButtonLoading
                ]}
                onPress={handleUseLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: locationIconRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}
                >
                  <Ionicons 
                    name={locationLoading ? "navigate" : "location"} 
                    size={20} 
                    color={locationLoading ? colors.white : colors.primary} 
                  />
                </Animated.View>
                <Text style={[
                  styles.locationButtonText,
                  locationLoading && styles.locationButtonTextLoading
                ]}>
                  {locationLoading ? 'Detecting...' : 'Use my location'}
                </Text>
                {locationLoading && (
                  <ActivityIndicator 
                    size="small" 
                    color={colors.white} 
                    style={styles.locationLoader}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* OR Divider */}
          {!locationUsed && (
            <Animated.View 
              style={[
                styles.divider,
                {
                  opacity: Animated.multiply(
                    locationButtonAnim, 
                    locationElementsOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.8], // Slightly less opacity for divider
                    })
                  ),
                  transform: [
                    {
                      translateY: Animated.add(
                        locationButtonAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        }),
                        locationElementsHeight.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-5, 0],
                        })
                      )
                    },
                    {
                      scaleX: locationElementsHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </Animated.View>
          )}
          
          <Animated.View 
            style={{ 
              width: '100%', 
              opacity: Animated.add(
                fadeAnim,
                inputSlideUp.interpolate({
                  inputRange: [-1, 0],
                  outputRange: [0, 0],
                  extrapolate: 'clamp',
                })
              ),
              transform: [
                {
                  translateY: inputSlideUp
                },
                {
                  scale: inputSlideUp.interpolate({
                    inputRange: [-1, 0],
                    outputRange: [1.01, 1],
                    extrapolate: 'clamp',
                  })
                }
              ]
            }}
          >
            <View style={styles.formContainer}>
              <Animated.View 
                style={{ 
                  opacity: inputAnim
                }}
              >
                <View 
                  style={[
                    styles.inputContainer,
                    showDropdown && styles.inputContainerWithDropdown
                  ]}
                  ref={inputContainerRef}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    setInputLayout({ x, y, width, height });
                  }}
                >
                  {countryCode ? (
                    <View style={styles.selectedFlagContainer}>
                      <FlagComponent isoCode={countryCode} size={24} />
                    </View>
                  ) : (
                    <Ionicons name="earth-outline" size={24} color={colors.primary} style={styles.inputIcon} />
                  )}
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="Type your country..."
                    value={country}
                    onChangeText={handleCountryTextChange}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleInputSubmit}
                    autoFocus={true}
                  />
                  {country.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => {
                        setCountry('');
                        setCountryCode('');
                      }}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.gray} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {showDropdown && (
                  <Animated.View 
                    style={[
                      styles.dropdownContainer,
                      { 
                        opacity: dropdownAnim,
                        top: inputLayout.height,
                        width: inputLayout.width,
                        left: 0,
                        transform: [
                          { 
                            scale: dropdownAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.97, 1],
                              extrapolate: 'clamp'
                            })
                          },
                          {
                            translateY: dropdownAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-8, 0],
                              extrapolate: 'clamp'
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    <FlatList
                      data={filteredCountries}
                      renderItem={renderCountryItem}
                      keyExtractor={item => item.code}
                      keyboardShouldPersistTaps="always"
                      style={styles.dropdown}
                      contentContainerStyle={styles.dropdownContent}
                      showsVerticalScrollIndicator={false}
                      initialNumToRender={10}
                      bounces={false}
                    />
                  </Animated.View>
                )}
                
                <Text style={styles.helperText}>
                  Your location will allow you to represent your country in the GymVid Games!
                </Text>
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
            style={[styles.nextButton, !country && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !country}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.white} />
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
    paddingTop: 20, // Reduced from 40 to move content higher
    paddingBottom: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 15, // Reduced from 20 to tighten spacing
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
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    paddingHorizontal: 20,
    zIndex: 101, // Ensure input is above dropdown
  },
  inputIcon: {
    marginRight: 12,
  },
  selectedFlagContainer: {
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  countryFlagContainer: {
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: colors.darkGray,
  },
  clearButton: {
    padding: 8,
  },
  helperText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    position: 'absolute',
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderTopWidth: 0,
    overflow: 'hidden',
    // Add subtle backdrop blur effect on iOS for premium feel
    ...(Platform.OS === 'ios' ? {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
    } : {})
  },
  dropdown: {
    maxHeight: 250, // Reduced from 300 to fit better with keyboard
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  dropdownContent: {
    paddingVertical: 0,
  },
  dropdownItem: {
    padding: 16,
    paddingVertical: 14, // Slightly reduced default vertical padding for better proportions
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropdownItemFirst: {
    paddingTop: 20, // Adjusted from 22 for better balance
    marginTop: 6, // Slightly increased for more breathing room
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 20, // Matched with top padding for symmetry
    marginBottom: 6, // Added margin at bottom too for symmetry
  },
  dropdownItemHighlighted: {
    backgroundColor: 'rgba(0, 123, 255, 0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.darkGray,
    fontWeight: '500',
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
    // Premium glass effect
    backdropFilter: 'blur(10px)', // Will only work on iOS with newer versions
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
    shadowOpacity: 0.15, // Increased for more premium feel
    shadowRadius: 6, // Increased for softer shadow spread
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
  inputContainerWithDropdown: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)', // Match dropdown border color
    shadowOpacity: 0, // Remove shadow when dropdown is showing
  },
  locationButtonContainer: {
    marginTop: 5, // Reduced from 10
    marginBottom: 10, // Reduced from 20 since we now have the divider
    paddingHorizontal: 20,
    width: '100%',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F0F8FF', // Light blue background
    borderWidth: 1.5,
    borderColor: 'rgba(0, 123, 255, 0.2)',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  locationButtonLoading: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  locationButtonTextLoading: {
    color: colors.white,
  },
  locationLoader: {
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 8,
    paddingHorizontal: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE', // Lighter gray to match LoginScreen
    maxWidth: 80, // Limit line width for better aesthetics
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray,
    letterSpacing: -0.2,
  },
  flagPlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  flagFallback: {
    backgroundColor: '#E8F4FD',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#B8E6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagFallbackText: {
    color: '#0066CC',
    fontWeight: '600',
    textAlign: 'center',
  },
}); 