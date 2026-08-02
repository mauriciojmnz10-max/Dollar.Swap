import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStorage = {
  getItem: async (key) => {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key, value) => {
    try { await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED }); } catch {}
  },
  removeItem: async (key) => {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' }
});

// ------------------- CHAT SERVICE -------------------
export const chatService = {
  async getChat(chatId) {
    const { data, error } = await supabase.from('p2p_chats').select('*, buyer:buyer_id(*), seller:seller_id(*)').eq('id', chatId).single();
    return { data, error };
  },
  async getChatsForUser(userId) {
    const { data, error } = await supabase.from('p2p_chats').select('*, publication:publication_id(*, profiles(*))').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false });
    return { data, error };
  },
  async getChatMessages(chatId) {
    const { data, error } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('sent_at', { ascending: true });
    return { data, error };
  },
  async sendMessage(chatId, senderId, content) {
    const { data, error } = await supabase.from('messages').insert([{ chat_id: chatId, sender_id: senderId, content }]).select().single();
    return { data, error };
  },
  async startChat(publicationId, buyerId, sellerId) {
    const { data, error } = await supabase.rpc('start_secure_chat', { p_publication_id: publicationId, p_buyer_id: buyerId, p_seller_id: sellerId });
    return { data, error };
  },
  async verifyPin(chatId, pin, userId) {
    const { data, error } = await supabase.rpc('verify_chat_pin', { p_chat_id: chatId, p_pin: pin, p_user_id: userId });
    return { data, error };
  },
  async completeTransaction(chatId, userId, score, comment = '') {
    const { data, error } = await supabase.rpc('complete_transaction', { p_chat_id: chatId, p_user_id: userId, p_score: score, p_comment: comment });
    return { data, error };
  },
  subscribeToMessages(chatId, onMessage) {
    const channel = supabase.channel(`chat-${chatId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => onMessage(payload.new)).subscribe();
    return () => supabase.removeChannel(channel);
  },
  subscribeToChatStatus(chatId, onStatusChange) {
    const channel = supabase.channel(`chat-status-${chatId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'p2p_chats', filter: `id=eq.${chatId}` }, (payload) => onStatusChange(payload.new)).subscribe();
    return () => supabase.removeChannel(channel);
  }
};

// ------------------- PUBLICATIONS SERVICE -------------------
export const publicationsService = {
  async getAllActive() {
    const { data, error } = await supabase.from('publications').select('*, profiles:user_id(id, full_name, rating_avg, total_trades, is_verified)').eq('status', 'ACTIVE').order('created_at', { ascending: false }).limit(50);
    return { data, error };
  },
  async create(publicationData) {
    const { data, error } = await supabase.from('publications').insert([publicationData]).select().single();
    return { data, error };
  }
};

// ------------------- PROFILE SERVICE -------------------
export const profileService = {
  async getPublicProfile(userId) {
    const { data, error } = await supabase.from('public_profiles').select('*').eq('id', userId).single();
    return { data, error };
  }
};

// ------------------- AUTH SERVICE -------------------
export const authService = {
  async signUp(email, password, fullName, phoneNumber) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { data: null, error };
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, phone_number: phoneNumber }]);
    }
    return { data, error: null };
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, error };
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return { user: { ...user, profile }, error: null };
  }
};

// ------------------- STORAGE SERVICE -------------------
export const storageService = {
  async uploadBillPhoto(uri, userId) {
    const formData = new FormData();
    const ext = uri.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${ext}`;
    formData.append('file', { uri, name: fileName, type: `image/${ext}` });
    const { data, error } = await supabase.storage.from('bills').upload(fileName, formData);
    if (error) return { url: null, error };
    const { data: { publicUrl } } = supabase.storage.from('bills').getPublicUrl(fileName);
    return { url: publicUrl, error: null };
  }
};
