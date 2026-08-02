
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStorage = {
    getItem: async (key) => {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error('SecureStore read error:', error);
            return null;
        }
    },
    setItem: async (key, value) => {
        try {
            await SecureStore.setItemAsync(key, value, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });
        } catch (error) {
            console.error('SecureStore write error:', error);
        }
    },
    removeItem: async (key) => {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('SecureStore delete error:', error);
        }
    }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
    },
});

// Servicios...

export const chatService = {
    async startChat(publicationId, buyerId, sellerId) {
        try {
            const { data, error } = await supabase.rpc('start_secure_chat', {
                p_publication_id: publicationId,
                p_buyer_id: buyerId,
                p_seller_id: sellerId,
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'chatService', method: 'startChat' } });
            return { data: null, error };
        }
    },

    async verifyPin(chatId, pin, userId) {
        try {
            const { data, error } = await supabase.rpc('verify_chat_pin', {
                p_chat_id: chatId,
                p_pin: pin,
                p_user_id: userId,
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'chatService', method: 'verifyPin' } });
            return { data: null, error };
        }
    },

    async completeTransaction(chatId, userId, score, comment = '') {
        try {
            const { data, error } = await supabase.rpc('complete_transaction', {
                p_chat_id: chatId,
                p_user_id: userId,
                p_score: score,
                p_comment: comment,
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'chatService', method: 'completeTransaction' } });
            return { data: null, error };
        }
    },

    subscribeToMessages(chatId, onMessage) {
        const channel = supabase
            .channel(`chat-${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`,
            }, (payload) => { if (onMessage) onMessage(payload.new); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    subscribeToChatStatus(chatId, onStatusChange) {
        const channel = supabase
            .channel(`chat-status-${chatId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'p2p_chats',
                filter: `id=eq.${chatId}`,
            }, (payload) => { if (onStatusChange) onStatusChange(payload.new); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
};

export const publicationsService = {
    async getAllActive() {
        try {
            const { data, error } = await supabase
                .from('publications')
                .select(`*, profiles:user_id (id, full_name, rating_avg, total_trades, is_verified)`)
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false })
                .limit(50);
            return { data, error };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'publicationsService', method: 'getAllActive' } });
            return { data: null, error };
        }
    },

    async create(publicationData) {
        try {
            const { data, error } = await supabase
                .from('publications')
                .insert([publicationData])
                .select()
                .single();
            return { data, error };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'publicationsService', method: 'create' } });
            return { data: null, error };
        }
    }
};

export const profileService = {
    async getPublicProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('public_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            return { data, error };
        } catch (error) {
            Sentry.captureException(error, { tags: { service: 'profileService', method: 'getPublicProfile' } });
            return { data: null, error };
        }
    }
};
