import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function DriverIndex() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page des demandes
    setTimeout(() => {
      router.push('requests' as any);
    }, 100);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#e74c3c" />
    </View>
  );
} 