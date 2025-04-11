import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

type EmergencyRequest = {
  id: string;
  created_at: string;
  user_id: string;
  status: string;
  latitude: number;
  longitude: number;
  user: {
    first_name: string;
    last_name: string;
    phone: string;
  };
};

export default function DriverRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    checkDriverStatus();
    loadRequests();

    // Mettre en place un écouteur en temps réel pour les nouvelles demandes
    const channel = supabase
      .channel('emergency_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: 'status=eq.pending'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkDriverStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_status')
        .select('is_active')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification du statut:', error);
        return;
      }

      setDriverStatus(data?.is_active ?? false);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Récupérer toutes les demandes en attente
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          id,
          created_at,
          user_id,
          status,
          latitude,
          longitude
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des demandes:', error);
        Alert.alert('Erreur', 'Impossible de charger les demandes');
        return;
      }

      // Utiliser des valeurs par défaut pour tous les utilisateurs
      const requestsWithDefaultUsers = data.map(request => ({
        ...request,
        user: {
          first_name: 'Utilisateur',
          last_name: request.user_id.substring(0, 4),
          phone: 'Non disponible'
        }
      }));

      setRequests(requestsWithDefaultUsers as EmergencyRequest[]);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des demandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptRequest = async (request: EmergencyRequest) => {
    if (!user) return;

    if (!driverStatus) {
      Alert.alert(
        'Statut inactif',
        'Vous devez être actif pour accepter des demandes. Veuillez activer votre statut dans l\'onglet "Statut".'
      );
      return;
    }

    try {
      // Vérifier la permission de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erreur', 'La permission de localisation est nécessaire');
        return;
      }

      // Obtenir la position actuelle
      const location = await Location.getCurrentPositionAsync({});

      // Mettre à jour la demande
      const { error } = await supabase
        .from('emergency_requests')
        .update({
          status: 'accepted',
          driver_id: user.id
        })
        .eq('id', request.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Erreur lors de l\'acceptation de la demande:', error);
        Alert.alert('Erreur', 'Impossible d\'accepter la demande');
        return;
      }

      // Rediriger vers la page d'itinéraire
      router.push(`/driver/route?requestId=${request.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'acceptation de la demande');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  };

  const renderItem = ({ item }: { item: EmergencyRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestTime}>{formatDate(item.created_at)}</Text>
        <FontAwesome name="ambulance" size={24} color="#e74c3c" />
      </View>

      <View style={styles.requestInfo}>
        <Text style={styles.patientName}>{`${item.user.first_name} ${item.user.last_name}`}</Text>
        <Text style={styles.phoneNumber}>{item.user.phone}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            setSelectedRequest(item);
            setModalVisible(true);
          }}
        >
          <FontAwesome name="info-circle" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Voir détails</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            !driverStatus && styles.acceptButtonDisabled
          ]}
          onPress={() => handleAcceptRequest(item)}
          disabled={!driverStatus}
        >
          <FontAwesome name="check" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.acceptButtonText}>
            {driverStatus ? 'Accepter la demande' : 'Activez votre statut pour accepter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRequests();
            }}
            colors={['#e74c3c']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="info-circle" size={50} color="#666" />
            <Text style={styles.emptyText}>Aucune demande en attente</Text>
          </View>
        }
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la demande</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <FontAwesome name="times" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nom:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.user.first_name} {selectedRequest.user.last_name}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Téléphone:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.user.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>CIN:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.user_id}</Text>
                  </View>
                </View>

                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: selectedRequest.latitude,
                      longitude: selectedRequest.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: selectedRequest.latitude,
                        longitude: selectedRequest.longitude,
                      }}
                      title="Position du patient"
                    />
                  </MapView>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalAcceptButton,
                    !driverStatus && styles.acceptButtonDisabled
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    handleAcceptRequest(selectedRequest);
                  }}
                  disabled={!driverStatus}
                >
                  <FontAwesome name="check" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.acceptButtonText}>
                    {driverStatus ? 'Accepter la demande' : 'Activez votre statut pour accepter'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  requestCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestTime: {
    fontSize: 14,
    color: '#666',
  },
  requestInfo: {
    marginBottom: 15,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonIcon: {
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    width: 100,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  mapContainer: {
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  modalAcceptButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 5,
  },
});
