import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, Keyboard } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import { Animated } from 'react-native';
import { runWorldClassEntranceAnimation, ANIMATION_CONFIG } from '../../utils/animationUtils';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function NameScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const { updateProfile, loading } = useAuth();
  
  // Get the userId and email passed from SignUpScreen
  const userId = route.params?.userId;
  const userEmail = route.params?.email;
  
  // Log parameters immediately when component mounts
  useEffect(() => {
    console.log('NameScreen mounted with route params:', route.params);
    
    if (userId) {
      console.log('NameScreen received userId:', userId);
    } else {
      console.error('NO USER ID PROVIDED TO NAMESCREEEN');
      
      // Show alert for debugging
      Alert.alert(
        'Debug Info',
        'No userId provided to NameScreen. Route params: ' + JSON.stringify(route.params),
        [{ text: 'OK' }]
      );
    }
  }, []);
  
  // Log parameters whenever they change 
  useEffect(() => {
    console.log('NameScreen - Route params changed:', route.params);
    if (userId !== route.params?.userId) {
      console.log('userId changed from', userId, 'to', route.params?.userId);
    }
  }, [route.params]);
  
  // Get progress context
  const { progress, setProgress } = useContext(ProgressContext);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(20)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  
  const isFocused = useIsFocused();
  const inputRef = useRef(null);

  // Run entrance animation only after navigator transition is complete
  useEffect(() => {
    let timer;
    if (isFocused) {
      // Reset all animations immediately when the component mounts/focuses
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(20);
      inputAnim.setValue(0);
      
      // Wait for the navigator transition to be fully complete
      timer = setTimeout(() => {
        // Use the world-class animation utility for consistent, premium feel
        runWorldClassEntranceAnimation({
          fadeAnim,
          titleAnim,
          slideAnim,
          elementsAnim: [inputAnim]
        });
        
        // Focus the input after animations
        if (inputRef.current) {
          inputRef.current.focus();
        }
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
    };
  }, [isFocused]);
  
  // Load existing name when the screen is focused
  useEffect(() => {
    const loadUserName = async () => {
      try {
        // First try to get user from route params (from signup flow)
        let userIdToUse = userId;
        
        // If not available, try to get from auth
        if (!userIdToUse) {
          const user = supabase.auth.user();
          if (user) {
            userIdToUse = user.id;
          }
        }
        
        if (!userIdToUse) {
          console.error('No user ID available for fetching profile');
          return;
        }

        debugLog('Loading profile data for user ID:', userIdToUse);

        // Try to fetch existing profile using available ID
        const { data: profile, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', userIdToUse)
          .single();

        // If we have name data, set it in the state
        if (!error && profile && profile.name) {
          debugLog('Loaded existing name:', profile.name);
          setName(profile.name);
        } else if (error) {
          debugLog('Error loading profile:', error);
        }
      } catch (err) {
        console.error('Error loading user name:', err);
      }
    };

    loadUserName();
  }, [userId]);

  const handleNameChange = (text) => {
    setName(text);
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    // Close keyboard if open
    Keyboard.dismiss();
    
    // Update database first - before any animations
    debugLog('Updating user profile with name:', name);
    debugLog('Using userId:', userId);
    
    let error = null;
    try {
      // Always try direct database update first if we have userId
      if (userId) {
        debugLog('Using direct database update with userId:', userId);
        const { error: directError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            name: name.trim(),
            email: userEmail,
            onboarding_complete: false
          });
          
        if (directError) {
          console.error('Error in direct update:', directError);
          error = directError;
        } else {
          debugLog('Name saved successfully via direct update');
        }
      } else {
        // Fallback to updateProfile if we don't have userId
        debugLog('No userId available, trying updateProfile method');
        const result = await updateProfile({
          name: name.trim(),
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
      Alert.alert('Error', error.message || 'Could not save your name. Please try again.');
      return;
    }
    
    // Update progress for next screen
    setProgress({ ...progress, current: 1 });
    
    // Completely fade out this screen before navigation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
      easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
      useNativeDriver: true
    }).start(() => {
      // Only navigate after animation is complete and screen is no longer visible
      debugLog('Profile updated, navigating to Gender screen with userId:', userId);
      
      // Pass all relevant data to the next screen
      navigation.navigate('Gender', { 
        userId,
        email: userEmail,
        fromSignUp: route.params?.fromSignUp
      });
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
          backgroundColor: '#FFFFFF' 
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Progress bar - remains static during transitions */}
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
            What's your name?
          </Animated.Text>
          <Animated.View 
            style={{ 
              width: '100%', 
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim
            }}
          >
            <View style={styles.formContainer}>
              <Animated.View 
                style={{ 
                  opacity: inputAnim
                }}
              >
                <View style={styles.nameInputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={inputRef}
                      style={styles.nameInput}
                      value={name}
                      onChangeText={handleNameChange}
                      placeholder="Enter your name"
                      placeholderTextColor="#AAAAAA"
                      autoCapitalize="words"
                      autoCorrect={false}
                      textAlign="center"
                      returnKeyType="done"
                      onSubmitEditing={handleContinue}
                    />
                    <TouchableOpacity 
                      style={styles.nextButton}
                      onPress={handleContinue}
                      disabled={loading || !name.trim()}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name="arrow-forward" 
                        size={24} 
                        color={!name.trim() ? colors.lightGray : colors.primary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.nameHelper}>
                  This is how we'll address you in the app
                </Text>
              </Animated.View>
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
    backgroundColor: '#FFFFFF',
    position: 'absolute',
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
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
  },
  nameInputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 70,
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.darkGray,
    flex: 1,
    marginHorizontal: 24, // Add padding on both sides to account for button width
  },
  nameHelper: {
    marginTop: 15,
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  nextButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
}); 