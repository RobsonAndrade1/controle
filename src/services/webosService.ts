import { Capacitor } from '@capacitor/core';
import { LgNativeBridge } from './nativeBridge';
import type { NativeConnectionEvent } from './nativeBridge';
import { WebOsCommand, DiscoveredTv, TvConnectionState } from '../types';

export type { WebOsCommand, DiscoveredTv, TvConnectionState };

export interface CommandResult {
  success: boolean;
  label: string;
  reason?: string;
}

/** Botões do Pointer Socket (nomes exatos aceitos pela TV) + reserva SSAP */
const BUTTONS: Partial<Record<WebOsCommand, { label: string; button?: string; uri?: string; payload?: Record<string, unknown> }>> = {
  power: { label: 'Desligar TV', uri: 'ssap://system/turnOff' },
  volumeUp: { label: 'Volume +', button: 'VOLUMEUP' },
  volumeDown: { label: 'Volume -', button: 'VOLUMEDOWN' },
  mute: { label: 'Mudo', button: 'MUTE' },
  channelUp: { label: 'Canal +', button: 'CHANNELUP' },
  channelDown: { label: 'Canal -', button: 'CHANNELDOWN' },
  up: { label: 'Cima', button: 'UP' },
  down: { label: 'Baixo', button: 'DOWN' },
  left: { label: 'Esquerda', button: 'LEFT' },
  right: { label: 'Direita', button: 'RIGHT' },
  ok: { label: 'OK', button: 'ENTER' },
  back: { label: 'Voltar', button: 'BACK' },
  home: { label: 'Início', button: 'HOME' },
  menu: { label: 'Configurações da TV', uri: 'ssap://system.launcher/open', payload: { id: 'com.palm.app.settings' } },
  input: { label: 'Entradas', uri: 'ssap://system.launcher/open', payload: { id: 'com.webos.app.inputpicker' } },
  play: { label: 'Play', button: 'PLAY' },
  pause: { label: 'Pause', button: 'PAUSE' },
  stop: { label: 'Stop', button: 'STOP' },
  rewind: { label: 'Retroceder', button: 'REWIND' },
  fastForward: { label: 'Avançar', button: 'FASTFORWARD' },
  red: { label: 'Vermelho', button: 'RED' },
  green: { label: 'Verde', button: 'GREEN' },
  yellow: { label: 'Amarelo', button: 'YELLOW' },
  blue: { label: 'Azul', button: 'BLUE' },
};

/** Apps: títulos para procurar na lista da TV + IDs conhecidos como reserva */
const APPS: Record<string, { label: string; titles: string[]; ids: string[] }> = {
  netflix: { label: 'Netflix', titles: ['netflix'], ids: ['netflix'] },
  primeVideo: { label: 'Prime Video', titles: ['prime video'], ids: ['amazon'] },
  youtube: { label: 'YouTube', titles: ['youtube'], ids: ['youtube.leanback.v4'] },
  disney: { label: 'Disney+', titles: ['disney+', 'disney plus'], ids: ['com.disney.disneyplus-prod'] },
  globoplay: { label: 'Globoplay', titles: ['globoplay'], ids: [] },
  max: { label: 'Max', titles: ['max', 'hbo max'], ids: [] },
  appletv: { label: 'Apple TV', titles: ['apple tv'], ids: ['com.apple.appletv'] },
  spotify: { label: 'Spotify', titles: ['spotify'], ids: ['spotify-beehive'] },
  twitch: { label: 'Twitch', titles: ['twitch'], ids: [] },
  crunchyroll: { label: 'Crunchyroll', titles: ['crunchyroll'], ids: [] },
  liveTv: { label: 'TV ao Vivo', titles: ['live tv', 'tv ao vivo'], ids: ['com.webos.app.livetv'] },
  browser: { label: 'Navegador', titles: ['web browser', 'navegador'], ids: ['com.webos.app.browser'] },
};

interface LaunchPoint { id: string; title?: string; launchPointId?: string }

