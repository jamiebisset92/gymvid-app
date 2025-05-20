import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../config/colors';

export default function ExploreWorkoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.darkGray} />
        </TouchableOpacity>
        <Text style={styles.title}>Explore Workouts</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Workout exploration coming soon!
          </Text>
          <Text style={styles.placeholderSubtext}>
            Discover new workout programs designed by experts
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  placeholderText: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  placeholderSubtext: {
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  }
}); 