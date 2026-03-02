import { Tabs } from 'expo-router';
import React from 'react';
import { Text, TextProps } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
/*
const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(102, 102, 101)',
  accent: 'rgb(205, 88, 56)',
  accentDark: 'rgb(185, 68, 36)',
  background: '#F9FAFB',
  white: '#FFFFFF',
};
*/
export default function TabLayout() {
  const theme = useColorScheme() ?? 'light';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[theme].tabIconSelected,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[theme].surface,
          borderTopColor: Colors[theme].border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Climbs',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mountains"
        options={{
          title: 'Mountains',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="mountain.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
        />
        <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
        />
    </Tabs>
  );
}

export function AppText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: 'Trebuchet MS'}, props.style]}
    />
  );
}