import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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
  Switch,
  PanResponder,
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
import { supabase } from '../../config/supabase';
import CoachingFeedbackModal from '../../components/CoachingFeedbackModal';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';

// API base URL for uploads
const API_URL = 'https://gymvid-app.onrender.com';

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

const REST_TIME_OPTIONS = [
  { label: '0:15', value: 15 },
  { label: '0:30', value: 30 },
  { label: '0:45', value: 45 },
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '2:30', value: 150 },
  { label: '3:00', value: 180 },
  { label: '3:30', value: 210 },
  { label: '4:00', value: 240 },
  { label: '4:30', value: 270 },
  { label: '5:00', value: 300 }
];

// Add this helper function above the component
function getAIMetrics(set) {
  const repData = set.rep_data || [];
  const weight = set.weight || set.weight_kg || set.weight_estimation?.estimated_weight_kg || '';
  const reps = repData.length || set.reps || '';
  let avgRPE = '';
  let sumTUT = '';
  if (repData.length > 0) {
    avgRPE = (repData.reduce((sum, r) => sum + (parseFloat(r.estimated_RPE) || 0), 0) / repData.length).toFixed(1);
    sumTUT = repData.reduce((sum, r) => sum + (parseFloat(r.total_TUT) || 0), 0).toFixed(1);
  } else {
    avgRPE = set.rpe || '';
    sumTUT = set.tut || '';
  }
  return { weight, reps, avgRPE, sumTUT };
}

