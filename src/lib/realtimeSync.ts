import { supabase } from './supabase';

const MAX_RECONNECT_ATTEMPTS = 3; // Reduced for faster stabilization
const INITIAL_RECONNECT_DELAY = 2000; // Longer delay
const HEARTBEAT_INTERVAL = 45000; // Longer heartbeat
const CONNECTION_DEBOUNCE = 3000; // Longer debounce to prevent loops
const CHANNEL_TIMEOUT = 10000; // 10 seconds

export interface QuizStateUpdate {
  type: 'START_QUIZ' | 'START_QUESTION' | 'SHOW_RESULTS' | 'FINISH_QUIZ' | 'NEXT_QUESTION' | 'PARTICIPANT_UPDATE' | 'LEADERBOARD_UPDATE' | 'QUESTION_ADDED';
  sessionId: string;
  messageId?: string;
  questionIndex?: number;
  timestamp: number;
  data?: any;
}

type UpdateCallback = (update: QuizStateUpdate) => void;
type ClientType = 'host' | 'participant' | 'bigscreen';

interface ChannelState {
  channel: any;
  isConnected: boolean;
  lastHeartbeat: number;
  subscriptionStatus: string;
}

class UnifiedRealtimeSync {
  private channels = new Map<string, ChannelState>();
  private listeners = new Map<string, Set<UpdateCallback>>();
  private connectionDebounceTimers = new Map<string, NodeJS.Timeout>();
  private reconnectAttempts = new Map<string, number>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private pendingMessages = new Map<string, QuizStateUpdate>();
  private connectionMonitor: NodeJS.Timeout | null = null;

  constructor() {
    this.startConnectionMonitor();
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private startConnectionMonitor() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }

