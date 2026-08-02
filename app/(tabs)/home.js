
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, RefreshControl, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { publicationsService } from '../../src/services/supabase';
import PostCard from '../../src/components/PostCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';

const ZONES = ['Todas', 'Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Mérida', 'San Cristóbal'];

export default function HomeScreen({ navigation }) {
  const [publications, setPublications] = useState([]);
  const [filteredPublications, setFilteredPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZone, setSelectedZone] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const loadPublications = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await publicationsService.getAllActive();
      if (fetchError) throw fetchError;
      setPublications(data || []);
      applyFilters(data || [], selectedZone, searchQuery);
    } catch (error) {
      console.error('Error loading publications:', error);
      setError('No se pudieron cargar las publicaciones.');
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (data, zone, query) => {
    let filtered = data || [];
    if (zone !== 'Todas') filtered = filtered.filter(item => item.zone_location === zone);
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        item.zone_location?.toLowerCase().includes(searchLower) ||
        item.amount_used?.toString().includes(searchLower)
      );
    }
    setFilteredPublications(filtered);
  };

  useEffect(() => { loadPublications(); }, []);
  useFocusEffect(useCallback(() => { loadPublications(); }, []));

  const handleRefresh = () => { setRefreshing(true); loadPublications(); };
  const handleZoneSelect = (zone) => { setSelectedZone(zone); applyFilters(publications, zone, searchQuery); };
  const handleSearch = (text) => { setSearchQuery(text); applyFilters(publications, selectedZone, text); };
  const handlePostPress = (publication) => {
    navigation.navigate('chat/[id]', { publicationId: publication.id, publication });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dollar Swap</Text>
        <TouchableOpacity onPress={handleRefresh}><Ionicons name="refresh-outline" size={24} color="#2563EB" /></TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar por zona, usuario o monto..." value={searchQuery} onChangeText={handleSearch} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => handleSearch('')}><Ionicons name="close-circle" size={20} color="#94A3B8" /></TouchableOpacity>}
      </View>
      <View style={styles.zoneContainer}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={ZONES} keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.zoneChip, selectedZone === item && styles.zoneChipActive]} onPress={() => handleZoneSelect(item)}>
              <Text style={[styles.zoneChipText, selectedZone === item && styles.zoneChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.zoneList} />
      </View>
      <FlatList data={filteredPublications} keyExtractor={(item) => item.id} renderItem={({ item }) => <PostCard publication={item} onPress={() => handlePostPress(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No hay publicaciones activas</Text>
            <Text style={styles.emptySubtitle}>Crea una nueva publicación para comenzar</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('create-post')}>
              <Text style={styles.emptyButtonText}>Crear Publicación</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={[styles.listContent, filteredPublications.length === 0 && styles.emptyListContent]} />
    </View>
  );
}

// Estilos iguales que antes (no los repito para no alargar)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 16, paddingHorizontal: 16, borderRadius: 12, height: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#0F172A' },
  zoneContainer: { marginTop: 16, paddingVertical: 8 },
  zoneList: { paddingHorizontal: 20 },
  zoneChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  zoneChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  zoneChipText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  zoneChipTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },
  emptyListContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyButton: { marginTop: 24, backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
