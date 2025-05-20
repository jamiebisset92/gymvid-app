import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

import { supabase } from './config/supabase';
import HomeScreen from './screens/HomeScreen';
import WorkoutStack from './navigation/WorkoutStack';
import ProfileScreen from './screens/ProfileScreen';
import FeedScreen from './screens/FeedScreen';
import AuthStack from './navigation/AuthStack';
import colors from './config/colors';
import { ToastProvider } from './components/ToastProvider';
import LogWorkoutScreen from './screens/LogWorkoutScreen';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true); // Start as true to prevent flicker
  const [onboardingState, setOnboardingState] = useState({
    needsOnboarding: false,
    profileLoaded: false
  });

  // When navigating from onboarding to main app, there might be multiple state updates
  // This ref helps us debounce these updates to avoid flickering
  const isTransitioning = useRef(false);
  
  // Add a safe session setter to handle session changes safely
  const safeSetSession = useCallback((newSession) => {
    try {
      // If session is changed, make sure we're not already in transition
      if (isTransitioning.current) {
        debugLog("Ignoring session update during transition");
        return;
      }
      
      isTransitioning.current = true;
      debugLog("Setting session:", newSession ? "Session provided" : "Null session");
      
      // Use a slight delay to let UI transitions complete
      setTimeout(() => {
        setSession(newSession);
        
        // Reset transition flag after another delay to prevent rapid changes
        setTimeout(() => {
          isTransitioning.current = false;
        }, 1000);
      }, 300);
    } catch (error) {
      console.error("Error setting session:", error);
      isTransitioning.current = false;
    }
  }, []);
  
  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
          'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
          'DMSans-Black': require('./assets/fonts/DMSans_36pt-Black.ttf')
        });

        // Get initial session
        const currentSession = supabase.auth.session();
        debugLog("Initial session:", currentSession ? "Found" : "None");
        
        // Use the safe setter for initial session
        setTimeout(() => {
          setSession(currentSession);
        }, 300);

        // Set up auth listener
        const { data: listener } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            debugLog("Auth state change:", event, newSession ? "New session" : "No session");
            
            // Use safe setter for auth state changes
            safeSetSession(newSession);
          }
        );

        return () => {
          listener.subscription?.unsubscribe();
        };
      } catch (e) {
        console.warn('App load error:', e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, [safeSetSession]);

  // Effect to process session changes
  useEffect(() => {
    const checkOnboarding = async () => {
      // If we're already processing a transition, don't start a new one
      if (isTransitioning.current) return;
      
      if (!session || !session.user) {
        debugLog("No session, clearing onboarding state");
        setOnboardingState({
          needsOnboarding: false,
          profileLoaded: true
        });
        setProfileLoading(false);
        return;
      }

      // Mark that we're beginning a transition
      isTransitioning.current = true;
      setProfileLoading(true);
      
      debugLog("Checking onboarding for user:", session.user.id);
      
      try {
        // First try to get the profile from the users table
        const { data: profile, error } = await supabase
          .from('users')
          .select('name, gender, date_of_birth, onboarding_complete')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          // If there's an error accessing the profile, try a fallback approach
          debugLog("Error fetching profile:", error);
          
          // Try to create a user record as a backup approach
          try {
            const { error: upsertError } = await supabase
              .from('users')
              .upsert({
                id: session.user.id,
                email: session.user.email,
                onboarding_complete: false
              });
              
            if (upsertError) {
              console.error("Error creating user record:", upsertError);
            } else {
              debugLog("Created initial user record");
            }
          } catch (err) {
            console.error("Error in backup user creation:", err);
          }
          
          setOnboardingState({
            needsOnboarding: true,
            profileLoaded: true
          });
        } else {
          debugLog("Profile data:", profile);
          
          // Check if we have a name, gender, and date of birth, or if onboarding_complete is explicitly true
          const isOnboardingComplete = profile.onboarding_complete === true;
          const hasAllRequiredFields = profile.name && profile.gender && profile.date_of_birth;
          
          // If any of the required fields are missing, or onboarding isn't explicitly complete, direct to onboarding
          const needsOnboarding = !isOnboardingComplete || !hasAllRequiredFields;
          
          debugLog("Needs onboarding:", needsOnboarding, 
                   "onboarding_complete:", profile.onboarding_complete,
                   "name:", !!profile.name,
                   "gender:", !!profile.gender,
                   "date_of_birth:", !!profile.date_of_birth);
          
          setOnboardingState({
            needsOnboarding: needsOnboarding,
            profileLoaded: true
          });
        }
      } catch (err) {
        console.error("Unexpected error checking onboarding:", err);
        setOnboardingState({
          needsOnboarding: true,
          profileLoaded: true
        });
      }
      
      setProfileLoading(false);
      
      // After a short delay, mark the transition as complete
      setTimeout(() => {
        isTransitioning.current = false;
      }, 1000);
    };
    
    checkOnboarding();
  }, [session]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Don't render until fonts are loaded and profile check is done
  if (!appIsReady || profileLoading) {
    debugLog("App not ready yet:", !appIsReady ? "Fonts loading" : "Profile loading");
    return null;
  }

  // Determine what to render based on session and onboarding state
  debugLog("Rendering app with session:", session ? "Yes" : "No", 
    "needs onboarding:", onboardingState.needsOnboarding);

  // Use a key on the NavigationContainer to prevent transition glitches
  const navKey = session ? 
    (onboardingState.needsOnboarding ? 'onboarding' : 'main') : 
    'auth';

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer key={navKey} onReady={onLayoutRootView}>
            {!session ? (
              // No session - show auth screens
              <AuthStack setSession={safeSetSession} />
            ) : onboardingState.needsOnboarding ? (
              // Session exists but onboarding incomplete - show onboarding in auth stack
              <AuthStack setSession={safeSetSession} initialRouteName="Name" />
            ) : (
              // Session exists and onboarding complete - show main app
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarIcon: ({ color, size, focused }) => {
                    if (route.name === 'Feed') {
                      return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />;
                    }
                    if (route.name === 'Progress') {
                      return <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />;
                    }
                    if (route.name === 'Settings') {
                      return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
                    }
                    if (route.name === 'Workout') {
                      return null; // We'll handle this separately
                    }
                  },
                  tabBarStyle: {
                    backgroundColor: colors.white,
                    borderTopWidth: 1,
                    borderTopColor: '#EEEEEE',
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 90, // Increased height for more padding
                    paddingBottom: 24, // More bottom padding for iPhone swipe bar
                    paddingTop: 0,
                  },
                  tabBarActiveTintColor: 'black',
                  tabBarInactiveTintColor: '#CCCCCC',
                  tabBarLabelStyle: {
                    fontFamily: 'DMSans-Medium',
                    fontSize: 12,
                    marginBottom: 5,
                  },
                })}
              >
                <Tab.Screen 
                  name="Profile" 
                  component={ProfileScreen}
                  options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ focused, color, size }) => (
                      <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
                    ),
                  }}
                />
                <Tab.Screen 
                  name="Feed" 
                  component={FeedScreen} 
                  options={{
                    tabBarLabel: 'Feed',
                    tabBarIcon: ({ focused, color, size }) => (
                      <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
                    ),
                  }}
                />
                <Tab.Screen 
                  name="Workout" 
                  component={WorkoutStack} 
                  options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused, color, size }) => (
                      <View style={styles.tabBarWorkoutButtonPremium}>
                        <Ionicons name="barbell" size={32} color="#fff" />
                      </View>
                    ),
                  }}
                />
                <Tab.Screen 
                  name="Progress" 
                  component={HomeScreen}
                  options={{
                    tabBarLabel: 'Progress',
                    tabBarIcon: ({ focused, color, size }) => (
                      <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />
                    ),
                  }}
                />
                <Tab.Screen 
                  name="Settings" 
                  component={ProfileScreen}
                  options={{
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ focused, color, size }) => (
                      <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
                    ),
                  }}
                />
              </Tab.Navigator>
            )}
          </NavigationContainer>
        </GestureHandlerRootView>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWorkoutButton: {
    position: 'absolute',
    bottom: 18, // Centered with new padding
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: '#212121',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  tabBarWorkoutButtonCustom: {
    position: 'absolute',
    bottom: 18,
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF', // iOS blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#fff',
  },
  tabBarWorkoutButtonFlat: {
    // (no longer used)
  },
  tabBarWorkoutButtonPremium: {
    position: 'absolute',
    bottom: -12, // Lower the button further so only a small portion overlaps the tab bar
    alignSelf: 'center',
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF', // Premium blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff', // Pure white border
    shadowColor: '#000', // Use black for subtle shadow, not blue
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 9,
    elevation: 7,
    zIndex: 10,
  },
}); 