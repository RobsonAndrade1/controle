package com.lgremote.smartmagic;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.net.URL;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * Ponte nativa para TVs LG webOS (protocolo SSAP + Pointer Input Socket).
 *
 * Fluxo correto:
 *  1) WebSocket principal (wss:3001 ou ws:3000) -> "register" -> TV mostra prompt -> "registered" + client-key
 *  2) Pede ssap://com.webos.service.networkinput/getPointerInputSocket
 *  3) Abre o socketPath devolvido; botões (UP, ENTER, VOLUMEUP...) e cursor vão por ele
 */
@CapacitorPlugin(name = "LgNativeBridge")
public class LgBridgePlugin extends Plugin {

    private static final String TAG = "LgNativeBridge";
    private static final int MAX_POINTER_RETRIES = 6;

    private OkHttpClient okHttpClient;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final AtomicInteger requestId = new AtomicInteger(0);
    private final Map<String, PluginCall> pendingRequests = new ConcurrentHashMap<>();

    private volatile WebSocket activeWebSocket;
    private volatile WebSocket pointerWebSocket;
    private volatile boolean isConnected = false;
    private volatile boolean isPairing = false;
    private volatile boolean pointerReady = false;
    private volatile String currentClientKey = "";

    // "Geração" da conexão: callbacks de sockets antigos (já substituídos) são ignorados
    private volatile int connectionGen = 0;
    private volatile int pointerGen = 0;
    private volatile int pointerRetries = 0;

    @Override
    public void load() {
        super.load();
        initUnsafeOkHttpClient();
    }

    /** Aceita o certificado autoassinado da TV (porta 3001, wss://). */
    private void initUnsafeOkHttpClient() {
        try {
            final X509TrustManager trustAll = new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                @Override public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[]{}; }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{trustAll}, new SecureRandom());

