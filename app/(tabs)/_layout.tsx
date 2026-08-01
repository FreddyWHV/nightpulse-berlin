import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { palette } from '@/lib/colors';

export default function TabLayout() {
  return (
    <>
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar's `style` is a string enum ('dark' | 'light' | 'auto'), not a React Native style object */}
      <StatusBar style="dark" />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: palette.canvas },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Feed' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </>
  );
}
