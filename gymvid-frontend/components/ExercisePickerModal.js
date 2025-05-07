import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import Modal from 'react-native-modal';
import { Swipeable } from 'react-native-gesture-handler';

const DUMMY_HISTORY = [
  { name: 'Bench Press', count: 12, lastUsed: '2024-04-28' },
  { name: 'Deadlift', count: 8, lastUsed: '2024-04-27' },
  { name: 'Squat', count: 15, lastUsed: '2024-04-26' },
  { name: 'Bicep Curl', count: 5, lastUsed: '2024-04-25' },
  { name: 'Sit Ups', count: 3, lastUsed: '2024-04-24' },
];

const FILTERS = [
  { label: 'Most Recent', value: 'recent' },
  { label: 'Most Used', value: 'used' },
  { label: 'A-Z', value: 'az' },
];

export default function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  selectedExercises = [],
  persistFilter,
  setPersistFilter,
  onAdd,
  onAddSuperset,
}) {
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState(DUMMY_HISTORY);
  const [filter, setFilter] = useState(persistFilter || 'recent');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  // Defensive fallback in case selectedExercises is undefined
  const safeSelectedExercises = Array.isArray(selectedExercises) ? selectedExercises : [];

  // Filter and sort history
  let filteredHistory = history
    .filter(e => e.name && e.name.trim() !== '')
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  if (filter === 'az') {
    filteredHistory = filteredHistory.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filter === 'used') {
    filteredHistory = filteredHistory.sort((a, b) => b.count - a.count);
  } else {
    filteredHistory = filteredHistory.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
  }

  const trimmedSearch = search.trim();
  const showAddButton = search.length > 0;

  const handleAddNewExercise = () => {
    if (!trimmedSearch) return;
    if (history.some(e => e.name.toLowerCase() === trimmedSearch.toLowerCase())) {
      Alert.alert('Duplicate Exercise', 'This exercise is already taken, sosy!');
      return;
    }
    const newExercise = {
      name: trimmedSearch,
      count: 1,
      lastUsed: new Date().toISOString().slice(0, 10),
    };
    setHistory([{ ...newExercise }, ...history]);
    onSelect(newExercise.name);
    setSearch('');
  };

  const handleSelect = (name) => {
    if (safeSelectedExercises.includes(name)) {
      // Unselect if already selected
      onSelect(safeSelectedExercises.filter(e => e !== name));
    } else {
      // Only add if not already selected (prevent duplicates)
      onSelect([...safeSelectedExercises, name]);
    }
  };

  const handleFilterChange = (val) => {
    setFilter(val);
    setPersistFilter(val);
  };

  const handleDeleteExercise = (name) => {
    setExerciseToDelete(name);
    setDeleteModalVisible(true);
  };

  const confirmDeleteExercise = () => {
    setHistory(h => h.filter(e => e.name !== exerciseToDelete));
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const cancelDeleteExercise = () => {
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const handleAddSelectedExercises = () => {
    safeSelectedExercises.forEach(name => {
      if (!history.some(e => e.name === name)) {
        setHistory([{ name, count: 1, lastUsed: new Date().toISOString().slice(0, 10) }, ...history]);
      }
    });
    if (onAdd) {
      onAdd(safeSelectedExercises);
    } else {
      onClose();
    }
  };

  const handleAddSuperset = () => {
    safeSelectedExercises.forEach(name => {
      if (!history.some(e => e.name === name)) {
        setHistory([{ name, count: 1, lastUsed: new Date().toISOString().slice(0, 10) }, ...history]);
      }
    });
    if (onAddSuperset) {
      onAddSuperset(safeSelectedExercises);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      propagateSwipe
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.keyboardView,
          showAddButton && { maxHeight: '98%' },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Select Your Exercises</Text>
        <View style={styles.searchRow}>
          <Ionicons name="add" size={22} color={colors.primary} style={{ marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter your exercise"
            placeholderTextColor={colors.gray}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="words"
          />
        </View>
        {!showAddButton && (
          <View style={styles.filterRow}>
            <Text style={styles.historyLabel}>History</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                // Cycle through filters
                const idx = FILTERS.findIndex(f => f.value === filter);
                const next = FILTERS[(idx + 1) % FILTERS.length];
                handleFilterChange(next.value);
              }}
            >
              <Ionicons name="filter" size={16} color={colors.primary} />
              <Text style={styles.filterButtonText}>{FILTERS.find(f => f.value === filter).label}</Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          data={filteredHistory}
          keyExtractor={item => item.name}
          renderItem={({ item, index }) => {
            const selected = safeSelectedExercises.includes(item.name);
            return (
              <>
                <Swipeable
                  renderRightActions={() => (
                    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDeleteExercise(item.name)}>
                      <Ionicons name="trash-outline" size={20} color={'#fff'} />
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    style={styles.exerciseRow}
                    onPress={() => handleSelect(item.name)}
                  >
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <View style={[styles.addIcon, selected && styles.addedIcon]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={22} color={colors.white} />
                      ) : (
                        <Ionicons name="add" size={19} color={'#222'} />
                      )}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
                {index < filteredHistory.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#E5E7EB', marginLeft: 18 }} />
                )}
              </>
            );
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={showAddButton ? (
            <TouchableOpacity style={styles.fullWidthAddButton} onPress={handleAddNewExercise} activeOpacity={0.85}>
              <Text style={styles.fullWidthAddButtonText}>Add "{search}"</Text>
            </TouchableOpacity>
          ) : null}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
        />
        {/* Sticky Add Exercises Button(s) */}
        {safeSelectedExercises.length > 1 ? (
          <View style={styles.stickyAddExercisesRow}>
            <TouchableOpacity style={styles.stickySupersetButton} onPress={handleAddSuperset} activeOpacity={0.85}>
              <Text style={styles.stickySupersetText}>{`Add Superset (${safeSelectedExercises.length})`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stickyAddExercisesButton} onPress={handleAddSelectedExercises} activeOpacity={0.85}>
              <Text style={styles.stickyAddExercisesText}>{`Add Exercises (${safeSelectedExercises.length})`}</Text>
            </TouchableOpacity>
          </View>
        ) : safeSelectedExercises.length === 1 ? (
          <View style={styles.stickyAddExercisesContainer}>
            <TouchableOpacity style={styles.stickyAddExercisesButtonSingle} onPress={handleAddSelectedExercises} activeOpacity={0.85}>
              <Text style={styles.stickyAddExercisesText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
      {/* Delete Exercise Modal */}
      <Modal
        isVisible={deleteModalVisible}
        onBackdropPress={cancelDeleteExercise}
        onSwipeComplete={cancelDeleteExercise}
        swipeDirection={['down']}
        style={styles.bottomModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.deleteModalContent}>
          <Text style={styles.deleteModalTitle}>Delete Exercise</Text>
          <Text style={styles.deleteModalText}>Deleting this exercise will delete any data you have saved. Are you sure you want to delete?</Text>
          <TouchableOpacity style={styles.deleteModalDeleteButton} onPress={confirmDeleteExercise}>
            <Text style={styles.deleteModalDeleteText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteModalCancelButton} onPress={cancelDeleteExercise}>
            <Text style={styles.deleteModalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 0,
    minHeight: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    paddingBottom: 80,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightGray,
    alignSelf: 'center',
    marginVertical: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    marginLeft: 8,
    backgroundColor: 'transparent',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  filterButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    marginLeft: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
  },
  addIcon: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedIcon: {
    backgroundColor: colors.primary,
  },
  fullWidthAddButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  fullWidthAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'DMSans-Bold',
  },
  noResults: {
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    marginTop: 32,
    fontFamily: 'DMSans-Regular',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: '90%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginVertical: 4,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: colors.error,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 16,
    color: colors.darkGray,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalDeleteButton: {
    width: '100%',
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalDeleteText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  deleteModalCancelButton: {
    width: '100%',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: colors.darkGray,
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  stickyAddExercisesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
  },
  stickyAddExercisesButton: {
    width: '48%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stickyAddExercisesButtonSingle: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stickyAddExercisesText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  stickyAddExercisesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
  },
  stickySupersetButton: {
    width: '48%',
    backgroundColor: '#22223B', // Charcoal (Secondary color for buttons)
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  stickySupersetText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
}); 