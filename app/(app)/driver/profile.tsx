import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

// Type pour les données utilisateur
type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  cin: string;
};

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du profil:', error);
        return;
      }

      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <FontAwesome name="user-circle" size={100} color="#2ecc71" />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          
          <View style={styles.detailRow}>
            <FontAwesome name="phone" size={20} color="#666" />
            <Text style={styles.detailText}>{profile?.phone_number}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <FontAwesome name="id-card" size={20} color="#666" />
            <Text style={styles.detailText}>{profile?.cin}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <FontAwesome name="sign-out" size={20} color="#fff" />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  signOutButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});