import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../config/colors';

// Workout Card Component
const WorkoutCard = ({ workout, onPress }) => (
  <TouchableOpacity style={styles.workoutCard} onPress={onPress}>
    <View style={styles.workoutInfo}>
      <Text style={styles.workoutName}>{workout.name}</Text>
      <Text style={styles.workoutDate}>{workout.date}</Text>
      <Text style={styles.workoutExercises}>
        {workout.exercises.length} exercises
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color={colors.gray} />
  </TouchableOpacity>
);

export default function SavedWorkoutsScreen({ navigation }) {
  // TODO: Fetch saved workouts from backend
  const [workouts, setWorkouts] = useState([
    {
      id: '1',
      name: 'Push Day',
      date: 'Last used: 2 days ago',
      exercises: ['Bench Press', 'Shoulder Press', 'Tricep Extensions'],
    },
    {
      id: '2',
      name: 'Pull Day',
      date: 'Last used: 4 days ago',
      exercises: ['Deadlift', 'Pull-ups', 'Rows'],
    },
  ]);

  const handleWorkoutPress = (workout) => {
    // TODO: Navigate to workout details screen
    console.log('Workout pressed:', workout.name);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Workouts</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        {workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={colors.gray} />
            <Text style={styles.emptyStateText}>No saved workouts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create a workout to get started
            </Text>
          </View>
        ) : (
          workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPress={() => handleWorkoutPress(workout)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginBottom: 4,
  },
  workoutExercises: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginTop: 8,
  },
}); 