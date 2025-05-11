import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';

export default function CoachingFeedbackModal({ visible, onClose, loading, feedback, videoThumbnail, exerciseName, setNumber, metrics, set, parentExerciseName }) {
  let displayExerciseName = parentExerciseName || exerciseName;
  const isFallbackHeader = !displayExerciseName;
  if (isFallbackHeader) displayExerciseName = 'AI Form Analysis';
  const weight = set?.weight || set?.kg || '-';
  const reps = set?.reps || '-';
  const rpe = feedback?.rpe || '-';
  const tut = feedback?.total_tut ? `${feedback.total_tut}s` : '-';
  const formRating = feedback?.form_rating || 'N/A';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayTrueBlack}>
        <View style={styles.drawerTrueGray}>
          <View style={styles.headerRowCustom}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.gray} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.exerciseTitleTrue, isFallbackHeader && styles.exerciseTitleTrueFallback]}>{displayExerciseName}</Text>
          {!isFallbackHeader && (
            <Text style={styles.setSubtitleTrue}>{`Set ${setNumber}: AI Form Analysis`}</Text>
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing your form...</Text>
            </View>
          ) : feedback ? (
            <ScrollView contentContainerStyle={styles.contentCustom}>
              <View style={styles.metricsCardBlockFull}>
                {videoThumbnail ? (
                  <Image source={{ uri: videoThumbnail }} style={styles.rectangleThumbnailInCard} />
                ) : (
                  <View style={styles.rectangleThumbnailInCard} />
                )}
                <View style={styles.metricsBlockRight}>
                  <Text style={styles.formRatingLabelBlock}>Form Rating</Text>
                  <Text style={styles.formRatingValueBlock}>{formRating !== 'N/A' ? `${formRating}/10` : 'N/A'}</Text>
                  <View style={styles.metricsGridBlockTrue}>
                    <View style={styles.metricBlockCellTrue}>
                      <Text style={styles.metricBlockLabel}>kg</Text>
                      <Text style={styles.metricBlockValue}>{weight}</Text>
                    </View>
                    <View style={styles.metricBlockCellTrue}>
                      <Text style={styles.metricBlockLabel}>Reps</Text>
                      <Text style={styles.metricBlockValue}>{reps}</Text>
                    </View>
                    <View style={styles.metricBlockCellTrue}>
                      <Text style={styles.metricBlockLabel}>RPE</Text>
                      <Text style={styles.metricBlockValue}>{rpe}</Text>
                    </View>
                    <View style={styles.metricBlockCellTrue}>
                      <Text style={styles.metricBlockLabel}>TUT</Text>
                      <Text style={styles.metricBlockValue}>{tut}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {feedback.observations && feedback.observations.map((item, idx) => (
                <View key={idx} style={styles.feedbackBlockCustom}>
                  {item.observation ? <><Text style={styles.feedbackHeaderCustom}>👀 Observation</Text><Text style={styles.feedbackTextCustom}>{item.observation}</Text></> : null}
                  {item.tip ? <><Text style={styles.feedbackHeaderCustom}>🧠 Tip</Text><Text style={styles.feedbackTextCustom}>{item.tip}</Text></> : null}
                </View>
              ))}
              {feedback.summary && (
                <View style={styles.feedbackBlockCustom}>
                  <Text style={styles.feedbackHeaderCustom}>👉 Summary</Text>
                  <Text style={styles.feedbackTextCustom}>{feedback.summary}</Text>
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
  overlayTrueBlack: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  drawerTrueGray: {
    backgroundColor: '#F7F7F7',
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
    marginBottom: 0,
    position: 'relative',
    paddingBottom: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lightGray,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 2,
  },
  exerciseTitleTrue: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'left',
    marginBottom: 0,
    marginTop: 0,
  },
  exerciseTitleTrueFallback: {
    marginBottom: 18,
  },
  setSubtitleTrue: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#007AFF',
    marginBottom: 18,
    marginTop: 2,
    textAlign: 'left',
  },
  metricsCardBlockFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 18,
    minHeight: 160,
  },
  rectangleThumbnailInCard: {
    width: 140,
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    marginRight: 18,
  },
  metricsBlockRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  formRatingLabelBlock: {
    fontSize: 15,
    color: colors.gray,
    fontFamily: 'DMSans-Bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  formRatingValueBlock: {
    fontSize: 26,
    color: colors.darkGray,
    fontFamily: 'DMSans-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  metricsGridBlockTrue: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 0,
  },
  metricBlockCellTrue: {
    width: '46%',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBlockLabel: {
    fontSize: 12,
    color: colors.gray,
    fontFamily: 'DMSans-Bold',
    marginBottom: 1,
  },
  metricBlockValue: {
    fontSize: 15,
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
  contentCustom: {
    paddingBottom: 32,
  },
  feedbackBlockCustom: {
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  feedbackHeaderCustom: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 4,
  },
  feedbackTextCustom: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginBottom: 2,
    lineHeight: 20,
  },
}); 