import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';

export default function CoachingFeedbackModal({ visible, onClose, loading, feedback, videoThumbnail, exerciseName, setNumber, metrics, set, parentExerciseName, customSubtitle }) {
  let displayExerciseName = parentExerciseName || exerciseName;
  const isFallbackHeader = !displayExerciseName;
  if (isFallbackHeader) displayExerciseName = 'AI Form Analysis';
  let weight = '-';
  if (set) {
    weight = set.weight_kg ?? set.weight ?? set.kg ?? '-';
  }
  if (weight === '-' && feedback?.data) {
    weight = feedback.data.weight_kg ?? feedback.data.weight ?? feedback.data.kg ?? '-';
  }
  let reps = '-';
  if (set) {
    reps = set.reps ?? '-';
  }
  if ((reps === '-' || reps === undefined) && feedback?.data) {
    reps = feedback.data.reps ?? '-';
  }
  const rpe = feedback?.rpe || '-';
  const tut = feedback?.total_tut ? `${feedback.total_tut}s` : '-';
  const formRating = feedback?.form_rating || 'N/A';

  // Emoji numbers for observations
  const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  // Function to get RIR text based on RPE
  const getRIRText = (rpe) => {
    if (!rpe || rpe === '-' || rpe === 'N/A') return null;
    
    const rpeValue = parseFloat(rpe);
    const rirLookup = {
      10.0: "(No More Reps in the Tank - Failure Achieved)",
      9.5: "(It looks like you might have had 1 more rep in the tank before hitting failure)",
      9.0: "(It looks like you might have had 1-2 more reps in the tank before hitting failure)",
      8.5: "(It looks like you might have had 2-3 more rep in the tank before hitting failure)",
      8.0: "(It looks like you might have had 3-4 more rep in the tank before hitting failure)",
      7.5: "(It looks like you could have have done at least 4 reps or more before hitting failure)",
      7.0: "(This looks like a warm up weight!)"
    };
    
    return rirLookup[rpeValue] || null;
  };

  const rirText = getRIRText(rpe);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayTrueBlack}>
        <View style={styles.drawerTrueGray}>
          {/* Centered Handle */}
          <View style={styles.handle} />
          {/* Header Section */}
          <View style={styles.headerRowCustom}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.gray} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.exerciseTitleTrue, isFallbackHeader && styles.exerciseTitleTrueFallback]}>{displayExerciseName}</Text>
          {!isFallbackHeader && (
            <View style={styles.setSubtitleContainer}>
              {customSubtitle ? (
                <Text style={styles.setSubtitleTrue}>
                  <Text style={styles.setSubtitleBold}>
                    {customSubtitle.split(':')[0]}:
                  </Text>
                  <Text style={styles.setSubtitleRegular}>
                    {customSubtitle.split(':').slice(1).join(':')}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.setSubtitleTrue}>
                  <Text style={styles.setSubtitleBold}>Set {setNumber}:</Text>
                  <Text style={styles.setSubtitleRegular}> AI Form Analysis</Text>
                </Text>
              )}
            </View>
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
              
              {/* Add RIR Card */}
              {rirText && (
                <View style={styles.rirCard}>
                  <Text style={styles.feedbackHeaderCustom}>🔥 Reps In Reserve</Text>
                  <Text style={styles.rirText}>{rirText.replace(/[()]/g, '')}</Text>
                </View>
              )}
              
              {feedback.observations && feedback.observations.map((item, idx) => (
                <View key={idx} style={styles.feedbackBlockCustom}>
                  {item.observation ? <><Text style={styles.feedbackHeaderCustom}>{emojiNumbers[idx] || `${idx + 1}️⃣`} {item.header || 'Observation'}</Text><Text style={styles.feedbackTextCustom}>{item.observation}</Text></> : null}
                  {item.tip ? (
                    <View style={styles.tipContainer}>
                      <Text style={styles.tipEmoji}>👉</Text>
                      <Text style={styles.tipText}>{item.tip}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              {feedback.summary && (
                <View style={styles.feedbackBlockCustom}>
                  <Text style={styles.feedbackHeaderCustom}>✅ Summary</Text>
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
    maxHeight: '84%',
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
  setSubtitleContainer: {
    marginBottom: 5,
  },
  setSubtitleTrue: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#007AFF',
    marginBottom: 18,
    marginTop: 2,
    textAlign: 'left',
  },
  setSubtitleBold: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: '#007AFF',
  },
  setSubtitleRegular: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#007AFF',
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
  rirCard: {
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rirText: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    textAlign: 'left',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tipEmoji: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginRight: 8,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    lineHeight: 20,
    marginRight: 8,
  },
}); 