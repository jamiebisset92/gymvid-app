import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { auth, db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { s3, BUCKET_NAME } from '../../config/awsConfig';

import InputField from '../components/InputField';
import ButtonPrimary from '../components/ButtonPrimary';
import Spacing from '../../config/spacing';
import Typography from '../../config/typography';

export default function LogWorkoutScreen() {
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRPE] = useState('');
  const [video, setVideo] = useState(null);

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true, // Enables trimming on iOS
      quality: 1,
    });
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideo(result.assets[0].uri);
    }
  };  

  const handleLog = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'We need access to your media library to upload videos.');
        return;
      }

      if (!video) {
        Alert.alert('Please select a video before logging.');
        return;
      }

      const fileUri = video;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File does not exist at path: ' + fileUri);
        return;
      }

      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileName = `${Date.now()}.mp4`;
      const userId = auth.currentUser.uid;
      const key = `workoutVideos/${userId}/${fileName}`;

      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: blob,
        ContentType: 'video/mp4',
      };

      await s3.upload(uploadParams).promise();

      const videoURL = `https://${BUCKET_NAME}.s3.ap-southeast-2.amazonaws.com/${key}`;

      await addDoc(collection(db, 'workouts'), {
        userId,
        exercise,
        reps: Number(reps),
        weight: Number(weight),
        rpe: Number(rpe),
        videoURL,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Workout set logged successfully! ✅');

      setExercise('');
      setReps('');
      setWeight('');
      setRPE('');
      setVideo(null);
    } catch (error) {
      console.error('🔥 AWS Upload Error:', error);
      Alert.alert('Error', 'Something went wrong while uploading the video.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Log Your Workout</Text>

          <InputField placeholder="Exercise" value={exercise} onChangeText={setExercise} />
          <InputField placeholder="Reps" value={reps} onChangeText={setReps} keyboardType="numeric" />
          <InputField placeholder="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
          <InputField placeholder="RPE" value={rpe} onChangeText={setRPE} keyboardType="numeric" />

          <ButtonPrimary title="Select Video" onPress={pickVideo} style={{ marginBottom: Spacing.md }} />

          {video && (
            <Video
              source={{ uri: video }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="contain"
              shouldPlay={false}
              useNativeControls
              style={{ width: '100%', height: 200, marginBottom: Spacing.lg }}
            />
          )}

          <ButtonPrimary title="Log Set" onPress={handleLog} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20, // or Spacing.lg if you're using the spacing system
    paddingTop: Platform.OS === 'ios' ? 100 : 40,
    backgroundColor: '#FFFFFF',
  },  

  title: {
    ...Typography.headingXL,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
});
