import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function UserLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2ecc71',
      tabBarInactiveTintColor: '#666',
      headerStyle: {
        backgroundColor: '#2ecc71',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Urgence',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="ambulance" size={24} color={color} />
          ),
          headerTitle: 'Appel d\'Urgence',
        }}
      />
      <Tabs.Screen
        name="active-request"
        options={{
          title: 'En cours',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="clock-o" size={24} color={color} />
          ),
          headerTitle: 'Demande en cours',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="history" size={24} color={color} />
          ),
          headerTitle: 'Historique des Demandes',
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="comments" size={24} color={color} />
          ),
          headerTitle: 'Assistant d\'urgence',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
          headerTitle: 'Mon Profil',
        }}
      />
    </Tabs>
  );
} 