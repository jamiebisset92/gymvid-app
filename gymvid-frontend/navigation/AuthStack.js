import React, { useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Easing, Platform, View, Text } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import NameScreen from '../screens/onboarding/NameScreen';
import GenderScreen from '../screens/onboarding/GenderScreen';
import DateOfBirthScreen from '../screens/onboarding/DateOfBirthScreen';
import WeightPreferenceScreen from '../screens/onboarding/WeightPreferenceScreen';
import BodyWeightScreen from '../screens/onboarding/BodyWeightScreen';
import CountryScreen from '../screens/onboarding/CountryScreen';
import UsernameScreen from '../screens/onboarding/UsernameScreen';
import OnboardingSummaryScreen from '../screens/onboarding/OnboardingSummaryScreen';
import VideoPromptScreen from '../screens/onboarding/VideoPromptScreen';
import ChooseDemoPathScreen from '../screens/onboarding/ChooseDemoPathScreen';
import DemoVideoScreen from '../screens/onboarding/DemoVideoScreen';
import ManualDemoScreen from '../screens/onboarding/ManualDemoScreen';
import VideoReviewScreen from '../screens/onboarding/VideoReviewScreen';
import PaywallScreen from '../screens/onboarding/PaywallScreen';
import { supabase } from '../config/supabase';
import colors from '../config/colors';
import { SCREEN_TRANSITION_SPECS } from '../utils/animationUtils';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import OnboardingProgressBar from '../components/OnboardingProgressBar';
import { useNavigation } from '@react-navigation/native';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[AUTH]', ...args);
  }
};

const Stack = createNativeStackNavigator();

// Define onboarding steps for consistent progress tracking
const ONBOARDING_SCREENS = {
  Name: 0,
  Gender: 1,
  DateOfBirth: 2,
  WeightPreference: 3,
  BodyWeight: 4,
  Country: 5,
  Username: 6,
  OnboardingSummary: 7,
  VideoPrompt: 8,
  ChooseDemoPath: 9,
  DemoVideo: 10,
  ManualDemo: 10, // Same level as DemoVideo (alternative paths)
  VideoReview: 11,
  Paywall: 12
};

const TOTAL_ONBOARDING_STEPS = Object.keys(ONBOARDING_SCREENS).length - 5; // Subtract the extended flow screens from total

// Premium stack navigator configuration to prevent screen overlapping
const screenOptions = {
  headerShown: false,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  contentStyle: { backgroundColor: '#FFFFFF' },
  
  // Use card presentation instead of transparentModal to avoid overlapping
  presentation: 'card',
  
  // Use slide animation instead of fade to prevent both screens being visible simultaneously
  animation: 'slide_from_right',
  
  // Optimized animation duration 
  animationDuration: 250,
  
  // Enable detaching inactive screens to prevent overlapping
  detachInactiveScreens: true,
  
  // Disable gestures during transitions to prevent issues
  gestureEnabled: Platform.OS === 'ios',
  
  // Improved transition specifications with proper easing and timing
  transitionSpec: {
    open: SCREEN_TRANSITION_SPECS.open,
    close: SCREEN_TRANSITION_SPECS.close,
  },
  
  // Card style with solid background color to prevent transparency issues
  cardStyle: {
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
  
  // Optimize animation performance
  animationTypeForReplace: 'push',
  
  // Custom card style interpolator to handle different transition directions
  cardStyleInterpolator: ({ current, next, layouts, invert }) => {
    // Check if this is a back navigation (detected by the invert flag)
    const isBackNavigation = !!invert;
    
    // Different animation based on direction
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              // When going back, slide from left to right, otherwise right to left
              outputRange: isBackNavigation ? 
                [-layouts.screen.width * 0.3, 0] : 
                [layouts.screen.width, 0],
            }),
          },
          // Very subtle scale effect for depth
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.98, 1],
              extrapolate: 'clamp',
            }),
          }
        ],
        // Ensure opaque background to prevent content from showing through
        backgroundColor: '#FFFFFF',
        // Add subtle opacity transition for smoother feel
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
          extrapolate: 'clamp',
        }),
      },
      // For the next screen during back navigation
      ...(next && isBackNavigation
        ? {
            containerStyle: {
              transform: [
                {
                  translateX: next.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, layouts.screen.width], // Slide out to the right
                  }),
                },
              ],
            },
          }
        : {}),
      // Remove the overlay shadow completely
      overlayStyle: {
        opacity: 0,
      },
    };
  },
  
  // Add animation completion callbacks for more control
  onTransitionStart: () => {
    debugLog('Screen transition started');
  },
  
  onTransitionEnd: () => {
    debugLog('Screen transition ended');
  },
};

