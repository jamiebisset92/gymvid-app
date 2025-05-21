import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from AsyncStorage
        const [country, gender, ageCategory, weightClass] = await Promise.all([
          AsyncStorage.getItem('userCountry'),
          AsyncStorage.getItem('userGender'),
          AsyncStorage.getItem('userAgeCategory'),
          AsyncStorage.getItem('userWeightClass')
        ]);
        
        // Update state with the fetched data
        setUserData({
          country: country || '🌍 Unknown',
          gender: gender || 'Not specified',
          ageCategory: ageCategory || 'Open',
          weightClass: weightClass || 'Open'
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading user data:', err);
        setLoading(false);
        
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
  }, []);

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
      
      // Staggered fade in for profile items
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

  // Create an animated profile item component
  const ProfileItem = ({ label, value, icon, animValue }) => (
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
        <Text style={styles.profileItemLabel}>{label}</Text>
        <Text style={styles.profileItemValue}>
          {icon && icon} {value}
        </Text>
      </View>
    </Animated.View>
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
        {/* Header spacer */}
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
                <Text style={styles.loadingText}>Loading your profile...</Text>
              </View>
            ) : (
              <View style={styles.profileContainer}>
                <ProfileItem 
                  label="Team" 
                  value={userData.country}
                  icon=""
                  animValue={countryAnim}
                />
                
                <ProfileItem 
                  label="Gender" 
                  value={userData.gender}
                  icon=""
                  animValue={genderAnim}
                />
                
                <ProfileItem 
                  label="Age Class" 
                  value={userData.ageCategory}
                  icon=""
                  animValue={ageAnim}
                />
                
                <ProfileItem 
                  label="Weight Class" 
                  value={userData.weightClass}
                  icon=""
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
  },
  profileContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  profileItem: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
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
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray,
  },
  profileItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
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
}); 