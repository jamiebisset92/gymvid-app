import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import NewBlankWorkoutScreen from '../screens/workout/NewBlankWorkoutScreen';
import AutoLogScreen from '../screens/workout/AutoLogScreen';
import ManualLogScreen from '../screens/workout/ManualLogScreen';
import CreateWorkoutScreen from '../screens/workout/CreateWorkoutScreen';
import QuickLogScreen from '../screens/workout/QuickLogScreen';
import SavedWorkoutsScreen from '../screens/workout/SavedWorkoutsScreen';

const Stack = createNativeStackNavigator();

export default function WorkoutStack() {
  return (
    <Stack.Navigator
      initialRouteName="LogWorkout"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LogWorkout" component={LogWorkoutScreen} />
      <Stack.Screen name="NewBlankWorkout" component={NewBlankWorkoutScreen} />
      <Stack.Screen name="AutoLog" component={AutoLogScreen} />
      <Stack.Screen name="ManualLog" component={ManualLogScreen} />
      <Stack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      <Stack.Screen name="QuickLog" component={QuickLogScreen} />
      <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} />
    </Stack.Navigator>
  );
} 