import { supabase } from './supabase';

const CONNECTION_TIMEOUT = 15000; // 15 seconds (increased for stability)
const HEARTBEAT_INTERVAL = 60000; // 60 seconds (less aggressive monitoring)
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 3000; // 3 seconds (slightly longer initial delay)

export interface QuizStateUpdate {
  type: 'START_QUIZ' | 'START_QUESTION' | 'SHOW_RESULTS' | 'FINISH_QUIZ' | 'PARTICIPANT_UPDATE' | 'QUESTION_ADDED';
  sessionId: string;
  questionIndex?: number;
  timestamp: number;
  data?: any;
}

type UpdateCallback = (update: QuizStateUpdate) => void;
type ClientType = 'host' | 'participant' | 'bigscreen';

interface SubscriptionState {
  isConnected: boolean;
  callbacks: Set<UpdateCallback>;
  channel: any;
  heartbeatTimer?: NodeJS.Timeout;
  retryCount: number;
  lastSeen: number;
  cleanupTimer?: NodeJS.Timeout;
}

class OptimizedRealtimeSync {
  private subscriptions = new Map<string, SubscriptionState>();
  private connectionMonitor?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor() {
    this.startConnectionMonitor();
    this.setupGlobalErrorHandling();
  }

  private setupGlobalErrorHandling() {
    // Handle page unload to cleanup connections
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });

      // Handle page visibility changes to pause/resume connections
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAllConnections();
        } else {
          this.resumeAllConnections();
        }
      });
    }
  }

  private startConnectionMonitor() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }

    this.connectionMonitor = setInterval(() => {
      this.monitorConnections();
    }, HEARTBEAT_INTERVAL);
  }

  private monitorConnections() {
    if (this.isDestroyed) return;

    const now = Date.now();
    
    this.subscriptions.forEach((state, sessionId) => {
      // Check if connection is stale (more lenient timing)
      if (state.isConnected && now - state.lastSeen > HEARTBEAT_INTERVAL * 3) {
        console.warn(`[SYNC] Stale connection for session ${sessionId} (last seen ${Math.round((now - state.lastSeen) / 1000)}s ago), reconnecting...`);
        this.reconnectSession(sessionId);
      }
    });
  }

  private async reconnectSession(sessionId: string) {
    const state = this.subscriptions.get(sessionId);
    if (!state) return;
    
    // Don't give up after max retries - just log and keep trying with longer delays
    if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(`[SYNC] Max retry attempts reached for session ${sessionId}, using extended delay`);
      state.retryCount = MAX_RETRY_ATTEMPTS; // Cap at max but don't unsubscribe
    } else {
      state.retryCount++;
    }

    state.isConnected = false;

    // Exponential backoff with extended delay for persistent failures
    const baseDelay = state.retryCount >= MAX_RETRY_ATTEMPTS ? 30000 : RETRY_DELAY_BASE; // 30s for persistent failures
    const delay = baseDelay * Math.pow(2, Math.min(state.retryCount - 1, 3)); // Cap exponential growth
    
    console.log(`[SYNC] Retrying connection for session ${sessionId} in ${delay}ms (attempt ${state.retryCount})`);
    
    setTimeout(() => {
      if (!this.isDestroyed && this.subscriptions.has(sessionId)) {
        this.createSubscription(sessionId);
      }
    }, delay);
  }

  private createSubscription(sessionId: string): boolean {
    try {
      const state = this.subscriptions.get(sessionId);
      if (!state) return false;

      // Remove existing channel if any
      if (state.channel) {
        supabase.removeChannel(state.channel);
      }

      // Create new optimized channel with minimal subscriptions
      const channelName = `quiz_session_${sessionId}_${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${sessionId}`
        }, (payload) => {
          this.handleSessionUpdate(sessionId, payload);
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_questions',
          filter: `quiz_session_id=eq.${sessionId}`
        }, () => {
          this.broadcastUpdate(sessionId, {
            type: 'QUESTION_ADDED',
            sessionId,
            timestamp: Date.now()
          });
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `quiz_session_id=eq.${sessionId}`
        }, () => {
          this.broadcastUpdate(sessionId, {
            type: 'PARTICIPANT_UPDATE',
            sessionId,
            timestamp: Date.now()
          });
        })
        .subscribe((status) => {
          console.log(`[SYNC] Channel ${channelName} status:`, status);
          
          const currentState = this.subscriptions.get(sessionId);
          if (!currentState) return;
          
          if (status === 'SUBSCRIBED') {
            currentState.isConnected = true;
            currentState.lastSeen = Date.now();
            currentState.retryCount = 0;
            this.startHeartbeat(sessionId);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            currentState.isConnected = false;
            this.reconnectSession(sessionId);
          }
        });

      state.channel = channel;
      
      // Set connection timeout
      setTimeout(() => {
        const currentState = this.subscriptions.get(sessionId);
        if (currentState && !currentState.isConnected) {
          console.warn(`[SYNC] Connection timeout for session ${sessionId}`);
          this.reconnectSession(sessionId);
        }
      }, CONNECTION_TIMEOUT);

      return true;
    } catch (error) {
      console.error(`[SYNC] Failed to create subscription for session ${sessionId}:`, error);
      return false;
    }
  }

  private handleSessionUpdate(sessionId: string, payload: any) {
    const state = this.subscriptions.get(sessionId);
    if (!state) return;

    state.lastSeen = Date.now();

    // Determine update type based on the change
    const record = payload.new || payload.old;
    if (!record) return;

    let updateType: QuizStateUpdate['type'] = 'START_QUIZ';
    
    if (record.is_finished) {
      updateType = 'FINISH_QUIZ';
    } else if (record.show_results) {
      updateType = 'SHOW_RESULTS';
    } else if (record.current_question_index >= 0 && record.current_question_start_time) {
      updateType = 'START_QUESTION';
    }

    this.broadcastUpdate(sessionId, {
      type: updateType,
      sessionId,
      questionIndex: record.current_question_index,
      timestamp: Date.now(),
      data: record
    });
  }

  private broadcastUpdate(sessionId: string, update: QuizStateUpdate) {
    const state = this.subscriptions.get(sessionId);
    if (!state) return;

    console.log(`[SYNC] Broadcasting ${update.type} to ${state.callbacks.size} callbacks`);

    // Broadcast to all callbacks for this session
    state.callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('[SYNC] Error in callback:', error);
      }
    });
  }



  private startHeartbeat(sessionId: string) {
    const state = this.subscriptions.get(sessionId);
    if (!state) return;

    // Clear existing heartbeat
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
    }

    state.heartbeatTimer = setInterval(() => {
      if (state.isConnected) {
        state.lastSeen = Date.now();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private pauseAllConnections() {
    console.log('[SYNC] Pausing all connections (page hidden)');
    this.subscriptions.forEach((state) => {
      if (state.heartbeatTimer) {
        clearInterval(state.heartbeatTimer);
      }
    });
  }

  private resumeAllConnections() {
    console.log('[SYNC] Resuming all connections (page visible)');
    this.subscriptions.forEach((state, sessionId) => {
      if (state.isConnected) {
        this.startHeartbeat(sessionId);
      } else {
        this.reconnectSession(sessionId);
      }
    });
  }

  // Public API
  public subscribe(sessionId: string, callback: UpdateCallback, clientType: ClientType = 'host'): () => void {
    if (this.isDestroyed) {
      console.error('[SYNC] Cannot subscribe, sync manager is destroyed');
      return () => {};
    }

    console.log(`[SYNC] ${clientType} subscribing to session ${sessionId}`);

    // Get or create subscription state
    let state = this.subscriptions.get(sessionId);
    if (!state) {
      state = {
              isConnected: false,
      callbacks: new Set(),
      channel: null,
      retryCount: 0,
      lastSeen: Date.now(),
      cleanupTimer: undefined
      };
      this.subscriptions.set(sessionId, state);
      
      // Create the actual subscription
      this.createSubscription(sessionId);
    }

    // Add callback
    state.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      const currentState = this.subscriptions.get(sessionId);
      if (currentState) {
        currentState.callbacks.delete(callback);
        
        // Clean up if no more callbacks after grace period (prevents premature disconnections)
        if (currentState.callbacks.size === 0) {
          console.log(`[SYNC] No more callbacks for session ${sessionId}, scheduling cleanup in 30s`);
          
          // Clear any existing cleanup timer
          if (currentState.cleanupTimer) {
            clearTimeout(currentState.cleanupTimer);
          }
          
          // Schedule cleanup with grace period
          currentState.cleanupTimer = setTimeout(() => {
            const state = this.subscriptions.get(sessionId);
            if (state && state.callbacks.size === 0) {
              console.log(`[SYNC] Grace period expired, cleaning up session ${sessionId}`);
              this.unsubscribe(sessionId);
            }
          }, 30000); // 30 second grace period
        } else {
          // Cancel cleanup if new callbacks are added
          if (currentState.cleanupTimer) {
            clearTimeout(currentState.cleanupTimer);
            currentState.cleanupTimer = undefined;
          }
        }
      }
    };
  }

  public unsubscribe(sessionId: string) {
    const state = this.subscriptions.get(sessionId);
    if (!state) return;

    console.log(`[SYNC] Unsubscribing from session ${sessionId}`);

    // Clear heartbeat
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
    }

    // Clear cleanup timer
    if (state.cleanupTimer) {
      clearTimeout(state.cleanupTimer);
    }



    // Remove channel
    if (state.channel) {
      supabase.removeChannel(state.channel);
    }

    // Remove from subscriptions
    this.subscriptions.delete(sessionId);
  }

  public destroy() {
    if (this.isDestroyed) return;

    console.log('[SYNC] Destroying sync manager');
    this.isDestroyed = true;

    // Clear connection monitor
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }

    // Unsubscribe from all sessions
    const sessionIds = Array.from(this.subscriptions.keys());
    sessionIds.forEach(sessionId => this.unsubscribe(sessionId));
  }

  public getConnectionStatus(sessionId: string): boolean {
    const state = this.subscriptions.get(sessionId);
    return state?.isConnected || false;
  }

  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Create singleton instance
export const optimizedSync = new OptimizedRealtimeSync();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).optimizedSync = optimizedSync;
} 