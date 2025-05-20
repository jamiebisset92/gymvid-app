import React from 'react';
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

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const Stack = createNativeStackNavigator();

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

// Shared element context for progress bar continuity
export const ProgressContext = React.createContext(null);

const Tab = createBottomTabNavigator();

export default function AuthStack({ setSession, initialRouteName = 'Login' }) {
  debugLog("AuthStack initialRouteName:", initialRouteName);
  
  // Shared progress state between screens
  const [progress, setProgress] = React.useState({
    current: 0,
    total: 7 // Total steps: Name, Gender, Age, WeightPref, BodyWeight, Country, Username
  });
  
  return (
    <ProgressContext.Provider value={{ progress, setProgress }}>
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
        <Stack.Screen name="Name" component={NameScreen} />
        <Stack.Screen name="Gender" component={GenderScreen} />
        <Stack.Screen name="DateOfBirth" component={DateOfBirthScreen} />
        <Stack.Screen name="WeightPreference" component={WeightPreferenceScreen} />
        <Stack.Screen name="BodyWeight" component={BodyWeightScreen} />
        <Stack.Screen name="Country" component={CountryScreen} />
        <Stack.Screen name="Username" component={UsernameScreen} />
        <Stack.Screen name="MainApp">
          {() => (
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;

                  if (route.name === 'Feed') {
                    iconName = focused ? 'grid' : 'grid-outline';
                  } else if (route.name === 'Profile') {
                    iconName = focused ? 'person' : 'person-outline';
                  } else if (route.name === 'Workout') {
                    iconName = focused ? 'barbell' : 'barbell-outline';
                  } else if (route.name === 'Progress') {
                    iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                  } else if (route.name === 'Settings') {
                    iconName = focused ? 'settings' : 'settings-outline';
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: 'blue',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
              })}
            >
              <Tab.Screen name="Feed" component={FeedScreen} />
              <Tab.Screen name="Profile" component={ProfileScreen} />
              <Tab.Screen name="Workout" component={LogWorkoutScreen} />
              <Tab.Screen name="Progress" component={HomeScreen} />
              <Tab.Screen name="Settings" component={SettingsScreen} />
            </Tab.Navigator>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </ProgressContext.Provider>
  );
} 