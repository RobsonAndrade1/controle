import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativeDiscoveredTv {
  name: string;
  ip: string;
  port: number;
  modelName?: string;
  /** true = respondeu ao SSDP como webOS; false = apenas porta 3000/3001 aberta */
  confirmed?: boolean;
}

export interface NativeConnectionEvent {
  isConnected: boolean;
  isPairing: boolean;
  pointerReady: boolean;
  clientKey?: string;
  /** socket_open | prompt | registered | pointer_ready | pointer_lost | pointer_denied | register_error | closed | failure */
  message?: string;
  error?: string;
}

export interface LgNativeBridgePlugin {
  discoverTvs(): Promise<{ tvs: NativeDiscoveredTv[] }>;
  connect(options: { ip: string; port: number; clientKey?: string }): Promise<{ success: boolean }>;
  /** Botão via Pointer Socket (UP, DOWN, ENTER, BACK, HOME, VOLUMEUP, VOLUMEDOWN, MUTE, CHANNELUP, 0-9, RED...) */
  sendButton(options: { name: string }): Promise<{ success: boolean; pointerReady: boolean }>;
  /** Requisição SSAP com resposta */
  request(options: { uri: string; payload?: Record<string, unknown> }): Promise<{ success: boolean; payload?: Record<string, any> }>;
  sendCommand(options: { payload: string }): Promise<{ success: boolean }>;
  sendPointerMove(options: { dx: number; dy: number }): Promise<{ success: boolean }>;
  sendPointerScroll(options: { dx: number; dy: number }): Promise<{ success: boolean }>;
  sendPointerClick(): Promise<{ success: boolean }>;
  /** Wake-on-LAN: envia o magic packet para cada MAC */
  wakeOnLan(options: { macs: string[]; ip?: string }): Promise<{ success: boolean; sent?: number; error?: string }>;
  disconnect(): Promise<{ success: boolean }>;
  getConnectionStatus(): Promise<{ isConnected: boolean; isPairing: boolean; pointerReady: boolean; clientKey?: string }>;
  addListener(
    eventName: 'onConnectionChange',
    listener: (event: NativeConnectionEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const LgNativeBridge = registerPlugin<LgNativeBridgePlugin>('LgNativeBridge');
