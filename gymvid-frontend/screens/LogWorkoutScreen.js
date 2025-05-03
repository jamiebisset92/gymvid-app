import React from 'react';
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
import colors from '../config/colors';

// Main Menu Option Component
const MenuOption = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.menuOption} onPress={onPress}>
    <View style={styles.menuOptionIcon}>
      <Ionicons name={icon} size={32} color={colors.primary} />
          </View>
    <View style={styles.menuOptionContent}>
      <Text style={styles.menuOptionTitle}>{title}</Text>
      <Text style={styles.menuOptionDescription}>{description}</Text>
          </View>
    <Ionicons name="chevron-forward" size={24} color={colors.gray} />
        </TouchableOpacity>
);

export default function LogWorkoutScreen({ navigation }) {
  const handleNewBlankWorkout = () => {
    navigation.navigate('NewBlankWorkout');
  };

  const handleCreateAndSchedule = () => {
    // TODO: Navigate to Create & Schedule Workout screen
    console.log('Create & Schedule Workout pressed');
  };

  const handleQuickLog = () => {
    navigation.navigate('QuickLog');
  };

  const handleSavedWorkouts = () => {
    navigation.navigate('SavedWorkouts');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Your GymVid's</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <MenuOption
          icon="document-outline"
          title="New Blank Workout"
          description="Start a completely blank workout session"
          onPress={handleNewBlankWorkout}
        />
        <MenuOption
          icon="calendar-outline"
          title="Create & Schedule Workout"
          description="Create a workout and schedule it for later"
          onPress={handleCreateAndSchedule}
        />
        <MenuOption
          icon="flash-outline"
          title="Quick Log"
          description="Log a single set quickly without creating a workout"
          onPress={handleQuickLog}
          />
        <MenuOption
          icon="bookmark-outline"
          title="Saved Workouts"
          description="View and repeat previous workouts"
          onPress={handleSavedWorkouts}
        />
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
  menuOption: {
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
  menuOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuOptionContent: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  menuOptionDescription: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
  },
}); 