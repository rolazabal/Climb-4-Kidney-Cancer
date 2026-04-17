import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Map, Mountain as MountainIcon, TrendingUp, User } from 'lucide-react-native';
import { Text, TextProps } from 'react-native';

import { THEME_COLORS } from '@/constants/api';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="climbs"
          options={{
            title: 'Climbs',
            tabBarIcon: ({ color }) => <MountainIcon color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color }) => <TrendingUp color={THEME_COLORS.secondary} size={24} />,
          }}
          />
          <Tabs.Screen
          name="mountains"
          options={{
            title: 'Mountains',
            tabBarIcon: ({ color }) => <Map color={THEME_COLORS.secondary} size={24} />,
          }}
          />
          <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User color={THEME_COLORS.secondary} size={24} />,
          }}
          />
        </Tabs>
      </>
  );
}

// Global AppText component (use this instead of Text across the app)
export function AppText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[/*{ fontFamily: 'serif'},*/ props.style]}
    />
  );
}
