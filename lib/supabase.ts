import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Remplacez ces valeurs par vos propres clés Supabase
const supabaseUrl = 'https://taeifemjwbwsoambawak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWlmZW1qd2J3c29hbWJhd2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MzQ5MTIsImV4cCI6MjA1OTMxMDkxMn0.ReoFMOqYumObHWUqw_JOPqYTT3eGHpa60YrCfaeDXgk';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 