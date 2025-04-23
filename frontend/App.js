import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from './config/supabase';
import HomeScreen from './screens/HomeScreen';
import LogWorkoutScreen from './screens/LogWorkoutScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthStack from './navigation/AuthStack';
import colors from './config/colors';

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [session, setSession] = useState(null);

  // ✅ Load fonts and fetch session
  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
          'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
        });

        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session:", session); // Log initial session
        setSession(session);

        // ✅ Auth state listener
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth Event:", event);  // Add this line
          console.log("Session changed", session);
          console.log("New Session object:", session); // Log the entire session object
          setSession(session);
        });

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
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) return null;

  console.log("Current session state:", session);
  console.log("Has user?", session?.user);

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      {session ? (
        session.user ? (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === 'Home') iconName = 'home-outline';
                if (route.name === 'Log') iconName = 'add-circle-outline';
                if (route.name === 'Account') iconName = 'person-outline';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarStyle: {
                backgroundColor: colors.white,
                borderTopColor: colors.lightGray,
              },
              tabBarActiveTintColor: colors.darkGray,
              tabBarInactiveTintColor: '#B0B0B0',
              tabBarLabelStyle: {
                fontFamily: 'DMSans-Medium',
                fontSize: 12,
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Log" component={LogWorkoutScreen} />
            <Tab.Screen name="Account" component={ProfileScreen} />
          </Tab.Navigator>
        ) : (
          <>
            {console.log("No user in session")}
            <AuthStack setSession={setSession} />
          </>
        )
      ) : (
        <>
          {console.log("No session")}
          <AuthStack setSession={setSession} />
        </>
      )}
    </NavigationContainer>
  );
}
