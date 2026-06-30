import express from "express";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import webpush from "web-push";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getDatabase, IDatabase, Situation, Suggestion } from "./src/server/database";

// Load configuration
dotenv.config();

const app = express();
const PORT = 3000;

// Setup static upload and generic JSON parsing
app.use(express.json());
const upload = multer();

// Admin Verification Middleware
const checkAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminPassword = process.env.ADMIN_PASSWORD || "salveme2024";
  const authHeader = req.headers.authorization;
  const authQuery = req.query.password as string;
  const authBody = req.body.password as string;

  let key = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    key = authHeader.substring(7);
  } else if (authHeader) {
    key = authHeader;
  } else if (authQuery) {
    key = authQuery;
  } else if (authBody) {
    key = authBody;
  }

  if (key === adminPassword) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid administrative password." });
  }
};

// VAPID Web Push Setup
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || ""
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@salve-me.eu",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (err) {
    console.error("Failed to set custom Web-Push VAPID details:", err);
  }
} else {
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidKeys = keys;
    webpush.setVapidDetails(
      "mailto:admin@salve-me.eu",
      keys.publicKey,
      keys.privateKey
    );
    console.log("Successfully generated session fallback VAPID Keys.");
  } catch (err) {
    console.warn("Could not set up fallback VAPID Keys: ", err);
  }
}

// Safely obtain Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Configure it in the Secrets panel inside the AI Studio UI.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Auxiliary translation helper using Gemini
async function translateTextWithGemini(
  content: {
    trigger: string;
    educadora: string;
    sarcastica: string;
    assertiva: string;
    sem_filtro: string;
    notas: string;
  },
  targetLang: "en" | "es"
): Promise<any> {
  try {
    const ai = getAiClient();
    const langName = targetLang === "en" ? "English" : "Spanish";
    
    const responseSchema = {
      type: "OBJECT",
      properties: {
        trigger: { type: "STRING" },
        educadora: { type: "STRING" },
        sarcastica: { type: "STRING" },
        assertiva: { type: "STRING" },
        sem_filtro: { type: "STRING" },
        notas: { type: "STRING" }
      },
      required: ["trigger", "educadora", "sarcastica", "assertiva", "sem_filtro", "notas"]
    };

    const prompt = `Translate this JSON object containing Portuguese (pt-BR) harassment response scripts into ${langName}.
Maintain the precise semantic meaning, emotional urgency, and sarcastic/witty/boundary-setting tones.

Input JSON:
${JSON.stringify(content, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert dual-language translator specialized in localized safety instructions and witty social comebacks.
Translate the input Portuguese text into the requested target language. You must output a valid JSON object matching the requested schema. Do not enclose the output in markdown code blocks.`,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed;
  } catch (err: any) {
    console.warn("[translateTextWithGemini failed, returning original content]", err);
    return content;
  }
}

// Execute custom async function with retry policy (specifically for 429 warnings)
async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        (error?.message && /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error.message)) ||
        (typeof error === "string" && /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error));

      if (attempt >= retries) {
        throw error;
      }

      // Exponential backoff with jitter
      const wait = isRateLimit ? delayMs * Math.pow(2.2, attempt) : delayMs;
      console.warn(`[Gemini API] Retrying on error (attempt ${attempt}/${retries}). Error msg: ${error?.message || error}. Waiting ${wait}ms...`);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
}

// Batch translation helper using Gemini to translate multiple situations in one request
async function translateBatchWithGemini(
  contents: {
    id: string;
    trigger: string;
    educadora: string;
    sarcastica: string;
    assertiva: string;
    sem_filtro: string;
    notas: string;
  }[],
  targetLang: "en" | "es"
): Promise<Record<string, any>> {
  try {
    const ai = getAiClient();
    const langName = targetLang === "en" ? "English" : "Spanish";
    
    const responseSchema = {
      type: "OBJECT",
      properties: {
        translations: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              trigger: { type: "STRING" },
              educadora: { type: "STRING" },
              sarcastica: { type: "STRING" },
              assertiva: { type: "STRING" },
              sem_filtro: { type: "STRING" },
              notas: { type: "STRING" }
            },
            required: ["id", "trigger", "educadora", "sarcastica", "assertiva", "sem_filtro", "notas"]
          }
        }
      },
      required: ["translations"]
    };

    const prompt = `Translate this JSON array of Portuguese (pt-BR) response scripts into ${langName}.
Keep the 'id' fields identical, and translate all textual values. Maintain the precise semantic meaning, emotional urgency, and sarcastic/witty/boundary-setting tones.

Input Array:
${JSON.stringify(contents, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert dual-language translator specialized in safety responses and verbal comebacks.
Translate the input into the target language. Return a valid JSON object matching the requested schema. No markdown wrapping.`,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const result: Record<string, any> = {};
    if (parsed && Array.isArray(parsed.translations)) {
      parsed.translations.forEach((item: any) => {
        if (item && item.id) {
          const { id, ...fields } = item;
          result[id] = fields;
        }
      });
    }
    return result;
  } catch (err: any) {
    console.warn("[translateBatchWithGemini failed, fallback to original values]", err);
    const result: Record<string, any> = {};
    contents.forEach((item) => {
      const { id, ...fields } = item;
      result[id] = fields;
    });
    return result;
  }
}

