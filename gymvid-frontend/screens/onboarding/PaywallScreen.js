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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  const onboardingComplete = route.params?.onboardingComplete || false;
  
  debugLog('PaywallScreen params:', { exerciseLogged, videoLogged, userId, onboardingComplete });
  
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const isFocused = useIsFocused();
  const { updateProfile } = useAuth();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.8)).current;
  const heroRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const planScaleMonthly = useRef(new Animated.Value(1)).current;
  const planScaleYearly = useRef(new Animated.Value(1)).current;
  
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

  // Start pulse animation for CTA button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Start shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Run entrance animations
  useEffect(() => {
    const animationSequence = [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Hero animation with rotation
      Animated.parallel([
        Animated.spring(heroScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(heroRotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      
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
      ),
      
      // Checkmark animation
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 500,
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
      titleAnim.setValue(0);
      contentAnim.setValue(0);
      heroScaleAnim.setValue(0.8);
      heroRotateAnim.setValue(0);
      checkmarkScale.setValue(0);
      featureItemAnims.forEach(anim => anim.setValue(0));
      
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
    
    // Animate the selection
    if (plan === 'monthly') {
      Animated.parallel([
        Animated.spring(planScaleMonthly, {
          toValue: 1.05,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(planScaleYearly, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(planScaleYearly, {
          toValue: 1.05,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(planScaleMonthly, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

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
  const FeatureItem = ({ icon, title, description, anim, iconColor = colors.primary }) => (
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
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
                extrapolate: 'clamp'
              })
            }
          ]
        }
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Animated.View>
  );

  // Plan card component
  const PlanCard = ({ plan, price, period, savings, isSelected, scale }) => (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected
        ]}
        onPress={() => handlePlanSelect(plan)}
        activeOpacity={0.8}
      >
        {savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{savings}</Text>
          </View>
        )}
        <View style={styles.planHeader}>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && (
              <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </Animated.View>
            )}
          </View>
          <Text style={[styles.planTitle, isSelected && styles.planTitleSelected]}>
            {plan === 'monthly' ? 'Monthly' : 'Annual'}
          </Text>
        </View>
        <View style={styles.planPricing}>
          <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>{price}</Text>
          <Text style={[styles.planPeriod, isSelected && styles.planPeriodSelected]}>/{period}</Text>
        </View>
      </TouchableOpacity>
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
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FF', '#FFFFFF']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View 
            style={[
              styles.heroContainer,
              {
                transform: [
                  { scale: heroScaleAnim },
                  {
                    rotate: heroRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={[colors.primary, '#8B5CF6']}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={60} color={colors.white} />
            </LinearGradient>
          </Animated.View>
          
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
            Unlock Your Full Potential
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
            {videoLogged 
              ? `Great job analyzing your ${videoLogged.exercise || 'lift'}!` 
              : 'Join thousands of athletes improving their form with AI'}
          </Animated.Text>
          
          {/* Pricing Plans */}
          <Animated.View
            style={[
              styles.plansContainer,
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
            <PlanCard
              plan="monthly"
              price="$9.99"
              period="month"
              isSelected={selectedPlan === 'monthly'}
              scale={planScaleMonthly}
            />
            <PlanCard
              plan="yearly"
              price="$79.99"
              period="year"
              savings="Save 33%"
              isSelected={selectedPlan === 'yearly'}
              scale={planScaleYearly}
            />
          </Animated.View>
          
          {/* Features */}
          <View style={styles.featuresContainer}>
            <FeatureItem 
              icon="analytics"
              title="AI Form Analysis"
              description="Get instant feedback on your technique"
              anim={featureItemAnims[0]}
              iconColor="#6366F1"
            />
            
            <FeatureItem 
              icon="trending-up"
              title="Progress Tracking"
              description="Visualize your strength gains over time"
              anim={featureItemAnims[1]}
              iconColor="#10B981"
            />
            
            <FeatureItem 
              icon="videocam"
              title="Unlimited Videos"
              description="Analyze as many lifts as you want"
              anim={featureItemAnims[2]}
              iconColor="#F59E0B"
            />
            
            <FeatureItem 
              icon="shield-checkmark"
              title="Secure Cloud Backup"
              description="Never lose your workout history"
              anim={featureItemAnims[3]}
              iconColor="#3B82F6"
            />
          </View>
          
          {/* CTA Section */}
          <Animated.View
            style={[
              styles.ctaContainer,
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
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={styles.subscribeButton}
                onPress={handleSubscribe}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, '#8B5CF6']}
                  style={styles.subscribeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Animated.View
                    style={[
                      styles.shimmerOverlay,
                      {
                        transform: [
                          {
                            translateX: shimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
                            })
                          }
                        ]
                      }
                    ]}
                  />
                  <Text style={styles.subscribeButtonText}>
                    Start Free Trial
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity 
              style={styles.freeButton}
              onPress={handleContinueFree}
              activeOpacity={0.8}
            >
              <Text style={styles.freeButtonText}>Maybe later</Text>
            </TouchableOpacity>
            
            <Text style={styles.termsText}>
              7-day free trial • Cancel anytime
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
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  heroGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
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
    lineHeight: 22,
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
    marginBottom: 20,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    lineHeight: 20,
  },
  pricingContainer: {
    marginTop: 20,
  },
  subscribeButton: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  subscribeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  freeButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  freeButtonText: {
    color: colors.gray,
    fontSize: 16,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  plansContainer: {
    marginBottom: 30,
  },
  ctaContainer: {
    marginTop: 20,
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginLeft: 12,
  },
  planTitleSelected: {
    color: colors.darkGray,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 36,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.darkGray,
  },
  planPriceSelected: {
    color: colors.darkGray,
  },
  planPeriod: {
    fontSize: 16,
    color: colors.gray,
    marginLeft: 4,
  },
  planPeriodSelected: {
    color: colors.gray,
  },
}); 