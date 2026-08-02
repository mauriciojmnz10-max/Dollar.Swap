import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export default function PostCard({ publication, onPress }) {
  const { trade_type, amount_used, rate_bs, denominations, bills_photo_url, zone_location, profiles, created_at } = publication;
  const isBuy = trade_type === 'BUY';
  const formattedDate = new Date(created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: bills_photo_url }} style={styles.image} placeholder={blurhash} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        <View style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
          <Text style={styles.badgeText}>{isBuy ? 'COMPRA' : 'VENTA'}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>{profiles?.full_name || 'Usuario'}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>{profiles?.rating_avg?.toFixed(1) || '5.0'}</Text>
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Monto:</Text><Text style={styles.detailValue}>${amount_used?.toFixed(2)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Tasa:</Text><Text style={styles.detailValue}>Bs. {rate_bs?.toFixed(2)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Denominaciones:</Text><Text style={styles.detailValue}>{denominations}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Zona:</Text><Text style={styles.detailValue}>{zone_location}</Text></View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.time}>{formattedDate}</Text>
          <View style={styles.statusContainer}><View style={styles.statusDot} /><Text style={styles.statusText}>Activo</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  imageContainer: { position: 'relative', height: 200, width: '100%' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeBuy: { backgroundColor: '#10B981' },
  badgeSell: { backgroundColor: '#F59E0B' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  username: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#64748B' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  time: { fontSize: 12, color: '#94A3B8' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: '#10B981', fontWeight: '500' }
});
