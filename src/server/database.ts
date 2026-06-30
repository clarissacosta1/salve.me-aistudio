import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MongoClient, Collection, Db } from "mongodb";
import { SEED_SITUATIONS } from "./seed";

export interface Situation {
  id: string;
  contexto: string;
  trigger: string;
  educadora: string;
  sarcastica: string;
  assertiva: string;
  sem_filtro: string;
  seguranca: string;
  notas: string;
  tags: string[];
}

export interface Suggestion {
  id: string;
  situation: string;
  contexto: string;
  created_at: string;
}

export interface CopyEvent {
  id: string;
  situation_id: string;
  response_type: string;
  timestamp: string;
}

export interface FeedbackEvent {
  id: string;
  situation_id: string;
  response_type: string;
  rating: number; // 1 or -1
  timestamp: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}

export interface CommunityComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface CommunityStory {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  date: string;
  solidarityCount: number;
  comments: CommunityComment[];
  audioUrl?: string;
}

export interface IDatabase {
  getSituations(filter?: { contexto?: string; search?: string }): Promise<Situation[]>;
  getSituationById(id: string): Promise<Situation | null>;
  addSituation(sit: Omit<Situation, "id"> & { id?: string }): Promise<Situation>;
  deleteSituation(id: string): Promise<boolean>;
  updateSituation(id: string, update: Partial<Omit<Situation, "id">>): Promise<boolean>;

  getSuggestions(): Promise<Suggestion[]>;
  addSuggestion(sug: { situation: string; contexto: string }): Promise<Suggestion>;
  deleteSuggestion(id: string): Promise<boolean>;

  getTranslationCache(key: string): Promise<any | null>;
  saveTranslationCache(key: string, situationId: string, lang: string, translations: any): Promise<void>;

  addCopyEvent(event: { situation_id: string; response_type: string }): Promise<CopyEvent>;
  getCopyEvents(): Promise<CopyEvent[]>;

  addFeedbackEvent(event: { situation_id: string; response_type: string; rating: number }): Promise<FeedbackEvent>;
  getFeedbackEvents(): Promise<FeedbackEvent[]>;

  getSubscriptions(): Promise<PushSubscriptionData[]>;
  addSubscription(sub: any): Promise<void>;
  deleteSubscription(endpoint: string): Promise<void>;

  // Community Stories Interfacer
  getStories(category?: string): Promise<CommunityStory[]>;
  addStory(story: { title: string; content: string; category: string; author: string }): Promise<CommunityStory>;
  addSolidarityToStory(id: string): Promise<boolean>;
  addCommentToStory(id: string, comment: { author: string; text: string }): Promise<CommunityComment | null>;
  deleteStory(id: string): Promise<boolean>;
}

export const SEED_STORIES: CommunityStory[] = [
  {
    id: "story-1",
    title: "Fui interrompida repetidamente em reunião de tecnologia",
    content: "Hoje em uma planning técnica de arquitetura de software, apresentei um plano completo de microsserviços. Um colega de equipe sênior me interrompeu 4 vezes nos primeiros 5 minutos para explicar a mesma coisa usando outras palavras. Respirei fundo e disse de forma firme: 'Obrigada por reforçar meu ponto de vista, por favor me permita concluir a apresentação e depois abrimos para dúvidas.' Ele se calou. O apoio visual das estratégias me deu coragem!",
    category: "Profissional",
    author: "Camila S.",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    solidarityCount: 15,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    comments: [
      {
        id: "comm-1",
        author: "Fernanda Medeiros",
        text: "Incrível atitude, Camila! Manterrupting é o que mais sofremos em TI. Usar essa postura assertiva corta o comportamento na hora. Força!",
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
      },
      {
        id: "comm-2",
        author: "Anônima",
        text: "Você foi gigante! O segredo é exatamente esse: retomar o controle sem pedir desculpas ou soar reativa.",
        timestamp: new Date(Date.now() - 3605000).toISOString()
      }
    ]
  },
  {
    id: "story-2",
    title: "Cantada invasiva e importunação no metrô de São Paulo",
    content: "No caminho de volta da faculdade ontem à noite, um estranho sentou muito perto no vagão vazio e fez comentários vulgares sobre a minha roupa. Em vez de congelar ou me encolher, decidi levantar, encará-lo e gritar alto para o vagão ouvir: 'Afaste-se e respeite meu espaço! Isso é assédio!'. Duas pessoas que estavam no vagão se aproximaram de mim na mesma hora e o sujeito desceu tenso na estação seguinte. A união das mulheres salva vidas.",
    category: "Rua / Transporte",
    author: "EstudanteAnônima",
    date: new Date(Date.now() - 3600000 * 12).toISOString(),
    solidarityCount: 38,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    comments: [
      {
        id: "comm-3",
        author: "Mariana Costa",
        text: "Espetacular! Chamar a atenção das pessoas ao redor desconstrói totalmente a impunidade que esses covardes acham que têm no transporte público.",
        timestamp: new Date(Date.now() - 3600000 * 11).toISOString()
      }
    ]
  },
  {
    id: "story-3",
    title: "Chauvinism disguised as joke at family dinner",
    content: "During a family get-together, an uncle said a highly sexist joke about wives being 'house managers who should only cook'. I didn't laugh and simply replied: 'I don't get the punchline, uncle. Can you explain why it is funny to reduce women like that?' The room went completely silent and he looked deeply embarrassed. Setting simple conversational traps works like magic!",
    category: "Social",
    author: "Clara_Insight",
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    solidarityCount: 29,
    comments: [
      {
        id: "comm-4",
        author: "Julia Rosa",
        text: "This is the BEST method! Asking them to explain the joke strips away all the humor and forces them to face their own bias in public. Bravo!",
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
      }
    ]
  }
];

