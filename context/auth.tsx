import { createContext, useContext, useEffect, useState } from 'react';
import { router, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';

type UserData = {
  first_name: string;
  last_name: string;
  phone: string;
  cin: string;
  role?: string;
};

type AuthContextType = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: UserData) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
  session: Session | null;
};

const AuthContext = createContext<AuthContextType>({
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  user: null,
  session: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(user: User | null) {
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('../login');
    } else if (user && inAuthGroup) {
      router.replace('../index');
    }
  }, [user, segments]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useProtectedRoute(user);

  const signIn = async (email: string, password: string) => {
    try {
      // 1. Authentification
      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!authUser) throw new Error('Erreur de connexion');

      console.log('Auth user:', authUser);

      // 2. Vérifier si l'utilisateur existe dans la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Si l'utilisateur n'existe pas dans la table users, afficher un message
      if (!userData && userError?.code === 'PGRST116') {
        console.log('User not found in users table');
        // Ne pas échouer la connexion, mais afficher un message
        Alert.alert(
          'Attention',
          'Votre profil n\'est pas correctement configuré. Certaines fonctionnalités peuvent ne pas être disponibles.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking user:', userError);
        // Ne pas échouer la connexion si la vérification échoue
        console.log('Continuing despite user check error');
      }

    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: UserData): Promise<void> => {
    try {
      // Vérifier si le CIN existe déjà
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('cin', userData.cin)
        .single();

      if (existingUser) {
        throw new Error('Ce numéro CIN est déjà utilisé');
      }

      // Vérifier si le numéro de téléphone existe déjà
      const { data: existingPhone, error: phoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', userData.phone)
        .single();

      if (existingPhone) {
        throw new Error('Ce numéro de téléphone est déjà utilisé');
      }

      // Créer le compte d'authentification
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            cin: userData.cin,
            role: 'user'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      // Insérer les données utilisateur
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          cin: userData.cin,
          role: 'user'
        });

      if (insertError) {
        // Si l'insertion échoue, supprimer le compte d'authentification
        await supabase.auth.signOut();
        throw insertError;
      }

      // Rediriger vers la page de connexion
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signUp,
        signOut,
        user,
        session,
      }}>
      {children}
    </AuthContext.Provider>
  );
}