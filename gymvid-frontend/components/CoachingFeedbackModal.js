import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';

export default function CoachingFeedbackModal({ visible, onClose, loading, feedback, videoThumbnail, exerciseName, setNumber, metrics }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.drawer}>
          <View style={styles.headerRowCustom}>
            <View style={styles.handle} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseTitle}>{exerciseName || 'Exercise'}</Text>
              <Text style={styles.setSubtitle}>{`Set ${setNumber}: AI Form Analysis`}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.gray} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing your form...</Text>
            </View>
          ) : feedback ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.metricsRow}>
                {videoThumbnail ? (
                  <Image source={{ uri: videoThumbnail }} style={styles.roundedThumbnail} />
                ) : (
                  <View style={styles.roundedThumbnailPlaceholder} />
                )}
                <View style={styles.metricsCard}>
                  <Text style={styles.formRatingLabel}>Form Rating</Text>
                  <Text style={styles.formRatingValue}>{metrics.form_rating ? <Text style={{color:'#007AFF',fontWeight:'bold'}}>{metrics.form_rating} <Text style={{color:colors.gray,fontWeight:'normal'}}>/ 10</Text></Text> : 'N/A'}</Text>
                  <View style={styles.metricsGridRow}>
                    <View style={styles.metricBox}><Text style={styles.metricLabel}>kg</Text><Text style={styles.metricValue}>{metrics.weight || '-'}</Text></View>
                    <View style={styles.metricBox}><Text style={styles.metricLabel}>Reps</Text><Text style={styles.metricValue}>{metrics.reps || '-'}</Text></View>
                  </View>
                  <View style={styles.metricsGridRow}>
                    <View style={styles.metricBox}><Text style={styles.metricLabel}>RPE</Text><Text style={styles.metricValue}>{metrics.rpe || '-'}</Text></View>
                    <View style={styles.metricBox}><Text style={styles.metricLabel}>TUT</Text><Text style={styles.metricValue}>{metrics.tut ? `${metrics.tut}s` : '-'}</Text></View>
                  </View>
                </View>
              </View>
              {feedback.observations && feedback.observations.map((item, idx) => (
                <View key={idx} style={styles.feedbackBlock}>
                  {item.observation ? <><Text style={styles.feedbackHeader}>👀 Observation</Text><Text style={styles.feedbackText}>{item.observation}</Text></> : null}
                  {item.tip ? <><Text style={styles.feedbackHeader}>🧠 Tip</Text><Text style={styles.feedbackText}>{item.tip}</Text></> : null}
                </View>
              ))}
              {feedback.observations && feedback.observations[0]?.summary && (
                <View style={styles.feedbackBlock}>
                  <Text style={styles.feedbackHeader}>👉 Summary</Text>
                  <Text style={styles.feedbackText}>{feedback.observations[0].summary}</Text>
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
  headerRowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    paddingBottom: 8,
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
    zIndex: 1,
  },
  exerciseTitle: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'left',
    marginTop: 16,
    marginBottom: 0,
  },
  setSubtitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.primary,
    marginBottom: 4,
    marginTop: 2,
    textAlign: 'left',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
    gap: 18,
  },
  roundedThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.lightGray,
    marginRight: 16,
  },
  roundedThumbnailPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.lightGray,
    marginRight: 16,
  },
  metricsCard: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  formRatingLabel: {
    fontSize: 13,
    color: colors.gray,
    fontFamily: 'DMSans-Medium',
    marginBottom: 2,
  },
  formRatingValue: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricsGridRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 2,
    marginBottom: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  metricLabel: {
    fontSize: 12,
    color: colors.gray,
    fontFamily: 'DMSans-Medium',
    marginBottom: 1,
  },
  metricValue: {
    fontSize: 17,
    color: colors.darkGray,
    fontFamily: 'DMSans-Bold',
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
  feedbackBlock: {
    marginBottom: 18,
    backgroundColor: '#F7F7FA',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  feedbackHeader: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginBottom: 2,
    lineHeight: 20,
  },
}); 