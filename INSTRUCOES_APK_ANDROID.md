# Como gerar o APK (versão corrigida)

Na pasta do projeto (precisa de Node 20+ e JDK 21 / Android Studio):

```cmd
npm install
npm run build:android
cd android
gradlew assembleDebug
```

O APK sai em `android\app\build\outputs\apk\debug\app-debug.apk`.
(Atalho: `npm run apk` faz tudo de uma vez.)

> Importante: use SEMPRE `npm run build:android` (e não `npm run build`). Esse modo desliga o
> service worker, que mantinha em cache a versão antiga do app dentro do celular.

## Na TV (uma vez só)
1. TV e celular no MESMO Wi-Fi (não use "rede de convidados").
2. Na TV, ative "LG Connect Apps" (em Configurações > Geral/Conexão > Dispositivos externos / Gerenciamento de dispositivos móveis; o nome do menu varia conforme a versão do webOS).
3. Abra o app. Ele busca a TV, a TV mostra "Permitir conexão?" -> aceite com o controle físico.
4. O app só mostra "Conectado" quando o canal dos botões está pronto.

## Se algo falhar
Veja o log do celular ligado por USB: `adb logcat -s LgNativeBridge`
