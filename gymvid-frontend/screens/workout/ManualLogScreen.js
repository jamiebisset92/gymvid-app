import React, { useState, useEffect } from 'react';
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
  Image,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import colors from '../../config/colors';
import { Platform as RNPlatform } from 'react-native';
import { Video } from 'expo-av';

// History View Component
const HistoryView = ({ previousSets }) => (
  <View style={styles.historyContainer}>
    <Text style={styles.historyTitle}>Previous Workouts</Text>
    <View style={styles.historyTable}>
      <View style={styles.historyHeaderRow}>
        <Text style={styles.historyHeaderCell}>Date</Text>
        <Text style={styles.historyHeaderCell}>Weight (kg)</Text>
        <Text style={styles.historyHeaderCell}>Reps</Text>
      </View>
      {previousSets.map((set, index) => (
        <View key={index} style={styles.historyRow}>
          <Text style={styles.historyCell}>2024-04-{String(29 - index).padStart(2, '0')}</Text>
          <Text style={styles.historyCell}>{set.weight}</Text>
          <Text style={styles.historyCell}>{set.reps}</Text>
        </View>
      ))}
    </View>
  </View>
);

export default function ManualLogScreen({ navigation, route }) {
  const [exerciseName, setExerciseName] = useState('');
  const [savedExercises, setSavedExercises] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sets, setSets] = useState([]);
  const [previousSets, setPreviousSets] = useState([]);
  const [exerciseConfirmed, setExerciseConfirmed] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // TODO: Fetch saved exercises from Supabase
    const mockSavedExercises = [
      'Bench Press',
      'Squat',
      'Deadlift',
      'Overhead Press',
    ];
    setSavedExercises(mockSavedExercises);
  }, []);

  // Fetch previous sets when exercise is confirmed/selected
  useEffect(() => {
    if (exerciseConfirmed && exerciseName) {
      setLoadingPrevious(true);
      // TODO: Replace with real backend fetch
      setTimeout(() => {
        setPreviousSets([
          { weight: 50, reps: 10 },
          { weight: 50, reps: 10 },
          { weight: 55, reps: 10 },
        ]);
        setSets([{ weight: '', reps: '', completed: false, video: null }]);
        setLoadingPrevious(false);
      }, 600);
    }
  }, [exerciseConfirmed, exerciseName]);

  const handleAddSet = () => {
    setSets([...sets, { weight: '', reps: '', completed: false, video: null }]);
  };

  const handleUpdateSet = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleCompleteSet = (index) => {
    const newSets = [...sets];
    newSets[index].completed = !newSets[index].completed;
    setSets(newSets);
  };

  const handleVideoUpload = async (index) => {
    const selectFromGallery = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant Photos access in Settings > Privacy > Photos for GymVid to select videos from your gallery.',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
          videoMaxDuration: 30,
          thumbnail: true,
        });
        
        if (!result.canceled) {
          const newSets = [...sets];
          newSets[index].video = result.assets[0].uri;
          newSets[index].thumbnail = result.assets[0].uri; // iOS automatically generates thumbnail
          setSets(newSets);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to select video. Please try again.');
      }
    };

    const recordNewVideo = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant camera access to record videos');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
        if (!result.canceled) {
          const newSets = [...sets];
          newSets[index].video = result.assets[0].uri;
          setSets(newSets);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to record video. Please try again.');
      }
    };

    if (RNPlatform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Select from Video Gallery', 'Record New Video'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) selectFromGallery();
          if (buttonIndex === 2) recordNewVideo();
        }
      );
    } else {
      Alert.alert(
        'Attach Video',
        'Choose an option',
        [
          { text: 'Select from Video Gallery', onPress: selectFromGallery },
          { text: 'Record New Video', onPress: recordNewVideo },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleVideoPreview = (videoUri) => {
    setSelectedVideo(videoUri);
  };

  const handleSaveExercise = () => {
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }
    if (sets.length === 0) {
      Alert.alert('Error', 'Please add at least one set');
      return;
    }
    const exercise = {
      name: exerciseName,
      sets: sets.map(set => ({
        weight: set.weight ? parseFloat(set.weight) : 0,
        reps: set.reps ? parseInt(set.reps) : 0,
        video: set.video || null,
      }))
    };
    if (!savedExercises.includes(exerciseName)) {
      setSavedExercises([...savedExercises, exerciseName]);
    }
    route.params?.onSave(exercise);
    navigation.goBack();
  };

  const renderRightActions = () => (
    <View style={styles.historyButton}>
      <Ionicons name="time-outline" size={24} color={colors.white} />
      <Text style={styles.historyButtonText}>History</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Swipeable
            renderRightActions={renderRightActions}
            rightThreshold={40}
            overshootRight={false}
            onSwipeableOpen={() => setShowHistory(true)}
            onSwipeableClose={() => setShowHistory(false)}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{exerciseName || 'Exercise Name'}</Text>
                <TouchableOpacity style={styles.settingsIcon}>
                  <Ionicons name="options-outline" size={28} color={colors.gray} />
                </TouchableOpacity>
              </View>
              {!exerciseConfirmed && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.darkGray, marginBottom: 8 }}>Exercise Name</Text>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={{
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
                        }}
                        value={exerciseName}
                        onChangeText={text => {
                          setExerciseName(text);
                          setShowDropdown(true);
                        }}
                        placeholder="Enter exercise name"
                        onFocus={() => setShowDropdown(true)}
                        autoCorrect={false}
                        autoCapitalize="words"
                      />
                      {showDropdown && savedExercises.length > 0 && exerciseName.length > 0 && (
                        <View style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.white,
                          borderRadius: 12,
                          marginTop: 8,
                          zIndex: 10,
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
                        }}>
                          {savedExercises.filter(e => e.toLowerCase().includes(exerciseName.toLowerCase())).map((exercise, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray }}
                              onPress={() => {
                                setExerciseName(exercise);
                                setShowDropdown(false);
                                setExerciseConfirmed(true);
                              }}
                            >
                              <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.darkGray }}>{exercise}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}
              {exerciseConfirmed && (
                <>
                  <Text style={styles.cardSubtitle}>{`${sets.filter(s => s.completed).length} sets completed`}</Text>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.tableCellSetHeader}>#</Text>
                      <Text style={styles.tableCellInputHeader}>kg</Text>
                      <Text style={styles.tableCellInputHeader}>Reps</Text>
                      <Text style={styles.tableCellIconHeader}>Video</Text>
                      <Text style={styles.tableCellCheckHeader}> </Text>
                    </View>
                    {loadingPrevious ? (
                      <Text style={{ textAlign: 'center', marginVertical: 16, color: colors.gray }}>Loading previous data...</Text>
                    ) : (
                      sets.map((set, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.tableCellSet}>{index + 1}</Text>
                          <TextInput
                            style={styles.tableCellInput}
                            value={set.weight}
                            onChangeText={v => handleUpdateSet(index, 'weight', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            editable={!set.completed}
                            maxLength={4}
                          />
                          <TextInput
                            style={styles.tableCellInput}
                            value={set.reps}
                            onChangeText={v => handleUpdateSet(index, 'reps', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            editable={!set.completed}
                            maxLength={3}
                          />
                          <TouchableOpacity
                            style={styles.tableCellIcon}
                            onPress={() => set.video ? handleVideoPreview(set.video) : handleVideoUpload(index)}
                          >
                            {set.video ? (
                              <View style={styles.thumbnailContainer}>
                                <Image
                                  source={{ uri: set.thumbnail || set.video }}
                                  style={styles.thumbnail}
                                  resizeMode="cover"
                                />
                                <View style={styles.playIconOverlay}>
                                  <Ionicons name="play-circle" size={24} color="white" />
                                </View>
                              </View>
                            ) : (
                              <Ionicons name="camera-outline" size={18} color={colors.gray} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.tableCellCheck}
                            onPress={() => handleCompleteSet(index)}
                          >
                            <View style={[styles.checkmark, set.completed && styles.checkmarkCompleted]}>
                              {set.completed && (
                                <Ionicons name="checkmark" size={14} color={colors.white} />
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                  <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.addSetText}>Add set</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Swipeable>
          {showHistory && <HistoryView previousSets={previousSets} />}
          {exerciseConfirmed && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveExercise}>
              <Text style={styles.saveButtonText}>Save Exercise</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={selectedVideo !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setSelectedVideo(null)}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo }}
              style={styles.modalVideo}
              shouldPlay={true}
              isLooping={true}
              resizeMode="contain"
              useNativeControls
            />
          )}
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    margin: 16,
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 26,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
  },
  cardSubtitle: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 16,
    marginLeft: 2,
  },
  settingsIcon: {
    padding: 4,
  },
  tableContainer: {
    paddingHorizontal: 0,
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16, // Match card padding
    marginBottom: 8,
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 48,
    paddingRight: 16, // Match card padding
  },
  tableCellSet: {
    width: 32,
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
  },
  tableCellInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    marginHorizontal: 4,
    fontFamily: 'DMSans-Bold',
    paddingVertical: 0,
    paddingHorizontal: 4,
    minWidth: 70, // Minimum width
  },
  tableCellInputWide: {
    flex: 1,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    marginHorizontal: 4,
    fontFamily: 'DMSans-Bold',
    paddingVertical: 0,
    paddingHorizontal: 4,
    minWidth: 70, // Minimum width
  },
  tableCellIcon: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  tableCellCheck: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellSetHeader: {
    width: 32,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
  },
  tableCellInputHeader: {
    flex: 1,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 4,
    minWidth: 70, // Minimum width
  },
  tableCellIconHeader: {
    width: 56,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 4,
  },
  tableCellCheckHeader: {
    width: 32,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkmarkCompleted: {
    backgroundColor: '#4cd964',
    borderColor: '#4cd964',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  addSetText: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: '#6C3EF6',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  deleteButton: {
    backgroundColor: colors.error || '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
    height: '90%',
    borderRadius: 12,
    marginVertical: 2,
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.lightGray,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalVideo: {
    width: '100%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  historyContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    margin: 16,
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
  historyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 16,
  },
  historyTable: {
    width: '100%',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    paddingBottom: 8,
    marginBottom: 8,
  },
  historyHeaderCell: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: colors.gray,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  historyCell: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    textAlign: 'center',
  },
  historyButton: {
    backgroundColor: colors.primary,
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 16,
  },
  historyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    marginTop: 4,
  },
}); 