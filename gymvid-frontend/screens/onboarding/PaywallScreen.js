import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Dimensions,
  ScrollView
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
    console.log('[PAYWALL]', ...args);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaywallScreen({ navigation, route }) {
  // Get exercise data from route params if available
  const exerciseLogged = route.params?.exerciseLogged;
  const videoLogged = route.params?.videoLogged;
  const userId = route.params?.userId;
  const onboardingComplete = route.params?.onboardingComplete || false;
  
  debugLog('PaywallScreen params:', { exerciseLogged, videoLogged, userId, onboardingComplete });
  
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const featureItemAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current
  ];

  // Function to get current user ID
  const getCurrentUserId = async () => {
    try {
      // If we have it from route params, use that
      if (userId) {
        return userId;
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
    } catch (err) {
      console.error('Error in getCurrentUserId:', err);
      return null;
    }
  };

  // Function to ensure onboarding is marked as complete
  const finalizeOnboarding = async () => {
    try {
      // This is a final safety check to make sure onboarding is marked complete
      // before going to the main app
      debugLog('Performing final check to ensure onboarding is marked complete');
      
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error('Cannot finalize onboarding: No user ID available');
        return;
      }
      
      // Set flag in AsyncStorage
      await AsyncStorage.setItem('onboardingComplete', 'true');
      await AsyncStorage.removeItem('onboardingInProgress');
      
      // Update Supabase as final step
      const { error } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', currentUserId);
        
      if (error) {
        console.error('Error marking onboarding as complete in Supabase:', error);
      } else {
        debugLog('Successfully marked onboarding as complete in Supabase');
      }
      
      // Also try with the updateProfile function from auth context
      try {
        await updateProfile({ onboarding_complete: true });
        debugLog('Successfully marked onboarding as complete via updateProfile');
      } catch (err) {
        console.error('Error in updateProfile:', err);
      }
      
      // Force refresh auth session to ensure the new onboarding state is picked up
      try {
        await supabase.auth.refreshSession();
        debugLog('Refreshed auth session');
      } catch (refreshErr) {
        console.error('Error refreshing auth session:', refreshErr);
      }
    } catch (err) {
      console.error('Error in finalizeOnboarding:', err);
    }
  };

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('Paywall');
    }
  }, [isFocused, updateProgress]);

  // Run entrance animations
  useEffect(() => {
    const animationSequence = [
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
      
      // Fade in content
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      
      // Staggered feature items
      ...featureItemAnims.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: 100 + (index * 100),
          useNativeDriver: true,
        })
      )
    ];
    
    // Start the animation sequence
    Animated.parallel(animationSequence).start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(0);
      contentAnim.setValue(0);
      featureItemAnims.forEach(anim => anim.setValue(0));
      
      // Restart the animation sequence
      Animated.parallel(animationSequence).start();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  // Handle subscription button press
  const handleSubscribe = async () => {
    setLoading(true);
    
    // Make sure onboarding is marked as complete before proceeding
    await finalizeOnboarding();
    
    // Simulate subscription process
    setTimeout(() => {
      setLoading(false);
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }]
      });
    }, 1000);
  };
  
  // Handle continue with free version
  const handleContinueFree = async () => {
    // Make sure onboarding is marked as complete before proceeding
    await finalizeOnboarding();
    
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }]
    });
  };

  // Feature item component with animation
  const FeatureItem = ({ icon, title, description, anim }) => (
    <Animated.View 
      style={[
        styles.featureItem,
        {
          opacity: anim,
          transform: [
            { 
              translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
                extrapolate: 'clamp'
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color="#FFF" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
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
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text
            style={[
              styles.titleText,
              { 
                opacity: titleAnim,
                transform: [
                  { 
                    scale: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            Unlock the full GymVid experience
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
                      outputRange: [10, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ] 
              }
            ]}
          >
            {exerciseLogged 
              ? `Great job logging your ${exerciseLogged.exercise}!` 
              : videoLogged 
                ? `Great job analyzing your lift!`
                : 'Take your training to the next level'}
          </Animated.Text>
          
          <Animated.View
            style={[
              styles.illustrationContainer,
              {
                opacity: contentAnim,
                transform: [
                  {
                    translateY: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }
            ]}
          >
            <Ionicons name="trophy" size={100} color={colors.primary} />
          </Animated.View>
          
          <View style={styles.featuresContainer}>
            <FeatureItem 
              icon="analytics"
              title="Advanced Analytics"
              description="Track your progress with detailed charts and insights"
              anim={featureItemAnims[0]}
            />
            
            <FeatureItem 
              icon="videocam"
              title="Unlimited Video Analysis"
              description="Get AI feedback on all your lifts"
              anim={featureItemAnims[1]}
            />
            
            <FeatureItem 
              icon="fitness"
              title="Personalized Programs"
              description="Custom workout plans tailored to your goals"
              anim={featureItemAnims[2]}
            />
            
            <FeatureItem 
              icon="cloud-upload"
              title="Cloud Storage"
              description="Save all your workouts and videos securely"
              anim={featureItemAnims[3]}
            />
          </View>
          
          <Animated.View
            style={[
              styles.pricingContainer,
              {
                opacity: contentAnim,
                transform: [
                  {
                    translateY: contentAnim.interpolate({
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
              style={styles.subscribeButton}
              onPress={handleSubscribe}
              activeOpacity={0.8}
            >
              <Text style={styles.subscribeButtonText}>Go Pro • $9.99/month</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.freeButton}
              onPress={handleContinueFree}
              activeOpacity={0.8}
            >
              <Text style={styles.freeButtonText}>Continue with free version</Text>
            </TouchableOpacity>
            
            <Text style={styles.termsText}>
              Subscription renews automatically. Cancel anytime.
            </Text>
          </Animated.View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 30,
    textAlign: 'center',
    color: colors.gray,
    width: '100%',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.gray,
  },
  pricingContainer: {
    marginTop: 20,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  freeButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  freeButtonText: {
    color: colors.darkGray,
    fontSize: 16,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
}); 