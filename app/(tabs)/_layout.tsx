import { Map, Sparkles, UserRound } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette } from '@/lib/colors';

export default function TabLayout() {
  return (
    <>
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar's `style` is a string enum ('dark' | 'light' | 'auto'), not a React Native style object */}
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: palette.canvas },
          tabBarStyle: {
            backgroundColor: palette.card,
            borderTopColor: palette.line,
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: palette.brand,
          tabBarInactiveTintColor: palette.inkFaint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size ?? 22} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Karte',
            tabBarIcon: ({ color, size }) => <Map color={color} size={size ?? 22} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <UserRound color={color} size={size ?? 22} />,
          }}
        />
      </Tabs>
    </>
  );
}
