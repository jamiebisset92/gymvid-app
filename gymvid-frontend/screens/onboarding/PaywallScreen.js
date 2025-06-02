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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleContinueFree}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Choose Your Plan
          </Text>
          
          {/* Sub-header */}
          <Text style={styles.subHeader}>
            Start your fitness journey with GymVid
          </Text>
          
          {/* Pricing Plans - Side by Side */}
          <View style={styles.plansRow}>
            {/* Gold Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'gold' && styles.selectedPlanCard
              ]}
              onPress={() => handlePlanSelect('gold')}
              activeOpacity={0.8}
            >
              <View style={styles.planContent}>
                <View style={styles.radioButton}>
                  <View style={[
                    styles.radioInner,
                    selectedPlan === 'gold' && styles.radioInnerSelected
                  ]} />
                </View>
                
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>Gold</Text>
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>$9.95</Text>
                    <Text style={styles.planPeriod}>/month</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Platinum Plan - Featured */}
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.featuredPlanCard,
                selectedPlan === 'platinum' && styles.selectedPlanCard
              ]}
              onPress={() => handlePlanSelect('platinum')}
              activeOpacity={0.8}
            >
              <View style={styles.mostPopularBadge}>
                <Text style={styles.mostPopularText}>MOST POPULAR</Text>
              </View>
              
              <View style={styles.planContent}>
                <View style={styles.radioButton}>
                  <View style={[
                    styles.radioInner,
                    selectedPlan === 'platinum' && styles.radioInnerSelected
                  ]} />
                </View>
                
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>Platinum</Text>
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>$24.95</Text>
                    <Text style={styles.planPeriod}>/month</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Feature Comparison Table */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresSectionTitle}>Compare Plans</Text>
            
            <View style={styles.featuresTable}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderFeatures}>Features</Text>
                <Text style={styles.tableHeaderPlan}>Gold</Text>
                <Text style={styles.tableHeaderPlan}>Platinum</Text>
              </View>
              
              {/* Feature Rows */}
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>Video Uploads</Text>
                <Text style={styles.featureValue}>50/month</Text>
                <Text style={[styles.featureValue, styles.unlimitedText]}>Unlimited</Text>
              </View>
              
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>AI Video Logging</Text>
                <Text style={styles.featureValue}>50/month</Text>
                <Text style={[styles.featureValue, styles.unlimitedText]}>Unlimited</Text>
              </View>
              
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>AI Coaching</Text>
                <Text style={styles.featureValueNo}>❌</Text>
                <Text style={[styles.featureValue, styles.unlimitedText]}>100/month</Text>
              </View>
              
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>Manual Logging</Text>
                <Text style={styles.featureValueYes}>✅</Text>
                <Text style={styles.featureValueYes}>✅</Text>
              </View>
              
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>GymVid Games</Text>
                <Text style={styles.featureValueYes}>✅</Text>
                <Text style={styles.featureValueYes}>✅</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007BFF', '#0056CC', '#003D99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaButtonText}>
                Start {selectedPlan === 'platinum' ? 'Platinum' : 'Gold'} Plan
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  animatedContainer: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 40,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featuredPlanCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  goldPlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedPlanCard: {
    borderColor: colors.primary,
    borderWidth: 3,
    elevation: 6,
    shadowOpacity: 0.2,
  },
  mostPopularBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    elevation: 5,
  },
  mostPopularText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planContent: {
    padding: 12,
    paddingTop: 20,
    alignItems: 'center',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  radioInnerSelected: {
    backgroundColor: colors.primary,
  },
  planInfo: {
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  planPricing: {
    alignItems: 'center',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  planPeriod: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  featuresSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresTable: {
    gap: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  tableHeaderFeatures: {
    flex: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'left',
  },
  tableHeaderPlan: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featureLabel: {
    flex: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'left',
  },
  featureValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  featureValueNo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  featureValueYes: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  unlimitedText: {
    color: colors.primary,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ctaButton: {
    borderRadius: 12,
    height: 50,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 