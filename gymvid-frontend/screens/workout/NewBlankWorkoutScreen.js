import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  FlatList,
  Keyboard,
  InputAccessoryView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import Toast from 'react-native-root-toast';
import { RootSiblingParent } from 'react-native-root-siblings';
import colors from '../../config/colors';
import ExercisePickerModal from '../../components/ExercisePickerModal';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View as RNView } from 'react-native';

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

const REST_TIME_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300];

// Track which thumbnails have been generated to prevent duplicates
const generatedThumbnailKeys = new Set();

export default function NewBlankWorkoutScreen({ navigation = {} }) {
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('recent');
  const [expandedExercises, setExpandedExercises] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimeSeconds, setRestTimeSeconds] = useState(60); // default 1:00
  const [defaultRestTime, setDefaultRestTime] = useState(60);
  const [isResting, setIsResting] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [sliderValue, setSliderValue] = useState(60);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const timerInterval = useRef(null);
  const restInterval = useRef(null);
  const [showLogChoice, setShowLogChoice] = useState(false);
  const [showLogChoiceIdx, setShowLogChoiceIdx] = useState(null);
  const [showLogChoiceSheet, setShowLogChoiceSheet] = useState(false);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [preDragExpandedExercises, setPreDragExpandedExercises] = useState(null);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [restTimeStart, setRestTimeStart] = useState(60);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState(false);
  const [pendingDeleteExerciseIdx, setPendingDeleteExerciseIdx] = useState(null);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [uploadingSet, setUploadingSet] = useState(null); // setId of uploading set

  // Add a unique ID for the accessory view
  const inputAccessoryViewID = 'doneAccessoryView';

  useLayoutEffect(() => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    setIsReady(true);
    return () => {
      nav.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    };
  }, [nav]);

  useEffect(() => {
    if (!timerInterval.current) {
      timerInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalSetsCompleted = () => {
    return exercises.reduce((total, exercise) => {
      if (exercise.isSuperset && Array.isArray(exercise.exercises)) {
        // Sum sets for all exercises in the superset
        return total + exercise.exercises.reduce(
          (supersetTotal, ex) => supersetTotal + (ex.sets?.filter(set => set.completed).length || 0),
          0
        );
      }
      // Normal exercise
      return total + (exercise.sets?.filter(set => set.completed).length || 0);
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
            id: generateId(),
            name,
            sets: [{
              id: generateId(),
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
          { id: generateId(), name, sets: [{ id: generateId(), weight: '', reps: '', completed: false, video: null }] },
        ]);
        setExpandedExercises(prev => ({ ...prev, [exercises.length]: true }));
      }
    }
  };

  const handleUpdateSet = (exerciseId, setId, field, value, subExerciseId = null) => {
    setExercises(prev => {
      const updated = [...prev];
      const exerciseIdx = updated.findIndex(e => e.id === exerciseId);
      if (exerciseIdx === -1) return prev;
      if (updated[exerciseIdx].isSuperset && Array.isArray(updated[exerciseIdx].exercises) && subExerciseId) {
        const subIdx = updated[exerciseIdx].exercises.findIndex(ex => ex.id === subExerciseId);
        if (subIdx === -1) return prev;
        const setIdx = updated[exerciseIdx].exercises[subIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        const prevValue = updated[exerciseIdx].exercises[subIdx].sets[setIdx][field] ?? '';
        const newValue = value?.toString() ?? '';
        const superset = { ...updated[exerciseIdx] };
        superset.exercises = superset.exercises.map((ex, i) => {
          if (i !== subIdx) return ex;
          let newSets = ex.sets.map((s, j) => {
            if (j === setIdx) {
              return { ...s, [field]: newValue };
            } else if (j > setIdx && s[field] === prevValue) {
              return { ...s, [field]: newValue };
            } else {
              return s;
            }
          });
          return { ...ex, sets: newSets };
        });
        updated[exerciseIdx] = superset;
      } else {
        const setIdx = updated[exerciseIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        const prevValue = updated[exerciseIdx].sets[setIdx][field] ?? '';
        const newValue = value?.toString() ?? '';
        let newSets = updated[exerciseIdx].sets.map((s, j) => {
          if (j === setIdx) {
            return { ...s, [field]: newValue };
          } else if (j > setIdx && s[field] === prevValue) {
            return { ...s, [field]: newValue };
          } else {
            return s;
          }
        });
        updated[exerciseIdx] = { ...updated[exerciseIdx], sets: newSets };
      }
      return updated;
    });
  };

  const handlePropagateSetValue = (exerciseId, setId, field, value, subExerciseId = null) => {
    setExercises(prev => {
      const updated = [...prev];
      const exerciseIdx = updated.findIndex(e => e.id === exerciseId);
      if (exerciseIdx === -1) return prev;
      if (updated[exerciseIdx].isSuperset && Array.isArray(updated[exerciseIdx].exercises) && subExerciseId) {
        const subIdx = updated[exerciseIdx].exercises.findIndex(ex => ex.id === subExerciseId);
        if (subIdx === -1) return prev;
        const setIdx = updated[exerciseIdx].exercises[subIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        const superset = { ...updated[exerciseIdx] };
        superset.exercises = superset.exercises.map((ex, i) => {
          if (i !== subIdx) return ex;
          let newSets = [...ex.sets];
          for (let j = setIdx + 1; j < newSets.length; j++) {
            if (!newSets[j][field]) {
              newSets[j] = { ...newSets[j], [field]: value?.toString() ?? '' };
            }
          }
          return { ...ex, sets: newSets };
        });
        updated[exerciseIdx] = superset;
      } else {
        const setIdx = updated[exerciseIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        let newSets = [...updated[exerciseIdx].sets];
        for (let j = setIdx + 1; j < newSets.length; j++) {
          if (!newSets[j][field]) {
            newSets[j] = { ...newSets[j], [field]: value?.toString() ?? '' };
          }
        }
        updated[exerciseIdx] = { ...updated[exerciseIdx], sets: newSets };
      }
      return updated;
    });
  };

  const handleAddSet = (exerciseIdx) => {
    setExercises(prev => {
      const updated = [...prev];
      const sets = updated[exerciseIdx].sets;
      const lastSet = sets.length > 0 ? sets[sets.length - 1] : {};
      const newSet = {
        id: generateId(),
        weight: lastSet.weight ?? '',
        reps: lastSet.reps ?? '',
        completed: false,
        video: null
      };
      updated[exerciseIdx].sets = [...updated[exerciseIdx].sets, newSet];
      return updated;
    });
  };

  const handleCompleteSet = (exerciseId, setId, subExerciseId = null) => {
    setExercises(prev => {
      const updated = [...prev];
      const exerciseIdx = updated.findIndex(e => e.id === exerciseId);
      if (exerciseIdx === -1) return prev;
      let currentSet;
      if (updated[exerciseIdx].isSuperset && Array.isArray(updated[exerciseIdx].exercises) && subExerciseId) {
        const subIdx = updated[exerciseIdx].exercises.findIndex(ex => ex.id === subExerciseId);
        if (subIdx === -1) return prev;
        const setIdx = updated[exerciseIdx].exercises[subIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        currentSet = updated[exerciseIdx].exercises[subIdx].sets[setIdx];
        // Show error if missing weight/reps
        if (!currentSet.completed && (!currentSet.weight?.toString().trim() || !currentSet.reps?.toString().trim())) {
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
          return prev;
        }
        // FULLY IMMUTABLE: superset, sub-exercise, sets
        const superset = { ...updated[exerciseIdx] };
        superset.exercises = superset.exercises.map((ex, i) => {
          if (i !== subIdx) return ex;
          const newSets = ex.sets.map((s, j) =>
            j === setIdx ? { ...s, completed: !s.completed } : s
          );
          return { ...ex, sets: newSets };
        });
        updated[exerciseIdx] = superset;
      } else {
        const setIdx = updated[exerciseIdx].sets.findIndex(s => s.id === setId);
        if (setIdx === -1) return prev;
        currentSet = updated[exerciseIdx].sets[setIdx];
        // Show error if missing weight/reps
        if (!currentSet.completed && (!currentSet.weight?.toString().trim() || !currentSet.reps?.toString().trim())) {
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
          return prev;
        }
        // FULLY IMMUTABLE: exercise, sets
        const newSets = updated[exerciseIdx].sets.map((s, j) =>
          j === setIdx ? { ...s, completed: !s.completed } : s
        );
        updated[exerciseIdx] = { ...updated[exerciseIdx], sets: newSets };
      }
      return updated;
    });
  };

  const swipeableRefs = useRef({});

  const handleDeleteSet = (exerciseId, setId, subExerciseId = null) => {
    setExercises(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(e => e.id === exerciseId);
      if (idx === -1) return prev;
      const exercise = updated[idx];
      if (exercise.isSuperset && Array.isArray(exercise.exercises) && subExerciseId) {
        exercise.exercises = exercise.exercises.map(ex =>
          ex.id === subExerciseId
            ? { ...ex, sets: ex.sets.filter(set => set.id !== setId) }
            : ex
        );
        updated[idx] = exercise;
      } else {
        exercise.sets = exercise.sets.filter(set => set.id !== setId);
        updated[idx] = exercise;
      }
      return updated;
    });
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

  const generateThumbnail = async (videoUri, exerciseId, setId) => {
    const key = `${exerciseId}-${setId}`;
    if (generatedThumbnailKeys.has(key)) return; // Prevent duplicate generations
    generatedThumbnailKeys.add(key);
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.5,
      });
      console.log('generateThumbnail called:', { videoUri, exerciseId, setId, uri });
      setVideoThumbnails(prev => {
        console.log('Setting videoThumbnails:', { key, uri });
        return {
          ...prev,
          [key]: uri
        };
      });
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  };

  const renderVideoButton = (exercise, set) => {
    return (
      <TouchableOpacity
        style={styles.tableCellIcon}
        onPress={() => handleVideoUpload(exercise.id, set.id)}
        disabled={isUploading || uploadingSet === set.id}
      >
        <View style={styles.cameraCornerBox}>
          <View style={styles.cornerTLH} />
          <View style={styles.cornerTLV} />
          <View style={styles.cornerTRH} />
          <View style={styles.cornerTRV} />
          <View style={styles.cornerBLH} />
          <View style={styles.cornerBLV} />
          <View style={styles.cornerBRH} />
          <View style={styles.cornerBRV} />
          {uploadingSet === set.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : set.thumbnail_url ? (
            <Image source={{ uri: set.thumbnail_url }} style={styles.videoThumb} />
          ) : (
            <Ionicons name="camera-outline" size={20} color={colors.gray} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleVideoUpload = async (exerciseId, setId) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets || !result.assets[0].uri) return;

      const videoUri = result.assets[0].uri;
      setUploadingSet(setId);

      // Find the correct indices
      const exerciseIdx = exercises.findIndex(e => e.id === exerciseId);
      if (exerciseIdx === -1) throw new Error('Exercise not found');
      const setIdx = exercises[exerciseIdx].sets.findIndex(s => s.id === setId);
      if (setIdx === -1) throw new Error('Set not found');

      // Prepare FormData
      const formData = new FormData();
      // TODO: Replace with actual user_id from your auth context/state
      const userId = 'demo-user';
      formData.append('user_id', userId);
      formData.append('movement', exercises[exerciseIdx].name);
      formData.append('equipment', exercises[exerciseIdx].equipment || '');
      formData.append('weight', exercises[exerciseIdx].sets[setIdx].weight || '');
      formData.append('weight_unit', 'kg');
      formData.append('reps', exercises[exerciseIdx].sets[setIdx].reps || '');
      formData.append('rpe', exercises[exerciseIdx].sets[setIdx].rpe || '');
      formData.append('rir', exercises[exerciseIdx].sets[setIdx].rir || '');
      formData.append('video', {
        uri: videoUri,
        name: 'video.mp4',
        type: 'video/mp4',
      });

      // Upload to backend
      const response = await fetch('https://gymvid-app.onrender.com/manual_log', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await response.json();
      console.log('Backend response:', data); // Add this line
      if (!data.data?.video_url || !data.data?.thumbnail_url) {
        throw new Error('Upload failed: missing video_url or thumbnail_url');
      }

      // Update set with video and thumbnail URLs
      setExercises(prev => {
        const updated = [...prev];
        const exIdx = updated.findIndex(e => e.id === exerciseId);
        if (exIdx === -1) return prev;
        const sIdx = updated[exIdx].sets.findIndex(s => s.id === setId);
        if (sIdx === -1) return prev;
        updated[exIdx].sets[sIdx] = {
          ...updated[exIdx].sets[sIdx],
          video: data.data.video_url,
          thumbnail_url: data.data.thumbnail_url,
        };
        return updated;
      });
    } catch (error) {
      console.error('Video upload error:', error);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
    } finally {
      setUploadingSet(null);
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
            setPendingDeleteExerciseIdx(exerciseIdx);
            setShowDeleteExerciseModal(true);
          }
        }
      );
    }
  };

  const renderRightActions = (exerciseId, setId, subExerciseId = null) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteSet(exerciseId, setId, subExerciseId)}
      >
        <Ionicons name="trash-outline" size={24} color={colors.white} />
      </TouchableOpacity>
    );
  };

  const toggleExerciseExpanded = (exerciseId) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleSettingsPress = () => {
    // TODO: Implement settings functionality
    console.log('Settings pressed');
  };

  const handleRestTimer = () => {
    if (isResting) {
      if (restInterval.current) {
        clearInterval(restInterval.current);
        restInterval.current = null;
      }
      setIsResting(false);
      setRestTimeSeconds(60); // reset to default 1:00
    } else {
      setRestTimeStart(restTimeSeconds); // remember the starting value
      setIsResting(true);
      restInterval.current = setInterval(() => {
        setRestTimeSeconds(prev => {
          if (prev <= 1) {
            clearInterval(restInterval.current);
            setIsResting(false);
            return 60; // reset to default 1:00
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const adjustRestTime = (seconds) => {
    if (isResting) {
      setRestTimeSeconds(prev => {
        const newTimeSeconds = prev + seconds;
        return newTimeSeconds > 0 ? newTimeSeconds : 0;
      });
    }
  };

  const handleSaveDefaultTime = () => {
    setDefaultRestTime(sliderValue);
    setRestTimeSeconds(60); // reset to default 1:00
    setShowTimerSettings(false);
  };

  const formatRestTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Helper to generate a unique id
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Handler for Auto Log (Video Log)
  const handleAutoLog = async () => {
    setShowLogChoiceSheet(false);
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant access to your photo library.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
        console.log('Picker Result:', result);
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
                id: generateId(),
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
        console.error('Video upload error:', error);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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
            id: generateId(),
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
  const handleAddManualSet = (exerciseId) => {
    setExercises(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(e => e.id === exerciseId);
      if (idx === -1) return prev; // Defensive: id not found
      const exercise = updated[idx];
      if (exercise.isSuperset && Array.isArray(exercise.exercises)) {
        exercise.exercises = exercise.exercises.map(ex => {
          const sets = ex.sets;
          const lastSet = sets.length > 0 ? sets[sets.length - 1] : {};
          return {
            ...ex,
            sets: [
              ...ex.sets,
              { id: generateId(), weight: lastSet.weight ?? '', reps: lastSet.reps ?? '', completed: false, video: null }
            ]
          };
        });
        updated[idx] = exercise;
      } else {
        // Normal exercise
        const sets = exercise.sets;
        const lastSet = sets.length > 0 ? sets[sets.length - 1] : {};
        const newSet = { id: generateId(), weight: lastSet.weight ?? '', reps: lastSet.reps ?? '', completed: false, video: null };
        exercise.sets = [...exercise.sets, newSet];
        updated[idx] = exercise;
      }
      return updated;
    });
  };

  // Add each selected exercise as a separate card
  const handleAddExercises = (selected) => {
    // Defensive: If selected is a string, wrap in array
    // If selected is an array of chars, join to a string
    let names = Array.isArray(selected) ? selected : [selected];
    if (names.length > 1 && names.every(n => typeof n === 'string' && n.length === 1)) {
      names = [names.join('')];
    }
    setExercises(prev => {
      const existingNames = prev.map(e => e.name);
      const newExercises = names.filter(name => !existingNames.includes(name));
      return [
        ...prev,
        ...newExercises.map(name => ({ id: generateId(), name, sets: [{ id: generateId(), weight: '', reps: '', completed: false, video: null }] })),
      ];
    });
    setSelectedExercises([]);
    setShowPicker(false);
  };

  // Add a single superset card containing all selected exercises
  const handleAddSuperset = (selected) => {
    // Safeguard: always treat as array
    const names = Array.isArray(selected) ? selected : [selected];
    setExercises(prev => {
      const isDuplicateSuperset = prev.some(e => e.isSuperset && Array.isArray(e.exercises) && e.exercises.length === names.length && e.exercises.every((ex, i) => ex.name === names[i]));
      if (isDuplicateSuperset) return prev;
      // Create superset card with unique id, and unique ids for each exercise and set inside
      const superset = {
        id: generateId(),
        isSuperset: true,
        exercises: names.map(name => ({ id: generateId(), name, sets: [{ id: generateId(), weight: '', reps: '', completed: false, video: null }] })),
      };
      return [...prev, superset];
    });
    setSelectedExercises([]);
    setShowPicker(false);
  };

  const toggleTimerMinimize = () => {
    const toValue = isTimerMinimized ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    setIsTimerMinimized(!isTimerMinimized);
  };

  // When the slider changes, set restTimeSeconds to the selected increment
  const handleSliderChange = (idx) => {
    setRestTimeSeconds(REST_TIME_OPTIONS[idx]);
  };

  // Helper to get the slider index from the current seconds value
  const getSliderIndex = (seconds) => {
    const idx = REST_TIME_OPTIONS.indexOf(seconds);
    return idx === -1 ? 3 : idx; // default to 1:00 if not found
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 0);
  };

  // Add useEffect to generate thumbnails only when needed
  useEffect(() => {
    exercises.forEach(exercise => {
      if (exercise.isSuperset && Array.isArray(exercise.exercises)) {
        exercise.exercises.forEach(subEx => {
          subEx.sets?.forEach(set => {
            const key = `${subEx.id}-${set.id}`;
            if (set.video && !videoThumbnails[key]) {
              generateThumbnail(set.video, subEx.id, set.id);
            }
          });
        });
      } else {
        exercise.sets?.forEach(set => {
          const key = `${exercise.id}-${set.id}`;
          if (set.video && !videoThumbnails[key]) {
            generateThumbnail(set.video, exercise.id, set.id);
          }
        });
      }
    });
  }, [exercises, videoThumbnails]);

  if (!isReady) {
    return null; // or a loading spinner if you prefer
  }

  return (
    <RootSiblingParent>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={[
            styles.header, 
            { 
              paddingTop: insets.top + 10,
              ...(isScrolled ? {
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
                zIndex: 1,
              } : null)
            }
          ]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{formatDate()}</Text>
              <View style={styles.headerIconsRow}>
                <TouchableOpacity 
                  style={styles.settingsButton}
                  onPress={handleSettingsPress}
                >
                  <Ionicons name="settings-outline" size={26} color={colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exitButton}
                  onPress={() => setShowExitModal(true)}
                >
                  <Ionicons name="close" size={28} color={colors.gray} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                {exercises.length} Exercise{exercises.length !== 1 ? 's' : ''} | {getTotalSetsCompleted()} Set{getTotalSetsCompleted() !== 1 ? 's' : ''} Completed
              </Text>
              <View style={styles.timerRightRow}>
                <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
              </View>
            </View>
          </View>
          <DraggableFlatList
            data={exercises}
            onDragBegin={index => {
              setPreDragExpandedExercises(expandedExercises);
              setExpandedExercises({});
              setDraggingIndex(index);
            }}
            onDragEnd={({ data }) => {
              setExercises(data);
              setDraggingIndex(null);
              if (preDragExpandedExercises) {
                setExpandedExercises(preDragExpandedExercises);
                setPreDragExpandedExercises(null);
              }
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ 
              ...styles.scrollView, 
              paddingBottom: insets.bottom + 270 // 68px footer + 53px timer + 40px extra padding + 50px complete button + 20px extra for timer position + safe area
            }}
            ListEmptyComponent={null}
            ListFooterComponent={exercises.length > 0 ? (
              <TouchableOpacity 
                style={styles.completeTextButton}
                onPress={handleEndWorkout}
              >
                <View style={styles.buttonContentRow}>
                  <Text style={styles.completeTextButtonText}>Complete Workout</Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gray} style={styles.buttonIcon} />
                </View>
              </TouchableOpacity>
            ) : null}
            renderItem={({ item: exercise, index: exerciseIdx, drag, isActive }) => {
              const faded = draggingIndex !== null && !isActive;
              const expanded = expandedExercises[exercise.id];
              return (
                <TouchableOpacity
                  onPress={() => toggleExerciseExpanded(exercise.id)}
                  onLongPress={drag}
                  disabled={isActive}
                  activeOpacity={0.95}
                  style={{ opacity: faded ? 0.4 : 1 }}
                >
                  <View style={styles.exerciseTableCard}>
                    {/* Card Header with expand/collapse and options */}
                    <View style={styles.exerciseTableHeader}>
                      {exercise.isSuperset ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="repeat" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                          <Text style={[styles.exerciseTableTitle, { color: colors.primary, fontSize: 17, fontFamily: 'DMSans-Regular' }]}>Superset</Text>
                        </View>
                      ) : (
                        <Text style={styles.exerciseTableTitle}>{exercise.name}</Text>
                      )}
                      <View style={styles.headerButtons}>
                        <TouchableOpacity 
                          style={styles.optionsButton}
                          onPress={() => handleExerciseOptions(exerciseIdx)}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.gray} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.expandButton}
                        >
                          <Ionicons 
                            name={expanded ? "chevron-down" : "chevron-forward"} 
                            size={20} 
                            color={colors.gray} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* Collapsed Superset View */}
                    {!expanded && exercise.isSuperset ? (
                      <View style={{ paddingVertical: 0 }}>
                        {exercise.exercises.map((ex, i) => (
                          <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 4 }}>
                            <Feather name="corner-right-up" size={18} color={colors.primary} style={{ marginRight: 6, transform: [{ rotate: '90deg' }] }} />
                            <Text style={styles.exerciseTableTitle}>{ex.name}</Text>
                          </View>
                        ))}
                        <Text style={[styles.exerciseTableSubtitle, { marginTop: 7 }]}> 
                          {exercise.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)} sets completed
                        </Text>
                      </View>
                    ) : null}
                    {/* Expanded Superset View */}
                    {expanded && exercise.isSuperset ? (
                      <>
                        {exercise.exercises.map((ex, exIdx) => (
                          <React.Fragment key={ex.id}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }}>
                              <Feather name="corner-right-up" size={18} color={colors.primary} style={{ marginRight: 6, transform: [{ rotate: '90deg' }] }} />
                              <Text style={[
                                styles.exerciseTableTitle,
                                exIdx === 0 && { marginTop: 0 },
                                { marginBottom: 10 }
                              ]}>{ex.name}</Text>
                            </View>
                            <View style={styles.tableContainer}>
                              <View style={styles.tableHeaderRow}>
                                <Text style={styles.tableCellSetHeader}>#</Text>
                                <Text style={styles.tableCellInputHeader}>kg</Text>
                                <Text style={styles.tableCellInputHeader}>Reps</Text>
                                <Text style={styles.tableCellIconHeader}> </Text>
                                <Text style={styles.tableCellCheckHeader}> </Text>
                              </View>
                              {ex.sets.map((set, setIdx) => (
                                <Swipeable
                                  key={set.id}
                                  ref={ref => swipeableRefs.current[`superset-${exercise.id}-${ex.id}-${set.id}`] = ref}
                                  renderRightActions={() => renderRightActions(exercise.id, set.id, ex.id)}
                                  rightThreshold={40}
                                >
                                  <View style={styles.tableRow}>
                                    <Text style={styles.tableCellSet}>{setIdx + 1}</Text>
                                    <TextInput
                                      style={styles.tableCellInput}
                                      value={set.weight?.toString() ?? ''}
                                      onChangeText={v => handleUpdateSet(exercise.id, set.id, 'weight', v, ex.id)}
                                      onEndEditing={e => handlePropagateSetValue(exercise.id, set.id, 'weight', e.nativeEvent.text, ex.id)}
                                      keyboardType="decimal-pad"
                                      placeholder="0"
                                      placeholderTextColor="#AAAAAA"
                                      editable={!set.completed}
                                      maxLength={4}
                                      returnKeyType="done"
                                      inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                    />
                                    <TextInput
                                      style={styles.tableCellInput}
                                      value={set.reps?.toString() ?? ''}
                                      onChangeText={v => handleUpdateSet(exercise.id, set.id, 'reps', v, ex.id)}
                                      onEndEditing={e => handlePropagateSetValue(exercise.id, set.id, 'reps', e.nativeEvent.text, ex.id)}
                                      keyboardType="number-pad"
                                      placeholder="0"
                                      placeholderTextColor="#AAAAAA"
                                      editable={!set.completed}
                                      maxLength={3}
                                      returnKeyType="done"
                                      inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                    />
                                    {renderVideoButton(exercise, set)}
                                    <TouchableOpacity
                                      style={styles.tableCellCheck}
                                      onPress={() => handleCompleteSet(exercise.id, set.id, ex.id)}
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
                              ))}
                            </View>
                            {exIdx < exercise.exercises.length - 1 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                                <View style={{ height: 1, backgroundColor: '#E5E7EB', flex: 1 }} />
                                <Ionicons name="chevron-down" size={18} color={colors.primary} style={{ marginHorizontal: 12 }} />
                                <View style={{ height: 1, backgroundColor: '#E5E7EB', flex: 1 }} />
                              </View>
                            )}
                          </React.Fragment>
                        ))}
                        <TouchableOpacity style={[styles.addSetButton, { alignSelf: 'center', marginTop: 12 }]} onPress={() => handleAddManualSet(exercise.id)}>
                          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                          <Text style={styles.addSetText}>Add set</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    {/* Collapsed Normal Exercise View */}
                    {!expanded && !exercise.isSuperset ? (
                      <Text style={styles.exerciseTableSubtitle}>
                        {`${exercise.sets.filter(s => s.completed).length} sets completed`}
                      </Text>
                    ) : null}
                    {/* Expanded Normal Exercise View */}
                    {expanded && !exercise.isSuperset ? (
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
                            <Swipeable
                              key={set.id}
                              ref={ref => swipeableRefs.current[`${exercise.id}-${set.id}`] = ref}
                              renderRightActions={() => renderRightActions(exercise.id, set.id)}
                              rightThreshold={40}
                            >
                              <View style={styles.tableRow}>
                                <Text style={styles.tableCellSet}>{setIdx + 1}</Text>
                                <TextInput
                                  style={styles.tableCellInput}
                                  value={set.weight?.toString() ?? ''}
                                  onChangeText={v => handleUpdateSet(exercise.id, set.id, 'weight', v)}
                                  onEndEditing={e => handlePropagateSetValue(exercise.id, set.id, 'weight', e.nativeEvent.text)}
                                  keyboardType="decimal-pad"
                                  placeholder="0"
                                  placeholderTextColor="#AAAAAA"
                                  editable={!set.completed}
                                  maxLength={4}
                                  returnKeyType="done"
                                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                />
                                <TextInput
                                  style={styles.tableCellInput}
                                  value={set.reps?.toString() ?? ''}
                                  onChangeText={v => handleUpdateSet(exercise.id, set.id, 'reps', v)}
                                  onEndEditing={e => handlePropagateSetValue(exercise.id, set.id, 'reps', e.nativeEvent.text)}
                                  keyboardType="number-pad"
                                  placeholder="0"
                                  placeholderTextColor="#AAAAAA"
                                  editable={!set.completed}
                                  maxLength={3}
                                  returnKeyType="done"
                                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                />
                                {renderVideoButton(exercise, set)}
                                <TouchableOpacity
                                  style={styles.tableCellCheck}
                                  onPress={() => handleCompleteSet(exercise.id, set.id)}
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
                          ))}
                        </View>
                        <TouchableOpacity style={[styles.addSetButton, { alignSelf: 'center', marginTop: 12 }]} onPress={() => handleAddManualSet(exercise.id)}>
                          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                          <Text style={styles.addSetText}>Add set</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          {exercises.length > 0 && !isTimerMinimized && (
            <Animated.View 
              style={[
                styles.floatingTimer,
                {
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 400]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.minimizeButton}
                onPress={toggleTimerMinimize}
              >
                <Ionicons 
                  name={isTimerMinimized ? "chevron-back" : "chevron-forward"} 
                  size={20} 
                  color={colors.gray} 
                />
              </TouchableOpacity>
              <View style={styles.restTimerContainer}>
                <Text style={styles.restTimerText}>{formatRestTime(restTimeSeconds)}</Text>
                <View style={styles.timerSliderContainerWide}>
                  {isResting ? (
                    // Show a custom progress bar
                    <RNView style={styles.progressBarBackground}>
                      <RNView
                        style={[
                          styles.progressBarFill,
                          { width: `${(restTimeSeconds / restTimeStart) * 100}%` }
                        ]}
                      />
                    </RNView>
                  ) : (
                    // Show the interactive slider
                    <Slider
                      style={styles.timerSliderWide}
                      minimumValue={0}
                      maximumValue={REST_TIME_OPTIONS.length - 1}
                      step={1}
                      value={getSliderIndex(restTimeSeconds)}
                      onValueChange={handleSliderChange}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.lightGray}
                      thumbTintColor={colors.primary}
                    />
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.timerPlayButton} 
                  onPress={handleRestTimer}
                >
                  <Ionicons 
                    name={isResting ? "pause" : "play"} 
                    size={29} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          {exercises.length > 0 && isTimerMinimized && (
            <TouchableOpacity 
              style={styles.minimizedTimer}
              onPress={toggleTimerMinimize}
            >
              <Ionicons name="timer-outline" size={29} color={colors.gray} />
            </TouchableOpacity>
          )}
          <View style={styles.footer}>
            <View style={styles.footerButtonRow}>
              <TouchableOpacity 
                style={styles.aiVideoButton}
                onPress={handleAutoLog}
              >
                <View style={styles.buttonContentRow}>
                  <Ionicons name="logo-electron" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.aiVideoButtonText}>Add Video</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.footerButtonSpacer} />
              <TouchableOpacity 
                style={styles.manualAddButton}
                onPress={() => setShowPicker(true)}
              >
                <View style={styles.buttonContentRow}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.manualAddButtonText}>Add Exercise</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ExercisePickerModal
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={setSelectedExercises}
          onAdd={handleAddExercises}
          onAddSuperset={handleAddSuperset}
          selectedExercises={selectedExercises}
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
        <Modal
          visible={showExitModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExitModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{ width: '94%', borderRadius: 18, backgroundColor: 'white', alignItems: 'center', paddingTop: 22.5, paddingBottom: 6.3, marginBottom: 8.1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 8 }}>
              <Text style={{ fontSize: 16, color: '#828284', textAlign: 'center', marginBottom: 19.44, fontFamily: 'DMSans-Regular', paddingHorizontal: 8.1 }}>
                Are you sure you want to quit this workout?
              </Text>
              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 12.96, alignItems: 'center', borderTopWidth: 1, borderColor: '#eee' }}
                onPress={() => { setShowExitModal(false); navigation.goBack(); }}
              >
                <Text style={{ color: '#FF3B30', fontSize: 20, fontWeight: '600', fontFamily: 'DMSans-Bold' }}>Quit Workout</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: '94%', borderRadius: 18, backgroundColor: 'white', alignItems: 'center', marginBottom: 19.44, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 8 }}>
              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 16, alignItems: 'center' }}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={{ color: '#007AFF', fontSize: 20, fontWeight: '600', fontFamily: 'DMSans-Bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {insets.bottom > 0 && (
          <View style={{ backgroundColor: 'white', height: insets.bottom, width: '100%' }} />
        )}
        {/* InputAccessoryView for iOS "Done" button */}
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View style={{ backgroundColor: '#F7F7F7', padding: 8, alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#E5E7EB' }}>
              <TouchableOpacity onPress={Keyboard.dismiss} style={{ paddingHorizontal: 18, paddingVertical: 6, borderRadius: 8, backgroundColor: '#6C3EF6' }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
        {/* Delete Exercise Modal */}
        <Modal
          visible={showDeleteExerciseModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteExerciseModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{ width: '94%', borderRadius: 18, backgroundColor: 'white', alignItems: 'center', paddingTop: 22.5, paddingBottom: 6.3, marginBottom: 8.1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 8 }}>
              <Text style={{ fontSize: 16, color: '#828284', textAlign: 'center', marginBottom: 19.44, fontFamily: 'DMSans-Regular', paddingHorizontal: 8.1 }}>
                Are you sure you want to delete this exercise?
              </Text>
              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 12.96, alignItems: 'center', borderTopWidth: 1, borderColor: '#eee' }}
                onPress={() => {
                  setShowDeleteExerciseModal(false);
                  setExercises(prev => prev.filter((_, idx) => idx !== pendingDeleteExerciseIdx));
                  setPendingDeleteExerciseIdx(null);
                }}
              >
                <Text style={{ color: '#FF3B30', fontSize: 20, fontWeight: '600', fontFamily: 'DMSans-Bold' }}>Delete Exercise</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: '94%', borderRadius: 18, backgroundColor: 'white', alignItems: 'center', marginBottom: 19.44, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 8 }}>
              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 16, alignItems: 'center' }}
                onPress={() => { setShowDeleteExerciseModal(false); setPendingDeleteExerciseIdx(null); }}
              >
                <Text style={{ color: '#007AFF', fontSize: 20, fontWeight: '600', fontFamily: 'DMSans-Bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
    paddingBottom: 10,
    backgroundColor: colors.background,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
    textAlign: 'left',
  },
  scrollView: {
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingTop: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
  footerButtonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSpacer: {
    width: 8,
  },
  aiVideoButton: {
    flex: 1,
    backgroundColor: '#23253A',
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiVideoButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
  },
  manualAddButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  restTimerText: {
    color: colors.darkGray,
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    textAlign: 'center',
    minWidth: 32,
    marginRight: 4,
  },
  timerSliderContainerWide: {
    flex: 4,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  timerSliderWide: {
    width: '100%',
    height: 40,
  },
  timerPlayButton: {
    width: 53,
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    padding: 0,
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
  timerRightRow: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: colors.gray,
    marginRight: 0,
  },
  settingsButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButton: {
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
    borderRadius: 2,
    backgroundColor: colors.lightGray,
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
  floatingTimer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: colors.white,
    borderRadius: 14,
    height: 53,
    paddingHorizontal: 14,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  minimizeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  minimizedTimer: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    width: 53,
    height: 53,
    backgroundColor: colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightGray,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  completeTextButton: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    height: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
  },
  completeTextButtonText: {
    color: colors.gray,
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    marginRight: 6,
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  exitModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 180,
  },
  exitModalHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightGray,
    alignSelf: 'center',
    marginBottom: 18,
  },
  exitModalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 32,
  },
  exitModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  exitModalQuitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: colors.lightGray,
  },
  exitModalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: colors.lightGray,
  },
  exitModalQuitText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  exitModalCancelText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  videoThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
}); 