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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import Modal from 'react-native-modal';

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
  selectedExercises,
  persistFilter,
  setPersistFilter,
}) {
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState(DUMMY_HISTORY);
  const [filter, setFilter] = useState(persistFilter || 'recent');

  // Filter and sort history
  let filteredHistory = history.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  if (filter === 'az') {
    filteredHistory = filteredHistory.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filter === 'used') {
    filteredHistory = filteredHistory.sort((a, b) => b.count - a.count);
  } else {
    filteredHistory = filteredHistory.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
  }

  const isNewExercise = search.length > 0 && !history.some(e => e.name.toLowerCase() === search.toLowerCase());

  const handleAddNewExercise = () => {
    const newExercise = {
      name: search,
      count: 1,
      lastUsed: new Date().toISOString().slice(0, 10),
    };
    setHistory([{ ...newExercise }, ...history]);
    onSelect(newExercise.name);
    setSearch('');
  };

  const handleSelect = (name) => {
    onSelect(name);
    setHistory(h =>
      h.map(e =>
        e.name === name ? { ...e, lastUsed: new Date().toISOString().slice(0, 10), count: e.count + 1 } : e
      )
    );
  };

  const handleFilterChange = (val) => {
    setFilter(val);
    setPersistFilter(val);
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
        style={styles.keyboardView}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Select Your Exercises</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={22} color={colors.gray} style={{ marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for an exercise"
            placeholderTextColor={colors.gray}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="words"
          />
        </View>
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
        <FlatList
          data={filteredHistory}
          keyExtractor={item => item.name}
          renderItem={({ item }) => {
            const selected = selectedExercises.includes(item.name);
            return (
              <TouchableOpacity
                style={styles.exerciseRow}
                onPress={() => handleSelect(item.name)}
              >
                <Text style={styles.exerciseName}>{item.name}</Text>
                <View style={[styles.addIcon, selected && styles.addedIcon]}>
                  {selected ? (
                    <Ionicons name="checkmark" size={22} color={colors.white} />
                  ) : (
                    <Ionicons name="add" size={22} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={isNewExercise ? (
            <TouchableOpacity style={styles.addNewRow} onPress={handleAddNewExercise}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={styles.addNewText}>Add "{search}"</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noResults}>No exercises found.</Text>
          )}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 0,
    minHeight: 400,
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
    fontSize: 24,
    fontFamily: 'DMSans-Black',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
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
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.lightGray,
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
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 18,
    fontFamily: 'DMSans-Medium',
    color: colors.darkGray,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedIcon: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  addNewText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    marginLeft: 8,
  },
  noResults: {
    textAlign: 'center',
    color: colors.gray,
    fontSize: 16,
    marginTop: 32,
    fontFamily: 'DMSans-Regular',
  },
}); 