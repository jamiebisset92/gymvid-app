import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import colors from '../config/colors';
import { supabase } from '../config/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../components/ToastProvider';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const StatsCard = ({ icon, value, label }) => (
  <View style={styles.statsCard}>
    <Ionicons name={icon} size={24} color={colors.gray} style={styles.statsIcon} />
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </View>
);

const ActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Ionicons name={icon} size={32} color={colors.darkGray} />
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation, route }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    streak: 0,
    videos: 0,
    prs: 0,
    hours: 0
  });
  const [userName, setUserName] = useState("there");
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast(); // Get toast functions from context

  // Check for welcome info from onboarding
  useFocusEffect(
    React.useCallback(() => {
      // Check for route params first
      if (route.params?.showWelcomeToast && route.params?.userName) {
        // Show welcome toast
        toast.success(`Welcome to GymVid ${route.params.userName}!`, {
          duration: 4000,
          position: 'top'
        });
        
        // Clear the params
        navigation.setParams({
          showWelcomeToast: undefined,
          userName: undefined
        });
      } 
      // Then check for global welcome info (from onboarding)
      else if (global.welcomeInfo?.showWelcomeToast) {
        const name = global.welcomeInfo.userName || userName;
        
        // Show welcome toast
        toast.success(`Welcome to GymVid ${name}!`, {
          duration: 4000,
          position: 'top'
        });
        
        // Clear the global info
        global.welcomeInfo = null;
      }
      
      // Check for first time user from completing onboarding
      const checkFirstTimeUser = async () => {
        // Get the current user
        const currentUser = supabase.auth.user();
        if (!currentUser) return;
        
        // Fetch user profile data
        const { data: profile, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          debugLog("Error fetching user profile:", error);
        } else if (profile && profile.name) {
          const firstName = profile.name.split(' ')[0]; // Use just the first name
          setUserName(firstName);
          debugLog("User name loaded:", profile.name);
          
          // If we still have global welcome info without a name, set it now
          if (global.welcomeInfo && !global.welcomeInfo.userName) {
            global.welcomeInfo.userName = firstName;
          }
        }
      };
      
      checkFirstTimeUser();
    }, [userName])
  );

  // Load user data and stats
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        debugLog("Loading user data for HomeScreen");
        
        // Get current user
        const currentUser = supabase.auth.user();
        if (!currentUser) {
          debugLog("No user found in HomeScreen");
          return;
        }
        
        // Fetch user profile data
        const { data: profile, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          debugLog("Error fetching user profile:", error);
        } else if (profile && profile.name) {
          const firstName = profile.name.split(' ')[0]; // Use just the first name
          setUserName(firstName);
          debugLog("User name loaded:", profile.name);
          
          // If we still have global welcome info without a name, set it now
          if (global.welcomeInfo && !global.welcomeInfo.userName) {
            global.welcomeInfo.userName = firstName;
          }
        }
      } catch (err) {
        console.error("Error in HomeScreen data loading:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // TODO: Fetch real stats from backend
  useEffect(() => {
    // Placeholder for stats fetching
  }, []);

  const handleStartWorkout = () => {
    // Navigate to the Workout tab and then to LogWorkout as the initial screen
    navigation.navigate('Workout', { 
      screen: 'LogWorkout',
    });
  };

  const handleQuickSet = () => {
    navigation.navigate('Workout', { screen: 'QuickLog' });
  };

  const handleImportVideo = () => {
    navigation.navigate('Workout', { screen: 'AutoLog' });
  };

  const handleNewTemplate = () => {
    navigation.navigate('Workout', { screen: 'CreateWorkout' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi {userName}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <StatsCard icon="flame" value={stats.streak} label="Streak" />
          <StatsCard icon="videocam" value={stats.videos} label="Videos" />
          <StatsCard icon="trophy" value={stats.prs} label="PRs" />
          <StatsCard icon="time" value={stats.hours} label="Hours" />
        </View>

        <Text style={styles.sectionTitle}>Training</Text>

        <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStartWorkout}>
          <Ionicons name="add-circle" size={24} color={colors.white} />
          <Text style={styles.startWorkoutText}>Start a workout</Text>
        </TouchableOpacity>

        <View style={styles.actionButtonsContainer}>
          <ActionButton
            icon="camera"
            label="Quick set"
            onPress={handleQuickSet}
          />
          <ActionButton
            icon="cloud-download"
            label="Import a video"
            onPress={handleImportVideo}
          />
          <ActionButton
            icon="clipboard"
            label="New template"
            onPress={handleNewTemplate}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 36,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  date: {
    fontSize: 18,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '23%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIcon: {
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  statsLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  startWorkoutButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  startWorkoutText: {
    color: colors.white,
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    marginLeft: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '31%',
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
    marginTop: 12,
    textAlign: 'center',
  },
}); 