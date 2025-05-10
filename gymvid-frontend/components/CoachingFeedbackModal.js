import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';

export default function CoachingFeedbackModal({ visible, onClose, loading, feedback, videoThumbnail }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.drawer}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>AI Coaching Feedback</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.gray} />
            </TouchableOpacity>
          </View>
          {videoThumbnail && (
            <Image source={{ uri: videoThumbnail }} style={styles.thumbnail} />
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing your form...</Text>
            </View>
          ) : feedback ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🔟 Form Rating</Text>
                <Text style={styles.sectionValue}>{feedback.form_rating ? `${feedback.form_rating}/10` : 'N/A'}</Text>
              </View>
              {feedback.observations && feedback.observations.map((item, index) => (
                <View key={index} style={styles.section}>
                  <Text style={styles.sectionLabel}>👀 Observation</Text>
                  <Text style={styles.sectionValue}>{item.observation}</Text>
                  <Text style={styles.sectionLabel}>🧠 Tip</Text>
                  <Text style={styles.sectionValue}>{item.tip}</Text>
                  <Text style={styles.sectionLabel}>👉 Summary</Text>
                  <Text style={styles.sectionValue}>{item.summary}</Text>
                </View>
              ))}
              {feedback.cues && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>🧠 Coaching Cues</Text>
                  {Array.isArray(feedback.cues) ? feedback.cues.map((cue, idx) => (
                    <Text key={idx} style={styles.sectionValue}>• {cue}</Text>
                  )) : <Text style={styles.sectionValue}>{feedback.cues}</Text>}
                </View>
              )}
              {feedback.summary && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>👉 Summary</Text>
                  <Text style={styles.sectionValue}>{feedback.summary}</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <Text style={styles.loadingText}>No feedback available.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    minHeight: 340,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  handle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lightGray,
  },
  title: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.lightGray,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginBottom: 2,
    lineHeight: 20,
  },
}); 