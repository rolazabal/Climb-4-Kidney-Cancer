import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Map, Mountain as MountainIcon, Settings, TrendingUp, User, UserRoundSearch } from 'lucide-react-native';
import { Text, TextProps } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: palette.tint,
          tabBarInactiveTintColor: palette.tabIconDefault,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
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
            tabBarIcon: ({ color }) => <TrendingUp color={color} size={24} />,
          }}
          />
          <Tabs.Screen
          name="mountains"
          options={{
            title: 'Mountains',
            tabBarIcon: ({ color }) => <Map color={color} size={24} />,
          }}
          />
          <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
        />
      <Tabs.Screen
        name="group"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <UserRoundSearch color={color} size={24} />,
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
      style={props.style}
    />
  );
}
