import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useMobileCounters } from '../../store/mobileCounters';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function ProfileHeaderLeft() {
  const { displayName, photoURL, role } = useMobileCounters();

  const getRoleLabel = (r: string | null) => {
    if (!r) return '';
    switch (r) {
      case 'superadmin': return 'Super Admin';
      case 'app_admin': return 'Admin';
      case 'global_pm': return 'Gestor Global';
      case 'pm': return 'Gestor';
      case 'team_member': return 'Colaborador';
      default: return r;
    }
  };

  const firstLetter = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <View style={layoutStyles.profileContainer}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={layoutStyles.avatar} />
      ) : (
        <View style={[layoutStyles.avatar, layoutStyles.avatarFallback]}>
          <Text style={layoutStyles.avatarFallbackText}>{firstLetter}</Text>
        </View>
      )}
      <View style={layoutStyles.profileTextContainer}>
        <Text style={layoutStyles.profileName} numberOfLines={1}>
          {displayName || 'Usuario'}
        </Text>
        <Text style={layoutStyles.profileRole} numberOfLines={1}>
          {getRoleLabel(role)}
        </Text>
      </View>
    </View>
  );
}

function ProfileHeaderRight() {
  const handleLogout = () => {
    const performSignOut = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        performSignOut();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Cerrar Sesión', 
            style: 'destructive',
            onPress: performSignOut
          }
        ]
      );
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={layoutStyles.logoutButton} activeOpacity={0.7}>
      <Ionicons name="log-out-outline" size={20} color="#ef4444" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { pendingTasks } = useMobileCounters();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => <ProfileHeaderLeft />,
          headerRight: () => <ProfileHeaderRight />,
        }}>
        <Tabs.Screen
          name="leaks"
          options={{
            title: 'UniLeaks',
            tabBarIcon: ({ color }) => <TabBarIcon name="newspaper-o" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Proyectos',
            tabBarIcon: ({ color }) => <TabBarIcon name="briefcase" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="dispoplan"
          options={{
            title: 'DispoPlan',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color as string} />,
          }}
        />
      </Tabs>
      
      {/* Floating Counter */}
      {pendingTasks > 0 && (
        <View style={styles.floatingCounter}>
          <Text style={styles.counterText}>{pendingTasks}</Text>
        </View>
      )}
    </>
  );
}

const layoutStyles = StyleSheet.create({
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileTextContainer: {
    justifyContent: 'center',
    maxWidth: 120,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  profileRole: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  logoutButton: {
    marginRight: 16,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  floatingCounter: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    right: 20,
    backgroundColor: '#ff3b30',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 1000,
  },
  counterText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  }
});
