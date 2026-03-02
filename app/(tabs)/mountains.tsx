import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MountainsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mountains</Text>
      <Text style={styles.subtitle}>Explore peaks to climb next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgb(51, 51, 51)',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgb(102, 102, 101)',
  },
});