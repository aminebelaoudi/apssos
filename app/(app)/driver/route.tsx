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

      // Obtenir l'itinéraire depuis l'API Google Maps Directions
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
      // REMARQUE: Remplacez YOUR_GOOGLE_MAPS_API_KEY par votre véritable clé API Google Maps
      // Vous pouvez obtenir une clé API sur: https://console.cloud.google.com/google/maps-apis/
      const GOOGLE_MAPS_API_KEY = 'AIzaSyDV4xXkdKt0aEe7CYkxCSy1r7ogXrbFDFE';
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      // Extraire les coordonnées de l'itinéraire
      const points = decodePolyline(data.routes[0].overview_polyline.points);
      const distance = data.routes[0].legs[0].distance.value / 1000; // Convertir en kilomètres
      const duration = Math.round(data.routes[0].legs[0].duration.value / 60); // Convertir en minutes

      return {
        coordinates: points,
        distance,
        duration,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'itinéraire:', error);
      throw error;
    }
  };

  // Fonction pour décoder le polyline de Google Maps
  const decodePolyline = (encoded: string) => {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let shift = 0;
      let result = 0;

      do {
        const b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        const b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }

    return points;
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