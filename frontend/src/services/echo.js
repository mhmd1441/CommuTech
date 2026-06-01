import { API_BASE_URL } from "../config";
import { getAuthToken } from "./api";

const PUSHER_KEY    = "ebc6b1cb30cb336d6f2d";
const PUSHER_CLUSTER = "eu";
const WS_URL = `wss://ws-${PUSHER_CLUSTER}.pusher.com/app/${PUSHER_KEY}?protocol=7&client=react-native&version=1.0`;

class PusherClient {
  constructor(token) {
    this.token      = token;
    this.ws         = null;
    this.socketId   = null;
    this.channels   = {};
    this.subscribed = new Set();
    this.pending    = [];
  }

  connect() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.event === "pusher:connection_established") {
        this.socketId = JSON.parse(msg.data).socket_id;
        this.pending.forEach((ch) => this._subscribe(ch));
        this.pending = [];
        return;
      }

      const handlers = this.channels[msg.channel]?.[msg.event];
      if (handlers) {
        const data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
        handlers.forEach((fn) => fn(data));
      }
    };

    this.ws.onerror = (e) => console.warn("Pusher error:", e.message);
    this.ws.onclose = () => { this.socketId = null; };
  }

  async _subscribe(channelName) {
    if (this.subscribed.has(channelName)) return;
    this.subscribed.add(channelName);
    try {
      const res = await fetch(`${API_BASE_URL}/broadcasting/auth`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ socket_id: this.socketId, channel_name: channelName }),
      });
      const { auth } = await res.json();
      this.ws.send(JSON.stringify({
        event: "pusher:subscribe",
        data: { channel: channelName, auth },
      }));
    } catch (e) {
      this.subscribed.delete(channelName);
      console.warn("Pusher auth failed:", e.message);
    }
  }

  subscribe(channelName) {
    if (!this.channels[channelName]) this.channels[channelName] = {};

    if (this.socketId) {
      this._subscribe(channelName);
    } else if (!this.pending.includes(channelName)) {
      this.pending.push(channelName);
    }

    const self = this;
    return {
      bind(event, fn) {
        if (!self.channels[channelName][event]) self.channels[channelName][event] = [];
        self.channels[channelName][event].push(fn);
        return this;
      },
      unbind(event, fn) {
        if (!self.channels[channelName]?.[event]) return;
        self.channels[channelName][event] = self.channels[channelName][event].filter((h) => h !== fn);
      },
    };
  }

  unsubscribe(channelName) {
    delete this.channels[channelName];
    this.subscribed.delete(channelName);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: "pusher:unsubscribe", data: { channel: channelName } }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.socketId = null;
    this.channels = {};
    this.pending  = [];
  }
}

let instance = null;

export function getPusher() {
  const token = getAuthToken();
  if (!token) return null;
  if (instance) return instance;
  instance = new PusherClient(token);
  instance.connect();
  return instance;
}

export function disconnectPusher() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
