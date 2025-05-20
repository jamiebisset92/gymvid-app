import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../gymvid-frontend/screens/auth/LoginScreen';
import SignUpScreen from '../gymvid-frontend/screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack({ setSession }) {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} setSession={setSession} />}
      </Stack.Screen>
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
} 