import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService, authService } from '../../src/services/supabase';
import { offlineQueue } from '../../src/services/offlineQueue';
import ChatMessage from '../../src/components/ChatMessage';
import LoadingSpinner from '../../src/components/LoadingSpinner';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [chatStatus, setChatStatus] = useState('OPEN');

  const flatListRef = useRef();
  const router = useRouter();

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const { user, error } = await authService.getCurrentUser();
    if (user) { setCurrentUser(user); loadChatData(); }
    else { Alert.alert('Error', 'Debes iniciar sesión'); router.replace('/login'); }
  };

  const loadChatData = async () => {
    try {
      const { data, error } = await chatService.getChat(id);
      if (error) throw error;
      setChat(data);
      setChatStatus(data.status);
      const { data: msgs } = await chatService.getChatMessages(id);
      setMessages(msgs || []);
      // Suscripciones
      const unsubMsgs = chatService.subscribeToMessages(id, (newMsg) => { setMessages(prev => [...prev, newMsg]); });
      const unsubStatus = chatService.subscribeToChatStatus(id, (updated) => { setChat(updated); setChatStatus(updated.status); if (updated.status === 'CLOSED_SUCCESS') setShowRatingModal(true); });
      return () => { unsubMsgs(); unsubStatus(); };
    } catch (error) { Alert.alert('Error', 'No se pudo cargar el chat'); } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending || chatStatus !== 'OPEN') return;
    setSending(true);
    try {
      const { error } = await chatService.sendMessage(id, currentUser.id, messageText.trim());
      if (error) throw error;
      setMessageText('');
    } catch (error) {
      // Offline queue
      await offlineQueue.addMessage(id, messageText, currentUser.id);
      Alert.alert('Sin conexión', 'El mensaje se guardará y se enviará cuando recuperes señal.');
      setMessageText('');
    } finally { setSending(false); }
  };

  const verifyPin = async () => {
    if (pinInput.length !== 4) { Alert.alert('Error', 'El PIN debe tener 4 dígitos'); return; }
    setIsVerifying(true);
    try {
      const { data, error } = await chatService.verifyPin(id, pinInput, currentUser.id);
      if (error) throw error;
      if (data.success) {
        setShowPinModal(false);
        completeTransaction();
      } else {
        let msg = data.error || 'PIN incorrecto';
        if (data.code === 'LOCKED') msg = `🔒 Demasiados intentos. Espera ${Math.ceil((new Date(data.locked_until) - new Date()) / 60000)} minutos.`;
        else if (data.code === 'WRONG_PIN') msg = `❌ PIN incorrecto. Te quedan ${data.attempts_remaining} intentos.`;
        Alert.alert('Error', msg);
        setPinInput('');
      }
    } catch (error) { Alert.alert('Error', 'No se pudo verificar el PIN'); } finally { setIsVerifying(false); }
  };

  const completeTransaction = async () => {
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    try {
      const { data, error } = await chatService.completeTransaction(id, currentUser.id, rating, ratingComment);
      if (error) throw error;
      if (data.success) {
        setShowRatingModal(false);
        Alert.alert('🎉 ¡Éxito!', 'Transacción completada', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error) { Alert.alert('Error', 'No se pudo completar la transacción'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{chat?.seller_id === currentUser?.id ? chat?.buyer?.full_name : chat?.seller?.full_name}</Text>
        <Text style={styles.headerStatus}>{chatStatus === 'OPEN' ? 'Activo' : 'Cerrado'}</Text>
      </View>
      <View style={styles.pinInfo}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#2563EB" />
        <Text style={styles.pinInfoText}>PIN: <Text style={styles.pinCode}>{chat?.closure_pin}</Text></Text>
      </View>
      <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChatMessage message={item} isOwn={item.sender_id === currentUser?.id} />} contentContainerStyle={styles.messagesContainer} onContentSizeChange={() => flatListRef.current?.scrollToEnd()} />
      {chatStatus === 'OPEN' && (
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Escribe un mensaje..." value={messageText} onChangeText={setMessageText} multiline />
          <TouchableOpacity style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!messageText.trim() || sending}>{sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}</TouchableOpacity>
        </View>
      )}
      {chatStatus === 'OPEN' && <TouchableOpacity style={styles.closeButton} onPress={() => setShowPinModal(true)}><Text style={styles.closeButtonText}>Finalizar Transacción</Text></TouchableOpacity>}

      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Verificar PIN</Text><TextInput style={styles.pinInput} value={pinInput} onChangeText={setPinInput} keyboardType="numeric" maxLength={4} secureTextEntry placeholder="1234" autoFocus /><View style={styles.modalButtons}><TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => setShowPinModal(false)}><Text style={styles.cancelModalButtonText}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.confirmModalButton]} onPress={verifyPin} disabled={isVerifying}>{isVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmModalButtonText}>Verificar</Text>}</TouchableOpacity></View></View></View>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Calificar Transacción</Text><View style={styles.ratingContainer}>{[1,2,3,4,5].map((star) => <TouchableOpacity key={star} onPress={() => setRating(star)}><Ionicons name={star <= rating ? 'star' : 'star-outline'} size={40} color={star <= rating ? '#F59E0B' : '#D1D5DB'} /></TouchableOpacity>)}</View><TextInput style={styles.ratingCommentInput} placeholder="Comentario (opcional)" value={ratingComment} onChangeText={setRatingComment} multiline /><TouchableOpacity style={[styles.modalButton, styles.confirmModalButton]} onPress={submitRating}><Text style={styles.confirmModalButtonText}>Enviar Calificación</Text></TouchableOpacity></View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Estilos (iguales que antes, no los repito por longitud, pero los tienes de los mensajes anteriores)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { flex: 1, marginLeft: 12, fontSize: 18, fontWeight: '600', color: '#0F172A' },
  headerStatus: { fontSize: 14, color: '#64748B' },
  pinInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' },
  pinInfoText: { fontSize: 14, color: '#1E40AF', marginLeft: 8 },
  pinCode: { fontWeight: '700', fontSize: 16, letterSpacing: 2 },
  messagesContainer: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, color: '#0F172A' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#93C5FD' },
  closeButton: { backgroundColor: '#10B981', padding: 16, alignItems: 'center', margin: 16, borderRadius: 12 },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  pinInput: { height: 56, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 8, paddingHorizontal: 16, color: '#0F172A', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#F1F5F9' },
  cancelModalButtonText: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  confirmModalButton: { backgroundColor: '#2563EB' },
  confirmModalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ratingContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16, gap: 8 },
  ratingCommentInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#0F172A', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
});
