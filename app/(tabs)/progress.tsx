import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import React from 'react';
import { View, Text, } from 'react-native';

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Progress</Text>
      <Text style={styles.subtitle}>Track your climbing stats here.</Text>
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