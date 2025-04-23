import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function LogWorkoutScreen() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickAndUploadVideo = async () => {
    const file = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (file.type === 'success') {
      const uriParts = file.uri.split('/');
      const filename = uriParts[uriParts.length - 1];
      const fileType = file.mimeType || 'video/mp4';

      const formData = new FormData();
      formData.append('video', {
        uri: file.uri,
        name: filename,
        type: fileType,
      });
      formData.append('coaching', 'false'); // Set to 'true' if user taps for coaching

      try {
        setLoading(true);
        const response = await fetch('http://172.20.10.6:8000/process_set', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error('Upload error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Upload Video" onPress={pickAndUploadVideo} />
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {result && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.label}>Exercise:</Text>
          <Text>{parseOutput(result.stdout, 'Predicted')}</Text>

          <Text style={styles.label}>Estimated Weight:</Text>
          <Text>{parseOutput(result.stdout, 'Estimated Weight')}</Text>

          <Text style={styles.label}>Confidence:</Text>
          <Text>{parseOutput(result.stdout, 'Confidence')}</Text>
        </View>
      )}
    </View>
  );
}

function parseOutput(output, label) {
  const lines = output.split('\n');
  const match = lines.find(line => line.includes(label));
  return match ? match.replace(/.*?:\s*/, '') : 'N/A';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
});
