export type ControlMode = 'dpad' | 'touchpad';

export interface DiscoveredTv {
  ip: string;
  port: number;
  name: string;
  model?: string;
  mac?: string;
  isOnline: boolean;
}

export interface TvConnectionState {
  ip: string;
  port: number;
  clientKey: string;
  isConnected: boolean;
  isPairing: boolean;
  isScanning?: boolean;
  tvName: string;
  modelName: string;
  error?: string;
  isMockMode: boolean;
  /** Canal de botões/cursor (Pointer Socket) pronto */
  pointerReady: boolean;
  /** MAC(s) da TV salvos para o Wake-on-LAN */
  macAddress?: string;
  statusMessage?: string;
  discoveredTvs: DiscoveredTv[];
}

export type WebOsCommand =
  | 'power'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute'
  | 'channelUp'
  | 'channelDown'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'back'
  | 'home'
  | 'menu'
  | 'input'
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'fastForward'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'netflix'
  | 'primeVideo'
  | 'youtube'
  | 'disney'
  | 'globoplay'
  | 'max'
  | 'appletv'
  | 'spotify'
  | 'twitch'
  | 'crunchyroll'
  | 'liveTv'
  | 'browser'
  | 'alexa'
  | 'googleAssistant'
  | 'number';

export interface TouchpadPosition {
  x: number;
  y: number;
}

export interface AppItem {
  id: string;
  name: string;
  color: string;
  category: 'Streaming' | 'Música' | 'Sistema' | 'Canais' | 'Jogos';
  badge?: string;
  appIdUri?: string;
}

