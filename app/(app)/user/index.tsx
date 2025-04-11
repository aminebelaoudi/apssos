import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '@/context/auth';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// Only import MapView on native platforms
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function Emergency() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
  }>>([]);

  useEffect(() => {
    loadDrivers();
  }, []);

  const requestLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Nous avons besoin de votre position pour envoyer une ambulance.',
          [{ text: 'OK', style: 'default' }]
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setShowMap(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Erreur',
        "Impossible d'obtenir votre position. Veuillez réessayer.",
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const sendRequest = async () => {
    if (!location || !user) {
      console.log('No location or user:', { location, user });
      return;
    }

    try {
      setLoading(true);
      console.log('Current user:', user);
      
      // Vérifier que l'utilisateur existe dans la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('User data from DB:', userData);
      console.log('User error:', userError);

      if (userError && userError.code === 'PGRST116') {
        // L'utilisateur n'existe pas dans la table users
        console.log('Utilisateur non trouvé dans la table users');
        Alert.alert(
          'Erreur',
          'Votre profil n\'est pas correctement configuré. Veuillez vous déconnecter et vous reconnecter.',
          [{ text: 'OK', style: 'default' }]
        );
        setLoading(false);
        return;
      } else if (userError) {
        console.error('Error checking user:', userError);
        throw userError;
      }
      
      // Envoyer la demande à Supabase
      const { error } = await supabase
        .from('emergency_requests')
        .insert([
          {
            user_id: user.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            status: 'pending'
          }
        ]);

      if (error) {
        console.error('Emergency request error:', error);
        throw error;
      }
      
      setLoading(false);
      setModalVisible(true);
    } catch (error: any) {
      console.error('Full error:', error);
      setLoading(false);
      Alert.alert(
        'Erreur',
        error.message || "Impossible d'envoyer la demande. Veuillez réessayer.",
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowMap(false);
  };

  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webMapFallback}>
          <FontAwesome name="map-marker" size={50} color="#e74c3c" style={styles.mapIcon} />
          <Text style={styles.webMapText}>Position actuelle :</Text>
          <Text style={styles.webMapCoords}>
            Latitude: {location?.coords.latitude.toFixed(6)}
          </Text>
          <Text style={styles.webMapCoords}>
            Longitude: {location?.coords.longitude.toFixed(6)}
          </Text>
        </View>
      );
    }

    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 0,
          longitude: location?.coords.longitude || 0,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}>
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Votre position"
            description="Une ambulance sera envoyée à cette position"
          />
        )}
      </MapView>
    );
  };

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, role')
        .eq('role', 'driver')
        .eq('is_active', true);

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des chauffeurs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#e74c3c" />
          <Text style={styles.loadingText}>Veuillez patienter...</Text>
        </View>
      )}
      
      {!showMap ? (
        <View style={styles.emergencyContainer}>
          <Text style={styles.emergencyTitle}>Urgence médicale?</Text>
          <Text style={styles.emergencySubtitle}>Appuyez sur le bouton ci-dessous pour demander une ambulance</Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={requestLocation} activeOpacity={0.8}>
            <FontAwesome name="ambulance" size={50} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.emergencyButtonText}>DEMANDER UNE AMBULANCE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {renderMap()}
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTitle}>Confirmez votre position</Text>
            <Text style={styles.mapSubtitle}>L'ambulance sera envoyée à l'emplacement indiqué sur la carte</Text>
            <TouchableOpacity style={styles.sendButton} onPress={sendRequest} activeOpacity={0.8}>
              <Text style={styles.sendButtonText}>CONFIRMER ET ENVOYER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowMap(false)}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FontAwesome name="check-circle" size={60} color="#4CAF50" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Demande envoyée avec succès!</Text>
            <Text style={styles.modalText}>
              Une ambulance est en route vers votre position. Restez calme et ne bougez pas.
            </Text>
            <Text style={styles.modalInfo}>
              Un opérateur pourrait vous contacter pour plus d'informations.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>OK, COMPRIS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emergencyContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonIcon: {
    marginBottom: 15,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  mapIcon: {
    marginBottom: 20,
  },
  webMapText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  webMapCoords: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  sendButton: {
    backgroundColor: '#e74c3c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  modalInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});