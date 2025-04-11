import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

// Définir les types pour la demande d'urgence
type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
};

type ActiveRequest = {
  id: string;
  created_at: string;
  status: string;
  driver?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
};

export default function ActiveRequestScreen() {
  const { user } = useAuth();
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveRequest();
    const subscription = supabase
      .channel('active_request_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Changement détecté:', payload);
          loadActiveRequest();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadActiveRequest = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          driver:driver_id(
            first_name,
            last_name,
            phone
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (error) {
        console.error('Erreur lors du chargement de la demande active:', error);
        return;
      }

      console.log('Demande active chargée:', data);
      setRequest(data as ActiveRequest);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!request) return;
    
    try {
      const { error } = await supabase
        .from('emergency_requests')
        .update({ status: 'cancelled' })
        .eq('id', request.id);

      if (error) throw error;
      
      Alert.alert('Succès', 'Votre demande a été annulée.');
      setRequest(null);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'annuler la demande.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <FontAwesome name="check-circle" size={64} color="#2ecc71" />
        <Text style={styles.noRequestText}>
          Aucune demande en cours
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.status}>
          Statut: {request.status === 'pending' ? 'En attente' : 'Acceptée'}
        </Text>
        
        {request.driver && (
          <>
            <Text style={styles.driverInfo}>
              Conducteur: {`${request.driver.first_name} ${request.driver.last_name}`}
            </Text>
            <Text style={styles.driverInfo}>
              Téléphone: {request.driver.phone}
            </Text>
          </>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelRequest}
        >
          <Text style={styles.cancelButtonText}>Annuler la demande</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    elevation: 3,
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  driverInfo: {
    fontSize: 16,
    marginBottom: 10,
  },
  noRequestText: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 20,
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 