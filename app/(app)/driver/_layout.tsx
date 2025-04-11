import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function DriverLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#e74c3c',
      tabBarInactiveTintColor: '#95a5a6',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
      },
      headerStyle: {
        backgroundColor: '#e74c3c',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Statut',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="toggle-on" size={size} color={color} />
          ),
          headerTitle: 'Statut du Chauffeur',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Demandes',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="list" size={size} color={color} />
          ),
          headerTitle: 'Demandes d\'Ambulance',
        }}
      />
      <Tabs.Screen
        name="active-request"
        options={{
          title: 'Course Active',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="ambulance" size={size} color={color} />
          ),
          headerTitle: 'Course en Cours',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="history" size={size} color={color} />
          ),
          headerTitle: 'Historique des Courses',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
          headerTitle: 'Profil du Chauffeur',
        }}
      />
      <Tabs.Screen
        name="request-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
} 