    this.connectionMonitor = setInterval(() => {
      this.checkConnections();
    }, 30000); // Check every 30 seconds
  }

  private checkConnections() {
    const now = Date.now();
    
    this.channels.forEach((channelState, channelName) => {
      // Check if heartbeat is stale
      if (channelState.isConnected && now - channelState.lastHeartbeat > HEARTBEAT_INTERVAL * 2) {
        console.warn(`[SYNC] Stale connection detected for ${channelName}, attempting reconnection`);
        this.handleReconnect(channelName);
      }
    });
  }

  private handleReconnect(channelName: string) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[SYNC] Max reconnection attempts reached for ${channelName}`);
      this.cleanupChannel(channelName);
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, attempts),
      MAX_RECONNECT_ATTEMPTS * INITIAL_RECONNECT_DELAY
    );

    console.log(`[SYNC] Reconnecting to ${channelName} in ${delay}ms (attempt ${attempts + 1})`);
    
    this.reconnectAttempts.set(channelName, attempts + 1);
    
    // Mark as disconnected
    const channelState = this.channels.get(channelName);
    if (channelState) {
      channelState.isConnected = false;
    }
    
    setTimeout(() => {
      this.createAndSubscribeChannel(channelName);
    }, delay);
  }

  private setupHeartbeat(channelName: string) {
    this.clearHeartbeat(channelName);
    
    const interval = setInterval(() => {
      const channelState = this.channels.get(channelName);
      if (channelState?.channel && channelState.isConnected) {
        try {
          channelState.channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: Date.now() }
          });
          channelState.lastHeartbeat = Date.now();
        } catch (error) {
          console.error(`[SYNC] Heartbeat failed for ${channelName}:`, error);
          this.handleReconnect(channelName);
        }
      }
    }, HEARTBEAT_INTERVAL);
    
    this.heartbeatIntervals.set(channelName, interval);
  }

  private clearHeartbeat(channelName: string) {
    const interval = this.heartbeatIntervals.get(channelName);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(channelName);
    }
  }

  private createAndSubscribeChannel(channelName: string) {
    // Clean up existing channel first
    const existingState = this.channels.get(channelName);
    if (existingState?.channel) {
      try {
        supabase.removeChannel(existingState.channel);
      } catch (error) {
        console.error(`[SYNC] Error removing existing channel ${channelName}:`, error);
      }
    }

    // Create new channel
    const channel = supabase.channel(channelName, {
      config: { 
        broadcast: { ack: true },
        presence: { key: 'user_presence' }
      }
    });

    const channelState: ChannelState = {
      channel,
      isConnected: false,
      lastHeartbeat: Date.now(),
      subscriptionStatus: 'PENDING'
    };

    this.channels.set(channelName, channelState);

    // Handle incoming messages
    channel.on('broadcast', { event: 'quiz_update' }, ({ payload }: { payload: QuizStateUpdate }) => {
      console.log(`[SYNC] Received update on ${channelName}:`, payload.type);
      this.listeners.get(channelName)?.forEach(listener => {
        try { 
          listener(payload); 
        } catch (error) { 
          console.error(`[SYNC] Error in listener for ${channelName}:`, error);
        }
      });
    });

    // Handle heartbeat responses
    channel.on('broadcast', { event: 'heartbeat' }, () => {
      channelState.lastHeartbeat = Date.now();
    });

    // Handle connection state changes with proper error handling
    channel.on('system' as any, { event: 'disconnect' }, () => {
      console.log(`[SYNC] Channel ${channelName} disconnected`);
      channelState.isConnected = false;
      channelState.subscriptionStatus = 'DISCONNECTED';
      this.handleReconnect(channelName);
    });

    channel.on('system' as any, { event: 'reconnect' }, () => {
      console.log(`[SYNC] Channel ${channelName} reconnected`);
      channelState.isConnected = true;
      channelState.subscriptionStatus = 'SUBSCRIBED';
      this.reconnectAttempts.set(channelName, 0);
      this.setupHeartbeat(channelName);
      this.retryPendingMessages(channelName);
    });

    // Subscribe with timeout handling
    const subscriptionTimeout = setTimeout(() => {
      if (channelState.subscriptionStatus === 'PENDING') {
        console.error(`[SYNC] Subscription timeout for ${channelName}`);
        this.handleReconnect(channelName);
      }
    }, CHANNEL_TIMEOUT);

    channel.subscribe((status: string) => {
      console.log(`[SYNC] Subscription status for ${channelName}:`, status);
      channelState.subscriptionStatus = status;
      
      clearTimeout(subscriptionTimeout);
      
      if (status === 'SUBSCRIBED') {
        channelState.isConnected = true;
        this.reconnectAttempts.set(channelName, 0);
        this.setupHeartbeat(channelName);
        this.retryPendingMessages(channelName);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        channelState.isConnected = false;
        this.handleReconnect(channelName);
      }
    });

    return channelState;
  }

  private retryPendingMessages(channelName: string) {
    const sessionId = channelName.replace('sync_', '');
    const pendingForChannel = Array.from(this.pendingMessages.entries())
      .filter(([_, msg]) => msg.sessionId === sessionId);
    
    if (pendingForChannel.length > 0) {
      console.log(`[SYNC] Retrying ${pendingForChannel.length} pending messages for ${channelName}`);
      
      pendingForChannel.forEach(async ([messageId, update]) => {
        try {
          await this.sendUpdateInternal(sessionId, update);
          this.pendingMessages.delete(messageId);
        } catch (error) {
          console.error(`[SYNC] Failed to retry message ${messageId}:`, error);
        }
      });
    }
  }

  async sendUpdate(sessionId: string, update: Omit<QuizStateUpdate, 'sessionId' | 'messageId' | 'timestamp'>) {
    const messageId = this.generateMessageId();
    const fullUpdate: QuizStateUpdate = {
      ...update,
      sessionId,
      messageId,
      timestamp: Date.now()
    };

    return this.sendUpdateInternal(sessionId, fullUpdate);
  }

  private async sendUpdateInternal(sessionId: string, fullUpdate: QuizStateUpdate) {
    const channelName = `sync_${sessionId}`;
    let channelState = this.channels.get(channelName);
    
    if (!channelState || !channelState.isConnected) {
      console.log(`[SYNC] Channel ${channelName} not ready, queuing message`);
      if (fullUpdate.messageId) {
        this.pendingMessages.set(fullUpdate.messageId, fullUpdate);
      }
      
      if (!channelState) {
        this.createAndSubscribeChannel(channelName);
      }
      return;
    }

    try {
      await channelState.channel.send({
        type: 'broadcast',
        event: 'quiz_update',
        payload: fullUpdate
      });

      console.log(`[SYNC] Message sent successfully on ${channelName}:`, fullUpdate.type);
      
      // Remove from pending if successful
      if (fullUpdate.messageId) {
        this.pendingMessages.delete(fullUpdate.messageId);
      }
      
    } catch (error) {
      console.error(`[SYNC] Error sending message on ${channelName}:`, error);
      
      // Queue for retry
      if (fullUpdate.messageId) {
        this.pendingMessages.set(fullUpdate.messageId, fullUpdate);
      }
      
      // Trigger reconnection
      this.handleReconnect(channelName);
      throw error;
    }
  }

  // FIXED: Simpler subscription without debouncing that was causing loops
  subscribeToUpdates(
    sessionId: string, 
    callback: UpdateCallback, 
    clientType: ClientType
  ): () => void {
    const channelName = `sync_${sessionId}`;
    
    console.log(`[SYNC] ${clientType} subscribing to session:`, sessionId);

    // Add to listeners immediately
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(callback);

    // Create channel immediately if it doesn't exist
    if (!this.channels.has(channelName)) {
      this.createAndSubscribeChannel(channelName);
    }

    // Return cleanup function
    return () => {
      console.log(`[SYNC] ${clientType} unsubscribing from ${channelName}`);
      const listeners = this.listeners.get(channelName);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          // Immediate cleanup when no listeners
          this.cleanupChannel(channelName);
        }
      }
    };
  }

  // Clean up a specific channel
  private cleanupChannel(channelName: string) {
    console.log(`[SYNC] Cleaning up channel: ${channelName}`);
    
    const channelState = this.channels.get(channelName);
    if (channelState?.channel) {
      try {
        supabase.removeChannel(channelState.channel);
      } catch (error) {
        console.error(`[SYNC] Error cleaning up channel ${channelName}:`, error);
      }
    }
    
    this.channels.delete(channelName);
    this.clearHeartbeat(channelName);
    this.listeners.delete(channelName);
    this.reconnectAttempts.delete(channelName);
    
    // Clean up any pending messages for this channel
    const sessionId = channelName.replace('sync_', '');
    const pendingForChannel = Array.from(this.pendingMessages.entries())
      .filter(([_, msg]) => msg.sessionId === sessionId);
    
    pendingForChannel.forEach(([id]) => this.pendingMessages.delete(id));
  }

  // Get connection status for debugging
  getConnectionStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.channels.forEach((channelState, channelName) => {
      status[channelName] = {
        isConnected: channelState.isConnected,
        subscriptionStatus: channelState.subscriptionStatus,
        lastHeartbeat: new Date(channelState.lastHeartbeat).toISOString(),
        listeners: this.listeners.get(channelName)?.size || 0,
        reconnectAttempts: this.reconnectAttempts.get(channelName) || 0
      };
    });
    
    return {
      channels: status,
      pendingMessages: this.pendingMessages.size,
      totalChannels: this.channels.size
    };
  }

  // Cleanup all channels
  cleanup() {
    console.log('[SYNC] Cleaning up all channels');
    
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
    
    Array.from(this.channels.keys()).forEach(channelName => {
      this.cleanupChannel(channelName);
    });
  }
}

export const unifiedSync = new UnifiedRealtimeSync();

// Make it available for debugging
if (typeof window !== 'undefined') {
  (window as any).unifiedSync = unifiedSync;
}