import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../config/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressContext } from '../../navigation/AuthStack';
import { useIsFocused } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';

const debugLog = (...args) => {
  if (__DEV__) {
    console.log('[MANUAL-DEMO]', ...args);
  }
};

// Predefined exercises for the demo
const EXERCISES = [
  { label: 'Barbell Bench Press', value: 'barbell_bench_press' },
  { label: 'Barbell Squat', value: 'barbell_squat' },
  { label: 'Barbell Deadlift', value: 'barbell_deadlift' },
  { label: 'Pull-up', value: 'pullup' },
  { label: 'Push-up', value: 'pushup' },
  { label: 'Dumbbell Shoulder Press', value: 'dumbbell_shoulder_press' },
  { label: 'Bicep Curl', value: 'bicep_curl' },
  { label: 'Tricep Extension', value: 'tricep_extension' },
];

export default function ManualDemoScreen({ navigation, route }) {
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();
  
  // Get progress context
  const { progress, setProgress, updateProgress } = useContext(ProgressContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  // Update progress tracking
  useEffect(() => {
    if (isFocused) {
      // Update progress context with current screen
      updateProgress('ManualDemo');
    }
  }, [isFocused, updateProgress]);

  // Run entrance animations
  useEffect(() => {
    const animationSequence = Animated.stagger(100, [
      // Fade in the entire view first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Fade in the title
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Slide in content from right
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      
      // Fade in form
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    
    // Start the animation sequence
    animationSequence.start();
    
    // Set up a focus listener for when returning to this screen
    const unsubFocus = navigation.addListener('focus', () => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      titleAnim.setValue(0);
      formAnim.setValue(0);
      
      // Restart the animation sequence
      animationSequence.start();
    });
    
    return () => {
      unsubFocus();
    };
  }, [navigation]);

  // Validate form inputs
  const validateForm = () => {
    if (!exercise) {
      Alert.alert('Missing Exercise', 'Please select an exercise to log');
      return false;
    }
    
    if (!reps || isNaN(Number(reps)) || Number(reps) <= 0) {
      Alert.alert('Invalid Reps', 'Please enter a valid number of reps');
      return false;
    }
    
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return false;
    }
    
    return true;
  };

  // Handle log set submission
  const handleLogSet = () => {
    if (!validateForm()) {
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      
      // Navigate to PaywallScreen
      navigation.navigate('Paywall', {
        exerciseLogged: {
          exercise: EXERCISES.find(ex => ex.value === exercise)?.label || exercise,
          reps: Number(reps),
          weight: Number(weight)
        }
      });
    }, 1000);
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
        }
      ]}
    >
      <SafeAreaView style={styles.safeContainer}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.gray} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Log Exercise</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              style={[
                styles.titleText,
                { 
                  opacity: titleAnim,
                  transform: [
                    { 
                      scale: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                        extrapolate: 'clamp'
                      })
                    }
                  ] 
                }
              ]}
            >
              Log your exercise
            </Animated.Text>
            
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formAnim,
                  transform: [
                    {
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            >
              {/* Exercise Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exercise</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={(value) => setExercise(value)}
                    items={EXERCISES}
                    style={{
                      inputIOS: styles.picker,
                      inputAndroid: styles.pickerAndroid,
                      iconContainer: styles.pickerIcon,
                    }}
                    placeholder={{ label: 'Select an exercise...', value: null }}
                    Icon={() => (
                      <Ionicons name="chevron-down" size={24} color={colors.gray} />
                    )}
                    value={exercise}
                  />
                </View>
              </View>
              
              {/* Reps Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repetitions</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="repeat" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Enter reps"
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>
              
              {/* Weight Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="weight" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Enter weight"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>
              
              {/* Log Set Button */}
              <TouchableOpacity 
                style={[
                  styles.logButton,
                  loading && styles.logButtonDisabled
                ]}
                onPress={handleLogSet}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.logButtonText}>Log Set</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                This is just a demo of how you can manually log exercises. 
                In the full app, you'll be able to track your progress and see your improvement over time.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeContainer: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    height: 60,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
  },
  headerSpacer: {
    width: 40, // Same width as back button for alignment
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1A1A1A',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  picker: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: colors.darkGray,
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  pickerAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.darkGray,
    paddingRight: 30,
  },
  pickerIcon: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    height: '100%',
  },
  logButton: {
    backgroundColor: '#007BFF',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logButtonDisabled: {
    backgroundColor: '#AACEF5',
    shadowOpacity: 0,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
    textAlign: 'center',
  },
}); 