// Special config for Login to SignUp transition - this will slide from bottom
const signUpScreenOptions = {
  ...screenOptions,
  animation: 'slide_from_bottom',
  animationDuration: 300,
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 260,
        easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
      },
    },
  },
};

// Special config for SignUp to Login transition - this will slide from right
const loginScreenOptions = {
  ...screenOptions,
  animation: 'slide_from_right',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        damping: 13,
        stiffness: 100,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
    close: screenOptions.transitionSpec.close,
  },
};

// Elegant zoom in/fade animation for ResetPassword screen
const resetPasswordScreenOptions = {
  ...screenOptions,
  presentation: 'card',
  animation: 'fade',
  animationDuration: 300,
  cardStyle: {
    backgroundColor: '#FFFFFF',
  },
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 250,
        easing: Easing.bezier(0.2, 0.5, 0.35, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        opacity: current.progress,
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
              extrapolate: 'clamp',
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
          extrapolate: 'clamp',
        }),
      },
    };
  },
};

// Special config for going back (right to left transition - when pressing back button)
const backScreenOptions = {
  ...screenOptions,
  cardStyleInterpolator: ({ current, next, layouts }) => {
    // When pressing back, properly handle both the exiting and entering screens
    return {
      // Current screen (the one being navigated away from)
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0], // Slide current screen to the right
            }),
          },
        ],
        opacity: current.progress,
      },
      // Next screen (the one being navigated to - the previous screen in the stack)
      ...(next
        ? {
            containerStyle: {
              transform: [
                {
                  translateX: next.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-layouts.screen.width * 0.3, 0], // Slide in from left
                  }),
                },
              ],
              opacity: next.progress,
            },
          }
        : {}),
      // No shadow
      overlayStyle: {
        opacity: 0,
      },
    };
  },
};

// Shared element context for progress bar continuity
export const ProgressContext = React.createContext({
  progress: { current: 0, total: 9, isOnboarding: false, currentScreen: '' },
  setProgress: () => {},
  updateProgress: () => {}
});

const Tab = createBottomTabNavigator();

