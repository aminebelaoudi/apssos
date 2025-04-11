import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [cin, setCin] = useState('');
  const [cinError, setCinError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignup = async () => {
    // Reset error messages
    setEmailError('');
    setPhoneError('');
    setCinError('');
    setPasswordError('');
    
    // Validate inputs
    let isValid = true;
    
    if (!email.trim()) {
      setEmailError('Ce champ est obligatoire');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email invalide');
      isValid = false;
    }
    
    if (!phone.trim()) {
      setPhoneError('Ce champ est obligatoire');
      isValid = false;
    }
    
    if (!cin.trim()) {
      setCinError('Ce champ est obligatoire');
      isValid = false;
    }
    
    if (!password.trim()) {
      setPasswordError('Ce champ est obligatoire');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    }
    
    if (!isValid) return;
    
    try {
      setLoading(true);
      await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        phone,
        cin,
        role: 'user'
      });
      router.replace('/login');
    } catch (error: any) {
      Alert.alert(
        'Erreur d\'inscription',
        error.message || 'Une erreur est survenue lors de l\'inscription'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.logoContainer}>
        <FontAwesome name="ambulance" size={60} color="#e74c3c" />
        <Text style={styles.logoText}>AmbuHelp</Text>
      </View>
      
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Inscrivez-vous pour demander une ambulance</Text>
      <Text style={styles.driverNote}>
        Note : Cette inscription est uniquement pour les utilisateurs. Les chauffeurs doivent contacter l'administrateur.
      </Text>
      
      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={lastName}
          onChangeText={setLastName}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
        <FontAwesome name="envelope" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (text.trim()) setEmailError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#999"
        />
      </View>
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      
      <View style={[styles.inputContainer, phoneError ? styles.inputError : null]}>
        <FontAwesome name="phone" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Numéro de téléphone"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (text.trim()) setPhoneError('');
          }}
          keyboardType="phone-pad"
          placeholderTextColor="#999"
        />
      </View>
      {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
      
      <View style={[styles.inputContainer, cinError ? styles.inputError : null]}>
        <FontAwesome name="id-card" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Numéro CIN"
          value={cin}
          onChangeText={(text) => {
            setCin(text);
            if (text.trim()) setCinError('');
          }}
          autoCapitalize="characters"
          placeholderTextColor="#999"
        />
      </View>
      {cinError ? <Text style={styles.errorText}>{cinError}</Text> : null}
      
      <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
        <FontAwesome name="lock" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (text.trim()) setPasswordError('');
          }}
          secureTextEntry
          placeholderTextColor="#999"
        />
      </View>
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Inscription en cours...' : 'S\'inscrire'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>
          Déjà inscrit ? <Text style={styles.linkTextBold}>Se connecter</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 30,
  },
  driverNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    marginLeft: 5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#e74c3c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 25,
    alignSelf: 'center',
  },
  linkText: {
    color: '#777',
    fontSize: 16,
  },
  linkTextBold: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});