            okHttpClient = new OkHttpClient.Builder()
                .sslSocketFactory(sslContext.getSocketFactory(), trustAll)
                .hostnameVerifier((hostname, session) -> true)
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .pingInterval(10, TimeUnit.SECONDS)
                .build();
        } catch (Exception e) {
            Log.e(TAG, "Erro ao criar cliente SSL permissivo", e);
            okHttpClient = new OkHttpClient();
        }
    }

    // ------------------------------------------------------------------
    // DESCOBERTA
    // ------------------------------------------------------------------

    @PluginMethod
    public void discoverTvs(PluginCall call) {
        new Thread(() -> {
            final Map<String, Map<String, String>> discovered = new HashMap<>();

            Thread ssdpThread = new Thread(() -> runSsdpDiscovery(discovered));
            Thread subnetThread = new Thread(() -> runSubnetScan(discovered));
            ssdpThread.start();
            subnetThread.start();

            try { ssdpThread.join(4000); } catch (Exception ignored) {}
            try { subnetThread.join(8000); } catch (Exception ignored) {}

            List<Map<String, String>> list;
            synchronized (discovered) {
                list = new ArrayList<>(discovered.values());
            }
            // TVs confirmadas por SSDP (webOS) primeiro
            list.sort((a, b) -> {
                boolean ca = "true".equals(a.get("confirmed"));
                boolean cb = "true".equals(b.get("confirmed"));
                return ca == cb ? 0 : (ca ? -1 : 1);
            });

            JSArray resultTvs = new JSArray();
            for (Map<String, String> tv : list) {
                JSObject tvObj = new JSObject();
                tvObj.put("ip", tv.get("ip"));
                tvObj.put("name", tv.get("name"));
                int port = 3001;
                try { port = Integer.parseInt(tv.get("port")); } catch (Exception ignored) {}
                tvObj.put("port", port);
                tvObj.put("modelName", tv.get("modelName"));
                tvObj.put("confirmed", "true".equals(tv.get("confirmed")));
                resultTvs.put(tvObj);
            }

            Log.i(TAG, "Descoberta finalizada. TVs: " + resultTvs.length());
            JSObject ret = new JSObject();
            ret.put("tvs", resultTvs);
            call.resolve(ret);
        }).start();
    }

    private void runSsdpDiscovery(Map<String, Map<String, String>> discovered) {
        WifiManager.MulticastLock multicastLock = null;
        DatagramSocket socket = null;
        try {
            Context context = getContext();
            if (context != null) {
                WifiManager wifi = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifi != null) {
                    try {
                        multicastLock = wifi.createMulticastLock("lg_ssdp_lock");
                        multicastLock.setReferenceCounted(false);
                        multicastLock.acquire();
                    } catch (Exception e) {
                        Log.w(TAG, "MulticastLock: " + e.getMessage());
                    }
                }
            }

            socket = new DatagramSocket();
            socket.setSoTimeout(1000);
            InetAddress group = InetAddress.getByName("239.255.255.250");

            String[] targets = new String[]{
                "urn:lge-com:service:webos-second-screen:1",
                "urn:schemas-upnp-org:device:MediaRenderer:1",
                "ssdp:all"
            };
            for (String st : targets) {
                String q = "M-SEARCH * HTTP/1.1\r\n"
                    + "HOST: 239.255.255.250:1900\r\n"
                    + "MAN: \"ssdp:discover\"\r\n"
                    + "MX: 2\r\n"
                    + "ST: " + st + "\r\n\r\n";
                try {
                    byte[] data = q.getBytes();
                    socket.send(new DatagramPacket(data, data.length, group, 1900));
                } catch (Exception ignored) {}
            }

            long start = System.currentTimeMillis();
            byte[] buffer = new byte[4096];
            while (System.currentTimeMillis() - start < 3500) {
                try {
                    DatagramPacket p = new DatagramPacket(buffer, buffer.length);
                    socket.receive(p);
                    String response = new String(p.getData(), 0, p.getLength());
                    String host = p.getAddress().getHostAddress();
                    String lower = response.toLowerCase();

                    // Só aceita respostas que realmente indiquem webOS/LG (antes: qualquer "lg" ou MediaRenderer)
                    if (host != null && (lower.contains("webos") || lower.contains("lge") || lower.contains("lg electronics"))) {
                        Map<String, String> tv = new HashMap<>();
                        tv.put("ip", host);
                        tv.put("name", "LG Smart TV (" + host + ")");
                        tv.put("port", "3001");
                        tv.put("modelName", "LG webOS Smart TV");
                        tv.put("confirmed", "true");

                        String location = extractHeader(response, "LOCATION");
                        if (location != null) {
                            String friendly = fetchFriendlyNameFromXml(location);
                            if (friendly != null && !friendly.isEmpty()) tv.put("name", friendly);
                        }
                        synchronized (discovered) {
                            Map<String, String> old = discovered.get(host);
                            if (old != null && old.get("port") != null) tv.put("port", old.get("port"));
                            discovered.put(host, tv);
                        }
                    }
                } catch (java.net.SocketTimeoutException e) {
                    // continua até o fim da janela
                } catch (Exception e) {
                    break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro SSDP", e);
        } finally {
            if (socket != null && !socket.isClosed()) { try { socket.close(); } catch (Exception ignored) {} }
            if (multicastLock != null && multicastLock.isHeld()) { try { multicastLock.release(); } catch (Exception ignored) {} }
        }
    }

    private void runSubnetScan(Map<String, Map<String, String>> discovered) {
        String prefix = getLocalSubnetPrefix();
        if (prefix == null || prefix.isEmpty()) return;

        ExecutorService pool = Executors.newFixedThreadPool(64);
        for (int i = 1; i <= 254; i++) {
            final String ip = prefix + i;
            pool.execute(() -> {
                int port = 0;
                if (isPortOpen(ip, 3001)) port = 3001;
                else if (isPortOpen(ip, 3000)) port = 3000;
                if (port != 0) addDiscoveredTv(discovered, ip, port);
            });
        }
        pool.shutdown();
        try {
            if (!pool.awaitTermination(6000, TimeUnit.MILLISECONDS)) pool.shutdownNow();
        } catch (Exception ignored) {}
    }

    private boolean isPortOpen(String ip, int port) {
        Socket s = new Socket();
        try {
            s.connect(new InetSocketAddress(ip, port), 450);
            return true;
        } catch (Exception ignored) {
            return false;
        } finally {
            try { s.close(); } catch (Exception ignored) {}
        }
    }

    private void addDiscoveredTv(Map<String, Map<String, String>> discovered, String ip, int port) {
        synchronized (discovered) {
            if (!discovered.containsKey(ip)) {
                Map<String, String> tv = new HashMap<>();
                tv.put("ip", ip);
                tv.put("port", String.valueOf(port));
                tv.put("name", "Possível TV LG (" + ip + ")");
                tv.put("modelName", "LG webOS Smart TV");
                tv.put("confirmed", "false");
                discovered.put(ip, tv);
            }
        }
    }

    private String getLocalSubnetPrefix() {
        // 1) Interface Wi-Fi/Ethernet (evita pegar a rede de dados móveis)
        try {
            String fallback = null;
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                if (!intf.isUp() || intf.isLoopback()) continue;
                String name = intf.getName().toLowerCase();
                for (Enumeration<InetAddress> addrs = intf.getInetAddresses(); addrs.hasMoreElements();) {
                    InetAddress a = addrs.nextElement();
                    if (a.isLoopbackAddress() || !(a instanceof Inet4Address)) continue;
                    String host = a.getHostAddress();
                    if (host == null) continue;
                    int dot = host.lastIndexOf('.');
                    if (dot == -1) continue;
                    String prefix = host.substring(0, dot + 1);
                    if (name.startsWith("wlan") || name.startsWith("eth")) return prefix;
                    if (fallback == null && a.isSiteLocalAddress() && !name.contains("rmnet") && !name.contains("ccmni")) {
                        fallback = prefix;
                    }
                }
            }
            if (fallback != null) return fallback;
        } catch (Exception ignored) {}

        // 2) WifiManager (API antiga)
        try {
            Context context = getContext();
            if (context != null) {
                WifiManager wifi = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifi != null) {
                    int ipInt = wifi.getConnectionInfo().getIpAddress();
                    if (ipInt != 0) {
                        return (ipInt & 0xff) + "." + ((ipInt >> 8) & 0xff) + "." + ((ipInt >> 16) & 0xff) + ".";
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String extractHeader(String response, String headerName) {
        for (String line : response.split("\r\n")) {
            if (line.toLowerCase().startsWith(headerName.toLowerCase() + ":")) {
                return line.substring(headerName.length() + 1).trim();
            }
        }
        return null;
    }

    private String fetchFriendlyNameFromXml(String locationUrl) {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(locationUrl).openConnection();
            conn.setConnectTimeout(1500);
            conn.setReadTimeout(1500);
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder xml = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) xml.append(line);
            in.close();
            String full = xml.toString();
            int s = full.indexOf("<friendlyName>");
            int e = full.indexOf("</friendlyName>");
            if (s != -1 && e != -1) return full.substring(s + 14, e).trim();
        } catch (Exception ignored) {}
        return null;
    }

    // ------------------------------------------------------------------
    // CONEXÃO
    // ------------------------------------------------------------------

    private void emitState(String message, String error) {
        JSObject event = new JSObject();
        event.put("isConnected", isConnected);
        event.put("isPairing", isPairing);
        event.put("pointerReady", pointerReady);
        event.put("clientKey", currentClientKey);
        if (message != null) event.put("message", message);
        if (error != null) event.put("error", error);
        notifyListeners("onConnectionChange", event);
    }

    private void closeSockets() {
        WebSocket a = activeWebSocket;
        WebSocket p = pointerWebSocket;
        activeWebSocket = null;
        pointerWebSocket = null;
        pointerReady = false;
        if (p != null) { try { p.close(1000, "bye"); } catch (Exception ignored) {} }
        if (a != null) { try { a.close(1000, "bye"); } catch (Exception ignored) {} }
        failPendingRequests("Conexão encerrada");
    }

    private void failPendingRequests(String reason) {
        for (Map.Entry<String, PluginCall> e : pendingRequests.entrySet()) {
            PluginCall c = pendingRequests.remove(e.getKey());
            if (c != null) { try { c.reject(reason); } catch (Exception ignored) {} }
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        final String ip = call.getString("ip");
        final int port = call.getInt("port", 3001);
        final String clientKey = call.getString("clientKey", "");

        if (ip == null || ip.isEmpty()) {
            call.reject("IP não fornecido");
            return;
        }

        // Invalida callbacks dos sockets anteriores ANTES de fechá-los
        final int gen = ++connectionGen;
        pointerGen++;
        closeSockets();

        currentClientKey = clientKey == null ? "" : clientKey;
        isPairing = true;
        isConnected = false;
        pointerRetries = 0;

        final String wsUrl = (port == 3001 ? "wss" : "ws") + "://" + ip + ":" + port;
        Request request = new Request.Builder().url(wsUrl).build();

        activeWebSocket = okHttpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket ws, Response response) {
                if (gen != connectionGen) return;
                Log.d(TAG, "WebSocket aberto: " + wsUrl);
                sendRegisterPayload(ws, currentClientKey);
                emitState("socket_open", null);
            }

            @Override
            public void onMessage(WebSocket ws, String text) {
                if (gen != connectionGen) return;
                Log.d(TAG, "TV: " + text);
                handleTvMessage(text);
            }

            @Override
            public void onClosed(WebSocket ws, int code, String reason) {
                if (gen != connectionGen) return;
                isConnected = false;
                isPairing = false;
                pointerReady = false;
                emitState("closed", null);
            }

            @Override
            public void onFailure(WebSocket ws, Throwable t, Response response) {
                if (gen != connectionGen) return;
                Log.e(TAG, "Falha no WebSocket: " + t.getMessage());
                isConnected = false;
                isPairing = false;
                pointerReady = false;
                emitState("failure", t.getMessage() == null ? "Falha de conexão" : t.getMessage());
            }
        });

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    private void handleTvMessage(String text) {
        try {
            JSONObject json = new JSONObject(text);
            String type = json.optString("type");
            String id = json.optString("id");
            JSONObject payload = json.optJSONObject("payload");

            if ("registered".equals(type)) {
                if (payload != null && payload.has("client-key")) {
                    currentClientKey = payload.getString("client-key");
                }
                isConnected = true;
                isPairing = false;
                requestPointerSocket();
                emitState("registered", null);
                return;
            }

            if ("error".equals(type)) {
                String err = json.optString("error", "Erro da TV");
                PluginCall pending = pendingRequests.remove(id);
                if (pending != null) {
                    pending.reject(err);
                    return;
                }
                // Erro durante o registro (ex.: usuário recusou o prompt)
                if (id.startsWith("reg_")) {
                    isPairing = false;
                    isConnected = false;
                    emitState("register_error", err);
                } else {
                    Log.w(TAG, "Erro SSAP (" + id + "): " + err);
                }
                return;
            }

            if ("response".equals(type)) {
                if (id.startsWith("reg_")) {
                    // Resposta ao register: TV está exibindo o prompt "Permitir?"
                    emitState("prompt", null);
                    return;
                }
                if (id.startsWith("pointer_req_")) {
                    if (payload != null && payload.has("socketPath")) {
                        connectPointerSocket(payload.getString("socketPath"));
                    } else {
                        Log.w(TAG, "Resposta sem socketPath (permissão negada?): " + text);
                        emitState("pointer_denied", "A TV não liberou o canal de controle (permissões).");
                    }
                    return;
                }
                PluginCall pending = pendingRequests.remove(id);
                if (pending != null) {
                    JSObject out = new JSObject();
                    out.put("success", true);
                    if (payload != null) out.put("payload", new JSObject(payload.toString()));
                    pending.resolve(out);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar mensagem da TV", e);
        }
    }

    private void sendRegisterPayload(WebSocket ws, String clientKey) {
        try {
            String[] permList = new String[]{
                "LAUNCH", "LAUNCH_WEBAPP", "APP_TO_APP", "CONTROL_AUDIO", "CONTROL_POWER",
                "CONTROL_DISPLAY", "CONTROL_INPUT_TV", "CONTROL_INPUT_MEDIA_PLAYBACK",
                "CONTROL_INPUT_JOYSTICK", "CONTROL_INPUT_TEXT", "CONTROL_MOUSE_AND_KEYBOARD",
                "CONTROL_TV_SCREEN", "READ_INSTALLED_APPS", "READ_RUNNING_APPS",
                "READ_CURRENT_CHANNEL", "READ_TV_CHANNEL_LIST", "READ_INPUT_DEVICE_LIST",
                "READ_NETWORK_STATE", "READ_POWER_STATE", "READ_COUNTRY_INFO",
                "READ_SETTINGS", "TEST_OPEN", "TEST_PROTECTED", "WRITE_NOTIFICATION_TOAST",
                "SEARCH"
            };

            JSONObject reg = new JSONObject();
            reg.put("type", "register");
            reg.put("id", "reg_" + requestId.incrementAndGet());

            JSONObject payload = new JSONObject();
            payload.put("forcePairing", false);
            payload.put("pairingType", "PROMPT");
            if (clientKey != null && !clientKey.isEmpty()) payload.put("client-key", clientKey);

            JSONObject manifest = new JSONObject();
            manifest.put("manifestVersion", 1);
            manifest.put("appVersion", "1.1");

            JSONObject signed = new JSONObject();
            signed.put("created", "20140509");
            signed.put("appId", "com.lge.test");
            signed.put("vendorId", "com.lge");
            JSONObject names = new JSONObject();
            names.put("", "LG Smart Magic Remote");
            signed.put("localizedAppNames", names);
            JSONObject vendors = new JSONObject();
            vendors.put("", "LG Electronics");
            signed.put("localizedVendorNames", vendors);

            JSArray signedPerms = new JSArray();
            JSArray topPerms = new JSArray();
            for (String p : permList) { signedPerms.put(p); topPerms.put(p); }
            signed.put("permissions", signedPerms);

            manifest.put("signed", signed);
            // Permissões também no nível do manifest (é onde a TV lê quando o app não é assinado pela LG)
            manifest.put("permissions", topPerms);
            payload.put("manifest", manifest);
            reg.put("payload", payload);

            ws.send(reg.toString());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar registro", e);
        }
    }

    private void requestPointerSocket() {
        try {
            WebSocket ws = activeWebSocket;
            if (ws == null) return;
            JSONObject req = new JSONObject();
            req.put("type", "request");
            req.put("id", "pointer_req_" + requestId.incrementAndGet());
            req.put("uri", "ssap://com.webos.service.networkinput/getPointerInputSocket");
            ws.send(req.toString());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao pedir pointer socket", e);
        }
    }

    private void connectPointerSocket(String socketPath) {
        try {
            final int gen = ++pointerGen;
            WebSocket old = pointerWebSocket;
            pointerWebSocket = null;
            pointerReady = false;
            if (old != null) { try { old.close(1000, "reconnect"); } catch (Exception ignored) {} }

            Request request = new Request.Builder().url(socketPath).build();
            pointerWebSocket = okHttpClient.newWebSocket(request, new WebSocketListener() {
                @Override
                public void onOpen(WebSocket ws, Response response) {
                    if (gen != pointerGen) return;
                    pointerReady = true;
                    pointerRetries = 0;
                    Log.d(TAG, "Pointer socket CONECTADO");
                    emitState("pointer_ready", null);
                }

                @Override
                public void onClosed(WebSocket ws, int code, String reason) {
                    if (gen != pointerGen) return;
                    onPointerLost("closed");
                }

                @Override
                public void onFailure(WebSocket ws, Throwable t, Response response) {
                    if (gen != pointerGen) return;
                    Log.e(TAG, "Pointer socket falhou: " + t.getMessage());
                    onPointerLost(t.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Erro ao conectar pointer socket", e);
        }
    }

    private void onPointerLost(String why) {
        pointerReady = false;
        pointerWebSocket = null;
        emitState("pointer_lost", null);
        if (isConnected && activeWebSocket != null && pointerRetries < MAX_POINTER_RETRIES) {
            pointerRetries++;
            final int gen = connectionGen;
            scheduler.schedule(() -> {
                if (gen == connectionGen && isConnected && !pointerReady) requestPointerSocket();
            }, 1500, TimeUnit.MILLISECONDS);
        }
    }

    // ------------------------------------------------------------------
    // COMANDOS
    // ------------------------------------------------------------------

    /**
     * Envia um botão pelo Pointer Socket. Nomes válidos: UP DOWN LEFT RIGHT ENTER BACK HOME EXIT
     * MENU INFO MUTE VOLUMEUP VOLUMEDOWN CHANNELUP CHANNELDOWN 0-9 RED GREEN YELLOW BLUE
     * PLAY PAUSE STOP REWIND FASTFORWARD LIST ...
     * Só usa o SSAP como reserva quando o pointer não está pronto (nunca os dois ao mesmo tempo).
     */
    @PluginMethod
    public void sendButton(PluginCall call) {
        String name = call.getString("name", "");
        if (name == null || name.isEmpty()) {
            call.reject("Nome do botão não informado");
            return;
        }

        boolean sent = false;
        WebSocket p = pointerWebSocket;
        if (p != null && pointerReady) {
            sent = p.send("type:button\nname:" + name + "\n\n");
        }

        if (!sent && activeWebSocket != null && isConnected) {
            sent = sendSsapButtonFallback(name);
            if (!pointerReady) requestPointerSocket();
        }

        JSObject res = new JSObject();
        res.put("success", sent);
        res.put("pointerReady", pointerReady);
        call.resolve(res);
    }

    private boolean sendSsapButtonFallback(String name) {
        try {
            String uri;
            JSONObject payload = null;
            switch (name) {
                case "HOME":
                    uri = "ssap://system.launcher/open";
                    payload = new JSONObject().put("id", "com.webos.app.home");
                    break;
                case "VOLUMEUP":    uri = "ssap://audio/volumeUp"; break;
                case "VOLUMEDOWN":  uri = "ssap://audio/volumeDown"; break;
                case "CHANNELUP":   uri = "ssap://tv/channelUp"; break;
                case "CHANNELDOWN": uri = "ssap://tv/channelDown"; break;
                default: return false; // sem equivalente SSAP: não finge que enviou
            }
            JSONObject req = new JSONObject();
            req.put("type", "request");
            req.put("id", "btn_" + requestId.incrementAndGet());
            req.put("uri", uri);
            if (payload != null) req.put("payload", payload);
            WebSocket ws = activeWebSocket;
            return ws != null && ws.send(req.toString());
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void sendPointerMove(PluginCall call) {
        int dx = call.getInt("dx", 0);
        int dy = call.getInt("dy", 0);
        WebSocket p = pointerWebSocket;
        boolean sent = p != null && pointerReady && p.send("type:move\ndx:" + dx + "\ndy:" + dy + "\ndown:0\n\n");
        JSObject res = new JSObject();
        res.put("success", sent);
        call.resolve(res);
    }

    @PluginMethod
    public void sendPointerScroll(PluginCall call) {
        int dx = call.getInt("dx", 0);
        int dy = call.getInt("dy", 0);
        WebSocket p = pointerWebSocket;
        boolean sent = p != null && pointerReady && p.send("type:scroll\ndx:" + dx + "\ndy:" + dy + "\n\n");
        JSObject res = new JSObject();
        res.put("success", sent);
        call.resolve(res);
    }

    @PluginMethod
    public void sendPointerClick(PluginCall call) {
        WebSocket p = pointerWebSocket;
        boolean sent = p != null && pointerReady && p.send("type:click\n\n");
        JSObject res = new JSObject();
        res.put("success", sent);
        call.resolve(res);
    }

    /** Requisição SSAP com resposta (ex.: listar apps, abrir app, inserir texto). */
    @PluginMethod
    public void request(PluginCall call) {
        String uri = call.getString("uri");
        WebSocket ws = activeWebSocket;
        if (uri == null || uri.isEmpty()) { call.reject("uri não informada"); return; }
        if (ws == null || !isConnected) { call.reject("TV não conectada"); return; }

        try {
            final String id = "req_" + requestId.incrementAndGet();
            JSONObject req = new JSONObject();
            req.put("type", "request");
            req.put("id", id);
            req.put("uri", uri);
            JSObject payload = call.getObject("payload");
            if (payload != null) req.put("payload", new JSONObject(payload.toString()));

            pendingRequests.put(id, call);
            if (!ws.send(req.toString())) {
                pendingRequests.remove(id);
                call.reject("Falha ao enviar");
                return;
            }
            scheduler.schedule(() -> {
                PluginCall c = pendingRequests.remove(id);
                if (c != null) c.reject("Tempo esgotado esperando a TV");
            }, 8, TimeUnit.SECONDS);
        } catch (Exception e) {
            call.reject("Erro: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendCommand(PluginCall call) {
        String payload = call.getString("payload");
        WebSocket ws = activeWebSocket;
        if (ws != null && isConnected && payload != null) {
            JSObject res = new JSObject();
            res.put("success", ws.send(payload));
            call.resolve(res);
        } else {
            call.reject("TV nao conectada");
        }
    }

    // ------------------------------------------------------------------
    // WAKE-ON-LAN (ligar a TV em modo de espera)
    // ------------------------------------------------------------------

    /** Envia o "magic packet" (6x 0xFF + 16x MAC) para todos os endereços de broadcast da rede. */
    @PluginMethod
    public void wakeOnLan(PluginCall call) {
        final List<String> macs = new ArrayList<>();
        try {
            JSArray arr = call.getArray("macs");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) macs.add(arr.getString(i));
            }
        } catch (Exception ignored) {}
        final String tvIp = call.getString("ip", "");

        new Thread(() -> {
            int sent = 0;
            String lastError = null;
            DatagramSocket socket = null;
            try {
                socket = new DatagramSocket();
                socket.setBroadcast(true);
                List<String> targets = getBroadcastTargets(tvIp);
                for (int round = 0; round < 3; round++) {
                    for (String mac : macs) {
                        byte[] packet = buildMagicPacket(mac);
                        if (packet == null) continue;
                        for (String target : targets) {
                            for (int port : new int[]{9, 7}) {
                                try {
                                    socket.send(new DatagramPacket(packet, packet.length, InetAddress.getByName(target), port));
                                    sent++;
                                } catch (Exception e) {
                                    lastError = e.getMessage();
                                }
                            }
                        }
                    }
                    try { Thread.sleep(150); } catch (InterruptedException ignored) {}
                }
            } catch (Exception e) {
                lastError = e.getMessage();
            } finally {
                if (socket != null) { try { socket.close(); } catch (Exception ignored) {} }
            }
            Log.i(TAG, "Wake-on-LAN: pacotes enviados=" + sent + (lastError != null ? " erro=" + lastError : ""));
            JSObject res = new JSObject();
            res.put("success", sent > 0);
            res.put("sent", sent);
            if (lastError != null) res.put("error", lastError);
            call.resolve(res);
        }).start();
    }

    private byte[] buildMagicPacket(String mac) {
        if (mac == null) return null;
        String hex = mac.replaceAll("[^0-9A-Fa-f]", "");
        if (hex.length() != 12) return null;
        byte[] macBytes = new byte[6];
        for (int i = 0; i < 6; i++) {
            macBytes[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        byte[] packet = new byte[6 + 16 * 6];
        for (int i = 0; i < 6; i++) packet[i] = (byte) 0xFF;
        for (int i = 0; i < 16; i++) System.arraycopy(macBytes, 0, packet, 6 + i * 6, 6);
        return packet;
    }

    private List<String> getBroadcastTargets(String tvIp) {
        Set<String> out = new LinkedHashSet<>();
        out.add("255.255.255.255");
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en != null && en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                if (!intf.isUp() || intf.isLoopback()) continue;
                String name = intf.getName().toLowerCase();
                if (name.contains("rmnet") || name.contains("ccmni")) continue;
                for (InterfaceAddress ia : intf.getInterfaceAddresses()) {
                    InetAddress b = ia.getBroadcast();
                    if (b != null) out.add(b.getHostAddress());
                }
            }
        } catch (Exception ignored) {}
        String prefix = getLocalSubnetPrefix();
        if (prefix != null) out.add(prefix + "255");
        if (tvIp != null && !tvIp.isEmpty()) out.add(tvIp);
        return new ArrayList<>(out);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        connectionGen++;
        pointerGen++;
        closeSockets();
        isConnected = false;
        isPairing = false;
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void getConnectionStatus(PluginCall call) {
        JSObject res = new JSObject();
        res.put("isConnected", isConnected);
        res.put("isPairing", isPairing);
        res.put("pointerReady", pointerReady);
        res.put("clientKey", currentClientKey);
        call.resolve(res);
    }
}