export default function AuthStack({ setSession, initialRouteName = 'Login' }) {
  console.log("🔑 AuthStack initializing with route:", initialRouteName);
  
  try {
    // Check if we're starting directly in onboarding mode
    const startingInOnboarding = Object.keys(ONBOARDING_SCREENS).includes(initialRouteName);
    console.log("🔑 Starting in onboarding mode:", startingInOnboarding);
    
    // Get initial progress value based on starting screen
    const getInitialProgress = () => {
      // If it's a recognized onboarding screen, set appropriate progress
      if (Object.keys(ONBOARDING_SCREENS).includes(initialRouteName)) {
        console.log("🔑 Initial progress value:", ONBOARDING_SCREENS[initialRouteName]);
        return ONBOARDING_SCREENS[initialRouteName];
      }
      return 0; // Default to 0 for non-onboarding screens
    };
    
    // Shared progress state between screens with explicit indices for each screen
    const [progress, setProgress] = React.useState({
      current: getInitialProgress(),
      total: TOTAL_ONBOARDING_STEPS, // Total number of onboarding steps
      isOnboarding: startingInOnboarding, // Only true for onboarding screens
      currentScreen: startingInOnboarding ? initialRouteName : ''
    });
    
    // Effect to update progress when initialRouteName changes - runs only once on mount
    React.useEffect(() => {
      if (Object.keys(ONBOARDING_SCREENS).includes(initialRouteName)) {
        console.log("🔑 Setting initial progress for screen:", initialRouteName);
        setProgress(prev => ({
          ...prev,
          current: ONBOARDING_SCREENS[initialRouteName],
          isOnboarding: true,
          currentScreen: initialRouteName
        }));
      }
    }, [initialRouteName]); // Only run when initialRouteName changes
    
    // Memoized updateProgress function to avoid recreating on every render
    const updateProgress = useCallback((screenName) => {
      console.log("🔑 Updating progress for screen:", screenName);
      if (Object.keys(ONBOARDING_SCREENS).includes(screenName)) {
        setProgress(prev => {
          // Only update if the screen name has actually changed
          if (prev.currentScreen !== screenName) {
            console.log("🔑 Progress updated to screen:", screenName, 
                      "index:", ONBOARDING_SCREENS[screenName]);
            return {
              ...prev,
              currentScreen: screenName,
              current: ONBOARDING_SCREENS[screenName],
              isOnboarding: true
            };
          }
          return prev;
        });
      }
    }, []);
    
    // Checking if the initialRouteName is valid
    const allScreens = ['Login', 'SignUp', 'ResetPassword', 'MainApp', ...Object.keys(ONBOARDING_SCREENS)];
    if (!allScreens.includes(initialRouteName)) {
      console.warn(`🔑 WARNING: Invalid initialRouteName "${initialRouteName}". Valid screens are: ${allScreens.join(', ')}. Defaulting to Login.`);
      initialRouteName = 'Login';
    }
    
    console.log("🔑 AuthStack rendering with progress:", JSON.stringify(progress, null, 2));
    
    return (
      <ProgressContext.Provider value={{ progress, setProgress, updateProgress }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <Stack.Navigator 
            initialRouteName={initialRouteName} 
            screenOptions={screenOptions}
          >
            <Stack.Screen 
              name="Login" 
              options={loginScreenOptions}
            >
              {(props) => <LoginScreen {...props} setSession={setSession} />}
            </Stack.Screen>
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={signUpScreenOptions}
            />
            <Stack.Screen 
              name="ResetPassword" 
              component={ResetPasswordScreen}
              options={resetPasswordScreenOptions} 
            />
            <Stack.Screen 
              name="Name" 
              component={NameScreen}
              options={{
                ...screenOptions,
                // No back button for Name screen
                gestureEnabled: false
              }}
            />
            <Stack.Screen 
              name="Gender" 
              component={GenderScreen}
              options={screenOptions}
            />
            <Stack.Screen 
              name="DateOfBirth" 
              component={DateOfBirthScreen}
              options={screenOptions}
            />
            <Stack.Screen 
              name="WeightPreference" 
              component={WeightPreferenceScreen}
              options={screenOptions}
            />
            <Stack.Screen 
              name="BodyWeight" 
              component={BodyWeightScreen}
              options={{
                ...screenOptions,
                // Special screen with only top back button
                gestureEnabled: true
              }}
            />
            <Stack.Screen name="Country" component={CountryScreen} />
            <Stack.Screen name="Username" component={UsernameScreen} />
            <Stack.Screen name="OnboardingSummary" component={OnboardingSummaryScreen} />
            <Stack.Screen name="VideoPrompt" component={VideoPromptScreen} />
            <Stack.Screen name="ChooseDemoPath" component={ChooseDemoPathScreen} />
            <Stack.Screen name="DemoVideo" component={DemoVideoScreen} />
            <Stack.Screen name="ManualDemo" component={ManualDemoScreen} />
            <Stack.Screen name="VideoReview" component={VideoReviewScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} />
            <Stack.Screen 
              name="MainApp" 
              component={EmptyScreen}
              options={{
                // Prevent gestures on the EmptyScreen to avoid navigation issues
                gestureEnabled: false
              }}
            />
          </Stack.Navigator>
          
          {/* Static progress bar that appears only during onboarding */}
          {progress.isOnboarding && (
            <OnboardingProgressBar 
              current={progress.current} 
              total={progress.total} 
            />
          )}
        </View>
      </ProgressContext.Provider>
    );
  } catch (error) {
    console.error("🔑 ERROR rendering AuthStack:", error);
    // Return a fallback UI that still works
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading authentication...</Text>
      </View>
    );
  }
}

// Simplified empty screen that doesn't cause infinite loops
function EmptyScreen() {
  useEffect(() => {
    // Simple one-time effect to reload the app
    console.log("🔄 EmptyScreen mounted - scheduling app reload");
    const timer = setTimeout(() => {
      if (global.forceAppReload) {
        console.log("🔄 EmptyScreen calling forceAppReload");
        global.forceAppReload();
      } else {
        console.error("🔄 global.forceAppReload is not defined!");
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
} 