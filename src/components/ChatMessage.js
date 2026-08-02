
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatMessage({ message, isOwn }) {
  const isImage = message.content?.startsWith('http') && (message.content.endsWith('.jpg') || message.content.endsWith('.png') || message.content.endsWith('.jpeg'));
  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      <Text style={[styles.text, isOwn && styles.ownText]}>{message.content}</Text>
      <Text style={styles.time}>{new Date(message.sent_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  own: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  other: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9' },
  ownText: { color: '#fff' },
  text: { fontSize: 16, color: '#0F172A' },
  time: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' }
});
