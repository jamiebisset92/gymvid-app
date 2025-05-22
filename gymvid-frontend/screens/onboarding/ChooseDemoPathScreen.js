import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Image
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[CHOOSE-DEMO]', ...args);
  }
};

export default function ChooseDemoPathScreen({ navigation, route }) {
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get user ID from route params
  const [userId, setUserId] = useState(route.params?.userId);
  const continueOnboarding = route.params?.continueOnboarding === true;
  const forceFlow = route.params?.forceFlow === true;
  
  debugLog('ChooseDemoPathScreen params:', { userId, continueOnboarding, forceFlow });
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  // Function to get current user ID
  const getCurrentUserId = async () => {
    try {
      // If we already have it from route params, use that
      if (userId) {
        return userId;
      }

      // Try to get user from route params
      if (route.params?.userId) {
        const id = route.params.userId;
        setUserId(id);
        return id;
      }
      
      // Try to get user from Supabase auth
      try {
        const user = supabase.auth.user();
        if (user && user.id) {
          debugLog('Using userId from Supabase auth:', user.id);
          setUserId(user.id);
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
          setUserId(session.user.id);
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
          setUserId(storedUserId);
          return storedUserId;
        }
      } catch (err) {
        console.error('Error getting userId from AsyncStorage:', err);
      }
      
      return null;
    } catch (err) {
      console.error('Error in getCurrentUserId:', err);
      return null;
    }
  };

  // Get user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      await getCurrentUserId();
    };
    
    fetchUserId();
  }, []);

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('ChooseDemoPath');
    }
  }, [isFocused, updateProgress]);

  // CRITICAL: Force onboarding to be incomplete when this screen loads
  useEffect(() => {
    if (isFocused) {
      const forceOnboardingIncomplete = async () => {
        try {
          const currentUserId = await getCurrentUserId();
          if (currentUserId) {
            // Force-update onboarding_complete to false
            await supabase
              .from('users')
              .update({ onboarding_complete: false })
              .eq('id', currentUserId);
            
            debugLog('Force-set onboarding_complete=false in ChooseDemoPathScreen');
            
            // Also clear any local completion flags
            await AsyncStorage.setItem('onboardingInProgress', 'true');
            await AsyncStorage.removeItem('onboardingComplete');
          }
        } catch (error) {
          console.error('Error in forceOnboardingIncomplete:', error);
        }
      };
      
      forceOnboardingIncomplete();
    }
  }, [isFocused]);

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
      
      // Fade in buttons
      Animated.timing(buttonsAnim, {
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
      buttonsAnim.setValue(0);
      
      // Restart the animation sequence
      animationSequence.start();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  // Handler for sample video button
  const handleShowSampleVideo = async () => {
    const currentUserId = await getCurrentUserId();
    
    // Force onboarding to be incomplete
    if (currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', currentUserId);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
    
    navigation.navigate('DemoVideo', {
      userId: currentUserId,
      continueOnboarding: true,
      forceFlow: true
    });
  };
  
  // Handler for manual log button
  const handleManualLog = async () => {
    const currentUserId = await getCurrentUserId();
    
    // Force onboarding to be incomplete
    if (currentUserId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', currentUserId);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
    
    navigation.navigate('ManualDemo', {
      userId: currentUserId,
      continueOnboarding: true,
      forceFlow: true
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
        {/* Header spacer */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
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
            No problem! How would you like to see how GymVid works?
          </Animated.Text>
          
          <Animated.View 
            style={[
              styles.buttonsContainer, 
              { 
                opacity: buttonsAnim,
                transform: [
                  { 
                    translateY: buttonsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleShowSampleVideo}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle" size={24} color={colors.white} style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Show me a sample video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleManualLog}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={24} color={colors.darkGray} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Log a set manually</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.illustrationContainer}>
            <Ionicons name="barbell-outline" size={100} color={colors.primary} style={styles.illustration} />
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
    lineHeight: 36,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  secondaryButtonText: {
    color: colors.darkGray,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
  },
  illustrationContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  illustration: {
    marginVertical: 20,
  },
}); 