import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  Easing,
  Image
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[PAYWALL]', ...args);
  }
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PaywallScreen({ navigation, route }) {
  // Get exercise data from route params if available
  const exerciseLogged = route.params?.exerciseLogged;
  const videoLogged = route.params?.videoLogged;
  const userId = route.params?.userId;
  const continueOnboarding = route.params?.continueOnboarding || false;
  const fromVideoReview = route.params?.fromVideoReview || false;
  
  debugLog('PaywallScreen params:', { 
    exerciseLogged, 
    videoLogged, 
    userId, 
    continueOnboarding,
    fromVideoReview 
  });
  
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('platinum');
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const plan1Anim = useRef(new Animated.Value(0)).current;
  const plan2Anim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleSlideAnim = useRef(new Animated.Value(50)).current;
  const subtitleSlideAnim = useRef(new Animated.Value(30)).current;
  const plan1SlideAnim = useRef(new Animated.Value(40)).current;
  const plan2SlideAnim = useRef(new Animated.Value(40)).current;
  const footerSlideAnim = useRef(new Animated.Value(30)).current;

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
      debugLog('🎯 FINALIZING ONBOARDING - PaywallScreen completing onboarding flow');
      debugLog('PaywallScreen finalizeOnboarding called with flags:', { continueOnboarding, fromVideoReview });
      
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error('Cannot finalize onboarding: No user ID available');
        return;
      }
      
      debugLog('PaywallScreen marking onboarding complete for user:', currentUserId);
      
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
        debugLog('✅ PaywallScreen successfully marked onboarding as complete in Supabase');
      }
      
      // Also try with the updateProfile function from auth context
      try {
        await updateProfile({ onboarding_complete: true });
        debugLog('✅ PaywallScreen successfully marked onboarding as complete via updateProfile');
      } catch (err) {
        console.error('Error in updateProfile:', err);
      }
      
      // Force refresh auth session to ensure the new onboarding state is picked up
      try {
        await supabase.auth.refreshSession();
        debugLog('✅ PaywallScreen refreshed auth session');
      } catch (refreshErr) {
        console.error('Error refreshing auth session:', refreshErr);
      }
    } catch (err) {
      console.error('Error in PaywallScreen finalizeOnboarding:', err);
    }
  };

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Hide progress bar on paywall screen since it's the end of onboarding
      setProgress(prev => ({ 
        ...prev, 
        isOnboarding: false, 
        currentScreen: 'Paywall' 
      }));
    }
  }, [isFocused, setProgress]);

  // Run entrance animations
  useEffect(() => {
    const startAnimations = () => {
      // Reset all animations
      fadeAnim.setValue(0);
      logoAnim.setValue(0);
      logoScaleAnim.setValue(0.8);
      titleAnim.setValue(0);
      titleSlideAnim.setValue(50);
      subtitleAnim.setValue(0);
      subtitleSlideAnim.setValue(30);
      plan1Anim.setValue(0);
      plan1SlideAnim.setValue(40);
      plan2Anim.setValue(0);
      plan2SlideAnim.setValue(40);
      footerAnim.setValue(0);
      footerSlideAnim.setValue(30);

      // Create a beautiful staggered animation sequence
      const animationSequence = Animated.stagger(120, [
        // 1. Fade in the entire view first
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        
        // 2. Logo entrance with scale and fade
        Animated.parallel([
          Animated.timing(logoAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.spring(logoScaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          })
        ]),
        
        // 3. Title entrance with slide and fade
        Animated.parallel([
          Animated.timing(titleAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(titleSlideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        ]),
        
        // 4. Subtitle entrance
        Animated.parallel([
          Animated.timing(subtitleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(subtitleSlideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        ]),
        
        // 5. First plan card entrance
        Animated.parallel([
          Animated.timing(plan1Anim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(plan1SlideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        ]),
        
        // 6. Second plan card entrance
        Animated.parallel([
          Animated.timing(plan2Anim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(plan2SlideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        ]),
        
        // 7. Footer entrance
        Animated.parallel([
          Animated.timing(footerAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(footerSlideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        ])
      ]);
      
      // Start the animation sequence
      animationSequence.start();
    };
    
    // Start animations on mount
    startAnimations();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      startAnimations();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  // Handle plan selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  // Handle subscription button press
  const handleSubscribe = async () => {
    setLoading(true);
    
    // Only mark onboarding as complete if we're in the onboarding flow
    if (continueOnboarding || fromVideoReview) {
      await finalizeOnboarding();
    }
    
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
    // Only mark onboarding as complete if we're in the onboarding flow
    if (continueOnboarding || fromVideoReview) {
      await finalizeOnboarding();
    }
    
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }]
    });
  };

  // Get user's first name for personalization
  const getUserFirstName = async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        return "Champion"; // fallback
      }
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', currentUserId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching user name:', error);
        return "Champion"; // fallback
      }
      
      if (profile && profile.name) {
        // Return just the first name if multiple names provided
        return profile.name.split(' ')[0];
      }
      
      return "Champion"; // fallback
    } catch (err) {
      console.error('Error in getUserFirstName:', err);
      return "Champion"; // fallback
    }
  };

  const [firstName, setFirstName] = useState("Champion");
  
  // Load user's name when component mounts
  useEffect(() => {
    const loadUserName = async () => {
      const name = await getUserFirstName();
      setFirstName(name);
    };
    
    if (isFocused) {
      loadUserName();
    }
  }, [isFocused]);

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
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: logoAnim,
              transform: [{ scale: logoScaleAnim }]
            }
          ]}
        >
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <Animated.Text 
            style={[
              styles.mainTitle,
              {
                opacity: titleAnim,
                transform: [{ translateY: titleSlideAnim }]
              }
            ]}
          >
            Let's do this {firstName}!
          </Animated.Text>
          
          {/* Sub-header */}
          <Animated.Text 
            style={[
              styles.subHeader,
              {
                opacity: subtitleAnim,
                transform: [{ translateY: subtitleSlideAnim }]
              }
            ]}
          >
            Select your plan & get started now:
          </Animated.Text>
          
          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {/* Platinum Plan - Featured */}
            <Animated.View 
              style={[
                styles.planCardWrapper,
                {
                  opacity: plan1Anim,
                  transform: [{ translateY: plan1SlideAnim }]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'platinum' ? styles.featuredPlanCard : styles.unselectedFeaturedCard,
                  selectedPlan === 'platinum' && styles.selectedPlanCard
                ]}
                onPress={() => handlePlanSelect('platinum')}
                activeOpacity={0.8}
              >
                {selectedPlan === 'platinum' ? (
                  <LinearGradient
                    colors={['#ffffff', '#f8fafc', '#f1f5f9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.selectedCardGradient}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.leftColumn}>
                        <Text style={styles.planTitle}>Enhanced</Text>
                        <Text style={styles.planSubtitle}>AI Powered Experience</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>$24.95</Text>
                        <Text style={styles.perMonthText}>per month</Text>
                      </View>
                    </View>
                    
                    {selectedPlan === 'platinum' && (
                      <View style={styles.featuresContainer}>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>AI Coaching</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>AI Video Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Unlimited Video Storage</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Manual Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Custom Exercises</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>The GymVid Games</Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.cardContent}>
                    <View style={styles.planHeader}>
                      <View style={styles.leftColumn}>
                        <Text style={styles.planTitle}>Enhanced</Text>
                        <Text style={styles.planSubtitle}>AI Powered Experience</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>$24.95</Text>
                        <Text style={styles.perMonthText}>per month</Text>
                      </View>
                    </View>
                    
                    {selectedPlan === 'platinum' && (
                      <View style={styles.featuresContainer}>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>AI Coaching</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>AI Video Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Unlimited Video Storage</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Manual Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Custom Exercises</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>The GymVid Games</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Badge positioned outside the card */}
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Most Popular</Text>
              </View>
            </Animated.View>

            {/* Pro Plan */}
            <Animated.View
              style={[
                {
                  opacity: plan2Anim,
                  transform: [{ translateY: plan2SlideAnim }]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'pro' && styles.selectedPlanCard
                ]}
                onPress={() => handlePlanSelect('pro')}
                activeOpacity={0.8}
              >
                {selectedPlan === 'pro' ? (
                  <LinearGradient
                    colors={['#ffffff', '#f8fafc', '#f1f5f9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.selectedCardGradient}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.leftColumn}>
                        <Text style={styles.planTitle}>Standard</Text>
                        <Text style={styles.planSubtitle}>Manual Powered Experience</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>$9.95</Text>
                        <Text style={styles.perMonthText}>per month</Text>
                      </View>
                    </View>
                    
                    {selectedPlan === 'pro' && (
                      <View style={styles.featuresContainer}>
                        <View style={styles.featureRow}>
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                          <Text style={[styles.featureText, styles.excludedFeatureText]}>AI Coaching</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                          <Text style={[styles.featureText, styles.excludedFeatureText]}>AI Video Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Unlimited Video Storage</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Manual Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Custom Exercises</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>The GymVid Games</Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.cardContent}>
                    <View style={styles.planHeader}>
                      <View style={styles.leftColumn}>
                        <Text style={styles.planTitle}>Standard</Text>
                        <Text style={styles.planSubtitle}>Manual Powered Experience</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>$9.95</Text>
                        <Text style={styles.perMonthText}>per month</Text>
                      </View>
                    </View>
                    
                    {selectedPlan === 'pro' && (
                      <View style={styles.featuresContainer}>
                        <View style={styles.featureRow}>
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                          <Text style={[styles.featureText, styles.excludedFeatureText]}>AI Coaching</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                          <Text style={[styles.featureText, styles.excludedFeatureText]}>AI Video Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Unlimited Video Storage</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Manual Logging</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>Custom Exercises</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>The GymVid Games</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Bottom Section - Positioned absolutely at bottom */}
        <Animated.View 
          style={[
            styles.bottomSection,
            {
              opacity: footerAnim,
              transform: [{ translateY: footerSlideAnim }]
            }
          ]}
        >
          {/* CTA Button */}
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {selectedPlan === 'platinum' ? 'Continue with Enhanced Plan' : 
               'Continue with Standard Plan'}
            </Text>
          </TouchableOpacity>
          
          {/* Footer Links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleContinueFree}>
              <Text style={styles.footerLinkText}>Maybe later</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>or</Text>
            <TouchableOpacity>
              <Text style={styles.footerLinkText}>Restore purchase</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeContainer: {
    flex: 1,
    position: 'relative',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 60,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 180, // Make room for fixed footer
    backgroundColor: colors.background,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  featuredPlanCard: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  selectedPlanCard: {
    borderColor: colors.primary,
    borderWidth: 3,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  freeBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 15,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingTop: 8,
  },
  leftColumn: {
    flexDirection: 'column',
  },
  planTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  planSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  perMonthText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  featuresContainer: {
    gap: 8,
    marginTop: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  excludedFeatureText: {
    color: '#9CA3AF',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  footerSeparator: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedCardGradient: {
    flex: 1,
    borderRadius: 14,
    padding: 20,
    paddingTop: 16,
  },
  cardContent: {
    padding: 20,
    paddingTop: 16,
  },
  planCardWrapper: {
    position: 'relative',
  },
  unselectedFeaturedCard: {
    borderColor: '#E5E7EB',
    shadowColor: '#E5E7EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
}); 