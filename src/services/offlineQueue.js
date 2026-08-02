import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { chatService } from './supabase';

const QUEUE_KEY = 'offline_messages_queue';
const MAX_QUEUE_SIZE = 100;

class OfflineQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        await this.loadQueue();
        this.setupNetworkListener();
        this.initialized = true;
    }

    setupNetworkListener() {
        NetInfo.addEventListener(async (state) => {
            if (state.isConnected && this.queue.length > 0) {
                await this.processQueue();
            }
        });
    }

    async addMessage(chatId, content, userId) {
        await this.initialize();
        const message = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chatId,
            content: content.trim(),
            userId,
            timestamp: new Date().toISOString(),
            status: 'pending',
            retries: 0
        };

        if (this.queue.length >= MAX_QUEUE_SIZE) this.queue.shift();
        this.queue.push(message);
        await this.saveQueue();

        const isConnected = await this.isConnected();
        if (isConnected) await this.processQueue();

        return message;
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        const isConnected = await this.isConnected();
        if (!isConnected) return;

        this.isProcessing = true;
        const failedMessages = [];

        for (const message of this.queue) {
            try {
                const { error } = await chatService.sendMessage(
                    message.chatId,
                    message.userId,
                    message.content
                );
                if (!error) {
                    await this.removeFromQueue(message.id);
                } else {
                    message.retries += 1;
                    if (message.retries < 3) failedMessages.push(message);
                }
            } catch (error) {
                message.retries += 1;
                if (message.retries < 3) failedMessages.push(message);
            }
        }

        this.queue = failedMessages;
        await this.saveQueue();
        this.isProcessing = false;
    }

    async isConnected() {
        try {
            const state = await NetInfo.fetch();
            return state.isConnected && state.isInternetReachable !== false;
        } catch { return false; }
    }

    async saveQueue() {
        try {
            await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(this.queue), {
                keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    }

    async loadQueue() {
        try {
            const data = await SecureStore.getItemAsync(QUEUE_KEY);
            if (data) {
                this.queue = JSON.parse(data);
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                this.queue = this.queue.filter(msg => new Date(msg.timestamp).getTime() > sevenDaysAgo);
            }
        } catch (error) {
            console.error('Error loading offline queue:', error);
            this.queue = [];
        }
    }

    async removeFromQueue(messageId) {
        this.queue = this.queue.filter(m => m.id !== messageId);
        await this.saveQueue();
    }

    async getPendingCount() {
        await this.initialize();
        return this.queue.length;
    }

    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
    }
}

export const offlineQueue = new OfflineQueue();
