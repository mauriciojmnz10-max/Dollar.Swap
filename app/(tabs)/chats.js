import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService, authService } from '../../src/services/supabase';
import LoadingSpinner from '../../src/components/LoadingSpinner';

export default function ChatsScreen() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    const { user } = await authService.getCurrentUser();
    if (!user) { router.replace('/login'); return; }
    const { data, error } = await chatService.getChatsForUser(user.id);
    if (error) Alert.alert('Error', 'No se pudieron cargar los chats');
    else setChats(data || []);
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Chats</Text>
      {chats.length === 0 ? (
        <View style={styles.empty}><Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" /><Text style={styles.emptyText}>No tienes chats activos</Text></View>
      ) : (
        <FlatList data={chats} keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatItem} onPress={() => router.push(`/chat/${item.id}`)}>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.publication?.profiles?.full_name || 'Usuario'}</Text>
                <Text style={styles.chatStatus}>{item.status === 'OPEN' ? 'Activo' : 'Cerrado'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: '#94A3B8' },
  chatItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chatName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  chatStatus: { fontSize: 14, color: '#64748B' },
});
