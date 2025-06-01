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
  Easing
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

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
  const [selectedPlan, setSelectedPlan] = useState('annual');
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
  const getUserFirstName = () => {
    // For now, return a default. In production, you'd get this from user profile
    return "Champion";
  };

  const firstName = getUserFirstName();

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
          <Text style={styles.headerTitle}>GymVid</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Unlock your full potential today, {firstName}!
          </Text>
          
          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {/* Annual Plan - Featured */}
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.featuredPlanCard,
                selectedPlan === 'annual' && styles.selectedPlanCard
              ]}
              onPress={() => handlePlanSelect('annual')}
              activeOpacity={0.8}
            >
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>3 months free</Text>
              </View>
              
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Annual Plan</Text>
                <Text style={styles.planPrice}>$8.33/mo</Text>
              </View>
              <Text style={styles.planBilling}>Billed annually</Text>
              <Text style={styles.planTotalPrice}>$99.99/yr</Text>
              
              <View style={styles.featuresContainer}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={styles.featureText}>Most popular choice</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={styles.featureText}>Unlimited AI form analysis</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={styles.featureText}>Advanced progress tracking</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.selectedPlanCard
              ]}
              onPress={() => handlePlanSelect('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Monthly Plan</Text>
                <Text style={styles.planPrice}>$12.99/mo</Text>
              </View>
              <Text style={styles.planBilling}>Billed monthly</Text>
              
              <Text style={styles.additionalNote}>
                + Premium workout templates
              </Text>
            </TouchableOpacity>

            {/* Free Trial */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'trial' && styles.selectedPlanCard
              ]}
              onPress={() => handlePlanSelect('trial')}
              activeOpacity={0.8}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>7 day Trial</Text>
                <Text style={styles.planPrice}>$0</Text>
              </View>
              <Text style={styles.planBilling}>
                $99.99 billed annually after trial ends
              </Text>
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
              {selectedPlan === 'annual' ? 'Continue with Annual Plan' : 
               selectedPlan === 'monthly' ? 'Continue with Monthly Plan' :
               'Start Free Trial'}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
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
    marginBottom: 40,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
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
  },
  freeBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
}); 