import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      if (Platform.OS === 'web') {
        alert('Por favor, introduce tu email y contraseña.');
      } else {
        Alert.alert('Campos vacíos', 'Por favor, introduce tu email y contraseña.');
      }
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(tabs)/leaks');
    } catch (error: any) {
      console.error(error);
      const friendlyMessage = getFriendlyAuthError(error.code);
      if (Platform.OS === 'web') {
        alert(friendlyMessage);
      } else {
        Alert.alert('Error de acceso', friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyAuthError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Este usuario ha sido desactivado.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email o contraseña incorrectos.';
      case 'auth/network-request-failed':
        return 'Error de red. Comprueba tu conexión a internet.';
      default:
        return 'No se pudo iniciar sesión. Por favor, inténtalo de nuevo.';
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar style="light" />
      
      {/* Background Ambient Glows */}
      <View style={[styles.glowCircle, styles.glowRed]} />
      <View style={[styles.glowCircle, styles.glowOrange]} />

      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        <View style={styles.card}>
          {/* Logo container */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/brand-red.png')} 
              style={styles.logo}
            />
          </View>

          <Text style={styles.description}>
            Gestión inteligente de proyectos y tareas
          </Text>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  emailFocused && styles.inputFocused
                ]}
                placeholder="tu.email@empresa.com"
                placeholderTextColor="#52525b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[
                  styles.input, 
                  passwordFocused && styles.inputFocused
                ]}
                placeholder="••••••••"
                placeholderTextColor="#52525b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            Acceso restringido a personal autorizado. {'\n'}
            Contacta con soporte si no tienes acceso.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
  },
  glowRed: {
    top: '-15%',
    left: '-20%',
    width: 450,
    height: 450,
    backgroundColor: '#D32F2F',
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      },
      default: {
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 120,
        elevation: 30,
      }
    })
  },
  glowOrange: {
    bottom: '-15%',
    right: '-20%',
    width: 400,
    height: 400,
    backgroundColor: '#ea580c',
    opacity: 0.08,
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      },
      default: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 100,
        elevation: 20,
      }
    })
  },
  card: {
    backgroundColor: 'rgba(24, 24, 27, 0.4)', // Glassmorphism container
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 40,
    paddingHorizontal: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
      }
    })
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
  },
  description: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  inputFocused: {
    borderColor: '#D32F2F',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: '#52525b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 16,
  }
});
