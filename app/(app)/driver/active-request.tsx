import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

type ActiveRequest = {
  id: string;
  created_at: string;
  status: string;
  latitude: number;
  longitude: number;
  driver?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
};

export default function DriverActiveRequest() {
  const { user } = useAuth();
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    loadActiveRequest();
    startLocationUpdates();

    // Écouter les mises à jour en temps réel
    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, []);

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
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const startLocationUpdates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erreur', 'La permission de localisation est nécessaire');
        return;
      }

      // Commencer à suivre la position
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setDriverLocation(location);
          updateDriverLocation(location);
        }
      );
    } catch (error) {
      console.error('Erreur de localisation:', error);
    }
  };

  const updateDriverLocation = async (location: Location.LocationObject) => {
    if (!user || !request) return;

    try {
      await supabase
        .from('emergency_requests')
        .update({
          driver_latitude: location.coords.latitude,
          driver_longitude: location.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la position:', error);
    }
  };

  const handleCompleteRequest = async () => {
    if (!request) return;

    Alert.alert(
      'Terminer la course',
      'Êtes-vous sûr de vouloir terminer cette course ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('emergency_requests')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', request.id);

              if (error) {
                console.error('Erreur lors de la completion:', error);
                Alert.alert('Erreur', 'Impossible de terminer la course');
                return;
              }

              Alert.alert('Succès', 'Course terminée avec succès');
              router.replace('/(app)/driver/requests');
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Chargement de la course...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="info-circle" size={50} color="#666" />
        <Text style={styles.emptyText}>Aucune course active</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Carte */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: request.latitude,
            longitude: request.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Position du patient */}
          <Marker
            coordinate={{
              latitude: request.latitude,
              longitude: request.longitude,
            }}
            title="Patient"
            description={request.driver?.first_name + ' ' + request.driver?.last_name}
          >
            <FontAwesome name="user" size={30} color="#e74c3c" />
          </Marker>

          {/* Position du chauffeur */}
          {driverLocation && (
            <Marker
              coordinate={{
                latitude: driverLocation.coords.latitude,
                longitude: driverLocation.coords.longitude,
              }}
              title="Ma position"
            >
              <FontAwesome name="ambulance" size={30} color="#2ecc71" />
            </Marker>
          )}
        </MapView>
      </View>

      {/* Informations du patient */}
      <View style={styles.infoCard}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{request.driver?.first_name + ' ' + request.driver?.last_name}</Text>
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => {
              // Implémenter l'appel téléphonique
            }}
          >
            <FontAwesome name="phone" size={20} color="#fff" />
            <Text style={styles.phoneButtonText}>{request.driver?.phone}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteRequest}
        >
          <FontAwesome name="check" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.completeButtonText}>Terminer la course</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  patientInfo: {
    marginBottom: 20,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  completeButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
