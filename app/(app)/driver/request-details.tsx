import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import MapView, { Marker } from 'react-native-maps';

type EmergencyRequest = {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  latitude: number;
  longitude: number;
  user: {
    first_name: string;
    last_name: string;
    phone: string;
  };
};

export default function RequestDetails() {
  const { requestId } = useLocalSearchParams();
  const { user } = useAuth();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    if (!requestId || !user) return;

    try {
      setLoading(true);
      // Récupérer les informations de base de la demande
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          id,
          created_at,
          status,
          latitude,
          longitude,
          user_id
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      
      // Utiliser des valeurs par défaut pour l'utilisateur
      const formattedData: EmergencyRequest = {
        id: data.id,
        created_at: data.created_at,
        status: data.status,
        latitude: data.latitude,
        longitude: data.longitude,
        user: {
          first_name: 'Utilisateur',
          last_name: data.user_id ? data.user_id.substring(0, 4) : '',
          phone: 'Non disponible'
        }
      };
      
      setRequest(formattedData);
    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!request || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('emergency_requests')
        .update({ 
          status: 'accepted',
          driver_id: user.id
        })
        .eq('id', request.id);

      if (error) throw error;
      
      Alert.alert('Succès', 'Demande acceptée avec succès');
      router.back();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter la demande');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('emergency_requests')
        .update({ 
          status: 'cancelled',
          driver_id: user.id
        })
        .eq('id', request.id);

      if (error) throw error;
      
      Alert.alert('Succès', 'Demande rejetée');
      router.back();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Erreur', 'Impossible de rejeter la demande');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!request || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('emergency_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;
      
      Alert.alert('Succès', 'Course terminée avec succès');
      router.back();
    } catch (error) {
      console.error('Error completing request:', error);
      Alert.alert('Erreur', 'Impossible de terminer la course');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Demande non trouvée</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: request.latitude,
            longitude: request.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{
              latitude: request.latitude,
              longitude: request.longitude,
            }}
            title="Position du patient"
          />
        </MapView>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>Détails de la demande</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Statut:</Text>
          <Text style={[styles.value, styles.status, { color: getStatusColor(request.status) }]}>
            {getStatusText(request.status)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(request.created_at)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Patient:</Text>
          <Text style={styles.value}>
            {request.user.first_name} {request.user.last_name}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Téléphone:</Text>
          <Text style={styles.value}>{request.user.phone}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Position:</Text>
          <Text style={styles.value}>
            {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
          </Text>
        </View>
        
        {request.status === 'pending' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]} 
              onPress={handleAccept}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Accepter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Rejeter</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {request.status === 'accepted' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]} 
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Terminer la course</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#f39c12';
    case 'accepted':
      return '#3498db';
    case 'completed':
      return '#2ecc71';
    case 'cancelled':
      return '#e74c3c';
    default:
      return '#95a5a6';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'accepted':
      return 'Acceptée';
    case 'completed':
      return 'Terminée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  mapContainer: {
    height: 300,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  detailsContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  value: {
    flex: 2,
    fontSize: 16,
    color: '#333',
  },
  status: {
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  completeButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 