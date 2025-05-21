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

// Debug logging function
const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[DEBUG]', ...args);
  }
};

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
          'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
        });

        debugLog('Fonts loaded, getting session');
        
        try {
          const { data: { session } } = await supabase.auth.session();
          debugLog('Session loaded:', session ? 'Valid session' : 'No session');
          setSession(session);
        } catch (sessionError) {
          console.error('Error loading session:', sessionError);
        }

        try {
          debugLog('Setting up auth listener');
          const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            debugLog('Auth state changed:', event, session ? 'Has session' : 'No session');
            setSession(session);
          });
          
          return () => {
            debugLog('Cleaning up auth listener');
            listener.subscription?.unsubscribe();
          };
        } catch (listenerError) {
          console.error('Error setting up auth listener:', listenerError);
        }
      } catch (e) {
        console.warn('App load error:', e);
      } finally {
        debugLog('App ready');
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
          <AuthStack setSession={setSession} />
        )
      ) : (
        <AuthStack setSession={setSession} />
      )}
    </NavigationContainer>
  );
} 