const LS = {
  macs: 'lg_tv_macs',
  macIp: 'lg_tv_mac_ip',
  ip: 'lg_tv_ip',
  port: 'lg_tv_port',
  key: 'lg_tv_client_key',
  name: 'lg_tv_name',
};

const lsGet = (k: string, d = ''): string => {
  try { return localStorage.getItem(k) || d; } catch { return d; }
};
const lsSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};


// ---------- MAC / Wake-on-LAN ----------
const MAC_RE = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;

/** Normaliza para AA:BB:CC:DD:EE:FF. Retorna null se inválido. */
export function normalizeMac(raw: string): string | null {
  const text = (raw || '').trim();
  if (!/^[0-9a-f:.\-\s]+$/i.test(text)) return null;
  const hex = text.replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (hex.length !== 12) return null;
  if (/^0+$/.test(hex) || /^F+$/.test(hex)) return null;
  return hex.match(/.{2}/g)!.join(':');
}

function collectMacs(node: unknown, key: string, preferred: string[], any: string[], depth = 0) {
  if (node == null || depth > 6) return;
  if (typeof node === 'string') {
    if (MAC_RE.test(node.trim())) {
      const m = normalizeMac(node);
      if (m) {
        any.push(m);
        if (/mac|device_?id|hwaddr/i.test(key)) preferred.push(m);
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectMacs(n, key, preferred, any, depth + 1));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collectMacs(v, k, preferred, any, depth + 1);
    }
  }
}

/** Procura MACs em qualquer resposta da TV (a estrutura varia entre versões do webOS). */
function extractMacs(payload: unknown): string[] {
  const preferred: string[] = [];
  const any: string[] = [];
  collectMacs(payload, '', preferred, any);
  return Array.from(new Set(preferred.length ? preferred : any));
}

