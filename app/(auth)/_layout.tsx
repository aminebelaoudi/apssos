import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: '#e74c3c',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      <Stack.Screen
        name="login"
        options={{
          title: 'Connexion',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Inscription',
        }}
      />
      <Stack.Screen
        name="driver-login"
        options={{
          title: 'Connexion Chauffeur',
        }}
      />
    </Stack>
  );
} 