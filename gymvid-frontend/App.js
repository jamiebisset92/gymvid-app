import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './config/supabase';
import WorkoutStack from './navigation/WorkoutStack';
import ProfileScreen from './screens/ProfileScreen';
import FeedScreen from './screens/FeedScreen';
import AuthStack from './navigation/AuthStack';
import colors from './config/colors';
import { ToastProvider } from './components/ToastProvider';
import LogWorkoutScreen from './screens/LogWorkoutScreen';
import GymVidGamesScreen from './screens/GymVidGamesScreen';

// Import workout screens
import NewBlankWorkoutScreen from './screens/workout/NewBlankWorkoutScreen';
import QuickLogScreen from './screens/workout/QuickLogScreen';
import SavedWorkoutsScreen from './screens/workout/SavedWorkoutsScreen';
import ExploreWorkoutsScreen from './screens/workout/ExploreWorkoutsScreen';

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
const Stack = createNativeStackNavigator();

// Create a placeholder component for the workout tab
const WorkoutPlaceholder = () => null;

// Create a component that wraps the tab navigator with workout screens
function MainTabsWithWorkoutStack() {
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const navigation = useNavigation();

  const handleWorkoutNavigation = (screenName) => {
    setWorkoutModalVisible(false);
    navigation.navigate(screenName);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false, // Remove all labels
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'Feed') {
              return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={26} color={color} />;
            }
            if (route.name === 'Progress') {
              return <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={26} color={color} />;
            }
            if (route.name === 'Settings') {
              return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={26} color={color} />;
            }
            if (route.name === 'Profile') {
              return <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />;
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
            height: 80, // Increased height to accommodate larger bottom padding
            paddingBottom: 34, // Increased for iOS swipe bar
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#CCCCCC',
        })}
      >
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Feed" 
          component={FeedScreen} 
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'search' : 'search-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Workout" 
          component={WorkoutPlaceholder}
          listeners={{
            tabPress: (e) => {
              // Prevent default behavior
              e.preventDefault();
              // Show the workout modal instead
              setWorkoutModalVisible(true);
            },
          }}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <View style={styles.tabBarWorkoutButtonCenter}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="Progress" 
          component={GymVidGamesScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={26} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      
      {/* WorkoutStack Modal Overlay */}
      <WorkoutStack
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        navigation={{ navigate: handleWorkoutNavigation }}
      />
    </>
  );
}

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
        // PGRST116 means no rows found - this is expected for new users
        if (error.code === 'PGRST116') {
          console.log("⚙️ No profile found for new user - starting onboarding");
          setOnboardingState({
            needsOnboarding: true,
            profileLoaded: true,
            startScreen: "Name"
          });
        } else {
          console.error("⚠️ Unexpected error fetching profile:", error);
          // Still allow onboarding for other errors
          setOnboardingState({
            needsOnboarding: true,
            profileLoaded: true,
            startScreen: "Name"
          });
        }
      } else {
        console.log("⚙️ Profile loaded:", JSON.stringify(profile, null, 2));
        // Check if onboarding is actually complete
        const needsOnboarding = 
          profile.onboarding_complete !== true || // Changed from !profile.onboarding_complete === true
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
      
      // Check for fresh signup flag first
      const checkFreshSignup = async () => {
        try {
          const freshSignup = await AsyncStorage.getItem('freshSignup');
          if (freshSignup === 'true') {
            console.log("⚙️ Fresh signup detected via flag - going straight to onboarding");
            await AsyncStorage.removeItem('freshSignup'); // Clear the flag
            setOnboardingState({
              needsOnboarding: true,
              profileLoaded: true,
              startScreen: "Name"
            });
            setProfileLoading(false);
            return true;
          }
        } catch (err) {
          console.error("Error checking fresh signup flag:", err);
        }
        return false;
      };
      
      checkFreshSignup().then(isFreshSignup => {
        if (!isFreshSignup) {
          // Check if this is a fresh signup by looking for a flag in session metadata
          // or by checking if the user was just created (within last few seconds)
          const userCreatedAt = session.user?.created_at;
          const isNewUser = userCreatedAt && (new Date() - new Date(userCreatedAt)) < 10000; // Less than 10 seconds old
          
          if (isNewUser) {
            console.log("⚙️ New user detected - going straight to onboarding");
            setOnboardingState({
              needsOnboarding: true,
              profileLoaded: true,
              startScreen: "Name"
            });
            setProfileLoading(false);
          } else {
            // Add a small delay to allow profile creation to complete
            setTimeout(() => {
              checkOnboarding();
            }, 500);
          }
        }
      });
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
  
  // Extra safety check - if we have a session but haven't determined onboarding state yet
  if (session && !onboardingState.profileLoaded) {
    console.log("⏳ App not ready yet: Onboarding state not determined");
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
        initialParams={{
          userId: session?.user?.id,
          email: session?.user?.email
        }}
      />
    );
  } else {
    // Session exists and onboarding complete - show main app with stack navigator
    ComponentToRender = (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabsWithWorkoutStack} />
        <Stack.Screen name="NewBlankWorkout" component={NewBlankWorkoutScreen} />
        <Stack.Screen name="QuickLog" component={QuickLogScreen} />
        <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} />
        <Stack.Screen name="ExploreWorkouts" component={ExploreWorkoutsScreen} />
      </Stack.Navigator>
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
  tabBarWorkoutButtonCenter: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
}); 