// ----------------------------------------------------
// LOCAL FILE DATABASE FALLBACK IMPLEMENTATION
// ----------------------------------------------------
export class LocalFileDatabase implements IDatabase {
  private filePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, "database.json");
    this.initFileDb();
  }

  private initFileDb() {
    if (!fs.existsSync(this.filePath)) {
      const initialStore = {
        situations: SEED_SITUATIONS.map(s => ({ id: crypto.randomUUID(), ...s })),
        suggestions: [],
        translations_cache: [],
        copy_events: [],
        feedback_events: [],
        subscriptions: [],
        stories: SEED_STORIES
      };
      fs.writeFileSync(this.filePath, JSON.stringify(initialStore, null, 2), "utf-8");
      console.log("Local JSON Database initialized and seeded with community stories.");
    } else {
      try {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const db = JSON.parse(raw);
        let modified = false;
        if (!db.situations) {
          db.situations = [];
        }
        
        for (const seed of SEED_SITUATIONS) {
          const exists = db.situations.some((s: any) => s.trigger.toLowerCase().trim() === seed.trigger.toLowerCase().trim());
          if (!exists) {
            db.situations.push({ id: crypto.randomUUID(), ...seed });
            modified = true;
          }
        }
        
        if (!db.stories || db.stories.length === 0) {
          db.stories = SEED_STORIES;
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(this.filePath, JSON.stringify(db, null, 2), "utf-8");
          console.log("Local JSON Database reconciled with new seed situations successfully.");
        }
      } catch (err) {
        console.error("Local JSON Database reconciliation failed on startup:", err);
      }
    }
  }

  private async readAll(): Promise<any> {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf-8");
      const db = JSON.parse(raw);
      if (!db.stories) {
        db.stories = SEED_STORIES;
        await this.writeAll(db);
      }
      return db;
    } catch (e) {
      console.error("Local database read failed, resetting store:", e);
      return {
        situations: SEED_SITUATIONS.map(s => ({ id: crypto.randomUUID(), ...s })),
        suggestions: [],
        translations_cache: [],
        copy_events: [],
        feedback_events: [],
        subscriptions: [],
        stories: SEED_STORIES
      };
    }
  }

  private async writeAll(data: any): Promise<void> {
    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async getSituations(filter?: { contexto?: string; search?: string }): Promise<Situation[]> {
    const db = await this.readAll();
    let list: Situation[] = db.situations || [];

    if (filter?.contexto && filter.contexto !== "all") {
      list = list.filter(item => item.contexto === filter.contexto);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(item => 
        (item.trigger && item.trigger.toLowerCase().includes(q)) || 
        (item.notas && item.notas.toLowerCase().includes(q))
      );
    }
    return list;
  }

  async getSituationById(id: string): Promise<Situation | null> {
    const db = await this.readAll();
    const item = db.situations.find((s: Situation) => s.id === id);
    return item || null;
  }

  async addSituation(sit: Omit<Situation, "id"> & { id?: string }): Promise<Situation> {
    const db = await this.readAll();
    const newSit: Situation = {
      id: sit.id || crypto.randomUUID(),
      contexto: sit.contexto,
      trigger: sit.trigger,
      educadora: sit.educadora,
      sarcastica: sit.sarcastica,
      assertiva: sit.assertiva,
      sem_filtro: sit.sem_filtro,
      seguranca: sit.seguranca,
      notas: sit.notas || "",
      tags: sit.tags || []
    };
    db.situations.push(newSit);
    await this.writeAll(db);
    return newSit;
  }

  async deleteSituation(id: string): Promise<boolean> {
    const db = await this.readAll();
    const index = db.situations.findIndex((s: Situation) => s.id === id);
    if (index === -1) return false;
    db.situations.splice(index, 1);
    await this.writeAll(db);
    return true;
  }

  async updateSituation(id: string, update: Partial<Omit<Situation, "id">>): Promise<boolean> {
    const db = await this.readAll();
    const index = db.situations.findIndex((s: Situation) => s.id === id);
    if (index === -1) return false;
    db.situations[index] = { ...db.situations[index], ...update };
    await this.writeAll(db);
    return true;
  }

  async getSuggestions(): Promise<Suggestion[]> {
    const db = await this.readAll();
    return db.suggestions || [];
  }

  async addSuggestion(sug: { situation: string; contexto: string }): Promise<Suggestion> {
    const db = await this.readAll();
    const newSug: Suggestion = {
      id: crypto.randomUUID(),
      situation: sug.situation,
      contexto: sug.contexto,
      created_at: new Date().toISOString()
    };
    db.suggestions.push(newSug);
    await this.writeAll(db);
    return newSug;
  }

  async deleteSuggestion(id: string): Promise<boolean> {
    const db = await this.readAll();
    const index = db.suggestions.findIndex((s: Suggestion) => s.id === id);
    if (index === -1) return false;
    db.suggestions.splice(index, 1);
    await this.writeAll(db);
    return true;
  }

  async getTranslationCache(key: string): Promise<any | null> {
    const db = await this.readAll();
    const found = db.translations_cache?.find((c: any) => c.cache_key === key);
    return found || null;
  }

  async saveTranslationCache(key: string, situationId: string, lang: string, translations: any): Promise<void> {
    const db = await this.readAll();
    if (!db.translations_cache) db.translations_cache = [];
    
    const existingIndex = db.translations_cache.findIndex((c: any) => c.cache_key === key);
    const payload = {
      cache_key: key,
      situation_id: situationId,
      language: lang,
      translations,
      created_at: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      db.translations_cache[existingIndex] = payload;
    } else {
      db.translations_cache.push(payload);
    }
    await this.writeAll(db);
  }

  async addCopyEvent(event: { situation_id: string; response_type: string }): Promise<CopyEvent> {
    const db = await this.readAll();
    const record: CopyEvent = {
      id: crypto.randomUUID(),
      situation_id: event.situation_id,
      response_type: event.response_type,
      timestamp: new Date().toISOString()
    };
    db.copy_events.push(record);
    await this.writeAll(db);
    return record;
  }

  async getCopyEvents(): Promise<CopyEvent[]> {
    const db = await this.readAll();
    return db.copy_events || [];
  }

  async addFeedbackEvent(event: { situation_id: string; response_type: string; rating: number }): Promise<FeedbackEvent> {
    const db = await this.readAll();
    const record: FeedbackEvent = {
      id: crypto.randomUUID(),
      situation_id: event.situation_id,
      response_type: event.response_type,
      rating: event.rating,
      timestamp: new Date().toISOString()
    };
    db.feedback_events.push(record);
    await this.writeAll(db);
    return record;
  }

  async getFeedbackEvents(): Promise<FeedbackEvent[]> {
    const db = await this.readAll();
    return db.feedback_events || [];
  }

  async getSubscriptions(): Promise<PushSubscriptionData[]> {
    const db = await this.readAll();
    return db.subscriptions || [];
  }

  async addSubscription(sub: any): Promise<void> {
    const db = await this.readAll();
    const endpoint = sub.endpoint || sub.subscription?.endpoint;
    const keys = sub.keys || sub.subscription?.keys;
    
    if (!endpoint) return;
    
    const index = db.subscriptions.findIndex((s: any) => s.endpoint === endpoint);
    const data: PushSubscriptionData = {
      endpoint,
      keys: {
        p256dh: keys?.p256dh || "",
        auth: keys?.auth || ""
      },
      created_at: new Date().toISOString()
    };

    if (index !== -1) {
      db.subscriptions[index] = data;
    } else {
      db.subscriptions.push(data);
    }
    await this.writeAll(db);
  }

  async deleteSubscription(endpoint: string): Promise<void> {
    const db = await this.readAll();
    const index = db.subscriptions.findIndex((s: any) => s.endpoint === endpoint);
    if (index !== -1) {
      db.subscriptions.splice(index, 1);
      await this.writeAll(db);
    }
  }

  async getStories(category?: string): Promise<CommunityStory[]> {
    const db = await this.readAll();
    let list: CommunityStory[] = db.stories || [];
    if (category && category !== "all") {
      list = list.filter(item => item.category === category);
    }
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async addStory(story: { title: string; content: string; category: string; author: string }): Promise<CommunityStory> {
    const db = await this.readAll();
    const newStory: CommunityStory = {
      id: crypto.randomUUID(),
      title: story.title,
      content: story.content,
      category: story.category,
      author: story.author || "Anônima",
      date: new Date().toISOString(),
      solidarityCount: 0,
      comments: []
    };
    if (!db.stories) db.stories = [];
    db.stories.push(newStory);
    await this.writeAll(db);
    return newStory;
  }

  async addSolidarityToStory(id: string): Promise<boolean> {
    const db = await this.readAll();
    const index = db.stories.findIndex((s: CommunityStory) => s.id === id);
    if (index === -1) return false;
    db.stories[index].solidarityCount = (db.stories[index].solidarityCount || 0) + 1;
    await this.writeAll(db);
    return true;
  }

  async addCommentToStory(id: string, comment: { author: string; text: string }): Promise<CommunityComment | null> {
    const db = await this.readAll();
    const index = db.stories.findIndex((s: CommunityStory) => s.id === id);
    if (index === -1) return null;
    const newComment: CommunityComment = {
      id: crypto.randomUUID(),
      author: comment.author || "Anônima",
      text: comment.text,
      timestamp: new Date().toISOString()
    };
    if (!db.stories[index].comments) {
      db.stories[index].comments = [];
    }
    db.stories[index].comments.push(newComment);
    await this.writeAll(db);
    return newComment;
  }

  async deleteStory(id: string): Promise<boolean> {
    const db = await this.readAll();
    const index = db.stories.findIndex((s: CommunityStory) => s.id === id);
    if (index === -1) return false;
    db.stories.splice(index, 1);
    await this.writeAll(db);
    return true;
  }
}

// ----------------------------------------------------
// MONGODB CLIENT IMPLEMENTATION (REAL DEPLOYMENT)
// ----------------------------------------------------
export class MongoDatabase implements IDatabase {
  private client: MongoClient;
  private dbName: string;
  private db!: Db;

  constructor(url: string, dbName: string) {
    this.client = new MongoClient(url);
    this.dbName = dbName;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log(`Connected to real MongoDB Database: ${this.dbName}`);
    await this.seedIfNeeded();
  }

  private async seedIfNeeded() {
    const sitCol = this.db.collection("situations");
    const count = await sitCol.countDocuments();
    if (count === 0) {
      console.log("Seeding MongoDB with initial situations...");
      const mapped = SEED_SITUATIONS.map(s => ({ id: crypto.randomUUID(), ...s }));
      await sitCol.insertMany(mapped as any);
    } else {
      try {
        const existing = await sitCol.find({}, { projection: { trigger: 1 } }).toArray();
        const existingTriggers = new Set(existing.map((s: any) => s.trigger.toLowerCase().trim()));
        const toInsert = SEED_SITUATIONS.filter(seed => !existingTriggers.has(seed.trigger.toLowerCase().trim()));
        if (toInsert.length > 0) {
          console.log(`Reconciling MongoDB with ${toInsert.length} new seed situations...`);
          const mapped = toInsert.map(s => ({ id: crypto.randomUUID(), ...s }));
          await sitCol.insertMany(mapped as any);
        }
      } catch (e) {
        console.error("MongoDB seed reconciliation failed:", e);
      }
    }

    const storiesCol = this.db.collection("stories");
    const stCount = await storiesCol.countDocuments();
    if (stCount === 0) {
      console.log("Seeding MongoDB with initial community stories...");
      await storiesCol.insertMany(SEED_STORIES as any);
    }
  }

  private get situationsCol(): Collection<Situation> {
    return this.db.collection<Situation>("situations");
  }
  private get suggestionsCol(): Collection<Suggestion> {
    return this.db.collection<Suggestion>("suggestions");
  }
  private get translationsCacheCol(): Collection<any> {
    return this.db.collection("translations_cache");
  }
  private get copyEventsCol(): Collection<CopyEvent> {
    return this.db.collection<CopyEvent>("copy_events");
  }
  private get feedbackEventsCol(): Collection<FeedbackEvent> {
    return this.db.collection<FeedbackEvent>("feedback_events");
  }
  private get subscriptionsCol(): Collection<PushSubscriptionData> {
    return this.db.collection<PushSubscriptionData>("subscriptions");
  }
  private get storiesCol(): Collection<CommunityStory> {
    return this.db.collection<CommunityStory>("stories");
  }

  async getSituations(filter?: { contexto?: string; search?: string }): Promise<Situation[]> {
    const query: any = {};
    if (filter?.contexto && filter.contexto !== "all") {
      query.contexto = filter.contexto;
    }
    if (filter?.search) {
      query.$or = [
        { trigger: { $regex: filter.search, $options: "i" } },
        { notas: { $regex: filter.search, $options: "i" } }
      ];
    }
    const docs = await this.situationsCol.find(query, { projection: { _id: 0 } }).toArray();
    return docs;
  }

  async getSituationById(id: string): Promise<Situation | null> {
    const sit = await this.situationsCol.findOne({ id }, { projection: { _id: 0 } });
    return sit;
  }

  async addSituation(sit: Omit<Situation, "id"> & { id?: string }): Promise<Situation> {
    const newSit: Situation = {
      id: sit.id || crypto.randomUUID(),
      contexto: sit.contexto,
      trigger: sit.trigger,
      educadora: sit.educadora,
      sarcastica: sit.sarcastica,
      assertiva: sit.assertiva,
      sem_filtro: sit.sem_filtro,
      seguranca: sit.seguranca,
      notas: sit.notas || "",
      tags: sit.tags || []
    };
    await this.situationsCol.insertOne(newSit as any);
    return newSit;
  }

  async deleteSituation(id: string): Promise<boolean> {
    const result = await this.situationsCol.deleteOne({ id });
    return (result.deletedCount || 0) > 0;
  }

  async updateSituation(id: string, update: Partial<Omit<Situation, "id">>): Promise<boolean> {
    const result = await this.situationsCol.updateOne({ id }, { $set: update });
    return (result.matchedCount || 0) > 0;
  }

  async getSuggestions(): Promise<Suggestion[]> {
    return await this.suggestionsCol.find({}, { projection: { _id: 0 } }).toArray();
  }

  async addSuggestion(sug: { situation: string; contexto: string }): Promise<Suggestion> {
    const newSug: Suggestion = {
      id: crypto.randomUUID(),
      situation: sug.situation,
      contexto: sug.contexto,
      created_at: new Date().toISOString()
    };
    await this.suggestionsCol.insertOne(newSug as any);
    return newSug;
  }

  async deleteSuggestion(id: string): Promise<boolean> {
    const result = await this.suggestionsCol.deleteOne({ id });
    return (result.deletedCount || 0) > 0;
  }

  async getTranslationCache(key: string): Promise<any | null> {
    return await this.translationsCacheCol.findOne({ cache_key: key }, { projection: { _id: 0 } });
  }

  async saveTranslationCache(key: string, situationId: string, lang: string, translations: any): Promise<void> {
    await this.translationsCacheCol.updateOne(
      { cache_key: key },
      {
        $set: {
          cache_key: key,
          situation_id: situationId,
          language: lang,
          translations,
          created_at: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  async addCopyEvent(event: { situation_id: string; response_type: string }): Promise<CopyEvent> {
    const record: CopyEvent = {
      id: crypto.randomUUID(),
      situation_id: event.situation_id,
      response_type: event.response_type,
      timestamp: new Date().toISOString()
    };
    await this.copyEventsCol.insertOne(record as any);
    return record;
  }

  async getCopyEvents(): Promise<CopyEvent[]> {
    return await this.copyEventsCol.find({}, { projection: { _id: 0 } }).toArray();
  }

  async addFeedbackEvent(event: { situation_id: string; response_type: string; rating: number }): Promise<FeedbackEvent> {
    const record: FeedbackEvent = {
      id: crypto.randomUUID(),
      situation_id: event.situation_id,
      response_type: event.response_type,
      rating: event.rating,
      timestamp: new Date().toISOString()
    };
    await this.feedbackEventsCol.insertOne(record as any);
    return record;
  }

  async getFeedbackEvents(): Promise<FeedbackEvent[]> {
    return await this.feedbackEventsCol.find({}, { projection: { _id: 0 } }).toArray();
  }

  async getSubscriptions(): Promise<PushSubscriptionData[]> {
    return await this.subscriptionsCol.find({}, { projection: { _id: 0 } }).toArray();
  }

  async addSubscription(sub: any): Promise<void> {
    const endpoint = sub.endpoint || sub.subscription?.endpoint;
    const keys = sub.keys || sub.subscription?.keys;
    if (!endpoint) return;

    await this.subscriptionsCol.updateOne(
      { endpoint },
      {
        $set: {
          endpoint,
          keys: {
            p256dh: keys?.p256dh || "",
            auth: keys?.auth || ""
          },
          created_at: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  async deleteSubscription(endpoint: string): Promise<void> {
    await this.subscriptionsCol.deleteOne({ endpoint });
  }

  async getStories(category?: string): Promise<CommunityStory[]> {
    const query: any = {};
    if (category && category !== "all") {
      query.category = category;
    }
    const docs = await this.storiesCol.find(query, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
    return docs;
  }

  async addStory(story: { title: string; content: string; category: string; author: string }): Promise<CommunityStory> {
    const newStory: CommunityStory = {
      id: crypto.randomUUID(),
      title: story.title,
      content: story.content,
      category: story.category,
      author: story.author || "Anônima",
      date: new Date().toISOString(),
      solidarityCount: 0,
      comments: []
    };
    await this.storiesCol.insertOne(newStory as any);
    return newStory;
  }

  async addSolidarityToStory(id: string): Promise<boolean> {
    const result = await this.storiesCol.updateOne(
      { id },
      { $inc: { solidarityCount: 1 } }
    );
    return (result.matchedCount || 0) > 0;
  }

  async addCommentToStory(id: string, comment: { author: string; text: string }): Promise<CommunityComment | null> {
    const newComment: CommunityComment = {
      id: crypto.randomUUID(),
      author: comment.author || "Anônima",
      text: comment.text,
      timestamp: new Date().toISOString()
    };
    const result = await this.storiesCol.updateOne(
      { id },
      { $push: { comments: newComment as any } }
    );
    if ((result.matchedCount || 0) > 0) {
      return newComment;
    }
    return null;
  }

  async deleteStory(id: string): Promise<boolean> {
    const result = await this.storiesCol.deleteOne({ id });
    return (result.deletedCount || 0) > 0;
  }
}

// ----------------------------------------------------
// DATABASE SELECTOR FACTORY
// ----------------------------------------------------
let databaseInstance: IDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (databaseInstance) return databaseInstance;

  const mongoUrl = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || "salvemedb";

  if (mongoUrl) {
    try {
      console.log("Found MONGO_URL. Spawning MongoDB Database Driver...");
      const mongoDb = new MongoDatabase(mongoUrl, dbName);
      await mongoDb.connect();
      databaseInstance = mongoDb;
      return databaseInstance;
    } catch (e) {
      console.error("MongoDB integration failed, falling back to local JSON persistence:", e);
    }
  }

  console.log("No MongoDB configuration found. Bootstrapping fully integrated offline LocalFileDatabase fallback...");
  databaseInstance = new LocalFileDatabase();
  return databaseInstance;
}
