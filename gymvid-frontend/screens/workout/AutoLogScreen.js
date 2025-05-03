import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../../config/colors';

export default function AutoLogScreen({ navigation, route }) {
  const [isLoading, setIsLoading] = useState(false);
  const [exerciseData, setExerciseData] = useState(null);
  const [editedData, setEditedData] = useState(null);

  const handleTakeVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera access to take videos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        handleVideoUpload(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take video. Please try again.');
    }
  };

  const handleSelectVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to select videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        handleVideoUpload(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const handleVideoUpload = async (videoUri) => {
    setIsLoading(true);
    try {
      // TODO: Implement video upload and AI analysis
      // This is a mock response for now
      const mockResponse = {
        exerciseName: 'Bench Press',
        weight: 135,
        reps: 8,
        rpe: 7,
        rir: 3,
      };
      
      setExerciseData(mockResponse);
      setEditedData(mockResponse);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExercise = () => {
    if (!editedData) return;

    const exercise = {
      name: editedData.exerciseName,
      sets: [{
        weight: editedData.weight,
        reps: editedData.reps,
        rpe: editedData.rpe,
        rir: editedData.rir,
      }]
    };

    route.params?.onSave(exercise);
    navigation.goBack();
  };

  const handleUpdateField = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (exerciseData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Auto-Log Results</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              value={editedData.exerciseName}
              onChangeText={(text) => handleUpdateField('exerciseName', text)}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={editedData.weight.toString()}
              onChangeText={(text) => handleUpdateField('weight', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Reps</Text>
            <TextInput
              style={styles.input}
              value={editedData.reps.toString()}
              onChangeText={(text) => handleUpdateField('reps', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>RPE</Text>
            <TextInput
              style={styles.input}
              value={editedData.rpe.toString()}
              onChangeText={(text) => handleUpdateField('rpe', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>RIR</Text>
            <TextInput
              style={styles.input}
              value={editedData.rir.toString()}
              onChangeText={(text) => handleUpdateField('rir', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveExercise}>
            <Text style={styles.saveButtonText}>Save Exercise</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auto-Log Exercise</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.optionButton} onPress={handleTakeVideo}>
          <Ionicons name="videocam-outline" size={48} color={colors.primary} />
          <Text style={styles.optionText}>Take New Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={handleSelectVideo}>
          <Ionicons name="folder-outline" size={48} color={colors.primary} />
          <Text style={styles.optionText}>Select Existing Video</Text>
        </TouchableOpacity>
      </View>
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
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 32,
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    width: '100%',
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
  optionText: {
    fontSize: 18,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
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
  footer: {
    padding: 20,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
}); 