function loadMacs(): string[] {
  try {
    const arr = JSON.parse(lsGet(LS.macs, '[]'));
    if (Array.isArray(arr)) return arr.map((m) => normalizeMac(String(m))).filter((m): m is string => !!m);
  } catch { /* ignore */ }
  return [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class WebOsController {
  private listeners: Array<(state: TvConnectionState) => void> = [];
  private isScanningActive = false;
  private autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualDisconnect = false;
  private launchPointsCache: LaunchPoint[] | null = null;
  private lastPointerMove = 0;
  private listenerAttached = false;
  private isNative = Capacitor.isNativePlatform();
  /** Resolvedores de um connect() em andamento */
  private pendingConnect: ((ok: boolean, err?: string) => void) | null = null;
  private macs: string[] = loadMacs();
  private waking = false;
  private poweredOff = false;

  private connectionState: TvConnectionState = {
    isConnected: false,
    isPairing: false,
    isScanning: false,
    ip: lsGet(LS.ip),
    port: parseInt(lsGet(LS.port, '3001'), 10) || 3001,
    clientKey: lsGet(LS.key),
    tvName: lsGet(LS.name, 'LG Smart TV (webOS)'),
    modelName: 'LG Smart TV',
    // Simulador SÓ no navegador (pré-visualização). No celular nunca finge que enviou.
    isMockMode: !Capacitor.isNativePlatform(),
    pointerReady: false,
    macAddress: loadMacs().join(' / ') || undefined,
    discoveredTvs: [],
  };

  constructor() {
    if (!this.isNative) return;
    this.attachNativeListener();
    setTimeout(async () => {
      if (this.connectionState.ip) {
        const ok = await this.reconnect();
        if (!ok && !this.connectionState.isConnected) this.scanNetworkForTvs();
      } else {
        this.scanNetworkForTvs();
      }
    }, 500);
  }

  // ---------- estado ----------
  public getState(): TvConnectionState {
    return { ...this.connectionState };
  }

  public subscribe(cb: (state: TvConnectionState) => void) {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public setMockMode(enabled: boolean) {
    // No celular o simulador é proibido; só vale no navegador
    this.connectionState.isMockMode = this.isNative ? false : enabled;
    this.notify();
  }

  // ---------- eventos nativos ----------
  private attachNativeListener() {
    if (this.listenerAttached) return;
    this.listenerAttached = true;
    LgNativeBridge.addListener('onConnectionChange', (e) => this.onNativeEvent(e));
  }

  private onNativeEvent(e: NativeConnectionEvent) {
    const s = this.connectionState;
    const wasConnected = s.isConnected;
    s.pointerReady = !!e.pointerReady;
    s.isPairing = !!e.isPairing;

    if (e.clientKey) {
      s.clientKey = e.clientKey;
      lsSet(LS.key, e.clientKey);
    }

    switch (e.message) {
      case 'prompt':
        s.statusMessage = 'Aceite o pedido de conexão na tela da TV (use o controle físico).';
        break;
      case 'registered':
        s.isConnected = true;
        s.isPairing = false;
        s.error = undefined;
        s.statusMessage = 'Conectado. Abrindo canal de controle...';
        this.pendingConnect?.(true);
        break;
      case 'pointer_ready':
        s.statusMessage = undefined;
        s.error = undefined;
        break;
      case 'pointer_denied':
        s.error = e.error;
        break;
      case 'register_error':
        s.isConnected = false;
        s.error = 'A TV recusou a conexão (' + (e.error || 'negado') + '). Tente de novo e escolha "Sim" na TV.';
        this.pendingConnect?.(false, s.error);
        break;
      case 'failure':
      case 'closed':
        s.isConnected = false;
        s.pointerReady = false;
        if (wasConnected && this.poweredOff) {
          // Desligamos a TV por aqui: não é erro
          s.error = undefined;
          s.statusMessage = 'TV desligada. Toque em Power para ligar.';
        } else if (wasConnected) {
          // Queda de uma conexão que estava funcionando -> reconecta sozinho
          s.error = e.error ? `Conexão perdida: ${e.error}` : 'Conexão com a TV encerrada.';
          this.scheduleAutoReconnect();
        } else {
          // Falha durante uma tentativa de conexão: connect() decide o que fazer
          this.pendingConnect?.(false, e.error || 'Sem resposta da TV');
        }
        break;
      default:
        s.isConnected = !!e.isConnected;
    }
    this.notify();
  }

  // ---------- descoberta ----------
  public async scanNetworkForTvs(): Promise<DiscoveredTv[]> {
    if (!this.isNative) return [];
    if (this.isScanningActive) return this.connectionState.discoveredTvs;
    this.isScanningActive = true;
    this.connectionState.isScanning = true;
    this.connectionState.error = undefined;
    this.notify();

    let found: DiscoveredTv[] = [];
    try {
      const res = await LgNativeBridge.discoverTvs();
      found = (res?.tvs || []).map((tv) => ({
        name: tv.name || `LG webOS (${tv.ip})`,
        ip: tv.ip,
        port: tv.port || 3001,
        model: tv.modelName,
        isOnline: true,
      }));
    } catch (e) {
      console.warn('Descoberta falhou', e);
      this.connectionState.error = 'Falha ao procurar TVs na rede. Verifique se o Wi-Fi está ligado.';
    }

    this.connectionState.discoveredTvs = found;
    this.connectionState.isScanning = false;
    this.isScanningActive = false;

    if (found.length === 0 && !this.connectionState.error) {
      this.connectionState.error =
        'Nenhuma TV encontrada. Confirme: TV ligada, mesmo Wi-Fi do celular e "LG Connect Apps" ativado na TV. Ou digite o IP em Configurações.';
    }
    this.notify();

    if (found.length > 0 && !this.connectionState.isConnected && !this.connectionState.isPairing) {
      const best = found[0];
      this.connect(best.ip, best.port);
    }
    return found;
  }

  // ---------- conexão ----------
  public async reconnect(): Promise<boolean> {
    if (!this.connectionState.ip) return false;
    return this.connect(this.connectionState.ip, this.connectionState.port);
  }

  private async connectOnce(ip: string, port: number, timeoutMs: number): Promise<{ ok: boolean; err?: string }> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean, err?: string) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.pendingConnect = null;
        resolve({ ok, err });
      };
      const timer = setTimeout(() => finish(false, 'A TV não respondeu a tempo.'), timeoutMs);
      this.pendingConnect = finish;
      LgNativeBridge.connect({ ip, port, clientKey: this.connectionState.clientKey || undefined }).catch((e) =>
        finish(false, String(e?.message || e)),
      );
    });
  }

  public async connect(ip: string, port = 3001): Promise<boolean> {
    const cleanIp = ip.trim();
    if (!cleanIp || !this.isNative) return false;

    this.manualDisconnect = false;
    this.poweredOff = false;
    if (this.autoReconnectTimer) clearTimeout(this.autoReconnectTimer);

    const s = this.connectionState;
    s.ip = cleanIp;
    s.port = port;
    s.isPairing = true;
    s.isConnected = false;
    s.error = undefined;
    if (!this.waking) s.statusMessage = 'Conectando à TV...';
    this.notify();
    lsSet(LS.ip, cleanIp);

    // 3001 (wss) é o padrão em webOS 22+. Só tenta 3000 se a 3001 falhar.
    const order = port === 3001 ? [3001, 3000] : [3000, 3001];
    let lastErr = '';
    for (const p of order) {
      // 60 s: dá tempo de o usuário aceitar o prompt na TV
      const r = await this.connectOnce(cleanIp, p, 60000);
      if (r.ok) {
        s.port = p;
        lsSet(LS.port, String(p));
        s.isConnected = true;
        s.isPairing = false;
        s.error = undefined;
        this.launchPointsCache = null;
        this.waking = false;
        s.statusMessage = undefined;
        this.notify();
        this.captureMacs();
        return true;
      }
      lastErr = r.err || '';
      // Se o usuário recusou, não adianta tentar outra porta
      if (lastErr.includes('recusou')) break;
    }

    s.isPairing = false;
    s.isConnected = false;
    if (this.waking) {
      s.error = undefined; // TV ainda está ligando: sem alarme
    } else {
      s.statusMessage = undefined;
      s.error = lastErr || 'Não foi possível conectar à TV.';
    }
    this.notify();
    return false;
  }

  public async disconnect() {
    this.manualDisconnect = true;
    if (this.autoReconnectTimer) clearTimeout(this.autoReconnectTimer);
    if (this.isNative) await LgNativeBridge.disconnect().catch(() => {});
    this.connectionState.isConnected = false;
    this.connectionState.pointerReady = false;
    this.notify();
  }

  private scheduleAutoReconnect() {
    if (this.manualDisconnect || !this.connectionState.ip) return;
    if (this.autoReconnectTimer) clearTimeout(this.autoReconnectTimer);
    this.autoReconnectTimer = setTimeout(() => {
      if (!this.connectionState.isConnected && !this.connectionState.isPairing) this.reconnect();
    }, 4000);
  }

  // ---------- Wake-on-LAN ----------
  public getMacs(): string[] {
    return [...this.macs];
  }

  private persistMacs(ip?: string) {
    lsSet(LS.macs, JSON.stringify(this.macs));
    if (ip !== undefined) lsSet(LS.macIp, ip);
    this.connectionState.macAddress = this.macs.join(' / ') || undefined;
    this.notify();
  }

  /** Salva um MAC digitado à mão. Retorna false se o formato for inválido. */
  public setMac(raw: string): boolean {
    const mac = normalizeMac(raw);
    if (!mac) return false;
    this.macs = [mac, ...this.macs.filter((m) => m !== mac)];
    this.persistMacs(this.connectionState.ip);
    return true;
  }

  public clearMacs() {
    this.macs = [];
    this.persistMacs('');
  }

  /** Pergunta o MAC à própria TV (conectada) e guarda para o Wake-on-LAN. */
  public async captureMacs(force = false): Promise<void> {
    const ip = this.connectionState.ip;
    if (!this.isNative || !this.connectionState.isConnected) return;
    if (!force && this.macs.length > 0 && lsGet(LS.macIp) === ip) return;

    const found = new Set<string>();
    const uris = [
      'ssap://com.webos.service.connectionmanager/getinfo',
      'ssap://com.webos.service.update/getCurrentSWInformation',
    ];
    for (const uri of uris) {
      try {
        const r = await LgNativeBridge.request({ uri });
        extractMacs(r?.payload).forEach((m) => found.add(m));
      } catch { /* a TV pode negar; tenta o próximo */ }
    }
    if (found.size > 0) {
      const keep = lsGet(LS.macIp) === ip ? this.macs : []; // outra TV: descarta os antigos
      this.macs = Array.from(new Set([...found, ...keep]));
      this.persistMacs(ip);
    }
  }

  /** Liga a TV em modo de espera e reconecta quando ela subir. */
  public async powerOn(): Promise<CommandResult> {
    const label = 'Ligar TV';
    if (!this.isNative) return { success: false, label, reason: 'Simulador (navegador): nada é enviado à TV.' };
    if (this.waking) return { success: true, label: 'Ligando a TV... aguarde' };
    if (this.macs.length === 0) {
      return {
        success: false,
        label,
        reason: 'MAC da TV não salvo. Conecte uma vez com a TV ligada ou digite o MAC em Configurações.',
      };
    }

    try {
      const r = await LgNativeBridge.wakeOnLan({ macs: this.macs, ip: this.connectionState.ip });
      if (!r.success) return { success: false, label, reason: r.error || 'Falha ao enviar o sinal de ligar' };
    } catch (e: any) {
      return { success: false, label, reason: String(e?.message || e) };
    }

    this.waking = true;
    this.poweredOff = false;
    this.manualDisconnect = false;
    this.connectionState.error = undefined;
    this.connectionState.statusMessage = 'Ligando a TV... pode levar até 1 minuto.';
    this.notify();
    this.wakeAndReconnect();
    return { success: true, label: 'Sinal de ligar enviado' };
  }

  private async wakeAndReconnect() {
    const s = this.connectionState;
    const start = Date.now();
    let resent = false;
    try {
      while (Date.now() - start < 70000 && !s.isConnected) {
        await sleep(5000);
        if (s.isConnected) break;
        if (!resent && Date.now() - start > 15000) {
          resent = true;
          LgNativeBridge.wakeOnLan({ macs: this.macs, ip: s.ip }).catch(() => {});
        }
        if (!s.isPairing && s.ip) {
          if (await this.connect(s.ip, s.port)) break;
        }
      }
    } finally {
      this.waking = false;
      if (s.isConnected) {
        s.statusMessage = undefined;
        s.error = undefined;
      } else {
        s.statusMessage = undefined;
        s.error =
          'A TV não ligou. Confira se "Ligar via Wi-Fi" está ativado na TV e se ela está em espera (não desligada da tomada).';
      }
      this.notify();
    }
  }

  // ---------- comandos ----------
  /** Envia o comando. Retorna a Promise com o resultado REAL (sucesso/falha). */
  public async sendCommand(cmd: WebOsCommand, param?: string | number): Promise<CommandResult> {
    if (!this.isNative) {
      return { success: false, label: String(cmd), reason: 'Simulador (navegador): nada é enviado à TV.' };
    }
    if (cmd === 'power' && !this.connectionState.isConnected) {
      return this.powerOn(); // TV desligada/desconectada -> Wake-on-LAN
    }
    if (!this.connectionState.isConnected) {
      return { success: false, label: String(cmd), reason: 'TV desconectada' };
    }

    if (cmd === 'number') {
      const n = String(param ?? '');
      const r = await LgNativeBridge.sendButton({ name: n }).catch(() => ({ success: false }));
      return { success: r.success, label: `Dígito ${n}`, reason: r.success ? undefined : 'Canal de controle não está pronto' };
    }

    if (APPS[cmd]) return this.launchApp(cmd);

    const def = BUTTONS[cmd];
    if (!def) return { success: false, label: String(cmd), reason: 'Comando desconhecido' };

    try {
      if (def.button) {
        const r = await LgNativeBridge.sendButton({ name: def.button });
        return {
          success: r.success,
          label: def.label,
          reason: r.success ? undefined : 'Canal de controle não está pronto. Aguarde 2 s e tente de novo.',
        };
      }
      if (def.uri) {
        if (cmd === 'power') {
          // A TV costuma fechar a conexão antes de responder ao desligar
          this.poweredOff = true;
          this.manualDisconnect = true;
        }
        await LgNativeBridge.request({ uri: def.uri, payload: def.payload });
        return { success: true, label: def.label };
      }
    } catch (e: any) {
      if (cmd === 'power') return { success: true, label: 'Desligando a TV' };
      return { success: false, label: def.label, reason: String(e?.message || e) };
    }
    return { success: false, label: def.label };
  }

  private async getLaunchPoints(): Promise<LaunchPoint[]> {
    if (this.launchPointsCache) return this.launchPointsCache;
    const r = await LgNativeBridge.request({ uri: 'ssap://com.webos.applicationManager/listLaunchPoints' });
    const pts: LaunchPoint[] = r?.payload?.launchPoints || [];
    this.launchPointsCache = pts;
    return pts;
  }

  private async launchApp(key: string): Promise<CommandResult> {
    const app = APPS[key];
    try {
      let id: string | undefined;
      try {
        const pts = await this.getLaunchPoints();
        const hit = pts.find((p) => {
          const t = (p.title || '').toLowerCase();
          return app.titles.some((x) => t === x || t.includes(x));
        });
        id = hit?.id;
      } catch { /* usa IDs conhecidos */ }

      const candidates = id ? [id] : app.ids;
      if (candidates.length === 0) {
        return { success: false, label: app.label, reason: `${app.label} não encontrado na TV` };
      }
      for (const c of candidates) {
        try {
          await LgNativeBridge.request({ uri: 'ssap://system.launcher/launch', payload: { id: c } });
          return { success: true, label: `Abrindo ${app.label}` };
        } catch { /* tenta o próximo */ }
      }
      return { success: false, label: app.label, reason: `${app.label} não está instalado na TV` };
    } catch (e: any) {
      return { success: false, label: app.label, reason: String(e?.message || e) };
    }
  }

  public async sendRawButton(name: string): Promise<boolean> {
    if (!this.isNative || !this.connectionState.isConnected) return false;
    try {
      return (await LgNativeBridge.sendButton({ name })).success;
    } catch {
      return false;
    }
  }

  public sendPointerMove(dx: number, dy: number) {
    if (!this.isNative || !this.connectionState.pointerReady) return;
    const now = Date.now();
    if (now - this.lastPointerMove < 16) return; // ~60 msg/s no máximo
    this.lastPointerMove = now;
    LgNativeBridge.sendPointerMove({ dx: Math.round(dx), dy: Math.round(dy) }).catch(() => {});
  }

  public sendPointerClick() {
    if (!this.isNative) return;
    LgNativeBridge.sendPointerClick().catch(() => {});
  }

  public sendPointerScroll(dy: number) {
    if (!this.isNative) return;
    LgNativeBridge.sendPointerScroll({ dx: 0, dy: Math.round(dy) }).catch(() => {});
  }

  public async sendTextInput(text: string): Promise<boolean> {
    if (!text || !this.isNative || !this.connectionState.isConnected) return false;
    try {
      await LgNativeBridge.request({
        uri: 'ssap://com.webos.service.ime/insertText',
        payload: { text, replace: 0 },
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const webOsService = new WebOsController();
