import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../config/colors';

export default function ManualLogForm() {
  const [formData, setFormData] = useState({
    movement: '',
    weight: '',
    reps: '',
    rpe: '',
    notes: '',
    video: null,
  });

  const handleVideoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setFormData(prev => ({
          ...prev,
          video: result.assets[0],
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to load video. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.movement || !formData.weight || !formData.reps) {
      Alert.alert('Missing Information', 'Please fill in all required fields (movement, weight, reps).');
      return;
    }

    try {
      // TODO: Implement API call to log manual set
      console.log('Submitting form data:', formData);
      Alert.alert('Success', 'Workout logged successfully!');
      // Reset form
      setFormData({
        movement: '',
        weight: '',
        reps: '',
        rpe: '',
        notes: '',
        video: null,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to log workout. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Movement *</Text>
        <TextInput
          style={styles.input}
          value={formData.movement}
          onChangeText={(text) => setFormData(prev => ({ ...prev, movement: text }))}
          placeholder="e.g., Bench Press"
          placeholderTextColor={colors.gray}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Weight (kg) *</Text>
        <TextInput
          style={styles.input}
          value={formData.weight}
          onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
          placeholder="e.g., 100"
          keyboardType="numeric"
          placeholderTextColor={colors.gray}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Reps *</Text>
        <TextInput
          style={styles.input}
          value={formData.reps}
          onChangeText={(text) => setFormData(prev => ({ ...prev, reps: text }))}
          placeholder="e.g., 5"
          keyboardType="numeric"
          placeholderTextColor={colors.gray}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>RPE (1-10)</Text>
        <TextInput
          style={styles.input}
          value={formData.rpe}
          onChangeText={(text) => setFormData(prev => ({ ...prev, rpe: text }))}
          placeholder="e.g., 8"
          keyboardType="numeric"
          placeholderTextColor={colors.gray}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={formData.notes}
          onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
          placeholder="Add any additional notes here..."
          multiline
          placeholderTextColor={colors.gray}
        />
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={handleVideoUpload}>
        <Ionicons name="videocam" size={24} color={colors.white} />
        <Text style={styles.uploadButtonText}>
          {formData.video ? 'Change Video' : 'Upload Video'}
        </Text>
      </TouchableOpacity>

      {formData.video && (
        <Text style={styles.videoSelected}>
          Video selected: {formData.video.fileName || 'Video clip'}
        </Text>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Log Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  videoSelected: {
    color: colors.success,
    textAlign: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 