import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

export default function AppIndex() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkUserRole() {
      if (!user || !user.id) {
        console.log('Pas d\'utilisateur connecté ou ID manquant');
        setLoading(false);
        return;
      }

      try {
        console.log('Vérification du rôle pour l\'utilisateur:', user.id);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur Supabase:', error);
          
          if (error.code === 'PGRST116') {
            console.log('Utilisateur non trouvé dans la table users, redirection vers /user');
            router.replace('/(app)/user');
          } else {
            console.error('Erreur lors de la vérification du rôle:', error);
            setError('Erreur lors de la vérification du rôle');
          }
        } else {
          console.log('Données utilisateur trouvées:', data);
          console.log('Rôle trouvé:', data?.role);
          
          if (data?.role === 'driver') {
            router.replace('/(app)/driver/requests');
          } else {
            router.replace('/(app)/user');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
        setError('Erreur lors de la vérification du rôle');
      } finally {
        setLoading(false);
      }
    }

    checkUserRole();
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={{ marginTop: 10 }}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <Text>Veuillez réessayer de vous connecter</Text>
      </View>
    );
  }

  return null;
} 