// Batch tags translation helper using Gemini
async function translateTagsBatchWithGemini(
  tags: string[],
  targetLang: "en" | "es"
): Promise<Record<string, string>> {
  try {
    const ai = getAiClient();
    const langName = targetLang === "en" ? "English" : "Spanish";

    const responseSchema = {
      type: "OBJECT",
      properties: {
        tags: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              original: { type: "STRING" },
              translated: { type: "STRING" }
            },
            required: ["original", "translated"]
          }
        }
      },
      required: ["tags"]
    };

    const prompt = `Translate this list of social and safety tags from Portuguese into ${langName} in 1-2 words. Keep them short, uppercase, and precise.

Input Tags:
${JSON.stringify(tags, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert dual-language translator. Translate the array of tags. Return a valid JSON object matching the requested schema.",
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const result: Record<string, string> = {};
    if (parsed && Array.isArray(parsed.tags)) {
      parsed.tags.forEach((item: any) => {
        if (item && item.original && item.translated) {
          result[item.original.trim().toLowerCase()] = item.translated.trim().toUpperCase();
        }
      });
    }
    return result;
  } catch (err: any) {
    console.warn("[translateTagsBatchWithGemini failed, fallback to direct mapping]", err);
    const result: Record<string, string> = {};
    const known: Record<string, string> = {
      "rua": "STREET",
      "carreira": "CAREER",
      "assédio": "HARASSMENT",
      "estilo": "STYLE",
      "mansplaining": "MANSPLAINING",
      "corporativo": "CORPORATE",
      "social": "SOCIAL",
      "trabalho": "WORKPLAIN",
      "comportamento": "BEHAVIOR"
    };
    tags.forEach(t => {
      const lower = t.trim().toLowerCase();
      result[lower] = known[lower] || t.trim().toUpperCase();
    });
    return result;
  }
}

// INTELLIGENT HEURISTIC FALLBACKS FOR QUOTA LIMITATIONS (HTTP 429) OR KEY OFFLINE STATES
function getHeuristicSafetyAdvice(prompt: string, language: string, isQuotaAlert: boolean): string {
  const isPt = language === "pt" || language === "pt-BR";
  const p = prompt.toLowerCase();
  
  let header = "";
  if (isQuotaAlert) {
    header = isPt 
      ? `📢 **[Modo Autônomo - Alta Demanda da Inteligência Artificial]**\nO limite diário de requisições gratuitas foi atingido. Ativamos nosso **Sistema Local de Segurança Especializada** para lhe responder de imediato:\n\n`
      : `📢 **[Autonomous Mode - AI Demand Limit Met]**\nThe daily free quota of Gemini requests was reached. We have activated our **Local Specialized Security System** to reply immediately:\n\n`;
  } else {
    header = isPt
      ? `📢 **[Modo Autônomo de Contingência]**\n\n`
      : `📢 **[Autonomous Contingency Mode]**\n\n`;
  }

  // First Aid / Medical Emergency
  if (p.includes("primeiro") || p.includes("socor") || p.includes("médic") || p.includes("ambul") || p.includes("dor") || p.includes("fart") || p.includes("corac") || p.includes("heart") || p.includes("first aid") || p.includes("medical") || p.includes("breath")) {
    if (isPt) {
      return header + `### 🩺 Guia Rápido de Primeiros Socorros Urgentes
1. **Ligue imediatamente para o SAMU (192)** ou vá ao pronto-socorro mais próximo.
2. **Mantenha a calma** e coloque a pessoa em uma posição confortável (se consciente, deitada com o tronco ligeiramente elevado se houver falta de ar).
3. **Não administre medicamentos** ou líquidos sem orientação profissional explícita dos socorristas.
4. **Fique atento aos sinais vitais** (respiração e resposta verbal). Se a pessoa perder a consciência e parar de respirar, inicie a massagem cardíaca contínua imediatamente e peça para alguém pegar um Desfibrilador (DEA) caso disponível.`;
    } else {
      return header + `### 🩺 Urgent First Aid Guide
1. **Call emergency medical services immediately (e.g., 190 / 192 / 911)**.
2. **Keep calm** and assist the person into a comfortable resting position.
3. **Do not give medications**, food, or water unless explicitly instructed by professional dispatchers.
4. **Monitor vital status** (breathing and alertness). If the person stops breathing, begin chest compressions immediately and stay on the line with the dispatcher.`;
    }
  }

  // Stalking / Tracking / Hidden Camera
  if (p.includes("grava") || p.includes("camer") || p.includes("rastre") || p.includes("espi") || p.includes("app") || p.includes("gps") || p.includes("celular") || p.includes("stalk") || p.includes("track") || p.includes("spy") || p.includes("record")) {
    if (isPt) {
      return header + `### 📱 Proteção Digital e Dispositivos Espiões
1. **Varrer aplicativos suspeitos:** Vá nas configurações do seu celular, revise o uso de bateria/dados e remova apps de terceiros que você não se lembra de ter instalado.
2. **Desative localizações secundárias:** Desative históricos de localização redundantes do Google Maps, Apple Find My ou apps de namoro em momentos críticos.
3. **Senhas robustas:** Altere credenciais de e-mail principal, redes sociais e bancos de dados icloud/google. Prefira autenticação de dois fatores por aplicativo (como Google Authenticator) e não por SMS.
4. **Dispositivos Físicos:** Se desconfiar de rastreador veicular/físico, procure inspeção profissional em estabelecimentos credenciados de segurança veicular.`;
    } else {
      return header + `### 📱 Digital Protection and Spy Devices
1. **Scan suspicious apps:** Go to your mobile settings, check battery/data usage, and uninstall any application you do not recognize.
2. **Disable location sharing:** Turn off Google Maps sharing, Apple Find My, or social media location tags in critical or private situations.
3. **Strong Credentials:** Update master passwords for email accounts, cloud storage (iCloud/Google), and social portals. Always enable App-based Two-Factor Authentication (2FA) instead of SMS.
4. **Stealth/Physical Trackers:** If you suspect an AirTag or tracking device is hidden on you, use specialized detector apps or visit professional auto-security shops to scan.`;
    }
  }

  // Violence/Aggression/Harassment in public spaces
  if (p.includes("rua") || p.includes("estada") || p.includes("persegu") || p.includes("perig") || p.includes("segur") || p.includes("asséd") || p.includes("public") || p.includes("street") || p.includes("stalk") || p.includes("safe") || p.includes("harass")) {
    if (isPt) {
      return header + `### 🛑 Segurança Preventiva em Espaços Públicos
1. **Direcione-se para local movimentado:** Procure imediatamente lojas abertas, shoppings, postos de combustível iluminados ou locais com segurança visível.
2. **Simule uma ligação / Faça barulho:** Use o nosso **Simulador de Ligação** ou o **Alarme Estridente (SOS Pânico)** para fingir um suporte próximo e repelir abordagens oportunistas.
3. **Defina uma rota segura:** Evite becos desabitados ou ruelas escuras, prefira avenidas largas com fluxo de carros.
4. **Ligue no 180 ou 190:** Não hesite em notificar atitudes ameaçadoras diretas para os órgãos responsáveis.`;
    } else {
      return header + `### 🛑 Preventive Safety in Public Settings
1. **Seek Busy or Open Areas:** Immediately head to commercial centers, open stores, illuminated gas stations, or spaces with security/reproduction staff.
2. **Make Noise / Fake Call:** Use our built-in **Fake Call Simulator** or **Panic Siren (Alarm)** to showcase active security connections and deter approaches.
3. **Designate Safe Routes:** Stick to main, active streets with car flows. Avoid paths with blind corners or unlit alleys.
4. **Call support immediately:** Contact local emergency hotlines or share your instant directions template with designated guardians.`;
    }
  }

  // Work / Mansplaining / Sexism
  if (p.includes("trabalh") || p.includes("chefe") || p.includes("reun") || p.includes("profissi") || p.includes("work") || p.includes("offi") || p.includes("meet") || p.includes("boss") || p.includes("colleague")) {
    if (isPt) {
      return header + `### 💼 Gestão de Dignidade no Ambiente de Trabalho
