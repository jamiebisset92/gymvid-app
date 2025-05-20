import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../config/colors';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Your workout feed will be available soon!
          </Text>
          <Text style={styles.placeholderSubtext}>
            Follow friends and see their workouts, PRs, and progress
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    letterSpacing: -0.2,
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