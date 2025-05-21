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
import { View, StyleSheet, Text } from 'react-native';

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
    console.log('[DEBUG]', ...args);
  }
};

// Add a global function that can be called to force app reload
global.forceAppReload = () => {
  console.log("Force app reload requested - waiting for App component to mount");
};

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState({
    needsOnboarding: false,
    profileLoaded: false,
    startScreen: "Name"
  });
  const [reloadKey, setReloadKey] = useState(0);

  // Define the force reload function
  global.forceAppReload = useCallback(() => {
    console.log("🔄 Forcing app reload");
    setReloadKey(prev => prev + 1);
    setOnboardingState({
      needsOnboarding: false,
      profileLoaded: false,
      startScreen: "Name"
    });
    setProfileLoading(true);
    
    // Small delay before we check onboarding again
    setTimeout(() => {
      checkOnboarding();
    }, 300);
  }, []);

  // Add a safe session setter to handle session changes safely
  const safeSetSession = useCallback((newSession) => {
    console.log("Setting session:", newSession ? "Session provided" : "No session");
    setSession(newSession);
  }, []);
  
  // Define checkOnboarding as a function that can be called directly
  const checkOnboarding = useCallback(async () => {
    console.log("⚙️ Checking onboarding status");
    
    if (!session || !session.user) {
      console.log("⚙️ No session found");
      setOnboardingState({
        needsOnboarding: false,
        profileLoaded: true,
        startScreen: "Login"
      });
      setProfileLoading(false);
      return;
    }

    try {
      console.log("⚙️ Fetching profile for user:", session.user.id);
      // Simple database query to get user profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error("⚠️ Error fetching profile:", error);
        setOnboardingState({
          needsOnboarding: true,
          profileLoaded: true,
          startScreen: "Name"
        });
      } else {
        console.log("⚙️ Profile loaded:", JSON.stringify(profile, null, 2));
        // Check if any required fields are missing
        const needsOnboarding = 
          !profile.onboarding_complete === true || 
          !profile.name || 
          !profile.gender || 
          !profile.date_of_birth ||
          !profile.username ||
          !profile.country ||
          !profile.bodyweight ||
          !profile.unit_pref;
          
        // Determine appropriate starting screen if needed
        let startScreen = "Name";
        if (profile.name) {
          startScreen = "Gender";
          if (profile.gender) {
            startScreen = "DateOfBirth";
            if (profile.date_of_birth) {
              startScreen = "WeightPreference";
              if (profile.unit_pref) {
                startScreen = "BodyWeight";
                if (profile.bodyweight) {
                  startScreen = "Country";
                  if (profile.country) {
                    startScreen = "Username";
                  }
                }
              }
            }
          }
        }
        
        console.log("⚙️ Onboarding needed:", needsOnboarding);
        console.log("⚙️ Starting screen:", startScreen);
        
        setOnboardingState({
          needsOnboarding: needsOnboarding,
          profileLoaded: true,
          startScreen: startScreen
        });
      }
    } catch (err) {
      console.error("⚠️ Error checking onboarding:", err);
      setOnboardingState({
        needsOnboarding: true,
        profileLoaded: true,
        startScreen: "Name"
      });
    } finally {
      setProfileLoading(false);
    }
  }, [session]);
  
  // Load fonts and set up auth listener
  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
          'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
          'DMSans-Black': require('./assets/fonts/DMSans_36pt-Black.ttf')
        });

        // Get initial session
        const currentSession = supabase.auth.session();
        debugLog("Initial session:", currentSession ? "Found" : "None");
        
        // Set initial session
        setSession(currentSession);

        setAppIsReady(true);
      } catch (e) {
        console.warn('App load error:', e);
      }
    }

    // Set up auth listener (separate from prepare to avoid race conditions)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change:", event, newSession ? "New session" : "No session");
        safeSetSession(newSession);
      }
    );

    prepare();
    
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [safeSetSession]);

  // Check onboarding status when session changes
  useEffect(() => {
    if (session && appIsReady) {
      console.log("⚙️ Session available, checking onboarding");
      checkOnboarding();
    } else if (!session && appIsReady) {
      console.log("⚙️ No session, resetting onboarding state");
      setOnboardingState({
        needsOnboarding: false,
        profileLoaded: true,
        startScreen: "Login"
      });
      setProfileLoading(false);
    }
  }, [session, appIsReady, checkOnboarding]);

  // Handle layout for splash screen
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Don't render until app is ready and profile check is done
  if (!appIsReady) {
    console.log("⏳ App not ready yet: Fonts loading");
    return null;
  }
  
  if (profileLoading) {
    console.log("⏳ App not ready yet: Profile loading");
    return null;
  }

  console.log("🚀 Rendering app - Session:", session ? "Yes" : "No", 
    "Needs onboarding:", onboardingState.needsOnboarding,
    "Start screen:", onboardingState.startScreen);

  // Simple navigation key that changes only on forced reload
  const navigationKey = `nav-${reloadKey}`;

  // Determine which component to render based on auth and onboarding state
  let ComponentToRender;
  
  if (!session) {
    // No session - show auth screens
    ComponentToRender = (
      <AuthStack 
        setSession={safeSetSession} 
        initialRouteName="Login" 
      />
    );
  } else if (onboardingState.needsOnboarding) {
    // Session exists but onboarding incomplete - show onboarding in auth stack
    console.log("👤 Rendering onboarding flow starting at:", onboardingState.startScreen);
    ComponentToRender = (
      <AuthStack 
        setSession={safeSetSession} 
        initialRouteName={onboardingState.startScreen} 
      />
    );
  } else {
    // Session exists and onboarding complete - show main app
    ComponentToRender = (
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
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer key={navigationKey} onReady={onLayoutRootView}>
            {ComponentToRender}
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