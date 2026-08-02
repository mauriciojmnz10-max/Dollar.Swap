
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, profileService } from '../../src/services/supabase';
import LoadingSpinner from '../../src/components/LoadingSpinner';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { user, error } = await authService.getCurrentUser();
    if (user) setUser(user);
    else { Alert.alert('Error', 'No autenticado'); router.replace('/login'); }
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await authService.signOut(); router.replace('/login'); } }
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={80} color="#2563EB" />
        <Text style={styles.name}>{user?.profile?.full_name || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}><Text style={styles.statValue}>{user?.profile?.total_trades || 0}</Text><Text style={styles.statLabel}>Operaciones</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{user?.profile?.rating_avg?.toFixed(1) || '5.0'}</Text><Text style={styles.statLabel}>Calificación</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{user?.profile?.is_verified ? '✅ Sí' : '⏳ No'}</Text><Text style={styles.statLabel}>Verificado</Text></View>
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  header: { alignItems: 'center', marginTop: 40 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 8 },
  email: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  statLabel: { fontSize: 14, color: '#64748B' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 16, backgroundColor: '#FEE2E2', borderRadius: 12 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
