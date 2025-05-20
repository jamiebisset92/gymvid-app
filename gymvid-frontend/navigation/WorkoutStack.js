import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import NewBlankWorkoutScreen from '../screens/workout/NewBlankWorkoutScreen';
import AutoLogScreen from '../screens/workout/AutoLogScreen';
import ManualLogScreen from '../screens/workout/ManualLogScreen';
import CreateWorkoutScreen from '../screens/workout/CreateWorkoutScreen';
import QuickLogScreen from '../screens/workout/QuickLogScreen';
import SavedWorkoutsScreen from '../screens/workout/SavedWorkoutsScreen';
import ExploreWorkoutsScreen from '../screens/workout/ExploreWorkoutsScreen';

const Stack = createNativeStackNavigator();

export default function WorkoutStack() {
  return (
    <Stack.Navigator
      initialRouteName="LogWorkout"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="LogWorkout" component={LogWorkoutScreen} />
      <Stack.Screen name="NewBlankWorkout" component={NewBlankWorkoutScreen} />
      <Stack.Screen name="AutoLog" component={AutoLogScreen} />
      <Stack.Screen name="ManualLog" component={ManualLogScreen} />
      <Stack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      <Stack.Screen name="QuickLog" component={QuickLogScreen} />
      <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} />
      <Stack.Screen name="ExploreWorkouts" component={ExploreWorkoutsScreen} />
      <Stack.Screen name="LogNewPR" component={ManualLogScreen} />
    </Stack.Navigator>
  );
} 