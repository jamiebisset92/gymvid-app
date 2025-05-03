import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import Toast from 'react-native-root-toast';
import { RootSiblingParent } from 'react-native-root-siblings';
import colors from '../../config/colors';
import ExercisePickerModal from '../../components/ExercisePickerModal';
import * as ImagePicker from 'expo-image-picker';

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatDate = () => {
  const date = new Date();
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName} ${day}${getOrdinalSuffix(day)} of ${month}`;
};

export default function NewBlankWorkoutScreen({ navigation }) {
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('recent');
  const [expandedExercises, setExpandedExercises] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTime, setRestTime] = useState(60);
  const [defaultRestTime, setDefaultRestTime] = useState(60);
  const [isResting, setIsResting] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [sliderValue, setSliderValue] = useState(60);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const timerInterval = useRef(null);
  const restInterval = useRef(null);
  const [showLogChoice, setShowLogChoice] = useState(false);
  const [showLogChoiceIdx, setShowLogChoiceIdx] = useState(null);
  const [showLogChoiceSheet, setShowLogChoiceSheet] = useState(false);
  const [pendingVideo, setPendingVideo] = useState(null);

  useEffect(() => {
    if (exercises.length > 0 && !isTimerPaused) {
      // Only start the timer when there are exercises and timer is not paused
      if (!timerInterval.current) {
        timerInterval.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
      }
    } else {
      // Clear timer when no exercises or timer is paused
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [exercises.length, isTimerPaused]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalSetsCompleted = () => {
    return exercises.reduce((total, exercise) => {
      return total + exercise.sets.filter(set => set.completed).length;
    }, 0);
  };

  const handleAddFirstExercise = () => {
    setShowPicker(true);
  };

  const isExerciseSelected = (name) => exercises.some(e => e.name === name);

  const handleSelectExercise = (name) => {
    if (isExerciseSelected(name)) {
      setExercises(prev => prev.filter(e => e.name !== name));
      setExpandedExercises(prev => {
        const updated = { ...prev };
        delete updated[exercises.findIndex(e => e.name === name)];
        return updated;
      });
    } else {
      // If pendingVideo exists, add exercise with special video set
      if (pendingVideo) {
        setExercises(prev => [
          ...prev,
          {
            name,
            sets: [{
              weight: '',
              reps: '',
              rpe: '',
              tut: '',
              completed: false,
              video: pendingVideo,
              isVideoSet: true,
            }],
          },
        ]);
        setExpandedExercises(prev => ({ ...prev, [exercises.length]: true }));
        setPendingVideo(null);
      } else {
        setExercises(prev => [
          ...prev,
          { name, sets: [{ weight: '', reps: '', completed: false, video: null }] },
        ]);
        setExpandedExercises(prev => ({ ...prev, [exercises.length]: true }));
      }
    }
  };

  const handleUpdateSet = (exerciseIdx, setIdx, field, value) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = { ...updated[exerciseIdx] };
      updated[exerciseIdx].sets = [...updated[exerciseIdx].sets];
      updated[exerciseIdx].sets[setIdx] = {
        ...updated[exerciseIdx].sets[setIdx],
        [field]: value,
      };
      return updated;
    });
  };

  const handleAddSet = (exerciseIdx) => {
    setExercises(prev => {
      const updated = [...prev];
      const newSet = {
        weight: '',
        reps: '',
        completed: false,
        video: null
      };
      updated[exerciseIdx].sets = [...updated[exerciseIdx].sets, newSet];
      return updated;
    });
  };

  const handleCompleteSet = (exerciseIdx, setIdx) => {
    const currentSet = exercises[exerciseIdx].sets[setIdx];
    
    // Check if either weight or reps is empty when trying to complete
    if (!currentSet.completed && (!currentSet.weight.trim() || !currentSet.reps.trim())) {
      Toast.show('You need to add the weight & reps!', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        shadow: false,
        animation: true,
        hideOnPress: true,
        delay: 0,
        backgroundColor: colors.error,
        textColor: colors.white,
        containerStyle: {
          marginBottom: 100,
          zIndex: 9999,
          elevation: 0,
        },
        opacity: 1,
      });
      return;
    }

    setExercises(prev => {
      const updated = [...prev];
      const currentSet = {...updated[exerciseIdx].sets[setIdx]};
      currentSet.completed = !currentSet.completed;
      updated[exerciseIdx].sets = [
        ...updated[exerciseIdx].sets.slice(0, setIdx),
        currentSet,
        ...updated[exerciseIdx].sets.slice(setIdx + 1)
      ];
      return updated;
    });
  };

  const swipeableRefs = useRef({});

  const handleDeleteSet = (exerciseIdx, setIdx) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = { ...updated[exerciseIdx] };
      updated[exerciseIdx].sets = updated[exerciseIdx].sets.filter((_, idx) => idx !== setIdx);
      return updated;
    });
    // Close the swipeable after deletion
    if (swipeableRefs.current[`${exerciseIdx}-${setIdx}`]) {
      swipeableRefs.current[`${exerciseIdx}-${setIdx}`].close();
    }
  };

  const handleEndWorkout = async () => {
    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise before ending the workout');
      return;
    }
    try {
      // TODO: Implement save to Supabase
      console.log('Saving workout to Supabase:', exercises);
      Alert.alert('Success', 'Workout saved successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleVideoUpload = async (exerciseIdx, setIdx) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.VIDEO,
        allowsEditing: false,
        quality: 1,
      });
      Alert.alert('Picker Result', JSON.stringify(result));
      let videoUri = null;
      if (result.assets && result.assets.length > 0) {
        videoUri = result.assets[0].uri;
      } else if (result.uri) {
        videoUri = result.uri;
      }
      if (!result.canceled && videoUri) {
        setExercises(prev => {
          const updated = [...prev];
          updated[exerciseIdx] = { ...updated[exerciseIdx] };
          updated[exerciseIdx].sets = [...updated[exerciseIdx].sets];
          updated[exerciseIdx].sets[setIdx] = {
            ...updated[exerciseIdx].sets[setIdx],
            video: videoUri,
          };
          return updated;
        });
      } else if (!result.canceled) {
        Alert.alert('Error', 'No video selected. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const handleExerciseOptions = (exerciseIdx) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change Exercise', 'Delete Exercise'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setShowPicker(true);
          } else if (buttonIndex === 2) {
            setExercises(prev => prev.filter((_, idx) => idx !== exerciseIdx));
          }
        }
      );
    }
  };

  const renderRightActions = (exerciseIdx, setIdx) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteSet(exerciseIdx, setIdx)}
      >
        <Ionicons name="trash-outline" size={24} color={colors.white} />
      </TouchableOpacity>
    );
  };

  const toggleExerciseExpanded = (exerciseIdx) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseIdx]: !prev[exerciseIdx]
    }));
  };

  const handleSettingsPress = () => {
    // TODO: Implement settings functionality
    console.log('Settings pressed');
  };

  const handleRestTimer = () => {
    if (isResting) {
      // Stop timer
      if (restInterval.current) {
        clearInterval(restInterval.current);
        restInterval.current = null;
      }
      setIsResting(false);
      setRestTime(defaultRestTime);
    } else {
      // Start timer
      setIsResting(true);
      restInterval.current = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            clearInterval(restInterval.current);
            setIsResting(false);
            return defaultRestTime;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const adjustRestTime = (seconds) => {
    if (isResting) {
      setRestTime(prev => {
        const newTime = prev + seconds;
        return newTime > 0 ? newTime : 0;
      });
    }
  };

  const handleSaveDefaultTime = () => {
    setDefaultRestTime(sliderValue);
    setRestTime(sliderValue);
    setShowTimerSettings(false);
  };

  const toggleTimer = () => {
    setIsTimerPaused(!isTimerPaused);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
    };
  }, []);

  const formatRestTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Handler for Auto Log (Video Log)
  const handleAutoLog = async () => {
    Alert.alert('DEBUG', 'handleAutoLog called');
    setShowLogChoiceSheet(false);
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant access to your photo library.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaType.VIDEO,
          allowsEditing: false,
          quality: 1,
        });
        Alert.alert('DEBUG', 'Picker returned');
        Alert.alert('Picker Result', JSON.stringify(result));
        let videoUri = null;
        if (result.assets && result.assets.length > 0) {
          videoUri = result.assets[0].uri;
        } else if (result.uri) {
          videoUri = result.uri;
        }
        if (!result.canceled && videoUri) {
          if (exercises.length === 0) {
            setPendingVideo(videoUri);
            setShowPicker(true);
          } else {
            setExercises(prev => {
              const updated = [...prev];
              const newSet = {
                weight: '',
                reps: '',
                rpe: '',
                tut: '',
                completed: false,
                video: videoUri,
                isVideoSet: true,
              };
              updated[0].sets = [...updated[0].sets, newSet];
              return updated;
            });
            setExpandedExercises(prev => ({ ...prev, 0: true }));
          }
        } else if (!result.canceled) {
          Alert.alert('Error', 'No video selected. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to select video. Please try again.');
      }
    }, 300); // 300ms delay to allow modal to close
  };

  // Handler for Manual Log
  const handleManualLog = () => {
    setShowLogChoiceSheet(false);
    setShowPicker(true);
  };

  // Handler for Add AI Video Set (below each exercise card)
  const handleAddAIVideoSet = async (exerciseIdx) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.VIDEO,
        allowsEditing: false,
        quality: 1,
      });
      Alert.alert('Picker Result', JSON.stringify(result));
      let videoUri = null;
      if (result.assets && result.assets.length > 0) {
        videoUri = result.assets[0].uri;
      } else if (result.uri) {
        videoUri = result.uri;
      }
      if (!result.canceled && videoUri) {
        setExercises(prev => {
          const updated = [...prev];
          const newSet = {
            weight: '',
            reps: '',
            rpe: '',
            tut: '',
            completed: false,
            video: videoUri,
            isVideoSet: true,
          };
          updated[exerciseIdx].sets = [...updated[exerciseIdx].sets, newSet];
          return updated;
        });
        setExpandedExercises(prev => ({ ...prev, [exerciseIdx]: true }));
      } else if (!result.canceled) {
        Alert.alert('Error', 'No video selected. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  // Handler for Add Manual Set (below each exercise card)
  const handleAddManualSet = (exerciseIdx) => {
    handleAddSet(exerciseIdx);
  };

  return (
    <RootSiblingParent>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{formatDate()}</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={handleSettingsPress}
            >
              <Ionicons name="settings-outline" size={26} color={colors.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {exercises.length} Exercise{exercises.length !== 1 ? 's' : ''} | {getTotalSetsCompleted()} Set{getTotalSetsCompleted() !== 1 ? 's' : ''} Completed
            </Text>
            <View style={styles.timerRow}>
              <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
              {exercises.length > 0 && (
                <TouchableOpacity 
                  style={styles.timerControlButton} 
                  onPress={toggleTimer}
                >
                  <View style={styles.timerControlCircle}>
                    <Ionicons 
                      name={isTimerPaused ? "play" : "pause"} 
                      size={14} 
                      color={colors.gray} 
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <ScrollView style={styles.scrollView}>
          {exercises.map((exercise, exerciseIdx) => (
            <React.Fragment key={exercise.name}>
              <View style={styles.exerciseTableCard}>
                <View style={styles.exerciseTableHeader}>
                  <Text style={styles.exerciseTableTitle}>{exercise.name}</Text>
                  <View style={styles.headerButtons}>
                    <TouchableOpacity 
                      style={styles.optionsButton}
                      onPress={() => handleExerciseOptions(exerciseIdx)}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={() => toggleExerciseExpanded(exerciseIdx)}
                    >
                      <Ionicons 
                        name={expandedExercises[exerciseIdx] ? "chevron-down" : "chevron-forward"} 
                        size={20} 
                        color={colors.gray} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.exerciseTableSubtitle}>
                  {`${exercise.sets.filter(s => s.completed).length} sets completed`}
                </Text>
                {expandedExercises[exerciseIdx] && (
                  <>
                    <View style={styles.tableContainer}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={styles.tableCellSetHeader}>#</Text>
                        <Text style={styles.tableCellInputHeader}>kg</Text>
                        <Text style={styles.tableCellInputHeader}>Reps</Text>
                        <Text style={styles.tableCellIconHeader}> </Text>
                        <Text style={styles.tableCellCheckHeader}> </Text>
                      </View>
                      {exercise.sets.map((set, setIdx) => (
                        set.video ? (
                          <View key={setIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ width: 20, fontSize: 16, color: colors.gray, textAlign: 'center', fontFamily: 'DMSans-Bold', marginRight: 8 }}>{setIdx + 1}</Text>
                            <TouchableOpacity onPress={() => {}} style={{ marginRight: 12 }}>
                              <Image source={{ uri: set.video }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.lightGray }} />
                            </TouchableOpacity>
                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              <TextInput
                                style={[styles.tableCellInput, { minWidth: 60, maxWidth: 60 }]}
                                value={set.weight}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'weight', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={4}
                              />
                              <TextInput
                                style={[styles.tableCellInput, { minWidth: 60, maxWidth: 60 }]}
                                value={set.reps}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'reps', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={3}
                              />
                              <TextInput
                                style={[styles.tableCellInput, { minWidth: 60, maxWidth: 60 }]}
                                value={set.rpe}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'rpe', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={3}
                              />
                              <TextInput
                                style={[styles.tableCellInput, { minWidth: 60, maxWidth: 60 }]}
                                value={set.tut}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'tut', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={3}
                              />
                            </View>
                            <TouchableOpacity style={{ marginLeft: 8, backgroundColor: '#E6F0FF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => {}}>
                              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>AI Analyze Form</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Swipeable
                            key={setIdx}
                            ref={ref => swipeableRefs.current[`${exerciseIdx}-${setIdx}`] = ref}
                            renderRightActions={() => renderRightActions(exerciseIdx, setIdx)}
                            rightThreshold={40}
                          >
                            <View style={styles.tableRow}>
                              <Text style={styles.tableCellSet}>{setIdx + 1}</Text>
                              <TextInput
                                style={styles.tableCellInput}
                                value={set.weight}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'weight', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={4}
                              />
                              <TextInput
                                style={styles.tableCellInput}
                                value={set.reps}
                                onChangeText={v => handleUpdateSet(exerciseIdx, setIdx, 'reps', v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#AAAAAA"
                                editable={!set.completed}
                                maxLength={3}
                              />
                              <TouchableOpacity style={styles.tableCellIcon} onPress={() => handleVideoUpload(exerciseIdx, setIdx)}>
                                <View style={styles.cameraCornerBox}>
                                  <View style={styles.cornerTLH} />
                                  <View style={styles.cornerTLV} />
                                  <View style={styles.cornerTRH} />
                                  <View style={styles.cornerTRV} />
                                  <View style={styles.cornerBLH} />
                                  <View style={styles.cornerBLV} />
                                  <View style={styles.cornerBRH} />
                                  <View style={styles.cornerBRV} />
                                  {set.video ? (
                                    <Image source={{ uri: set.video }} style={styles.videoThumb} />
                                  ) : (
                                    <Ionicons name="camera-outline" size={20} color={colors.gray} />
                                  )}
                                </View>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.tableCellCheck}
                                onPress={() => handleCompleteSet(exerciseIdx, setIdx)}
                              >
                                <View style={[
                                  styles.checkSquare,
                                  set.completed ? styles.checkSquareCompleted : null
                                ]}>
                                  <Ionicons 
                                    name="checkmark-sharp" 
                                    size={24} 
                                    color={set.completed ? colors.white : colors.lightGray} 
                                  />
                                </View>
                              </TouchableOpacity>
                            </View>
                          </Swipeable>
                        )
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 4, marginBottom: 8, gap: 12 }}>
                      <TouchableOpacity onPress={() => handleAddAIVideoSet(exerciseIdx)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="add-circle-outline" size={20} color={'#6C3EF6'} />
                        <Text style={{ color: '#6C3EF6', fontSize: 16, fontFamily: 'DMSans-Bold', marginLeft: 4 }}>Add AI Video Set</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleAddManualSet(exerciseIdx)} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.gray} />
                        <Text style={{ color: colors.gray, fontSize: 16, fontFamily: 'DMSans-Bold', marginLeft: 4 }}>Add Manual Set</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.addSetButton} onPress={() => handleAddSet(exerciseIdx)}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.addSetText}>Add set</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </React.Fragment>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={exercises.length === 0 ? styles.fullWidthAddButton : styles.addButton} 
            onPress={() => setShowLogChoiceSheet(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.white} />
            <Text style={styles.addButtonText}>Exercise</Text>
          </TouchableOpacity>
          {exercises.length > 0 && (
            <>
              <View style={styles.restButton}>
                <View style={styles.restTimerContainer}>
                  {isResting ? (
                    <>
                      <TouchableOpacity 
                        style={styles.timerAdjustButton} 
                        onPress={() => adjustRestTime(-15)}
                      >
                        <Ionicons name="remove-circle" size={20} color={colors.gray} />
                      </TouchableOpacity>
                      <Text style={styles.restTimerText}>{formatRestTime(restTime)}</Text>
                      <TouchableOpacity 
                        style={styles.timerAdjustButton} 
                        onPress={() => adjustRestTime(15)}
                      >
                        <Ionicons name="add-circle" size={20} color={colors.gray} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={styles.timerAdjustButton} 
                        onPress={() => setShowTimerSettings(true)}
                      >
                        <Ionicons name="timer-outline" size={20} color={colors.gray} />
                      </TouchableOpacity>
                      <Text style={styles.restTimerText}>{formatRestTime(restTime)}</Text>
                      <TouchableOpacity 
                        style={styles.timerAdjustButton} 
                        onPress={handleRestTimer}
                      >
                        <Ionicons name="play" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.endButton} onPress={handleEndWorkout}>
                <Text style={styles.endButtonText}>Complete</Text>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark-outline" size={12} color={colors.white} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        <ExercisePickerModal
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleSelectExercise}
          selectedExercises={exercises.map(e => e.name)}
          persistFilter={pickerFilter}
          setPersistFilter={setPickerFilter}
        />

        <Modal
          visible={showTimerSettings}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimerSettings(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimerSettings(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Set Default Rest Time</Text>
                </View>
                <View style={styles.modalMainContent}>
                  <Text style={styles.timerValue}>{formatRestTime(sliderValue)}</Text>
                  <View style={styles.modalLeftSection}>
                    <Slider
                      style={styles.slider}
                      minimumValue={15}
                      maximumValue={480}
                      step={15}
                      value={defaultRestTime}
                      onValueChange={setSliderValue}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.lightGray}
                      thumbTintColor={colors.primary}
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={handleSaveDefaultTime}
                  >
                    <View style={[styles.checkSquare, styles.checkSquareCompleted]}>
                      <Ionicons 
                        name="checkmark-sharp" 
                        size={24} 
                        color={colors.white} 
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        {/* Bottom Sheet Log Choice Popup */}
        <Modal
          visible={showLogChoiceSheet}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLogChoiceSheet(false)}
        >
          <TouchableOpacity style={styles.logSheetOverlay} activeOpacity={1} onPress={() => setShowLogChoiceSheet(false)}>
            <View style={styles.logSheetContainer}>
              <View style={styles.logSheetHandle} />
              <View style={styles.logSheetRow}>
                <TouchableOpacity style={styles.logChoiceButtonInline} onPress={handleAutoLog}>
                  <Ionicons name="logo-electron" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.logChoiceTextInline}>Video Log</Text>
                </TouchableOpacity>
                <Text style={styles.logChoiceOrInline}>OR</Text>
                <TouchableOpacity style={styles.logChoiceButtonInline} onPress={handleManualLog}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.logChoiceTextInline}>Manual Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </RootSiblingParent>
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
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  exerciseTableCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
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
  exerciseTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    height: 24,
  },
  exerciseTableTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    lineHeight: 24,
  },
  exerciseTableSubtitle: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 10,
    marginLeft: 2,
  },
  tableContainer: {
    width: '100%',
    paddingHorizontal: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 48,
  },
  tableCellSet: {
    width: 20,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginRight: 8,
  },
  tableCellSetHeader: {
    width: 20,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginRight: 8,
    paddingHorizontal: 0,
  },
  tableCellInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    paddingVertical: 0,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    minWidth: 80,
    maxWidth: 85,
  },
  tableCellInputHeader: {
    flex: 1,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 4,
    minWidth: 80,
    maxWidth: 85,
    paddingHorizontal: 0,
  },
  tableCellIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
    marginRight: 5,
  },
  tableCellIconHeader: {
    width: 48,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginLeft: 4,
    marginRight: 4,
    paddingHorizontal: 0,
  },
  tableCellCheck: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
  tableCellCheckHeader: {
    width: 48,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginLeft: 4,
    marginRight: 12,
    paddingHorizontal: 0,
  },
  cameraCornerBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerTLH: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 10,
    height: 2,
    backgroundColor: colors.lightGray,
    borderTopLeftRadius: 8,
  },
  cornerTLV: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 2,
    height: 10,
    backgroundColor: colors.lightGray,
    borderTopLeftRadius: 8,
  },
  cornerTRH: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 2,
    backgroundColor: colors.lightGray,
    borderTopRightRadius: 8,
  },
  cornerTRV: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 2,
    height: 10,
    backgroundColor: colors.lightGray,
    borderTopRightRadius: 8,
  },
  cornerBLH: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 10,
    height: 2,
    backgroundColor: colors.lightGray,
    borderBottomLeftRadius: 8,
  },
  cornerBLV: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 2,
    height: 10,
    backgroundColor: colors.lightGray,
    borderBottomLeftRadius: 8,
  },
  cornerBRH: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 2,
    backgroundColor: colors.lightGray,
    borderBottomRightRadius: 8,
  },
  cornerBRV: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 2,
    height: 10,
    backgroundColor: colors.lightGray,
    borderBottomRightRadius: 8,
  },
  checkSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkSquareCompleted: {
    backgroundColor: '#4cd964',
    borderColor: '#4cd964',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginTop: 3,
    marginBottom: 3,
  },
  addSetText: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#6C3EF6',
    marginLeft: 6,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  addButton: {
    width: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    marginLeft: 4,
  },
  restButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 6,
    height: 44,
  },
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  restTimerText: {
    color: colors.darkGray,
    fontSize: 26,
    fontFamily: 'DMSans-Bold',
    paddingHorizontal: 0,
    textAlign: 'center',
    minWidth: 80,
    marginHorizontal: 0,
  },
  timerAdjustButton: {
    padding: 0,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    marginHorizontal: -2,
  },
  endButton: {
    width: 106,
    backgroundColor: '#4cd964',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  endButtonText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    marginRight: 4,
  },
  videoThumb: {
    width: 20,
    height: 20,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 48,
  },
  optionsButton: {
    padding: 4,
    height: 32,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 4,
    height: 32,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  statsText: {
    fontSize: 16,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timer: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: colors.gray,
    marginRight: 0,
  },
  timerControlButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerControlCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 96,
    paddingHorizontal: 16,
    width: '100%',
    height: 152,
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
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 11,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.gray,
  },
  modalMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
    marginTop: 0,
  },
  timerValue: {
    fontSize: 30,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    width: 90,
    textAlign: 'left',
    marginRight: -20,
  },
  modalLeftSection: {
    width: '60%',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 0,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 0,
  },
  confirmButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
  fullWidthAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    marginHorizontal: 16,
  },
  logChoiceBoxInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 8,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'center',
    height: 56,
  },
  logChoiceButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    minWidth: 0,
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  logChoiceTextInline: {
    color: colors.darkGray,
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  logChoiceOrInline: {
    color: colors.gray,
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    marginHorizontal: 10,
  },
  logSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  logSheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 15,
    paddingBottom: 50,
    paddingHorizontal: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 155,
  },
  logSheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightGray,
    alignSelf: 'center',
    marginBottom: 9,
  },
  logSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '2%',
  },
}); 