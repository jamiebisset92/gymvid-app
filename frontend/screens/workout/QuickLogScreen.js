import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../config/colors';

// Segmented Control Component
const SegmentedControl = ({ selectedMode, onModeChange }) => (
  <View style={styles.segmentedControl}>
    <TouchableOpacity
      style={[
        styles.segmentButton,
        selectedMode === 'auto' && styles.segmentButtonActive,
      ]}
      onPress={() => onModeChange('auto')}
    >
      <Ionicons
        name="flash"
        size={20}
        color={selectedMode === 'auto' ? colors.primary : colors.gray}
      />
      <Text
        style={[
          styles.segmentText,
          selectedMode === 'auto' && styles.segmentTextActive,
        ]}
      >
        Auto Log
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.segmentButton,
        selectedMode === 'manual' && styles.segmentButtonActive,
      ]}
      onPress={() => onModeChange('manual')}
    >
      <Ionicons
        name="create"
        size={20}
        color={selectedMode === 'manual' ? colors.primary : colors.gray}
      />
      <Text
        style={[
          styles.segmentText,
          selectedMode === 'manual' && styles.segmentTextActive,
        ]}
      >
        Manual Log
      </Text>
    </TouchableOpacity>
  </View>
);

export default function QuickLogScreen({ navigation }) {
  const [mode, setMode] = useState('auto');
  const [selectedMovement, setSelectedMovement] = useState(null);

  const handleSelectMovement = () => {
    // TODO: Navigate to movement selection screen
    console.log('Select Movement pressed');
  };

  const handleLogSet = () => {
    if (!selectedMovement) {
      Alert.alert('Error', 'Please select a movement first');
      return;
    }
    // TODO: Navigate to appropriate logging screen based on mode
    console.log('Log Set pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Log</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.movementContainer}>
          <Text style={styles.sectionTitle}>Movement</Text>
          <TouchableOpacity
            style={styles.movementButton}
            onPress={handleSelectMovement}
          >
            {selectedMovement ? (
              <Text style={styles.movementName}>{selectedMovement.name}</Text>
            ) : (
              <View style={styles.selectMovement}>
                <Ionicons name="barbell-outline" size={24} color={colors.gray} />
                <Text style={styles.selectMovementText}>Select Movement</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modeContainer}>
          <Text style={styles.sectionTitle}>Logging Mode</Text>
          <SegmentedControl selectedMode={mode} onModeChange={setMode} />
        </View>

        <TouchableOpacity style={styles.logButton} onPress={handleLogSet}>
          <Text style={styles.logButtonText}>Log Set</Text>
        </TouchableOpacity>
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
  movementContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 16,
  },
  movementButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
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
  selectMovement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectMovementText: {
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: colors.gray,
    marginLeft: 8,
  },
  movementName: {
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
    textAlign: 'center',
  },
  modeContainer: {
    marginBottom: 24,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.white,
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
  segmentText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: colors.gray,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
}); 