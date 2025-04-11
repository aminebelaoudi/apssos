import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

type RouteInfo = {
  request_id: string;
  user_id: string;
  patient_latitude: number;
  patient_longitude: number;
  distance: number;
  duration: number;
  routeCoordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
};

export default function DriverRoute() {
  const { user } = useAuth();
  const { requestId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (!requestId) {
      Alert.alert('Erreur', 'ID de la demande non trouvé');
      router.back();
      return;
    }

    loadRouteInfo();
    startLocationUpdates();
  }, [requestId]);

  const loadRouteInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('id, user_id, latitude, longitude')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      // Obtenir la position actuelle du conducteur
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erreur', 'Permission de localisation nécessaire');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Obtenir l'itinéraire depuis l'API Mapbox Directions
      const route = await fetchRoute(
        location.coords.latitude,
        location.coords.longitude,
        data.latitude,
        data.longitude
      );

      const routeData: RouteInfo = {
        request_id: data.id,
        user_id: data.user_id,
        patient_latitude: data.latitude,
        patient_longitude: data.longitude,
        distance: route.distance,
        duration: route.duration,
        routeCoordinates: route.coordinates,
      };

      setRouteInfo(routeData);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations de l\'itinéraire');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) => {
    try {
      // REMARQUE: Remplacez YOUR_MAPBOX_ACCESS_TOKEN par votre véritable token d'accès Mapbox
      // Vous pouvez obtenir un token sur: https://account.mapbox.com/
      const MAPBOX_ACCESS_TOKEN = 'sk.eyJ1IjoiYW1pbmViZWxhb3VkaSIsImEiOiJjbTlkNmxtazgwcWx2MmtzYTN4cTBkcWltIn0.tLgi6WQP5Br5IvExz1pA7A';
      
      // Construire l'URL pour l'API Mapbox Directions
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== 'Ok') {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      // Extraire les coordonnées de l'itinéraire
      const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
        longitude: coord[0],
        latitude: coord[1]
      }));
      
      // Convertir la distance en kilomètres
      const distance = data.routes[0].distance / 1000;
      
      // Convertir la durée en minutes
      const duration = Math.round(data.routes[0].duration / 60);

      return {
        coordinates,
        distance,
        duration,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'itinéraire:', error);
      throw error;
    }
  };

  const startLocationUpdates = () => {
    // Mettre à jour la position du conducteur toutes les 10 secondes
    const interval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Mettre à jour l'itinéraire si la position a changé significativement
        if (routeInfo) {
          const newRoute = await fetchRoute(
            location.coords.latitude,
            location.coords.longitude,
            routeInfo.patient_latitude,
            routeInfo.patient_longitude
          );

          setRouteInfo({
            ...routeInfo,
            distance: newRoute.distance,
            duration: newRoute.duration,
            routeCoordinates: newRoute.coordinates,
          });
        }
      } catch (error) {
        console.error('Erreur de mise à jour de la position:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Chargement de l'itinéraire...</Text>
      </View>
    );
  }

  if (!routeInfo || !driverLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Impossible de charger l'itinéraire</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (driverLocation.latitude + routeInfo.patient_latitude) / 2,
          longitude: (driverLocation.longitude + routeInfo.patient_longitude) / 2,
          latitudeDelta: Math.abs(driverLocation.latitude - routeInfo.patient_latitude) * 1.5,
          longitudeDelta: Math.abs(driverLocation.longitude - routeInfo.patient_longitude) * 1.5,
        }}
      >
        <Marker
          coordinate={{
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          }}
          title="Votre position"
          pinColor="#2ecc71"
        />
        <Marker
          coordinate={{
            latitude: routeInfo.patient_latitude,
            longitude: routeInfo.patient_longitude,
          }}
          title="Position du patient"
          pinColor="#e74c3c"
        />
        <Polyline
          coordinates={routeInfo.routeCoordinates}
          strokeColor="#e74c3c"
          strokeWidth={3}
        />
      </MapView>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Informations de l'itinéraire</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distance:</Text>
          <Text style={styles.infoValue}>{routeInfo.distance.toFixed(1)} km</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durée estimée:</Text>
          <Text style={styles.infoValue}>{routeInfo.duration} minutes</Text>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  map: {
    flex: 1,
  },
  infoContainer: {
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
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
}); 