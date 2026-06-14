import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.js';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connectCallbacks = [];  // one-time, cleared after first connect
    this.handlers = {};          // { destination: callback } — survives reconnects
    this.stompSubs = {};         // { destination: stompSub } — active STOMP subs
    this.reconnectListeners = []; // callbacks fired after every reconnect (not initial connect)
    this.reconnectCount = 0;
  }

  connect(token, onConnect) {
    if (this.connected) {
      if (onConnect) onConnect();
      return;
    }

    if (onConnect) this.connectCallbacks.push(onConnect);
    if (this.client) return;

    const WS_BASE = import.meta.env.VITE_WS_URL
      || `${window.location.protocol}//${window.location.hostname}:8080`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.connected = true;
        this.stompSubs = {};

        // Re-establish all registered subscriptions (handles initial connect + every reconnect)
        Object.entries(this.handlers).forEach(([dest, cb]) => {
          this.stompSubs[dest] = this.client.subscribe(dest, (msg) => {
            try { cb(JSON.parse(msg.body)); } catch { cb(msg.body); }
          });
        });

        // Run one-time connect callbacks (they call subscribe() which adds to handlers/stompSubs)
        this.connectCallbacks.forEach((cb) => cb());
        this.connectCallbacks = [];

        // Fire reconnect listeners (skip the very first connect)
        if (this.reconnectCount > 0) {
          this.reconnectListeners.forEach((cb) => cb());
        }
        this.reconnectCount++;
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
      },
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.handlers = {};
      this.stompSubs = {};
      this.connectCallbacks = [];
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }

  subscribe(destination, callback) {
    // Always store the handler so it survives reconnects
    this.handlers[destination] = callback;

    if (!this.client || !this.connected) return null;

    // Replace existing STOMP sub if any (prevents duplicates)
    if (this.stompSubs[destination]) {
      try { this.stompSubs[destination].unsubscribe(); } catch {}
    }
    this.stompSubs[destination] = this.client.subscribe(destination, (msg) => {
      try { callback(JSON.parse(msg.body)); } catch { callback(msg.body); }
    });
    return this.stompSubs[destination];
  }

  unsubscribe(destination) {
    delete this.handlers[destination];
    if (this.stompSubs[destination]) {
      try { this.stompSubs[destination].unsubscribe(); } catch {}
      delete this.stompSubs[destination];
    }
  }

  publish(destination, body) {
    if (this.client && this.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }

  isConnected() {
    return this.connected;
  }

  onReconnect(cb) {
    this.reconnectListeners.push(cb);
  }

  offReconnect(cb) {
    this.reconnectListeners = this.reconnectListeners.filter((r) => r !== cb);
  }
}

const wsService = new WebSocketService();
export default wsService;
