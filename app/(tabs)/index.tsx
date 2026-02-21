import React, { ReactNode } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// install 'lucide-react-native' and 'react-native-svg' first
import { Mountain, TrendingUp, Map, Settings, User, LucideIcon } from 'lucide-react-native';

// colors
const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(102, 102, 101)',
  accent: 'rgb(205, 88, 56)',
  background: '#F9FAFB', // Approximate replacement for gray-50
  white: '#FFFFFF',
};

export default function ClimbScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Climb Management</Text>
      <Text style={styles.subtitle}>Start your journey to the summit.</Text>
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
