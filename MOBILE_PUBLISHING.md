# 📱 Guia de Publicação nas Lojas (App Store e Google Play) — Salve-me

Este guia detalha exatamente como preparar, empacotar e publicar a aplicação **Salve-me** como um aplicativo nativo para **iOS (iPhone)** e **Android** utilizando **Capacitor**, o padrão da indústria para portabilização de apps modernos em React/Vite.

---

## 🛠️ Como Funciona a Conectividade Móvel?

Nós criamos e configuramos o utilitário `/src/utils/api.ts`. Ele garante que:
1. **No Navegador/Nuvem:** O aplicativo continue usando requisições locais normais `/api/...`.
2. **Nos Dispositivos Móveis Nativos:** O aplicativo identifique automaticamente que está rodando dentro do aplicativo móvel (iOS/Android) e direcione todas as requisições de API (como o conselheiro de IA do Gemini, vivências da comunidade e sugestões) para a sua URL de produção publicada:
   👉 `https://ais-pre-gthyx5g3l4lrsoceaddzap-478459567488.europe-west1.run.app`

Isso permite que seu aplicativo móvel nativo funcione em perfeita harmonia com o banco de dados e os serviços de Inteligência Artificial hospedados no servidor!

---

## 🏁 Passo 1: Configurar Recursos Locais e Instalar o Capacitor

No seu computador local com Node.js instalado, execute os seguintes comandos no terminal do projeto para instalar as dependências de integração mobile:

```bash
# 1. Instalar o núcleo do Capacitor e a linha de comandos (CLI)
npm i @capacitor/core @capacitor/cli

# 2. Inicializar as configurações do seu aplicativo móvel
# Siga as perguntas no terminal:
# - App name: Salve-me
# - App Package ID: com.salveme.app
# - Web asset directory: dist
npx cap init Salve-me "com.salveme.app" --web-dir=dist
```

Isto criará o arquivo `capacitor.config.ts` no seu projeto.

---

## 🤖 Passo 2: Adicionar as Plataformas Nativas (Android & iOS)

Adicione as dependências e gere as pastas nativas do Android Studio e Xcode:

```bash
# Instalar os SDKs nativos do Capacitor
npm i @capacitor/android @capacitor/ios

# Adicionar a pasta do projeto Android
npx cap add android

# Adicionar a pasta do projeto iOS (Requer macOS com Xcode instalado)
npx cap add ios
```

---

## 🔄 Passo 3: Compilar e Sincronizar o Código

Toda vez que você fizer alterações no código do React e desejar testar no celular, faça:

```bash
# 1. Construir a compilação otimizada da aplicação web
npm run build

# 2. Copiar os arquivos copilados para os projetos do Android e iOS
npx cap sync
```

---

## 🍎 Passo 4: Publicar na Apple App Store (iOS)

Para abrir seu projeto móvel no **Xcode** (necessário computador Mac) e enviar para a App Store:

1. Execute o comando:
   ```bash
   npx cap open ios
   ```
2. O Xcode abrirá automaticamente.
3. No Xcode, selecione a aba **Signing & Capabilities** nas configurações do projeto para definir sua conta de desenvolvedor da Apple (Apple Developer Account).
4. Altere o ícone do aplicativo na pasta `App/App/Assets.xcassets`.
5. No menu superior do Xcode, selecione **Product > Archive**.
6. Uma vez arquivado, clique em **Distribute App** para fazer o upload diretamente para o **App Store Connect / TestFlight** de forma trivial.

---

## 🤖 Passo 5: Publicar na Google Play Store (Android)

Para abrir seu projeto no **Android Studio** e gerar o instalador formal:

1. Execute o comando:
   ```bash
   npx cap open android
   ```
2. O Android Studio abrirá automaticamente.
3. Altere o ícone de demonstração padrão do app substituindo as imagens contidas na pasta `app/src/main/res/mipmap-*`.
4. No menu superior do Android Studio, vá em **Build > Generate Signed Bundle / APK...**.
5. Selecione **Android App Bundle (.aab)** (formato oficial moderno exigido pela Google Play).
6. Crie ou selecione uma chave segura de assinatura (.keystore).
7. O Android Studio criará o arquivo `.aab` pronto para ser enviado no console da **Google Play Console**.

---

## 💡 Dicas de Sucesso para a Aprovação Comercial

- **Privacidade de Dados:** Lojas de aplicativos exigem um link para os Termos de Uso e Política de Privacidade de dados móveis no formulário de envio. Crie uma página simples informando que as vivências da comunidade são anônimas.
- **Permissões de Geolocalização:** Se usar mapas em tempo real ou localização para contatos de emergência, lembre-se de configurar a mensagem de justificativa de uso no arquivo `InfoPlist.strings` (iOS) e `AndroidManifest.xml` (Android).