1. **Formalize os ocorridos por escrito:** Guarde e-mails, atas de reunião com testemunhas citadas e envie relatos formais de segurança a si mesma para registrar a data exata.
2. **Reúna evidências silenciosas:** Evite confrontos informais inflamados. Se possível, anote comentários, horários e pessoas presentes de forma exata.
3. **Compartilhe internamente:** Converse com canais de denúncia anônima ou representações sindicais neutras que ofereçam apoio legal e psicológico corporativo.
4. **Defesa Assertiva:** Interrompa tentativas de interrupção sistemática (manterrupting) de forma polida e firme: *"Por favor, deixe-me concluir o meu raciocínio para responder à sua dúvida na sequência."*`;
    } else {
      return header + `### 💼 Professional Boundary Setting at Work
1. **Document everything in writing:** Keep a digital/written log of comments, exact phrases, dating, times, and present coworkers.
2. **Gather clean evidence:** Avoid verbal screaming matches or raw arguments. Maintain a precise record of factual occurrences.
3. **Engage reliable internal portals:** Present records to compliance hotlines, or legal organizations specialized in corporate equality.
4. **Polite Assertive Scripts:** Handle maninterrupting immediately: *"I would like to complete my presentation first, then I will gladly address any follow-up questions."*`;
    }
  }

  // Default general safety consult
  if (isPt) {
    return header + `### 🛡️ Recomendações Fundamentais do Salva-me
1. **Priorize sua integridade física:** Em situações de risco direto, afaste-se o mais rápido possível e busque locais movimentados.
2. **Crie Redes de Apoio:** Adicione pelo menos 3 contatos confiáveis de SOS no nosso painel de contatos e mantenha-os a par da sua localização geral.
3. **Use ferramentas de contenção verbal:** Conheça nosso catálogo de **Respostas Táticas** para deter interações hostis ou machistas de forma segura no dia a dia.
4. **Acione as autoridades públicas:** Em qualquer caso de agressão física ou ameaça direta iminente, disque **Polícia Militar (190)** ou Ligue **Central da Mulher (180)**.`;
  } else {
    return header + `### 🛡️ Fundamental Salve-me Recommendations
1. **Prioritize Physical Integrity:** In case of imminent threat, immediately physical-flee the situation and search for highly active public buildings.
2. **Form Safe Networks:** Setup 3 high-confidence guardians in our SOS contact panel to share fast coordinates and keep them notified.
3. **Leverage Verbal Comeback Tools:** Use our tactical, classified preset safety comebacks to establish clear personal space and de-escalate verbal harassment.
4. **Contact Authorized Support:** Do not hesitate to phone emergency services (such as **190 / 911 / 180** in Brazil) if danger escalates or physical threat occurs.`;
  }
}

function getHeuristicCustomComeback(trigger: string, instruction: string, baseTone: string, language: string): string {
  const isPt = language === "pt" || language === "pt-BR";
  const inst = instruction.toLowerCase();
  
  // Custom templates mapped to core themes
  if (inst.includes("corporativ") || inst.includes("trabalh") || inst.includes("profissi") || inst.includes("email") || inst.includes("work") || inst.includes("office") || inst.includes("boss")) {
    if (isPt) {
      return `Como profissional nesta equipe, prefiro que foquemos o diálogo estritamente no escopo técnico de nossas atividades profissionais. Obrigado pela compreensão.`;
    } else {
      return `Let's keep our communication focused strictly on academic or corporate objectives and technical deliverables. Thank you for your professional cooperation.`;
    }
  }

  if (inst.includes("curt") || inst.includes("diret") || inst.includes("ráp") || inst.includes("short") || inst.includes("quick") || inst.includes("direct")) {
    if (isPt) {
      return `Comentário inadequado. Vamos manter o profissionalismo e o respeito mútuo.`;
    } else {
      return `Inappropriate comment. Let's maintain respect, please.`;
    }
  }

  if (inst.includes("amor") || inst.includes("educad") || inst.includes("fofo") || inst.includes("polite") || inst.includes("sweet")) {
    if (isPt) {
      return `Gentileza e respeito mútuo tornam qualquer convívio infinitamente melhor. Fico agradecida se conversarmos nesses termos!`;
    } else {
      return `Mutual respect makes every interaction better. I really appreciate it if we stick to that from now on!`;
    }
  }

  if (inst.includes("sarcas") || inst.includes("irôn") || inst.includes("engraç") || inst.includes("witty") || inst.includes("funny") || inst.includes("sarcastic")) {
    if (isPt) {
      return `Parabéns, impressionante como você encontrou tempo livre em sua agenda para palpites tão dispensáveis!`;
    } else {
      return `It's truly admirable how you find spare time for such completely unnecessary comments. Respect the dedication!`;
    }
  }

  if (inst.includes("firme") || inst.includes("assertiv") || inst.includes("calm") || inst.includes("firme") || inst.includes("grave") || inst.includes("assertive") || inst.includes("strong")) {
    if (isPt) {
      return `Meu espaço individual e minhas condutas não são objeto de avaliação informal. Solicito que mantenha o respeito aos limites.`;
    } else {
      return `My personal space and choices are not up for informal comments. Please respect my boundaries going forward.`;
    }
  }

  // General fallback by tone
  if (baseTone === "educadora") {
    if (isPt) {
      return `O respeito mútuo é a base de qualquer relação interpessoal saudável. Avaliações com viés de gênero ou comentários intrusivos não cabem aqui.`;
    } else {
      return `Mutual respect is the cornerstone of healthy public and workspace interactions. Comments with gender bias have no place in a mature dialogue.`;
    }
  } else if (baseTone === "sarcastica") {
    if (isPt) {
      return `Agradeço o seu conselho não solicitado; vou arquivar com todo o cuidado junto com as minhas outras anotações de relevância zero.`;
    } else {
      return `Thank you for your unsolicited input; I will make sure to archive it on my list of absolute zero relevance.`;
    }
  } else if (baseTone === "assertiva") {
    if (isPt) {
      return `Não dou abertura ou permissão para comentários invasivos sobre as minhas decisões ou minha vida pessoal. Assunto encerrado.`;
    } else {
      return `This discussion is closed. There is no opening or permission for invasive or personal feedback.`;
    }
  } else if (baseTone === "sem_filtro") {
    if (isPt) {
      return `Guarde seus comentários impertinentes para si mesmo. Respeito mútuo é o mínimo exigido.`;
    } else {
      return `Keep your unsolicited thoughts to yourself. Let's make sure respect is set as the bare minimum.`;
    }
  }

  // Ultimate universal return
  if (isPt) {
    return `Não tenho interesse em ouvir palpites invasivos. Por favor, respeite os limites básicos do nosso convívio saudável.`;
  } else {
    return `I possess zero interest or room for invasive commentaries. Please exercise decent judgment and respect my personal boundaries.`;
  }
}

