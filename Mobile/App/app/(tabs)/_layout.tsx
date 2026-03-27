import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Flag, Mountain as MountainIcon, Trophy } from 'lucide-react-native';
import { TrendingUp, Map, Settings, User, LucideIcon } from 'lucide-react-native'; //for navigation bar
import { Text, TextProps } from 'react-native';


const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(102, 102, 101)',
  accent: 'rgb(205, 88, 56)',
  accentDark: 'rgb(185, 68, 36)',
  background: '#F9FAFB',
  white: '#FFFFFF',
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Climbs',
          tabBarIcon: ({ color }) => <MountainIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TrendingUp color={theme.secondary} size={24} />,
        }}
        />
        <Tabs.Screen
        name="mountains"
        options={{
          title: 'Mountains',
          tabBarIcon: ({ color }) => <Map color={theme.secondary} size={24} />,
        }}
        />
        <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={theme.secondary} size={24} />,
        }}
        />
        <Tabs.Screen
        name="event"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <User color={theme.secondary} size={24} />,
        }}
        />
      </Tabs>
  );
}

// Global AppText component (use this instead of Text across the app)
export function AppText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: 'serif'}, props.style]}
    />
  );
}
