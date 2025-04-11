import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

export default function DriverStatus() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDriverStatus();
  }, []);

  const loadDriverStatus = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Vérifier si l'utilisateur est un chauffeur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Erreur lors de la vérification du rôle:', userError);
        Alert.alert('Erreur', 'Impossible de vérifier votre statut de chauffeur');
        return;
      }
      
      if (userData?.role !== 'driver') {
        Alert.alert('Accès refusé', 'Cette page est réservée aux chauffeurs');
        return;
      }
      
      // Récupérer le statut actuel du chauffeur
      const { data: statusData, error: statusError } = await supabase
        .from('driver_status')
        .select('is_active')
        .eq('driver_id', user.id)
        .single();
      
      if (statusError && statusError.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération du statut:', statusError);
      } else if (statusData) {
        setIsActive(statusData.is_active);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement du statut:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement de votre statut');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Mettre à jour ou créer l'entrée de statut
      const { error } = await supabase
        .from('driver_status')
        .upsert({
          driver_id: user.id,
          is_active: !isActive,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        Alert.alert('Erreur', 'Impossible de mettre à jour votre statut');
        return;
      }
      
      setIsActive(!isActive);
      Alert.alert(
        'Statut mis à jour',
        `Vous êtes maintenant ${!isActive ? 'actif' : 'inactif'}`
      );
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour de votre statut');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Chargement de votre statut...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <FontAwesome 
          name={isActive ? "check-circle" : "times-circle"} 
          size={80} 
          color={isActive ? "#2ecc71" : "#e74c3c"} 
        />
        <Text style={styles.statusText}>
          {isActive ? "Vous êtes actif" : "Vous êtes inactif"}
        </Text>
        <Text style={styles.statusDescription}>
          {isActive 
            ? "Vous recevrez des demandes d'ambulance" 
            : "Vous ne recevrez pas de demandes d'ambulance"}
        </Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Statut</Text>
          <Switch
            value={isActive}
            onValueChange={toggleStatus}
            disabled={saving}
            trackColor={{ false: "#e74c3c", true: "#2ecc71" }}
            thumbColor={isActive ? "#fff" : "#fff"}
          />
        </View>
        
        {saving && (
          <ActivityIndicator size="small" color="#e74c3c" style={styles.savingIndicator} />
        )}
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Informations</Text>
        <Text style={styles.infoText}>
          • Lorsque vous êtes actif, vous recevrez des notifications pour les nouvelles demandes d'ambulance.
        </Text>
        <Text style={styles.infoText}>
          • Vous pouvez accepter ou refuser les demandes selon votre disponibilité.
        </Text>
        <Text style={styles.infoText}>
          • Votre statut est mis à jour en temps réel.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  statusDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  savingIndicator: {
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
}); 