// CSV Parser Helper
function parseCSV(csvText: string): any[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const item: any = {};
    headers.forEach((header, index) => {
      let val = values[index] || "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      item[header.trim().toLowerCase()] = val;
    });
    results.push(item);
  }
  return results;
}

// CSV Generator Helper
function generateCSV(items: any[]): string {
  const headers = ["id", "contexto", "trigger", "educadora", "sarcastica", "assertiva", "sem_filtro", "seguranca", "notas", "tags"];
  const rows = [headers.join(",")];

  items.forEach(item => {
    const row = headers.map(header => {
      let val = item[header] || "";
      if (Array.isArray(val)) {
        val = val.join(";");
      }
      val = val.toString().replace(/"/g, '""');
      if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
        return `"${val}"`;
      }
      return val;
    });
    rows.push(row.join(","));
  });
  return rows.join("\n");
}

// ----------------------------------------------------
// API ROUTES IMPLEMENTATION
// ----------------------------------------------------

async function registerRoutes() {
  const db = await getDatabase();

  // 1. Get Situations catalog with dynamic translation and search filters
  app.get("/api/situations", async (req, res) => {
    try {
      const { contexto, search, lang = "pt" } = req.query as { contexto?: string; search?: string; lang?: string };
      const rawSituations = await db.getSituations({ contexto, search });

      if (lang === "pt" || rawSituations.length === 0) {
        res.json({ situations: rawSituations });
        return;
      }

      // Translate situations on-the-fly with batching & translation caching
      const targetLang = lang === "es" ? "es" : "en";
      
      const translatedMap: Record<string, any> = {};
      const toTranslate: any[] = [];

      // Fetch cached ones first
      for (const sit of rawSituations) {
        const cacheKey = `${sit.id}_${targetLang}`;
        const cached = await db.getTranslationCache(cacheKey);
        if (cached && cached.translations) {
          translatedMap[sit.id] = { ...sit, ...cached.translations };
        } else {
          toTranslate.push(sit);
        }
      }

      // Batch translate remaining situations using a sequential loop with retry
      if (toTranslate.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < toTranslate.length; i += batchSize) {
          const chunk = toTranslate.slice(i, i + batchSize);
          try {
            const translatedChunkMap = await executeWithRetry(async () => {
              return await translateBatchWithGemini(
                chunk.map(sit => ({
                  id: sit.id,
                  trigger: sit.trigger,
                  educadora: sit.educadora,
                  sarcastica: sit.sarcastica,
                  assertiva: sit.assertiva,
                  sem_filtro: sit.sem_filtro,
                  notas: sit.notas
                })),
                targetLang
              );
            }, 3, 2000);

            // Cache and map results
            for (const sit of chunk) {
              const transFields = translatedChunkMap[sit.id];
              if (transFields) {
                const cacheKey = `${sit.id}_${targetLang}`;
                await db.saveTranslationCache(cacheKey, sit.id, targetLang, transFields);
                translatedMap[sit.id] = { ...sit, ...transFields };
              } else {
                translatedMap[sit.id] = sit; // Fallback to original
              }
            }
          } catch (err: any) {
            console.error(`Batch translation failed for chunk starting at index ${i}:`, err);
            // Non-blocking fallback for this chunk
            for (const sit of chunk) {
              translatedMap[sit.id] = sit;
            }
          }

          // Small delay between batches to respect rate limits gently
          if (i + batchSize < toTranslate.length) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }

      // Reconstruct original array order
      const finalTranslated = rawSituations.map(sit => translatedMap[sit.id] || sit);
      res.json({ situations: finalTranslated });
    } catch (error: any) {
      console.error("Get Situations failed:", error);
      res.status(500).json({ error: error.message || "Failed to load situations catalog." });
    }
  });

  // 2. Get Single Situation details
  app.get("/api/situations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { lang = "pt" } = req.query as { lang?: string };

      const sit = await db.getSituationById(id);
      if (!sit) {
        res.status(404).json({ error: "Situation not found." });
        return;
      }

      if (lang === "pt") {
        res.json(sit);
        return;
      }

      const targetLang = lang === "es" ? "es" : "en";
      const cacheKey = `${sit.id}_${targetLang}`;
      const cached = await db.getTranslationCache(cacheKey);

      if (cached && cached.translations) {
        res.json({ ...sit, ...cached.translations });
        return;
      }

      try {
        const rawFields = {
          trigger: sit.trigger,
          educadora: sit.educadora,
          sarcastica: sit.sarcastica,
          assertiva: sit.assertiva,
          sem_filtro: sit.sem_filtro,
          notas: sit.notas
        };
        const translatedFields = await executeWithRetry(async () => {
          return await translateTextWithGemini(rawFields, targetLang);
        }, 3, 1500);
        await db.saveTranslationCache(cacheKey, sit.id, targetLang, translatedFields);
        res.json({ ...sit, ...translatedFields });
      } catch (e) {
        console.error(`Single situation translation failed for ID ${id}:`, e);
        res.json(sit);
      }
    } catch (error: any) {
      console.error("Get single situation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Get unique tags with counts and translation mapping
  app.get("/api/tags", async (req, res) => {
    try {
      const { lang = "pt" } = req.query as { lang?: string };
      const rawSituations = await db.getSituations();

      const tagCounts: Record<string, number> = {};
      rawSituations.forEach((sit) => {
        const tags = sit.tags || [];
        tags.forEach((tag) => {
          const t = tag.trim().toLowerCase();
          if (t) {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          }
        });
      });

      const uniqueTags = Object.keys(tagCounts);

      if (lang === "pt" || uniqueTags.length === 0) {
        const payload = uniqueTags.map(tag => ({
          tag,
          count: tagCounts[tag],
          tag_label: tag.toUpperCase()
        }));
        res.json({ tags: payload });
        return;
      }

      // Translate tag labels with cache & batching
      const targetLang = lang === "es" ? "es" : "en";
      
      const translatedMap: Record<string, string> = {};
      const toTranslate: string[] = [];

      for (const tag of uniqueTags) {
        const cacheKey = `tag::${tag}::${targetLang}`;
        const cached = await db.getTranslationCache(cacheKey);
        if (cached && cached.translations && cached.translations.label) {
          translatedMap[tag] = cached.translations.label;
        } else {
          toTranslate.push(tag);
        }
      }

      if (toTranslate.length > 0) {
        const batchSize = 15;
        for (let i = 0; i < toTranslate.length; i += batchSize) {
          const chunk = toTranslate.slice(i, i + batchSize);
          try {
            const translatedLabelsMap = await executeWithRetry(async () => {
              return await translateTagsBatchWithGemini(chunk, targetLang);
            }, 3, 1500);

            for (const tag of chunk) {
              const transLabel = translatedLabelsMap[tag.trim().toLowerCase()];
              if (transLabel) {
                const cacheKey = `tag::${tag}::${targetLang}`;
                await db.saveTranslationCache(cacheKey, tag, targetLang, { label: transLabel });
                translatedMap[tag] = transLabel;
              } else {
                translatedMap[tag] = tag.toUpperCase();
              }
            }
          } catch (err) {
            console.error(`Tags translation failed for chunk starting at index ${i}:`, err);
            for (const tag of chunk) {
              translatedMap[tag] = tag.toUpperCase();
            }
          }

          if (i + batchSize < toTranslate.length) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        }
      }

      const translatedTags = uniqueTags.map(tag => ({
        tag,
        count: tagCounts[tag],
        tag_label: translatedMap[tag] || tag.toUpperCase()
      }));

      res.json({ tags: translatedTags });
    } catch (error: any) {
      console.error("Get tags failed: ", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Create suggestion from user
  app.post("/api/suggestions", async (req, res) => {
    try {
      const { situation, contexto } = req.body;
      if (!situation || !contexto) {
        res.status(400).json({ error: "Contexto and situation trigger are mandatory fields." });
        return;
      }

      const created = await db.addSuggestion({ situation, contexto });

      // Trigger standard administrator Web-Push Notification alert
      const subscriptions = await db.getSubscriptions();
      const payloadString = JSON.stringify({
        title: "Nova Sugestão de Alerta 🚨",
        body: `Contexto: ${contexto}. Toque: "${situation.substring(0, 40)}${situation.length > 40 ? "..." : ""}"`,
        url: "/admin",
        tag: "new-suggestion"
      });

      console.log(`Sending web-push of suggestion to ${subscriptions.length} active admin subscriptions.`);
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            payloadString
          );
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            // Subscription expired or uninstalled, prune it
            await db.deleteSubscription(sub.endpoint);
          } else {
            console.error("WebPush failed to deliver to sub:", e);
          }
        }
      }

      res.status(201).json(created);
    } catch (error: any) {
      console.error("Create suggestion failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4a. Get all community stories with optional category filter
  app.get("/api/stories", async (req, res) => {
    try {
      const { category } = req.query as { category?: string };
      const list = await db.getStories(category);
      res.json({ stories: list });
    } catch (e: any) {
      console.error("Get stories failed:", e);
      res.status(500).json({ error: e.message || "Failed to load stories." });
    }
  });

  // 4b. Create a new community story
  app.post("/api/stories", async (req, res) => {
    try {
      const { title, content, category, author } = req.body;
      if (!title || !content || !category) {
        res.status(400).json({ error: "Title, content, and category are required." });
        return;
      }
      const created = await db.addStory({ title, content, category, author });
      res.status(201).json(created);
    } catch (e: any) {
      console.error("Create story failed:", e);
      res.status(500).json({ error: e.message || "Failed to submit story." });
    }
  });

  // 4c. Express solidarity to a story
  app.post("/api/stories/:id/solidarity", async (req, res) => {
    try {
      const success = await db.addSolidarityToStory(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Story not found." });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4d. Add a comment to community story
  app.post("/api/stories/:id/comments", async (req, res) => {
    try {
      const { author, text } = req.body;
      if (!text) {
        res.status(400).json({ error: "Comment text is required." });
        return;
      }
      const added = await db.addCommentToStory(req.params.id, { author, text });
      if (added) {
        res.status(201).json(added);
      } else {
        res.status(404).json({ error: "Story not found." });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 5. Emergency AI Safety Advisor Proxy (already exists, modified here for unified format)
  app.post("/api/safety-consult", async (req, res) => {
    try {
      const { prompt, category = "general", language = "pt-BR" } = req.body;

      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "Missing consulting prompt text." });
        return;
      }

      let aiClientInstance;
      try {
        aiClientInstance = getAiClient();
      } catch (e: any) {
        console.warn("Gemini is offline or API key is not configured:", e.message);
        
        const fallbacks: Record<string, string> = {
          "pt-BR": `⚠️ **[Modo de Emergência Ativo]** 
O assistente de inteligência artificial está offline ou a chave de API não foi configurada. 

**Conselhos Gerais de Segurança Urgentes:**
1. **Afaste-se do perigo:** Desloque-se para espaços públicos iluminados.
2. **Peça ajuda:** Ligue diretamente para a Polícia (190) ou SAMU (192).
3. **Localização:** Partilhe as suas coordenadas com pessoas conhecidas via WhatsApp.`,
          "en-US": `⚠️ **[Autonomous Safety Offline Mode]** 
The AI consultant is offline because the API key is not armed.

**Urgent Universal Directives:**
1. **Flee Danger:** Immediately reach public, active spaces with bystanders.
2. **Help Channels:** Dial local police (190) directly.
3. **Coordinate Sharing:** Transmit your location details to parents or contacts.`
        };

        res.json({
          text: fallbacks[language] || fallbacks["pt-BR"],
          isFallback: true
        });
        return;
      }

      const systemPrompt = language === "pt-BR"
        ? `Você é o conselheiro oficial do portal de defesa "Salve-me". Forneça orientações imediatas sobre segurança humana. Seja altamente prático, sério, empático e de leitura rápida. Use Markdown simples.`
        : `You are the safety advisor for "Salve-me". Output immediate actions. Be exceptionally concise and actionable. Use simple Markdown lists.`;

      const result = await aiClientInstance.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });

      res.json({ text: result.text || "" });
    } catch (error: any) {
      const isQuotaAlert = /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error?.message || "") || error?.status === 429;
      console.warn(`[Safety Consult Handled] Gemini API ${isQuotaAlert ? "Rate Limit (429)" : "Error"}. Activating specialized offline backup guidance.`);
      const fallbackText = getHeuristicSafetyAdvice(req.body.prompt || "", req.body.language || "pt-BR", isQuotaAlert);
      res.json({ text: fallbackText, isFallback: true });
    }
  });

  // 5b. Custom AI Comeback Customizer
  app.post("/api/custom-comeback", async (req, res) => {
    try {
      const { trigger, instruction, baseTone = "educadora", language = "pt-BR" } = req.body;

      if (!trigger || typeof trigger !== "string") {
        res.status(400).json({ error: "Missing sexist trigger sentence." });
        return;
      }

      let finalInstruction = (instruction && typeof instruction === "string") ? instruction.trim() : "";
      if (!finalInstruction) {
        finalInstruction = language === "pt" || language === "pt-BR"
          ? "responder de maneira assertiva, elegante e firme"
          : "reply in a firm, elegant and assertive way";
      }

      let aiClientInstance;
      try {
        aiClientInstance = getAiClient();
      } catch (e: any) {
        console.warn("Gemini is offline or API key is not configured:", e.message);
        const fallbacks: Record<string, string> = {
          "pt-BR": `⚠️ Não foi possível se conectar à nossa Inteligência Artificial para personalizar a resposta. Ative sua chave API ou verifique sua conexão.`,
          "en-US": `⚠️ Could not connect to our Artificial Intelligence for customizing the response. Activate your API key or check your connection.`
        };
        res.json({
          text: fallbacks[language === "pt" ? "pt-BR" : "en-US"] || fallbacks["pt-BR"],
          isFallback: true
        });
        return;
      }

      const systemPrompt = language === "pt" 
        ? `Você é uma assistente especialista em responder a comentários sexistas e comportamentos machistas da plataforma "Salve-me". 
Sua tarefa é personalizar ou gerar uma nova resposta estratégica de auto-defesa verbal baseada na frase abusiva ou machista fornecida pela usuária e na instrução/diretriz de estilo fornecida.
O tom de base solicitado é '${baseTone}'. A nova resposta deve seguir estritamente as diretrizes da usuária expressas em sua instrução (ex: "estilo e-mail corporativo", "mais curto e engraçado", "ultra assertivo e calmo", "resposta de trabalho", "responder no almoço de família").
Retorne APENAS a frase gerada diretamente, bem escrita, com excelente escolha de palavras, sem aspas, explicações, preâmbulos ou formatação markdown de cabeçalhos. Seja direta, assertiva e proteja os limites e dignidade da mulher.`
        : `You are an expert assistant specialized in countering sexist remarks and male chauvinistic behavior for the "Save Me" app.
Your task is to customize/generate a verbal self-defense comeback based on the abusive sexist remark provided and the user's styling instruction/directive.
The requested base tone is '${baseTone}'. Your generated response must strictly respect the styling instruction (e.g. "make it a corporate email", "shorter and funnier", "calm and ultra-assertive", "reply to boss").
Return ONLY the direct target sentence itself. Do not include quotes, preamble, or markdown headings. Keep it direct and powerful.`;

      const promptText = `Cenário / Comentário machista original: "${trigger}"
Diretriz de personalização/Estilo que você DEVE seguir: "${finalInstruction}"
Tom de base: ${baseTone}`;

      const result = await aiClientInstance.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8
        }
      });

      res.json({ text: (result.text || "").trim().replace(/^["'“]+|["'”]+$/g, "") });
    } catch (error: any) {
      const isQuotaAlert = /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error?.message || "") || error?.status === 429;
      console.warn(`[Custom Comeback Handled] Gemini API ${isQuotaAlert ? "Rate Limit (429)" : "Error"}. Reverting to local fallback.`);
      const { trigger, instruction = "", baseTone = "educadora", language = "pt-BR" } = req.body;
      
      let resText = getHeuristicCustomComeback(trigger, instruction, baseTone, language);
      if (isQuotaAlert) {
         resText = (language === "pt" || language === "pt-BR") 
           ? `⚠️ [Limite de Demanda Atingido] ${resText}`
           : `⚠️ [AI Quota Reached] ${resText}`;
      }
      res.json({ text: resText, isFallback: true });
    }
  });

  // ----------------------------------------------------
  // ADMIN API ROUTES
  // ----------------------------------------------------

  // Verify Admin Password
  app.post("/api/admin/verify", (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD || "salveme2024";
    const { password } = req.body;
    if (password === adminPassword) {
      res.json({ success: true, token: adminPassword });
    } else {
      res.status(401).json({ error: "Invalid password secret." });
    }
  });

  // Get all suggestions
  app.get("/api/suggestions", checkAdminAuth, async (req, res) => {
    try {
      const list = await db.getSuggestions();
      res.json({ suggestions: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete suggestions
  app.delete("/api/admin/suggestions/:id", checkAdminAuth, async (req, res) => {
    try {
      const deleted = await db.deleteSuggestion(req.params.id);
      if (deleted) {
        res.json({ success: true, message: "Suggestion deleted successfully." });
      } else {
        res.status(404).json({ error: "Suggestion not found." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete community story (moderation)
  app.delete("/api/admin/stories/:id", checkAdminAuth, async (req, res) => {
    try {
      const deleted = await db.deleteStory(req.params.id);
      if (deleted) {
        res.json({ success: true, message: "Story deleted successfully." });
      } else {
        res.status(404).json({ error: "Story not found." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all stories for admin management
  app.get("/api/admin/stories", checkAdminAuth, async (req, res) => {
    try {
      const list = await db.getStories();
      res.json({ stories: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete situations
  app.delete("/api/admin/situations/:id", checkAdminAuth, async (req, res) => {
    try {
      const deleted = await db.deleteSituation(req.params.id);
      if (deleted) {
        res.json({ success: true, message: "Situation removed successfully from catalog." });
      } else {
        res.status(404).json({ error: "Situation not cataloged." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edit/Update situation
  app.put("/api/admin/situations/:id", checkAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { contexto, trigger, educadora, sarcastica, assertiva, sem_filtro, seguranca, notas, tags } = req.body;

      const success = await db.updateSituation(id, {
        contexto,
        trigger,
        educadora,
        sarcastica,
        assertiva,
        sem_filtro,
        seguranca,
        notas,
        tags
      });

      if (success) {
        res.json({ success: true, message: "Catalog item updated." });
      } else {
        res.status(404).json({ error: "Situation not cataloged in database." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate comebacks using Gemini AI for new situation
  app.post("/api/admin/generate", checkAdminAuth, async (req, res) => {
    try {
      const { trigger, contexto, notas = "" } = req.body;
      if (!trigger || !contexto) {
        res.status(400).json({ error: "Trigger text and contextual setting are mandatory." });
        return;
      }

      const ai = getAiClient();
      const generationSchema = {
        type: "OBJECT",
        properties: {
          educadora: { type: "STRING" },
          sarcastica: { type: "STRING" },
          assertiva: { type: "STRING" },
          sem_filtro: { type: "STRING" },
          seguranca: { type: "STRING" },
          notas: { type: "STRING" },
          tags: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        },
        required: ["educadora", "sarcastica", "assertiva", "sem_filtro", "seguranca", "notas", "tags"]
      };

      const promptText = `Generate four harassment/microaggression response scripts in Portuguese (pt-BR) based on this input details:
Context: "${contexto}"
Harassing Trigger: "${trigger}"
Additional context/request: "${notas}"

Requirements for responses:
1. "educadora": highly polite, explaining why the comment is gender-biased, micro-aggressive, or inappropriate.
2. "sarcastica": very clever, witty, highly sarcastic, turning the table to highlight double standards.
3. "assertiva": firm, setting quick boundaries with authority without hesitation.
4. "sem_filtro": punchy, raw, blunt, letting the aggressor know they should back off.
5. "seguranca": Decide safety classification matching strictly one of: "Alta", "Média", "Baixa" (High, Medium, Low safety). Use "Alta" for mild remarks, "Média" for medium level, and "Baixa" for street catcalls or threats.
6. "notas": metadata commentary about this double standard in Brazilian/Portuguese culture.
7. "tags": 2-3 relevant tags in lowercase (e.g., "mansplaining", "rua", "assédio", "carreira", "estilo").`;

      console.log(`Pulsing Gemini model to generate scripts for: "${trigger}"`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: "You are the head master content writer of Salve-me app. Write empowering, extremely sharp, culturally accurate pt-BR text as requested in valid JSON.",
          responseMimeType: "application/json",
          responseSchema: generationSchema as any,
          temperature: 0.65
        }
      });

      const parsed = JSON.parse(response.text || "{}");

      const situationPayload = {
        contexto,
        trigger,
        educadora: parsed.educadora || "",
        sarcastica: parsed.sarcastica || "",
        assertiva: parsed.assertiva || "",
        sem_filtro: parsed.sem_filtro || "",
        seguranca: parsed.seguranca || "Média",
        notas: parsed.notas || notas,
        tags: parsed.tags || []
      };

      const created = await db.addSituation(situationPayload);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Gemini script generation failed:", error);
      const isQuotaAlert = /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error?.message || "") || error?.status === 429;
      if (isQuotaAlert) {
        res.status(429).json({ error: "Limite diário de requisições excedido no Gemini (HTTP 429). Por segurança, adicione e salve o item manualmente preenchendo as respostas diretamente abaixo." });
      } else {
        res.status(500).json({ error: error.message || "Failed to generate AI contents." });
      }
    }
  });

  // Generate responses for suggestions, promotions suggestion to active list, deletes suggestion
  app.post("/api/admin/suggestions/:id/generate", checkAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const suggestions = await db.getSuggestions();
      const match = suggestions.find(s => s.id === id);

      if (!match) {
        res.status(404).json({ error: "Suggestion trigger not found." });
        return;
      }

      const ai = getAiClient();
      const generationSchema = {
        type: "OBJECT",
        properties: {
          educadora: { type: "STRING" },
          sarcastica: { type: "STRING" },
          assertiva: { type: "STRING" },
          sem_filtro: { type: "STRING" },
          seguranca: { type: "STRING" },
          notas: { type: "STRING" },
          tags: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        },
        required: ["educadora", "sarcastica", "assertiva", "sem_filtro", "seguranca", "notas", "tags"]
      };

      const promptText = `Help us turn this user-submitted harassment suggestion into a formal situation block.
Category Contexto: "${match.contexto}"
Suggested Harassing Trigger: "${match.situation}"

Write 4 response scripts in pt-BR:
1. "educadora": educational explanation.
2. "sarcastica": witty, sarcastic counter.
3. "assertiva": firm boundary.
4. "sem_filtro": raw, blunt rebuttal.
And suggest "seguranca" ("Alta", "Média", or "Baixa"), some helpful "notas", and 2-3 tags.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: "You represent the core AI script engine for Salve-me app. Generate beautiful empowering safety texts in valid JSON.",
          responseMimeType: "application/json",
          responseSchema: generationSchema as any,
          temperature: 0.7
        }
      });

      const parsed = JSON.parse(response.text || "{}");

      const created = await db.addSituation({
        contexto: match.contexto,
        trigger: match.situation,
        educadora: parsed.educadora || "",
        sarcastica: parsed.sarcastica || "",
        assertiva: parsed.assertiva || "",
        sem_filtro: parsed.sem_filtro || "",
        seguranca: parsed.seguranca || "Média",
        notas: parsed.notas || "",
        tags: parsed.tags || []
      });

      // Purge/Archive original suggestion
      await db.deleteSuggestion(id);
      res.status(201).json({ success: true, created });
    } catch (error: any) {
      console.error("Suggestion promotional generation failed:", error);
      const isQuotaAlert = /429|quota|RESOURCE_EXHAUSTED|limit/i.test(error?.message || "") || error?.status === 429;
      if (isQuotaAlert) {
        res.status(429).json({ error: "Limite diário de requisições excedido no Gemini (HTTP 429). Copie o comentário sugerido e insira/configure o item de forma manual em nossa listagem de situações." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Export Situation Catalog as CSV download
  app.get("/api/admin/export-csv", checkAdminAuth, async (req, res) => {
    try {
      const list = await db.getSituations();
      const csv = generateCSV(list);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=salveme_situations.csv");
      res.status(200).send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Import situations from multipart CSV file
  app.post("/api/admin/import-csv", checkAdminAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Missing uploaded CSV File in 'file' field." });
        return;
      }

      const rawText = req.file.buffer.toString("utf-8");
      const parsedItems = parseCSV(rawText);

      let count = 0;
      for (const item of parsedItems) {
        if (!item.trigger || !item.contexto) continue;
        
        const tags = item.tags ? item.tags.split(";").map((t: string) => t.trim()).filter((t: string) => t) : [];
        await db.addSituation({
          contexto: item.contexto || "Social",
          trigger: item.trigger,
          educadora: item.educadora || "",
          sarcastica: item.sarcastica || "",
          assertiva: item.assertiva || "",
          sem_filtro: item.sem_filtro || "",
          seguranca: item.seguranca || "Média",
          notas: item.notas || "",
          tags
        });
        count++;
      }

      res.json({ success: true, count, message: `Successfully parsed and recorded ${count} scenarios.` });
    } catch (error: any) {
      console.error("CSV import failed: ", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk Import of validated items via JSON list
  app.post("/api/admin/bulk-import", checkAdminAuth, async (req, res) => {
    try {
      const { situations } = req.body;
      if (!Array.isArray(situations)) {
        res.status(400).json({ error: "Missing situations array in request body." });
        return;
      }

      let count = 0;
      for (const item of situations) {
        let tags: string[] = [];
        if (Array.isArray(item.tags)) {
          tags = item.tags.map((t: any) => t.toString().trim()).filter(Boolean);
        } else if (typeof item.tags === "string" && item.tags) {
          tags = item.tags.split(";").map((t: string) => t.trim()).filter(Boolean);
        }

        await db.addSituation({
          contexto: item.contexto || "Social",
          trigger: item.trigger,
          educadora: item.educadora || "",
          sarcastica: item.sarcastica || "",
          assertiva: item.assertiva || "",
          sem_filtro: item.sem_filtro || "",
          seguranca: item.seguranca || "Média",
          notas: item.notas || "",
          tags
        });
        count++;
      }

      res.json({ success: true, count, message: `Successfully registered ${count} scenarios.` });
    } catch (error: any) {
      console.error("Bulk-import failed: ", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------
  // ANALYTICS & FEEDBACK ENDPOINTS
  // ----------------------------------------------------

  // Register copy actions for analytical trends
  app.post("/api/analytics/copy", async (req, res) => {
    try {
      const { situation_id, response_type } = req.body;
      if (!situation_id || !response_type) {
        res.status(400).json({ error: "Missing situation_id or response_type" });
        return;
      }
      const record = await db.addCopyEvent({ situation_id, response_type });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get aggregated Analytics metrics
  app.get("/api/admin/analytics", checkAdminAuth, async (req, res) => {
    try {
      const items = await db.getCopyEvents();
      const situationsCache = await db.getSituations();
      const sitMap = new Map<string, string>();
      situationsCache.forEach(s => sitMap.set(s.id, s.trigger));

      // 1. Total copies
      const totalCopies = items.length;

      // 2. Copies by type breakdown
      const typeBreakdown: Record<string, number> = { educadora: 0, sarcastica: 0, assertiva: 0, sem_filtro: 0 };
      items.forEach(item => {
        if (item.response_type in typeBreakdown) {
          typeBreakdown[item.response_type]++;
        } else {
          typeBreakdown[item.response_type] = (typeBreakdown[item.response_type] || 0) + 1;
        }
      });

      // 3. Copies by day breakdown
      const dayBreakdown: Record<string, number> = {};
      items.forEach(item => {
        if (item.timestamp) {
          const day = item.timestamp.substring(0, 10);
          dayBreakdown[day] = (dayBreakdown[day] || 0) + 1;
        }
      });

      const sparklineData = Object.keys(dayBreakdown).sort().map(day => ({
        date: day,
        copies: dayBreakdown[day]
      }));

      // 4. Discover top safety triggers copied
      const counter: Record<string, number> = {};
      items.forEach(item => {
        counter[item.situation_id] = (counter[item.situation_id] || 0) + 1;
      });

      const topSituations = Object.keys(counter)
        .map(id => ({
          situation_id: id,
          trigger: sitMap.get(id) || "Excluída / Unlisted",
          copies: counter[id]
        }))
        .sort((a,b) => b.copies - a.copies)
        .slice(0, 5);

      res.json({
        total_copies: totalCopies,
        by_response_type: typeBreakdown,
        copies_by_day: sparklineData,
        top_situations: topSituations
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register helpfulness feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const { situation_id, response_type, rating } = req.body;
      if (!situation_id || !response_type || typeof rating !== "number") {
        res.status(400).json({ error: "Missing required feedback attributes." });
        return;
      }
      const record = await db.addFeedbackEvent({ situation_id, response_type, rating: rating > 0 ? 1 : -1 });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get aggregated feedback lists
  app.get("/api/admin/feedback", checkAdminAuth, async (req, res) => {
    try {
      const feed = await db.getFeedbackEvents();
      const situationsCache = await db.getSituations();
      const sitMap = new Map<string, string>();
      situationsCache.forEach(s => sitMap.set(s.id, s.trigger));

      const totalFeedback = feed.length;
      let helpfulCount = 0;
      let unhelpfulCount = 0;

      const typeFeedback: Record<string, { helpful: number; unhelpful: number }> = {
        educadora: { helpful: 0, unhelpful: 0 },
        sarcastica: { helpful: 0, unhelpful: 0 },
        assertiva: { helpful: 0, unhelpful: 0 },
        sem_filtro: { helpful: 0, unhelpful: 0 }
      };

      const scenarioSummary: Record<string, { trigger: string; score: number; count: number }> = {};

      feed.forEach(item => {
        const rating = item.rating;
        const isHelpful = rating === 1;

        if (isHelpful) helpfulCount++;
        else unhelpfulCount++;

        const type = item.response_type || "general";
        if (!typeFeedback[type]) {
          typeFeedback[type] = { helpful: 0, unhelpful: 0 };
        }

        if (isHelpful) {
          typeFeedback[type].helpful++;
        } else {
          typeFeedback[type].unhelpful++;
        }

        const sid = item.situation_id;
        if (!scenarioSummary[sid]) {
          scenarioSummary[sid] = {
            trigger: sitMap.get(sid) || "Excluída / Unlisted",
            score: 0,
            count: 0
          };
        }
        scenarioSummary[sid].score += rating;
        scenarioSummary[sid].count += 1;
      });

      const topRated = Object.keys(scenarioSummary)
        .map(sid => ({
          situation_id: sid,
          trigger: scenarioSummary[sid].trigger,
          score: scenarioSummary[sid].score,
          count: scenarioSummary[sid].count
        }))
        .sort((a,b) => b.score - a.score)
        .slice(0, 5);

      res.json({
        total_feedback: totalFeedback,
        helpful_count: helpfulCount,
        unhelpful_count: unhelpfulCount,
        helpfulness_percentage: totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 100,
        by_response_type: typeFeedback,
        top_rated_scenarios: topRated
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------
  // WEB PUSH SERVICE WORKER REGISTRATION ENDPOINTS
  // ----------------------------------------------------

  // VAPID Public key retrieval
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // Record administrative push subscriber
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const sub = req.body;
      if (!sub || !sub.endpoint) {
        res.status(400).json({ error: "Missing valid subscription schema." });
        return;
      }
      await db.addSubscription(sub);
      res.json({ success: true, message: "Registered administrative alert subscription." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Prune administrative push subscriber
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        res.status(400).json({ error: "Missing endpoint." });
        return;
      }
      await db.deleteSubscription(endpoint);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test web push notification
  app.post("/api/admin/push/test", checkAdminAuth, async (req, res) => {
    try {
      const subs = await db.getSubscriptions();
      let sentCount = 0;

      const payload = JSON.stringify({
        title: "Mensagem de Teste Salve-me 🛡️",
        body: "Seu canal administrativo de notificações push está funcionando perfeitamente!",
        url: "/admin",
        tag: "test-push"
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            payload
          );
          sentCount++;
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await db.deleteSubscription(sub.endpoint);
          } else {
            console.error("Test send failed for subscription: ", e);
          }
        }
      }

      res.json({ success: true, targets: subs.length, delivered: sentCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Initiate server engine
async function startServer() {
  await registerRoutes();

  // Vite routing layers
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server actively running on port ${PORT}`);
  });
}

startServer();