// Update the video preview modal
const VideoPreviewModal = ({ visible, videoUri, onClose }) => {
  const videoRef = useRef(null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        </View>
      </View>
    </Modal>
  );
};

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
  const [uploadingSet, setUploadingSet] = useState(null);
  const [analyzingSet, setAnalyzingSet] = useState(null);
  const [showCoachingFeedback, setShowCoachingFeedback] = useState({});
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [enableVideoUploads, setEnableVideoUploads] = useState(false);
  const [autoStartRestTimer, setAutoStartRestTimer] = useState(false);
  const [weightUnits, setWeightUnits] = useState('kg');
  const [autoPredictWeights, setAutoPredictWeights] = useState(true);
  const [exertionMetric, setExertionMetric] = useState('RPE');
  const [enableExertionTracking, setEnableExertionTracking] = useState(false);
  // Add at the top with other useState hooks
  const [pendingCards, setPendingCards] = useState([]);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackThumbnail, setFeedbackThumbnail] = useState(null);
  const [feedbackVideoUrl, setFeedbackVideoUrl] = useState(null);
  const [feedbackExerciseId, setFeedbackExerciseId] = useState(null);
  const [feedbackSetId, setFeedbackSetId] = useState(null);
  const [showRestTimePicker, setShowRestTimePicker] = useState(false);
  const [isRestTimeExpanded, setIsRestTimeExpanded] = useState(false);
  // Animated value for progress bar
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Add a unique ID for the accessory view
  const inputAccessoryViewID = 'doneAccessoryView';

  // PanResponder for swipe down to close settings modal
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical swipes starting on the handle
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 30 && gestureState.dy > 0;
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 40) {
          setShowSettingsModal(false);
        }
      },
    })
  ).current;

  const [previewVideo, setPreviewVideo] = useState(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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
        weight: autoPredictWeights ? (lastSet.weight ?? '') : '',
        weightUnit: weightUnits,
        reps: autoPredictWeights ? (lastSet.reps ?? '') : '',
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
      const exIdx = updated.findIndex(e => e.id === exerciseId);
      if (exIdx === -1) return prev;

      if (subExerciseId) {
        // Handle superset
        const subExIdx = updated[exIdx].exercises.findIndex(e => e.id === subExerciseId);
        if (subExIdx === -1) return prev;
        const sIdx = updated[exIdx].exercises[subExIdx].sets.findIndex(s => s.id === setId);
        if (sIdx === -1) return prev;

        const set = updated[exIdx].exercises[subExIdx].sets[sIdx];
        updated[exIdx].exercises[subExIdx].sets[sIdx] = {
          ...set,
          completed: !set.completed
        };
        if (!set.completed) {
          handleSetConfirm(exerciseId, setId, subExerciseId);
        }
      } else {
        // Handle regular set
        const sIdx = updated[exIdx].sets.findIndex(s => s.id === setId);
        if (sIdx === -1) return prev;

        const set = updated[exIdx].sets[sIdx];
        updated[exIdx].sets[sIdx] = {
          ...set,
          completed: !set.completed
        };
        if (!set.completed) {
          handleSetConfirm(exerciseId, setId);
        }
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
      const user = supabase.auth.user(); // V1 METHOD
      const userId = user?.id; // V1 user object is directly the user, not user.data.user
      if (!userId) throw new Error('User not authenticated');

      const workoutName = workoutNameInput || new Date().toLocaleString();
      const workoutDuration = calculateWorkoutDuration(); // Implement this function to calculate duration

      let totalExercises = 0;
      let totalSets = 0;
      let totalReps = 0;
      let totalWeightLifted = 0;

      const exerciseData = exercises.map(exercise => {
        const sets = exercise.sets.map(set => {
          const setTotalWeight = (set.weight_kg || set.weight_lb) * set.reps;
          totalWeightLifted += setTotalWeight;
          totalReps += set.reps;
          totalSets += 1;
          return {
            weight: set.weight_kg || set.weight_lb,
            reps: set.reps,
            rpe: set.rpe,
            rir: set.rir,
            video_url: set.video_url,
            set_total_weight: setTotalWeight
          };
        });

        const exerciseTotalWeight = sets.reduce((sum, set) => sum + set.set_total_weight, 0);
        const exerciseTotalReps = sets.reduce((sum, set) => sum + set.reps, 0);
        const numberOfSets = sets.length;

        totalExercises += 1;

        return {
          name: exercise.exercise_name,
          sets: JSON.stringify(sets),
          exercise_total_weight: exerciseTotalWeight,
          exercise_total_reps: exerciseTotalReps,
          number_of_sets: numberOfSets
        };
      });

      const { data: workoutData, error: workoutError } = await supabase.from('workouts').insert({
        user_id: userId,
        workout_name: workoutName,
        duration: workoutDuration,
        total_exercises: totalExercises,
        total_sets: totalSets,
        total_reps: totalReps,
        total_weight_lifted: totalWeightLifted,
        created_at: new Date().toISOString()
      }).single();

      if (workoutError) throw workoutError;

      const workoutId = workoutData.id;

      const { error: exercisesError } = await supabase.from('exercises').insert(
        exerciseData.map(exercise => ({ ...exercise, workout_id: workoutId }))
      );

      if (exercisesError) throw exercisesError;

      Alert.alert('Success', 'Workout saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleVideoUpload = async (exerciseId, setId) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        
        // Generate thumbnail immediately
        const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 0,
          quality: 0.5,
        });

        setExercises(prevExercises => {
          const exerciseExists = prevExercises.some(ex => ex.id === exerciseId);
          if (!exerciseExists) {
            console.error('No exercise found for id:', exerciseId, prevExercises);
            return prevExercises;
          }
          return prevExercises.map(exercise => {
            if (exercise.id === exerciseId) {
              if (!exercise.sets) {
                console.error('No sets found for exercise:', exercise);
                return exercise;
              }
              return {
                ...exercise,
                sets: exercise.sets.map(set => {
                  if (set.id === setId) {
                    return {
                      ...set,
                      localVideo: videoUri,
                      thumbnail: thumbnailUri,
                      isUploading: false
                    };
                  }
                  return set;
                })
              };
            }
            return exercise;
          });
        });
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const handleSetConfirm = async (exerciseId, setId, subExerciseId = null) => {
    try {
      const exercise = exercises.find(e => e.id === exerciseId);
      if (!exercise) return console.error('No exercise found:', exerciseId);

      const set = subExerciseId
        ? exercise.exercises?.find(e => e.id === subExerciseId)?.sets?.find(s => s.id === setId)
        : exercise.sets?.find(s => s.id === setId);
      if (!set) return console.error('No set found:', setId);

      if (set.isSubmitting) return; // 🚫 Prevent double-tap submits
      set.isSubmitting = true;

      const userId = supabase.auth?.user()?.id || 'demo-user';
      const formData = new FormData();

      formData.append('user_id', String(userId));
      formData.append('movement', String(set.exerciseName || exercise.name || 'Unknown Movement'));
      formData.append('equipment', String(set.equipment || 'Unknown Equipment'));
      formData.append('weight', String(set.kg || set.weight || '0'));
      formData.append('weight_unit', 'kg');
      formData.append('reps', String(set.reps || '0'));
      if (set.rpe) formData.append('rpe', String(set.rpe));
      if (set.rir) formData.append('rir', String(set.rir));

      if (set.localVideo) {
        const uri = set.localVideo.startsWith('file://') ? set.localVideo : `file://${set.localVideo}`;
        const name = uri.split('/').pop();
        const ext = name.split('.').pop()?.toLowerCase();
        const typeMap = {
          mp4: 'video/mp4',
          mov: 'video/quicktime',
          webm: 'video/webm',
          avi: 'video/x-msvideo',
          mkv: 'video/x-matroska',
        };
        const type = typeMap[ext] || 'video/mp4';

        if (!uri.startsWith('file://')) console.error('❌ Invalid video URI:', uri);

        const videoFile = {
          uri,
          name,
          type
        };
        console.log('✅ Attaching video to FormData:', videoFile);
        formData.append('video', videoFile);
      } else {
        console.log('⚠️ No video attached to this set');
      }

      for (let pair of formData.entries()) {
        if (pair[0] === 'video') {
          console.log(`video: uri=${pair[1]?.uri}, name=${pair[1]?.name}`);
        } else {
          console.log(`${pair[0]}: ${pair[1]}`);
        }
      }

      const response = await fetch(`${API_URL}/manual_log`, {
        method: 'POST',
        // Do NOT set Content-Type header for FormData in React Native
        body: formData
      });

      const text = await response.text();
      console.log('🔥 Raw response from /manual_log:', text);
      const data = JSON.parse(text);

      const hasUploadedVideo = !!data.video_url;

      setExercises(prev => {
        return prev.map(ex => {
          if (ex.id === exerciseId) {
            if (subExerciseId) {
              return {
                ...ex,
                exercises: ex.exercises.map(subEx => {
                  if (subEx.id === subExerciseId) {
                    return {
                      ...subEx,
                      sets: subEx.sets.map(s =>
                        s.id === setId
                          ? {
                              ...s,
                              video_url: hasUploadedVideo ? data.video_url : s.video_url || null,
                              thumbnail_url: hasUploadedVideo ? data.thumbnail_url : s.thumbnail || s.thumbnail_url || null,
                              localVideo: hasUploadedVideo ? null : s.localVideo,
                              isConfirmed: true,
                              isSubmitting: false,
                              weight: (data.data?.weight !== undefined ? data.data.weight : (data.data?.weight_kg !== undefined ? data.data.weight_kg : (s.kg !== undefined ? s.kg : s.weight))),
                              reps: (data.data?.reps !== undefined ? data.data.reps : s.reps),
                            }
                          : s
                      )
                    };
                  }
                  return subEx;
                })
              };
            } else {
              return {
                ...ex,
                sets: ex.sets.map(s =>
                  s.id === setId
                    ? {
                        ...s,
                        video_url: hasUploadedVideo ? data.video_url : s.video_url || null,
                        thumbnail_url: hasUploadedVideo ? data.thumbnail_url : s.thumbnail || s.thumbnail_url || null,
                        localVideo: hasUploadedVideo ? null : s.localVideo,
                        isConfirmed: true,
                        isSubmitting: false,
                        weight: (data.data?.weight !== undefined ? data.data.weight : (data.data?.weight_kg !== undefined ? data.data.weight_kg : (s.kg !== undefined ? s.kg : s.weight))),
                        reps: (data.data?.reps !== undefined ? data.data.reps : s.reps),
                      }
                    : s
                )
              };
            }
          }
          return ex;
        });
      });
    } catch (error) {
      console.error('❌ Error uploading set to /manual_log:', error);
    }
  };

  const handleAIAnalyzeForm = async (exerciseId, setId) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(set => {
          if (set.id !== setId) return set;
          return { ...set, analyzingForm: true };
        })
      };
    }));
    try {
      const exercise = exercises.find(e => e.id === exerciseId);
      const set = exercise?.sets.find(s => s.id === setId);
      if (!set || !set.video) throw new Error('No video found for analysis');
      const formData = new FormData();
      formData.append('video', {
        uri: set.video,
        type: 'video/mp4',
        name: set.video.split('/').pop()
      });
      formData.append('coaching', 'true');
      const response = await fetch('https://gymvid-app.onrender.com/process_set', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error('Coaching feedback failed');
      }
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id !== setId) return set;
            return {
              ...set,
              coaching_feedback: json.data.coaching_feedback || null,
              analyzingForm: false
            };
          })
        };
      }));
    } catch (error) {
      console.error('AI form analysis error:', error);
      Toast.show('Form analysis failed. Please try again.', { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM });
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id !== setId) return set;
            return { ...set, analyzingForm: false };
          })
        };
      }));
    }
  };

  const handleExerciseOptions = (exerciseId) => {
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
            // Immediately delete the exercise by id
            setExercises(prev => prev.filter(e => e.id !== exerciseId));
            setExpandedExercises(prev => {
              const updated = { ...prev };
              delete updated[exerciseId];
              return updated;
            });
          }
        }
      );
    }
  };

  const renderRightActions = (exerciseId, setId, subExerciseId = null) => {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSet(exerciseId, setId, subExerciseId)}
        >
          <Ionicons name="trash-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  const toggleExerciseExpanded = (exerciseId) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };

  // Animate progress bar when rest timer starts or updates
  useEffect(() => {
    if (isResting) {
      // Animate from full width to zero over restTimeStart seconds
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: restTimeStart * 1000,
        useNativeDriver: false,
        easing: t => t, // linear
      }).start();
    } else {
      progressAnim.setValue(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting, restTimeStart]);

  const handleRestTimer = () => {
    if (isResting) {
      if (restInterval.current) {
        clearInterval(restInterval.current);
        restInterval.current = null;
      }
      setIsResting(false);
      setRestTimeSeconds(defaultRestTime); // reset to default
      setRestTimeStart(defaultRestTime);
    } else {
      setRestTimeStart(restTimeSeconds); // always set to current value
      setIsResting(true);
      restInterval.current = setInterval(() => {
        setRestTimeSeconds(prev => {
          if (prev <= 1) {
            clearInterval(restInterval.current);
            setIsResting(false);
            setRestTimeSeconds(defaultRestTime);
            setRestTimeStart(defaultRestTime);
            return defaultRestTime;
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

  // Replace handleAddVideoAI with the new flow
  const handleAddVideoAI = async () => {
    let placeholderId = null;
    
    try {
      // Fix for Supabase v1.x
      const user = supabase.auth.user(); // V1 METHOD
      const user_id = user?.id;
      if (!user_id) {
        Toast.show('User not authenticated.', { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM });
        return;
      }

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

      if (result.canceled || !result.assets?.[0]?.uri) {
        Alert.alert('Error', 'No video selected. Please try again.');
        return;
      }

      const videoUri = result.assets[0].uri;

      // Show placeholder card
      placeholderId = generateId();
      setPendingCards(prev => [
        ...prev,
        { id: placeholderId, videoUri }
      ]);

      // Upload video directly to process_set endpoint
      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: videoUri.split('/').pop()
      });
      formData.append('user_id', user_id);
      formData.append('coaching', 'false');

      console.log('Uploading video to process_set...');
      const response = await fetch('https://gymvid-app.onrender.com/process_set', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const json = await response.json();
      console.log('Process set response:', json);

      if (!json.success || !json.data) {
        throw new Error(json.message || 'Video analysis failed');
      }

      // Remove placeholder card if it exists
      if (placeholderId) {
        setPendingCards(prev => prev.filter(card => card.id !== placeholderId));
      }

      // Add new exercise with analyzed data
      setExercises(prev => [
        ...prev,
        {
          id: generateId(),
          name: json.data.exercise_prediction?.movement || 'New Exercise',
          sets: [
            {
              id: generateId(),
              weight: json.data.weight_estimation?.estimated_weight_kg?.toString() || '',
              weightUnit: weightUnits,
              reps: json.data.rep_data?.length?.toString() || '',
              rpe: '',
              tut: '',
              completed: false,
              video: json.data.video_url,
              thumbnail_url: json.data.thumbnail_url,
              canAnalyzeForm: !!json.data.coaching_feedback,
              ai_analysis: {
                exercise_name: json.data.exercise_prediction?.movement,
                confidence: json.data.exercise_prediction?.confidence || 0,
                equipment: json.data.exercise_prediction?.equipment,
                variation: json.data.exercise_prediction?.variation
              }
            }
          ]
        }
      ]);

      // Expand the newly added exercise
      setExpandedExercises(prev => ({ ...prev, [exercises.length]: true }));

    } catch (error) {
      console.error('Video upload/analysis error:', error?.response?.data || error.message);
      
      // Remove placeholder card if it exists
      if (placeholderId) {
        setPendingCards(prev => prev.filter(card => card.id !== placeholderId));
      }

      // Show error toast
      Toast.show(
        'Failed to analyze video. Please try again.',
        { 
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          backgroundColor: '#FF3B30',
          textColor: '#FFFFFF'
        }
      );
    }
  };

  // Handler for Manual Log
  const handleManualLog = () => {
    setShowLogChoiceSheet(false);
    setShowPicker(true);
  };

  // Handler for Add AI Video Set (below each exercise card)
  const handleAddAIVideoSet = async (exerciseIdx) => {
    try {
      const user = supabase.auth.user(); // V1 METHOD
      const user_id = user?.id;
      if (!user_id) {
        Toast.show('User not authenticated.', { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM });
        return;
      }

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

      if (result.canceled || !result.assets?.[0]?.uri) {
        Alert.alert('Error', 'No video selected. Please try again.');
        return;
      }

      const videoUri = result.assets[0].uri;

      // POST to /analyze/log_set
      const formData = new FormData();
      formData.append('user_id', user_id);
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: videoUri.split('/').pop()
      });

      const response = await fetch('https://gymvid-app.onrender.com/analyze/log_set', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error('Video upload failed');
      }

      setExercises(prev => {
        const updated = [...prev];
        const newSet = {
          id: generateId(),
          weight: '',
          weightUnit: weightUnits,
          reps: '',
          rpe: '',
          tut: '',
          completed: false,
          video: json.data.video_url,
          thumbnail_url: json.data.thumbnail_url,
          canAnalyzeForm: true
        };
        updated[exerciseIdx].sets = [...updated[exerciseIdx].sets, newSet];
        return updated;
      });

      setExpandedExercises(prev => ({ ...prev, [exerciseIdx]: true }));

    } catch (error) {
      console.error('Video upload error:', error);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
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
              {
                id: generateId(),
                weight: autoPredictWeights ? (lastSet.weight ?? '') : '',
                weightUnit: weightUnits,
                reps: autoPredictWeights ? (lastSet.reps ?? '') : '',
                completed: false,
                video: null
              }
            ]
          };
        });
        updated[idx] = exercise;
      } else {
        // Normal exercise
        const sets = exercise.sets;
        const lastSet = sets.length > 0 ? sets[sets.length - 1] : {};
        const newSet = {
          id: generateId(),
          weight: autoPredictWeights ? (lastSet.weight ?? '') : '',
          weightUnit: weightUnits,
          reps: autoPredictWeights ? (lastSet.reps ?? '') : '',
          completed: false,
          video: null
        };
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
    setRestTimeSeconds(REST_TIME_OPTIONS[idx].value);
  };

  // Helper to get the slider index from the current seconds value
  const getSliderIndex = (seconds) => {
    const idx = REST_TIME_OPTIONS.findIndex(option => option.value === seconds);
    return idx === -1 ? 3 : idx; // default to 1:00 if not found
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 0);
  };

  const handleExitPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Quit Workout'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigation.goBack();
          }
        }
      );
    }
  };

  // Dropdown handlers for iOS style
  const handleWeightUnitsPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['kg', 'lb', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) setWeightUnits('kg');
        if (buttonIndex === 1) setWeightUnits('lb');
      }
    );
  };
  const handleExertionMetricPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['RPE', 'RIR', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) setExertionMetric('RPE');
        if (buttonIndex === 1) setExertionMetric('RIR');
      }
    );
  };

  const handleShowCoachingFeedback = async (exerciseId, setId, videoUrl, thumbnailUrl, subExerciseId = null) => {
    // Get the set from the exercises array
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const set = subExerciseId 
      ? exercise.exercises?.find(e => e.id === subExerciseId)?.sets?.find(s => s.id === setId)
      : exercise.sets?.find(s => s.id === setId);

    if (!set || !set.video_url) return;

    // Don't proceed if already loading or has successful feedback
    if (set.coaching?.status === 'loading' || set.coaching?.status === 'success') {
      setFeedbackModalVisible(true);
      setFeedbackLoading(false);
      setFeedbackData(set.coaching?.feedback);
      setFeedbackThumbnail(thumbnailUrl);
      setFeedbackVideoUrl(videoUrl);
      return;
    }

    // Set loading state
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      if (subExerciseId) {
        return {
          ...ex,
          exercises: ex.exercises.map(subEx => {
            if (subEx.id !== subExerciseId) return subEx;
            return {
              ...subEx,
              sets: subEx.sets.map(s => 
                s.id === setId 
                  ? { ...s, coaching: { status: 'loading', feedback: null } }
                  : s
              )
            };
          })
        };
      }
      return {
        ...ex,
        sets: ex.sets.map(s => 
          s.id === setId 
            ? { ...s, coaching: { status: 'loading', feedback: null } }
            : s
        )
      };
    }));

    // Show modal with loading state
    setFeedbackModalVisible(true);
    setFeedbackLoading(true);
    setFeedbackData(null);
    setFeedbackThumbnail(thumbnailUrl);
    setFeedbackVideoUrl(videoUrl);

    try {
      const user = supabase.auth.user(); // V1 METHOD
      const user_id = user?.id;
      if (!user_id) throw new Error('User not authenticated');

      const response = await fetch(`${API_URL}/analyze/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          movement: set.exerciseName || 'Unknown',
          video_url: set.video_url
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error('Failed to get coaching feedback');

      // Update state with success
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        if (subExerciseId) {
          return {
            ...ex,
            exercises: ex.exercises.map(subEx => {
              if (subEx.id !== subExerciseId) return subEx;
              return {
                ...subEx,
                sets: subEx.sets.map(s => 
                  s.id === setId 
                    ? { ...s, coaching: { status: 'success', feedback: data.feedback } }
                    : s
                )
              };
            })
          };
        }
        return {
          ...ex,
          sets: ex.sets.map(s => 
            s.id === setId 
              ? { ...s, coaching: { status: 'success', feedback: data.feedback } }
              : s
          )
        };
      }));

      setFeedbackLoading(false);
      setFeedbackData(data.feedback);

    } catch (error) {
      console.error('Error getting coaching feedback:', error);
      
      // Update state with error
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        if (subExerciseId) {
          return {
            ...ex,
            exercises: ex.exercises.map(subEx => {
              if (subEx.id !== subExerciseId) return subEx;
              return {
                ...subEx,
                sets: subEx.sets.map(s => 
                  s.id === setId 
                    ? { ...s, coaching: { status: 'error', feedback: null } }
                    : s
                )
              };
            })
          };
        }
        return {
          ...ex,
          sets: ex.sets.map(s => 
            s.id === setId 
              ? { ...s, coaching: { status: 'error', feedback: null } }
              : s
          )
        };
      }));

      setFeedbackLoading(false);
      setFeedbackData(null);
      Toast.show('Failed to get coaching feedback. Please try again.', { 
        duration: Toast.durations.SHORT, 
        position: Toast.positions.BOTTOM 
      });
    }
  };

  useEffect(() => {
    const loadDefaultRestTime = async () => {
      try {
        const savedTime = await AsyncStorage.getItem('defaultRestTime');
        if (savedTime) {
          const time = parseInt(savedTime);
          setDefaultRestTime(time);
          setRestTimeSeconds(time);
        }
      } catch (error) {
        console.error('Error loading default rest time:', error);
      }
    };
    loadDefaultRestTime();
  }, []);

  // First, let's modify the handleRestTimeSelect function to accept a parameter that controls modal closing
  const handleRestTimeSelect = async (time, shouldCloseModal = false) => {
    try {
      await AsyncStorage.setItem('defaultRestTime', time.toString());
      setDefaultRestTime(time);
      setRestTimeSeconds(time);
      if (shouldCloseModal) {
        setShowRestTimePicker(false);
        setShowSettingsModal(false);
      }
    } catch (error) {
      console.error('Error saving default rest time:', error);
    }
  };

  const formatRestTimeDisplay = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isReady) {
    return null; // or a loading spinner if you prefer
  }

  const handleVideoPreview = (set) => {
    const videoUriToPreview = set.localVideo || set.video_url;
    if (videoUriToPreview) {
      setPreviewVideo(videoUriToPreview);
      setIsPreviewVisible(true);
    }
  };

  const closePreview = () => {
    setIsPreviewVisible(false);
    setPreviewVideo(null);
  };

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
                  onPress={handleExitPress}
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
          {pendingCards.map(card => (
            <View key={card.id} style={styles.exerciseTableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.exerciseTableTitle}>Analyzing your lift...</Text>
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center', height: 180 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            </View>
          ))}
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
                <Swipeable
                  ref={ref => swipeableRefs.current[`${exercise.id}`] = ref}
                  renderRightActions={() => renderRightActions(exercise.id)}
                  rightThreshold={5} // Reduce the swipe threshold to bring the delete button closer
                >
                  <TouchableOpacity
                    onPress={() => toggleExerciseExpanded(exercise.id)}
                    // REMOVE onLongPress={drag} from here
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
                            onPress={() => handleExerciseOptions(exercise.id)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray} />
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
                                {/* Superset expanded header row */}
                                <View style={styles.tableHeaderRow}>
                                  <View style={styles.tableCellSetHeader}>
                                    <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}>#</Text>
                                  </View>
                                  <TextInput
                                    style={styles.tableCellInputHeaderInput}
                                    value={weightUnits}
                                    editable={false}
                                    selectTextOnFocus={false}
                                    pointerEvents="none"
                                  />
                                  <TextInput
                                    style={styles.tableCellInputHeaderInput}
                                    value="Reps"
                                    editable={false}
                                    selectTextOnFocus={false}
                                    pointerEvents="none"
                                  />
                                  {enableExertionTracking ? (
                                    <TextInput
                                      style={styles.tableCellInputHeaderInputNarrow}
                                      value={exertionMetric}
                                      editable={false}
                                      selectTextOnFocus={false}
                                      pointerEvents="none"
                                    />
                                  ) : null}
                                  <View style={styles.tableCellIconHeader}>
                                    <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}> </Text>
                                  </View>
                                  <View style={styles.tableCellCheckHeader}>
                                    <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}> </Text>
                                  </View>
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
                                      {enableExertionTracking && (
                                        <TextInput
                                          style={styles.tableCellInputNarrow}
                                          value={set[exertionMetric.toLowerCase()]?.toString() ?? ''}
                                          onChangeText={v => handleUpdateSet(exercise.id, set.id, exertionMetric.toLowerCase(), v, ex.id)}
                                          keyboardType="decimal-pad"
                                          placeholder="-"
                                          placeholderTextColor="#AAAAAA"
                                          editable={!set.completed}
                                          maxLength={3}
                                          returnKeyType="done"
                                          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                        />
                                      )}
                                      {set.thumbnail || set.thumbnail_url ? (
                                        <TouchableOpacity 
                                          style={styles.thumbnailContainer}
                                          onPress={() => handleVideoPreview(set)}
                                        >
                                          <Image 
                                            source={{ uri: set.thumbnail || set.thumbnail_url }} 
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                          />
                                        </TouchableOpacity>
                                      ) : (
                                        <TouchableOpacity 
                                          style={styles.cameraButtonContainer}
                                          onPress={() => handleVideoUpload(exercise.id, set.id)}
                                        >
                                          <View style={styles.cameraButtonInner}>
                                            <Ionicons name="camera-outline" size={24} color={colors.gray} />
                                          </View>
                                        </TouchableOpacity>
                                      )}
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
                                    {/* AI Analysis Results */}
                                    {set.ai_analysis && (
                                      <View style={styles.aiAnalysisContainer}>
                                        <View style={styles.aiAnalysisRow}>
                                          <Text style={styles.aiAnalysisLabel}>Exercise:</Text>
                                          <Text style={styles.aiAnalysisValue}>{set.ai_analysis.exercise_name}</Text>
                                          <Text style={styles.aiAnalysisConfidence}>({set.ai_analysis.confidence}% confidence)</Text>
                                        </View>
                                        {set.ai_analysis.equipment && (
                                          <View style={styles.aiAnalysisRow}>
                                            <Text style={styles.aiAnalysisLabel}>Equipment:</Text>
                                            <Text style={styles.aiAnalysisValue}>{set.ai_analysis.equipment}</Text>
                                          </View>
                                        )}
                                        {set.ai_analysis.variation && (
                                          <View style={styles.aiAnalysisRow}>
                                            <Text style={styles.aiAnalysisLabel}>Variation:</Text>
                                            <Text style={styles.aiAnalysisValue}>{set.ai_analysis.variation}</Text>
                                          </View>
                                        )}
                                        {set.canAnalyzeForm && !set.coaching_feedback && (
                                          <TouchableOpacity 
                                            style={styles.aiAnalyzeButton}
                                            onPress={() => handleShowCoachingFeedback(exercise.id, set.id, set.video, set.thumbnail_url)}
                                            disabled={feedbackLoading && feedbackExerciseId === exercise.id && feedbackSetId === set.id}
                                          >
                                            {feedbackLoading && feedbackExerciseId === exercise.id && feedbackSetId === set.id ? (
                                              <ActivityIndicator size="small" color={colors.white} />
                                            ) : (
                                              <>
                                                <Ionicons name="analytics-outline" size={16} color={colors.white} style={styles.aiAnalyzeIcon} />
                                                <Text style={styles.aiAnalyzeText}>Get Coaching Tips</Text>
                                              </>
                                            )}
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    )}
                                    {/* Coaching Feedback */}
                                    {showCoachingFeedback[set.id] && set.coaching_feedback && (
                                      <View style={styles.coachingFeedbackContainer}>
                                        <Text style={styles.coachingFeedbackTitle}>Coaching Feedback</Text>
                                        <Text style={styles.coachingFeedbackSummary}>{set.coaching_feedback.summary}</Text>
                                        {set.coaching_feedback.technical_tips?.length > 0 && (
                                          <View style={styles.technicalTipsContainer}>
                                            <Text style={styles.technicalTipsTitle}>Technical Tips:</Text>
                                            {set.coaching_feedback.technical_tips.map((tip, index) => (
                                              <Text key={index} style={styles.technicalTip}>• {tip}</Text>
                                            ))}
                                          </View>
                                        )}
                                        {set.coaching_feedback.tempo_guidance && (
                                          <Text style={styles.tempoGuidance}>{set.coaching_feedback.tempo_guidance}</Text>
                                        )}
                                        <Text style={styles.motivation}>{set.coaching_feedback.motivation}</Text>
                                      </View>
                                    )}
                                    {/* AI Coaching Feedback Button */}
                                    {set.completed && set.video_url && (
                                      <TouchableOpacity
                                        style={[styles.aiCoachingButton]}
                                        onPress={() => handleShowCoachingFeedback(exercise.id, set.id, set.video_url, set.thumbnail_url)}
                                      >
                                        <Ionicons name="analytics-outline" size={18} color="#6C3EF6" />
                                        <Text style={styles.aiCoachingButtonText}>AI Coaching Feedback</Text>
                                      </TouchableOpacity>
                                    )}
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
                            {/* Normal expanded header row */}
                            <View style={styles.tableHeaderRow}>
                              <View style={styles.tableCellSetHeader}>
                                <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}>#</Text>
                              </View>
                              <TextInput
                                style={styles.tableCellInputHeaderInput}
                                value={weightUnits}
                                editable={false}
                                selectTextOnFocus={false}
                                pointerEvents="none"
                              />
                              <TextInput
                                style={styles.tableCellInputHeaderInput}
                                value="Reps"
                                editable={false}
                                selectTextOnFocus={false}
                                pointerEvents="none"
                              />
                              {enableExertionTracking ? (
                                <TextInput
                                  style={styles.tableCellInputHeaderInputNarrow}
                                  value={exertionMetric}
                                  editable={false}
                                  selectTextOnFocus={false}
                                  pointerEvents="none"
                                />
                              ) : null}
                              <View style={styles.tableCellIconHeader}>
                                <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}> </Text>
                              </View>
                              <View style={styles.tableCellCheckHeader}>
                                <Text style={{ color: colors.gray, textAlign: 'center', fontSize: 12 }}> </Text>
                              </View>
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
                                  {enableExertionTracking && (
                                    <TextInput
                                      style={styles.tableCellInputNarrow}
                                      value={set[exertionMetric.toLowerCase()]?.toString() ?? ''}
                                      onChangeText={v => handleUpdateSet(exercise.id, set.id, exertionMetric.toLowerCase(), v)}
                                      keyboardType="decimal-pad"
                                      placeholder="-"
                                      placeholderTextColor="#AAAAAA"
                                      editable={!set.completed}
                                      maxLength={3}
                                      returnKeyType="done"
                                      inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                                    />
                                  )}
                                  {set.thumbnail || set.thumbnail_url ? (
                                    <TouchableOpacity 
                                      style={styles.thumbnailContainer}
                                      onPress={() => handleVideoPreview(set)}
                                    >
                                      <Image 
                                        source={{ uri: set.thumbnail || set.thumbnail_url }} 
                                        style={styles.thumbnail}
                                        resizeMode="cover"
                                      />
                                    </TouchableOpacity>
                                  ) : (
                                    <TouchableOpacity 
                                      style={styles.cameraButtonContainer}
                                      onPress={() => handleVideoUpload(exercise.id, set.id)}
                                    >
                                      <View style={styles.cameraButtonInner}>
                                        <Ionicons name="camera-outline" size={24} color={colors.gray} />
                                      </View>
                                    </TouchableOpacity>
                                  )}
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
                                {/* AI Analysis Results */}
                                {set.ai_analysis && (
                                  <View style={styles.aiAnalysisContainer}>
                                    <View style={styles.aiAnalysisRow}>
                                      <Text style={styles.aiAnalysisLabel}>Exercise:</Text>
                                      <Text style={styles.aiAnalysisValue}>{set.ai_analysis.exercise_name}</Text>
                                      <Text style={styles.aiAnalysisConfidence}>({set.ai_analysis.confidence}% confidence)</Text>
                                    </View>
                                    {set.ai_analysis.equipment && (
                                      <View style={styles.aiAnalysisRow}>
                                        <Text style={styles.aiAnalysisLabel}>Equipment:</Text>
                                        <Text style={styles.aiAnalysisValue}>{set.ai_analysis.equipment}</Text>
                                      </View>
                                    )}
                                    {set.ai_analysis.variation && (
                                      <View style={styles.aiAnalysisRow}>
                                        <Text style={styles.aiAnalysisLabel}>Variation:</Text>
                                        <Text style={styles.aiAnalysisValue}>{set.ai_analysis.variation}</Text>
                                      </View>
                                    )}
                                    {set.canAnalyzeForm && !set.coaching_feedback && (
                                      <TouchableOpacity 
                                        style={styles.aiAnalyzeButton}
                                        onPress={() => handleShowCoachingFeedback(exercise.id, set.id, set.video, set.thumbnail_url)}
                                        disabled={feedbackLoading && feedbackExerciseId === exercise.id && feedbackSetId === set.id}
                                      >
                                        {feedbackLoading && feedbackExerciseId === exercise.id && feedbackSetId === set.id ? (
                                          <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                          <>
                                            <Ionicons name="analytics-outline" size={16} color={colors.white} style={styles.aiAnalyzeIcon} />
                                            <Text style={styles.aiAnalyzeText}>Get Coaching Tips</Text>
                                          </>
                                        )}
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                                {/* Coaching Feedback */}
                                {showCoachingFeedback[set.id] && set.coaching_feedback && (
                                  <View style={styles.coachingFeedbackContainer}>
                                    <Text style={styles.coachingFeedbackTitle}>Coaching Feedback</Text>
                                    <Text style={styles.coachingFeedbackSummary}>{set.coaching_feedback.summary}</Text>
                                    {set.coaching_feedback.technical_tips?.length > 0 && (
                                      <View style={styles.technicalTipsContainer}>
                                        <Text style={styles.technicalTipsTitle}>Technical Tips:</Text>
                                        {set.coaching_feedback.technical_tips.map((tip, index) => (
                                          <Text key={index} style={styles.technicalTip}>• {tip}</Text>
                                        ))}
                                      </View>
                                    )}
                                    {set.coaching_feedback.tempo_guidance && (
                                      <Text style={styles.tempoGuidance}>{set.coaching_feedback.tempo_guidance}</Text>
                                    )}
                                    <Text style={styles.motivation}>{set.coaching_feedback.motivation}</Text>
                                  </View>
                                )}
                                {/* AI Coaching Feedback Button */}
                                {set.completed && set.video_url && (
                                  <TouchableOpacity
                                    style={[styles.aiCoachingButton]}
                                    onPress={() => handleShowCoachingFeedback(exercise.id, set.id, set.video_url, set.thumbnail_url)}
                                  >
                                    <Ionicons name="analytics-outline" size={18} color="#6C3EF6" />
                                    <Text style={styles.aiCoachingButtonText}>AI Coaching Feedback</Text>
                                  </TouchableOpacity>
                                )}
                              </Swipeable>
                            ))}
                          </View>
                          <TouchableOpacity style={[styles.addSetButton, { alignSelf: 'center', marginTop: 3 }]} onPress={() => handleAddManualSet(exercise.id)}>
                            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles.addSetText}>Add set</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
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
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          { width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            }) }
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
              {isResting ? (
                <View style={StyleSheet.absoluteFill}>
                  <Svg width={53} height={53}>
                    <Circle
                      cx={26.5}
                      cy={26.5}
                      r={18}
                      stroke={colors.lightGray}
                      strokeWidth={4}
                      fill="none"
                    />
                    <Circle
                      cx={26.5}
                      cy={26.5}
                      r={18}
                      stroke={colors.primary}
                      strokeWidth={4}
                      fill="none"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={(2 * Math.PI * 18) * (1 - (restTimeSeconds / restTimeStart))}
                      strokeLinecap="round"
                      transform={`rotate(-90, 26.5, 26.5)`}
                    />
                  </Svg>
                  {/* Centered timer text */}
                  <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 11.2, fontWeight: 'bold', color: colors.darkGray }}>
                      {formatRestTime(restTimeSeconds)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Ionicons name="timer-outline" size={29} color={colors.gray} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.footer}>
            <View style={styles.footerButtonRow}>
              <TouchableOpacity 
                style={styles.aiVideoButton}
                onPress={handleAddVideoAI}
                disabled={isUploading}
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
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowTimerSettings(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={e => e.stopPropagation()}
            >
              <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 0, paddingBottom: 32, paddingHorizontal: 0, width: '100%', minHeight: 420 }}>
                {/* Header */}
                <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 18, paddingBottom: 20 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 }} />
                  <Text style={{ fontSize: 24, fontFamily: 'DMSans-Black', color: colors.darkGray, textAlign: 'left', flex: 1 }}>Workout Settings</Text>
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 18, top: 18, padding: 4 }}
                    onPress={() => setShowTimerSettings(false)}
                  >
                    <Ionicons name="close" size={28} color="#B0B0B0" />
                  </TouchableOpacity>
                </View>
                {/* Settings Rows */}
                <View style={{ borderTopWidth: 1, borderColor: '#F0F0F0' }}>
                  {/* 1. Auto-Start Rest Timer */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Auto-Start Rest Timer</Text>
                    <Switch value={autoStartRestTimer} onValueChange={setAutoStartRestTimer} />
                  </View>

                  {/* 2. Default Rest Time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Default Rest Time</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={{ padding: 8 }}
                        onPress={() => {
                          const currentIndex = REST_TIME_OPTIONS.findIndex(opt => opt.value === defaultRestTime);
                          if (currentIndex > 0) {
                            handleRestTimeSelect(REST_TIME_OPTIONS[currentIndex - 1].value, false);
                          }
                        }}
                      >
                        <Ionicons name="remove-circle-outline" size={24} color={colors.gray} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginHorizontal: 3 }}>
                        {formatRestTimeDisplay(defaultRestTime)}
                      </Text>
                      <TouchableOpacity 
                        style={{ padding: 8 }}
                        onPress={() => {
                          const currentIndex = REST_TIME_OPTIONS.findIndex(opt => opt.value === defaultRestTime);
                          if (currentIndex < REST_TIME_OPTIONS.length - 1) {
                            handleRestTimeSelect(REST_TIME_OPTIONS[currentIndex + 1].value, false);
                          }
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={24} color={colors.gray} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3. Auto-Predict Weights */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Auto-Predict Weights</Text>
                    <Switch value={autoPredictWeights} onValueChange={setAutoPredictWeights} />
                  </View>

                  {/* 4. Weight Units Dropdown */}
                  <TouchableOpacity onPress={handleWeightUnitsPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Weight Units</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginRight: 4 }}>{weightUnits}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
                    </View>
                  </TouchableOpacity>

                  {/* 5. Enable Exertion Tracking */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Enable Exertion Tracking</Text>
                    <Switch value={enableExertionTracking} onValueChange={setEnableExertionTracking} />
                  </View>

                  {/* 6. Exertion Metric Dropdown */}
                  <TouchableOpacity onPress={handleExertionMetricPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Exertion Metric</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginRight: 4 }}>{exertionMetric}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Rest Time Picker Modal */}
        <Modal
          visible={showRestTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRestTimePicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, position: 'relative' }}>
                <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.darkGray }}>Default Rest Time</Text>
                <TouchableOpacity
                  style={{ position: 'absolute', right: 20, padding: 4 }}
                  onPress={() => setShowRestTimePicker(false)}
                >
                  <Ionicons name="close" size={28} color="#B0B0B0" />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                  {REST_TIME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.timeButton,
                        defaultRestTime === option.value && styles.timeButtonSelected
                      ]}
                      onPress={() => {
                        handleRestTimeSelect(option.value);
                        setShowRestTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timeButtonText,
                        defaultRestTime === option.value && styles.timeButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
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
        <Modal
          visible={showSettingsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32, position: 'relative' }}>
                {/* Close button flush with top, above modal content */}
                <TouchableOpacity
                  style={{ position: 'absolute', right: 12, top: 12, zIndex: 100, padding: 4, backgroundColor: colors.background, borderRadius: 16 }}
                  onPress={() => setShowSettingsModal(false)}
                >
                  <Ionicons name="close" size={28} color={colors.gray} />
                </TouchableOpacity>
                <View
                  style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12, marginTop: 0 }}
                  {...panResponder.panHandlers}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, position: 'relative' }}>
                  <Text style={{ fontSize: 24, fontFamily: 'DMSans-Black', color: colors.darkGray, textAlign: 'left', flex: 1 }}>Workout Settings</Text>
                </View>
                {/* Settings Groups */}
                <View style={{ gap: 16, paddingHorizontal: 16 }}>
                  {/* Group 1 */}
                  <View style={{ backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Auto-Start Rest Timer</Text>
                      <Switch value={autoStartRestTimer} onValueChange={setAutoStartRestTimer} />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.background, marginHorizontal: 20 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Default Rest Time</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={{ padding: 8 }}
                          onPress={() => {
                            const currentIndex = REST_TIME_OPTIONS.findIndex(opt => opt.value === defaultRestTime);
                            if (currentIndex > 0) {
                              handleRestTimeSelect(REST_TIME_OPTIONS[currentIndex - 1].value, false);
                            }
                          }}
                        >
                          <Ionicons name="remove-circle-outline" size={24} color={colors.gray} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginHorizontal: 3 }}>
                          {formatRestTimeDisplay(defaultRestTime)}
                        </Text>
                        <TouchableOpacity 
                          style={{ padding: 8 }}
                          onPress={() => {
                            const currentIndex = REST_TIME_OPTIONS.findIndex(opt => opt.value === defaultRestTime);
                            if (currentIndex < REST_TIME_OPTIONS.length - 1) {
                              handleRestTimeSelect(REST_TIME_OPTIONS[currentIndex + 1].value, false);
                            }
                          }}
                        >
                          <Ionicons name="add-circle-outline" size={24} color={colors.gray} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {/* Separator */}
                  <View style={{ height: 1, backgroundColor: colors.lightGray, marginVertical: 0, marginHorizontal: 8 }} />
                  {/* Group 2 */}
                  <View style={{ backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Auto-Predict Weights</Text>
                      <Switch value={autoPredictWeights} onValueChange={setAutoPredictWeights} />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.lightGray, marginHorizontal: 20 }} />
                    <TouchableOpacity onPress={handleWeightUnitsPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Weight Units</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginRight: 4 }}>{weightUnits}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
                      </View>
                    </TouchableOpacity>
                  </View>
                  {/* Separator */}
                  <View style={{ height: 1, backgroundColor: colors.lightGray, marginVertical: 0, marginHorizontal: 8 }} />
                  {/* Group 3 */}
                  <View style={{ backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Enable Exertion Tracking</Text>
                      <Switch value={enableExertionTracking} onValueChange={setEnableExertionTracking} />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.lightGray, marginHorizontal: 20 }} />
                    <TouchableOpacity onPress={handleExertionMetricPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.darkGray }}>Exertion Metric</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: colors.gray, marginRight: 4 }}>{exertionMetric}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <CoachingFeedbackModal
          visible={feedbackModalVisible}
          onClose={() => setFeedbackModalVisible(false)}
          loading={feedbackLoading}
          feedback={feedbackData}
          videoThumbnail={feedbackThumbnail}
          exerciseName={(() => {
            if (!feedbackExerciseId || !feedbackSetId) return '';
            const exercise = exercises.find(e => e.id === feedbackExerciseId);
            if (!exercise) return '';
            if (exercise.isSuperset) {
              for (const subEx of exercise.exercises) {
                const set = subEx.sets.find(s => s.id === feedbackSetId);
                if (set) return subEx.name;
              }
              return '';
            } else {
              return exercise.name;
            }
          })()}
          setNumber={(() => {
            if (!feedbackExerciseId || !feedbackSetId) return 1;
            const exercise = exercises.find(e => e.id === feedbackExerciseId);
            if (!exercise) return 1;
            if (exercise.isSuperset) {
              for (const subEx of exercise.exercises) {
                const idx = subEx.sets.findIndex(s => s.id === feedbackSetId);
                if (idx !== -1) return idx + 1;
              }
              return 1;
            } else {
              const idx = exercise.sets.findIndex(s => s.id === feedbackSetId);
              return idx !== -1 ? idx + 1 : 1;
            }
          })()}
          metrics={(() => {
            if (!feedbackExerciseId || !feedbackSetId) return {};
            const exercise = exercises.find(e => e.id === feedbackExerciseId);
            if (!exercise) return {};
            let set = null;
            if (exercise.isSuperset) {
              for (const subEx of exercise.exercises) {
                set = subEx.sets.find(s => s.id === feedbackSetId);
                if (set) break;
              }
            } else {
              set = exercise.sets.find(s => s.id === feedbackSetId);
            }
            if (!set) return {};
            return {
              form_rating: feedbackData?.form_rating ?? '',
              weight: set.weight ?? '',
              reps: set.reps ?? '',
              rpe: set.rpe ?? '',
              tut: set.tut ?? '',
            };
          })()}
          set={(() => {
            if (!feedbackExerciseId || !feedbackSetId) return null;
            const exercise = exercises.find(e => e.id === feedbackExerciseId);
            if (!exercise) return null;
            let set = null;
            if (exercise.isSuperset) {
              for (const subEx of exercise.exercises) {
                set = subEx.sets.find(s => s.id === feedbackSetId);
                if (set) break;
              }
            } else {
              set = exercise.sets.find(s => s.id === feedbackSetId);
            }
            return set;
          })()}
        />
        
        {/* Video Preview Modal */}
        <VideoPreviewModal
          visible={isPreviewVisible}
          videoUri={previewVideo}
          onClose={closePreview}
        />
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
    alignItems: 'center', // Ensure vertical alignment
    marginBottom: 12,
    height: 48,
    paddingVertical: 0, // Remove vertical padding
  },
  tableCellSet: {
    width: 12,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginRight: 8,
  },
  tableCellSetHeader: {
    width: 12,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginRight: 8, // match tableCellSet
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
  },
  tableCellInputHeader: {
    flex: 1,
    height: 15,
    backgroundColor: 'white',
    borderRadius: 0,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 4,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderWidth: 0,
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
    marginLeft: 3,
    marginRight: 5,
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
    marginLeft: 0,
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
    marginBottom: 8,
  },
  addSetText: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#007AFF',
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
    backgroundColor: 'rgba(0,0,0,0.18)',
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
  tableCellInputNarrow: {
    flex: 1,
    height: 48,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    paddingVertical: 0,
    paddingHorizontal: 2,
    marginHorizontal: 2,
  },
  tableCellInputHeaderInput: {
    flex: 1,
    height: 15,
    backgroundColor: 'white',
    borderRadius: 0,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 2,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderWidth: 0,
  },
  tableCellInputHeaderInputNarrow: {
    flex: 1,
    height: 15,
    backgroundColor: 'white',
    borderRadius: 0,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    marginHorizontal: 2,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderWidth: 0,
  },
  aiAnalysisContainer: {
    padding: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  aiAnalysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiAnalysisLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: colors.gray,
    marginRight: 4,
  },
  aiAnalysisValue: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  aiAnalysisConfidence: {
    fontSize: 10,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginLeft: 4,
  },
  aiAnalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  aiAnalyzeIcon: {
    marginRight: 6,
  },
  aiAnalyzeText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  coachingFeedbackContainer: {
    padding: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  coachingFeedbackTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 8,
  },
  coachingFeedbackSummary: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    marginBottom: 8,
    lineHeight: 18,
  },
  technicalTipsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  technicalTipsTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  technicalTip: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    marginBottom: 4,
    lineHeight: 18,
  },
  tempoGuidance: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
  },
  motivation: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: colors.primary,
    marginTop: 8,
    lineHeight: 18,
  },
  aiCardContainer: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'column',
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
  aiCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiCardThumbCol: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardThumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
  },
  aiCardMetricsCol: {
    flex: 1.6,
    paddingLeft: 18,
    justifyContent: 'center',
  },
  aiCardMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiCardMetricBox: {
    width: '48%',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingVertical: 12,
  },
  aiCardMetricLabel: {
    fontSize: 13,
    color: colors.gray,
    fontFamily: 'DMSans-Medium',
    marginBottom: 2,
  },
  aiCardMetricValue: {
    fontSize: 18,
    color: colors.darkGray,
    fontFamily: 'DMSans-Bold',
  },
  aiCardInfoBlock: {
    marginTop: 2,
    marginBottom: 12,
  },
  aiCardExerciseTitle: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: 'DMSans-Bold',
    marginBottom: 2,
  },
  aiCardInfoText: {
    fontSize: 13,
    color: colors.darkGray,
    fontFamily: 'DMSans-Regular',
    marginBottom: 1,
  },
  pickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    width: '100%',
    backgroundColor: 'white',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'relative',
  },
  pickerModalTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  pickerModalCloseButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  pickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  pickerItem: {
    fontSize: 24,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
  },
  timeButton: {
    width: '30%',
    margin: '1.66%',
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
  },
  timeButtonTextSelected: {
    color: colors.white,
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 3,
    marginRight: 5,
    position: 'relative',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
    marginRight: 5,
  },
  cameraButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
    marginRight: 5,
    backgroundColor: 'transparent',
  },
  cameraButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    padding: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  aiCoachingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: -2,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  aiCoachingButtonText: {
    color: '#6C3EF6',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    marginLeft: 6,
  },
  rightActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', // Ensure vertical alignment
    width: 80,
    height: '100%',
    marginVertical: -6.1,
    paddingVertical: -10,
  },
  actionButton: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 47,
    borderRadius: 12,
    marginHorizontal: 0, // Adjust margin to bring it closer to the tick button
  },
}); 