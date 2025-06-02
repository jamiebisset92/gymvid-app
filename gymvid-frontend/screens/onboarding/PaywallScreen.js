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
    const animationSequence = [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
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
    ];
    
    // Start the animation sequence
    Animated.parallel(animationSequence).start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      
      // Restart the animation sequence
      Animated.parallel(animationSequence).start();
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
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Let's do this {firstName}!
          </Text>
          
          {/* Sub-header */}
          <Text style={styles.subHeader}>
            Select your plan & get started now!
          </Text>
          
          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {/* Platinum Plan - Featured */}
            <View style={styles.planCardWrapper}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  styles.featuredPlanCard,
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
                      <Text style={styles.planTitle}>Platinum</Text>
                      <Text style={styles.planPrice}>$24.95</Text>
                    </View>
                    <Text style={styles.planBilling}>Billed Monthly</Text>
                    
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
                      <Text style={styles.planTitle}>Platinum</Text>
                      <Text style={styles.planPrice}>$24.95</Text>
                    </View>
                    <Text style={styles.planBilling}>Billed Monthly</Text>
                    
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
            </View>

            {/* Pro Plan */}
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
                    <Text style={styles.planTitle}>Pro</Text>
                    <Text style={styles.planPrice}>$9.95</Text>
                  </View>
                  <Text style={styles.planBilling}>Billed Monthly</Text>
                  
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
                    <Text style={styles.planTitle}>Pro</Text>
                    <Text style={styles.planPrice}>$9.95</Text>
                  </View>
                  <Text style={styles.planBilling}>Billed Monthly</Text>
                  
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
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* CTA Button */}
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {selectedPlan === 'platinum' ? 'Continue with Platinum Plan' : 
               'Continue with Pro Plan'}
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
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeContainer: {
    flex: 1,
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
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  planBilling: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  planTotalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  additionalNote: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  featuresContainer: {
    gap: 8,
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
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    paddingTop: 28,
  },
  cardContent: {
    padding: 20,
    paddingTop: 28,
  },
  planCardWrapper: {
    position: 'relative',
  },
}); 