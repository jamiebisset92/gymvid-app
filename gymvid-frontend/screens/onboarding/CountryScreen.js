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
  Keyboard
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import CountryFlag from 'react-native-country-flag';

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

export default function CountryScreen({ navigation, route }) {
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const { progress, setProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;

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
      dropdownAnim.setValue(0);
      
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
        Alert.alert('Error', 'Failed to save your country. Please try again.');
        setLoading(false);
        return;
      }
      
      // After database update is successful, handle UI transition
      debugLog('Profile updated, navigating to Username screen...');
      setLoading(false);
      
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
        // Update progress for next screen
        setProgress({ ...progress, current: 6 });
        
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
      setProgress({ ...progress, current: 4 });
      // Navigate back to the BodyWeight screen
      navigation.goBack();
    });
  };

  // Calculate progress percentage
  const progressPercentage = progress.current / progress.total;

  // Render item for dropdown
  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => handleSelectCountry(item)}
      activeOpacity={0.6}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      key={item.code}
    >
      <View style={styles.countryFlagContainer}>
        <CountryFlag isoCode={item.code} size={24} />
      </View>
      <Text style={styles.dropdownItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

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
            Where do you live?
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
                <View 
                  style={styles.inputContainer}
                  ref={inputContainerRef}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    setInputLayout({ x, y, width, height });
                  }}
                >
                  {countryCode ? (
                    <View style={styles.selectedFlagContainer}>
                      <CountryFlag isoCode={countryCode} size={24} />
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
                        top: inputLayout.height + 38 // Position right after input container
                      }
                    ]}
                  >
                    <FlatList
                      data={filteredCountries}
                      renderItem={renderCountryItem}
                      keyExtractor={item => item.code}
                      keyboardShouldPersistTaps="always"
                      style={styles.dropdown}
                    />
                  </Animated.View>
                )}
                
                <Text style={styles.helperText}>
                  This allows you to find and connect with others in your area.
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
    marginTop: 12,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    marginTop: 0,
    borderRadius: 16,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  dropdown: {
    maxHeight: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.darkGray,
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