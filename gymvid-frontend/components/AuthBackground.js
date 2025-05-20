import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';

// Extremely simple background component with no animations, gradients, or state
export default function AuthBackground({ children }) {
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.background} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  }
}); 