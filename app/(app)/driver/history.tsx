import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type Trip = {
  id: string;
  created_at: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  user: {
    first_name: string;
    last_name: string;
    phone: string;
  };
};

export default function DriverHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      Alert.alert(
        "Erreur d'authentification",
        "Vous devez être connecté pour voir l'historique des courses.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
      return;
    }
    loadTrips();
  }, [user]);

  async function loadTrips() {
    if (!user?.id) {
      setError("Vous devez être connecté pour voir l'historique des courses");
      setLoading(false);
      return;
    }

    try {
      console.log('Chargement des courses pour le chauffeur:', user.id);
      
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          user:users(first_name, last_name, phone)
        `)
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      console.log('Courses récupérées:', data);

      const formattedTrips = (data || []).map(trip => ({
        ...trip,
        user: trip.user[0]
      }));

      setTrips(formattedTrips);
    } catch (error) {
      console.error('Erreur lors du chargement des courses:', error);
      setError('Impossible de charger l\'historique des courses');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'En cours';
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {trips.length === 0 ? (
        <Text style={styles.emptyText}>Aucune course dans l'historique</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
              <View style={styles.tripDetails}>
                <Text style={styles.location}>
                  <Text style={styles.label}>Départ:</Text> {item.pickup_location}
                </Text>
                <Text style={styles.location}>
                  <Text style={styles.label}>Arrivée:</Text> {item.dropoff_location}
                </Text>
                <View style={styles.tripInfo}>
                  <Text style={styles.patientName}>{`${item.user.first_name} ${item.user.last_name}`}</Text>
                  <Text style={styles.phoneNumber}>{item.user.phone}</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  tripDetails: {
    gap: 8,
  },
  location: {
    fontSize: 16,
    color: '#2c3e50',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    color: '#2c3e50',
  },
  phoneNumber: {
    fontSize: 16,
    color: '#2c3e50',
  },
  label: {
    fontWeight: '600',
    color: '#34495e',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#e74c3c',
    marginTop: 20,
  },
}); 