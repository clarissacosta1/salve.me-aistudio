import { useState, useEffect, FormEvent } from "react";
import { 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  X, 
  Languages, 
  AlertCircle,
  Clock,
  Volume2,
  ListRestart,
  Heart,
  MessageSquare,
  Shield,
  Activity,
  Unlock,
  AlertTriangle,
  Compass,
  WifiOff,
  Sun,
  Moon
} from "lucide-react";
import { SAFETY_GUIDES } from "./data/guides";
import { EmergencyContact } from "./types";
import FakeCallModal from "./components/FakeCallModal";
import SirenSection from "./components/SirenSection";
import EmergencyTracker from "./components/EmergencyTracker";
import AiAssistant from "./components/AiAssistant";
import SexistSituationPanel from "./components/SexistSituationPanel";
import AdminPanel from "./components/AdminPanel";
import CommunityStoriesPanel from "./components/CommunityStoriesPanel";

export default function App() {
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [activeTab, setActiveTab] = useState<"communityStories" | "responseCenter" | "emergencyCenter" | "aiAdvisor" | "admin">("responseCenter");
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  
  // Track navigator online/offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track dark/light theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("salveme_theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("salveme_theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  // Custom contact form states
  const [newContactName, setNewContactName] = useState("");
  const [newContactRel, setNewContactRel] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  
  // Panic buttons and countdown
  const [panicDelay, setPanicDelay] = useState<0 | 3 | 5>(3);
  const [countdownActive, setCountdownActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [panicAlertFired, setPanicAlertFired] = useState(false);
  
  // Expanded offline guideline ID
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);

  // Load contacts from localStorage on start
  useEffect(() => {
    const saved = localStorage.getItem("salveme_contacts");
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading saved contacts: ", e);
      }
    } else {
      // Set default demo mock contacts so user has beautiful layout initially
      const demo: EmergencyContact[] = [
        { id: "1", name: "Contato de Teste - Família", relationship: "Contato de Emergência", phone: "112" }
      ];
      setContacts(demo);
      localStorage.setItem("salveme_contacts", JSON.stringify(demo));
    }
  }, []);

  const saveContacts = (updated: EmergencyContact[]) => {
    setContacts(updated);
    localStorage.setItem("salveme_contacts", JSON.stringify(updated));
  };

  const handleAddContact = (e: FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    
    const record: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName,
      relationship: newContactRel || (lang === "pt" ? "Contato" : "Contact"),
      phone: newContactPhone
    };
    
    const updated = [...contacts, record];
    saveContacts(updated);
    
    setNewContactName("");
    setNewContactRel("");
    setNewContactPhone("");
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    saveContacts(updated);
  };

  // Launch countdown sequence
  const triggerPanic = () => {
    if (panicDelay === 0) {
      firePanicSystems();
    } else {
      setSecondsLeft(panicDelay);
      setCountdownActive(true);
    }
  };

  // Fire alert configurations
  const firePanicSystems = () => {
    setCountdownActive(false);
    setPanicAlertFired(true);
    // Play loud siren beep to notify
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 805);
      }
    } catch (_) {}
  };

  // Counting down
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (countdownActive && secondsLeft > 0) {
      t = setTimeout(() => {
        setSecondsLeft((p) => {
          if (p <= 1) {
            firePanicSystems();
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(t);
  }, [countdownActive, secondsLeft]);

  return (
    <div className="min-h-screen bg-neutral-105 bg-slate-150 dark:bg-zinc-950 flex items-center justify-center p-0 sm:p-5 font-sans antialiased text-neutral-900 dark:text-neutral-100 selection:bg-purple-600 selection:text-white transition-colors duration-200">
      
      {/* Smartphone Simulator Mock Wrapper */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[92vh] sm:max-h-[92vh] bg-white dark:bg-zinc-900 sm:rounded-3xl sm:border sm:border-neutral-200/80 dark:sm:border-zinc-800 sm:shadow-2xl overflow-y-auto relative flex flex-col justify-between scrollbar-none transition-colors duration-200">
        
        <div>
          {/* Top Banner indicating fired safety alarm */}
          {panicAlertFired && (
            <div className="bg-red-600 text-white font-bold text-center py-3 px-4 flex items-center justify-between gap-2.5 animate-pulse text-xs sticky top-0 z-50 shadow-lg select-none">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>🚨 MODO DE PÂNICO ATIVADO!</span>
              </div>
              <button 
                onClick={() => setPanicAlertFired(false)}
                className="bg-black/30 text-[9px] px-2.5 py-1 rounded border border-white/20 uppercase hover:bg-black/50 transition font-mono"
              >
                Desarmar
              </button>
            </div>
          )}
 
          {/* Header section with subtle background and title */}
          <header 
            style={{ 
              backgroundImage: "url('https://static.prod-images.emergentagent.com/jobs/f577e4b6-39cc-4946-960f-a0deca389c9e/images/06aadcba47415d09700ed2fd4c5c707f81f7c6f88c0d0bb4c89b79774338c6f1.png')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
            className="border-b border-neutral-100 dark:border-zinc-800 relative p-4"
          >
            <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-[1px]" />
            <div className="relative z-10 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="bg-purple-700 text-white rounded-xl p-2.5 font-bold tracking-widest text-xs flex items-center justify-center shadow select-none shrink-0 font-mono">
                  S·O·S
                </div>
                <div>
                  <div className="flex items-center gap-1.5 align-middle">
                    <h1 className="text-base font-black tracking-tight text-neutral-950 dark:text-zinc-100 font-heading uppercase leading-none">
                      {lang === "pt" ? "Salva-me" : "Save Me"}
                    </h1>
                    {!isOnline && (
                      <span 
                        id="offline-badge" 
                        className="px-1.5 py-0.5 inline-flex items-center gap-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black animate-pulse select-none"
                      >
                        <WifiOff className="h-2 w-2" />
                        <span>OFFLINE</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] leading-tight text-purple-750 dark:text-purple-400 font-mono tracking-wider uppercase font-bold mt-0.5 max-w-[200px] min-[380px]:max-w-none">
                    {lang === "pt" ? "Respostas Táticas & Apoio Diário" : "Tactical Comebacks & Safe Haven"}
                  </p>
                </div>
              </div>
 
              <div className="flex flex-wrap items-center gap-1.5 min-[380px]:justify-end">
                {/* Simulated Call shortcut icon */}
                <button
                  onClick={() => setShowFakeCall(true)}
                  className="p-1.5 px-2 inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition duration-200 text-[11px] font-bold cursor-pointer"
                  title={lang === "pt" ? "Chamada de voz simulada para escapar" : "Simulated voice call to escape"}
                >
                  <Phone className="h-3 w-3" />
                  <span className="hidden min-[380px]:inline">{lang === "pt" ? "Simulador" : "Simulator"}</span>
                </button>

                {/* Theme Toggle Button */}
                <button
                  id="theme-toggle"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="p-1.5 px-2 rounded-lg border border-purple-200 dark:border-zinc-700 bg-purple-50 dark:bg-zinc-800 text-purple-700 dark:text-zinc-200 hover:bg-purple-100 dark:hover:bg-zinc-700 transition duration-200 text-[11px] font-black cursor-pointer flex items-center gap-1 shrink-0"
                  title={theme === "light" ? (lang === "pt" ? "Ativar Modo Escuro" : "Switch to Dark Mode") : (lang === "pt" ? "Ativar Modo Claro" : "Switch to Light Mode")}
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-3.5 w-3.5" />
                      <span className="hidden min-[380px]:inline uppercase text-[9.5px]">{lang === "pt" ? "Escuro" : "Dark"}</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5 animate-spin-slow" />
                      <span className="hidden min-[380px]:inline uppercase text-[9.5px]">{lang === "pt" ? "Claro" : "Light"}</span>
                    </>
                  )}
                </button>
 
                {/* Dynamic Language Toggle Selection */}
                <button
                  onClick={() => setLang(lang === "pt" ? "en" : "pt")}
                  className="p-1.5 px-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition duration-200 text-[11px] font-black cursor-pointer flex items-center gap-1 shrink-0"
                  title={lang === "pt" ? "Change interface layout to English" : "Traduzir a interface para Português"}
                >
                  <Languages className="h-3.5 w-3.5" />
                  <span className="hidden min-[380px]:inline uppercase text-[9.5px]">{lang}</span>
                </button>

                {/* Secure admin lock button */}
                <button
                  onClick={() => setActiveTab(activeTab === "admin" ? "responseCenter" : "admin")}
                  title={lang === "pt" ? "Painel de Moderação" : "Moderator Admin Area"}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    activeTab === "admin"
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-purple-750"
                  }`}
                >
                  <Unlock className="h-3 w-3" />
                </button>
              </div>
            </div>
          </header>

          {/* Main content area with layout padding */}
          <main className="p-4 space-y-4">
            
             {/* TAB 0: COMMUNITY STORIES HUB */}
            {activeTab === "communityStories" && (
              <div className="space-y-4">
                <CommunityStoriesPanel lang={lang} />
              </div>
            )}
            
            {/* TAB 1: RESPONSE CENTER (Mirroring Sexist Situations) */}
            {activeTab === "responseCenter" && (
              <SexistSituationPanel lang={lang} />
            )}

            {/* TAB 2: EMERGENCY SOS DISPATCH HUB */}
            {activeTab === "emergencyCenter" && (
              <div className="space-y-5">
                {/* Red Trigger Circle Box */}
                <div className="flex flex-col items-center justify-center p-5 border border-purple-100 bg-purple-50/30 rounded-3xl text-center">
                  <div className="mb-4">
                    <h2 className="text-base font-black tracking-tight text-neutral-900 mb-0.5 font-heading text-neutral-950">
                      Pânico Reativo Automático
                    </h2>
                    <p className="text-[11px] text-neutral-600 max-w-xs mx-auto leading-relaxed">
                      Toque para acionar sirenes de afugentamento ou programar tempo de envio de SMS aos seus protetores salvos.
                    </p>
                  </div>

                  {/* Delay timer picker */}
                  <div className="mb-5 w-full max-w-xs bg-neutral-50 border border-neutral-200 rounded-xl p-1 flex justify-around">
                    {[
                      { label: "0s (Imediato)", val: 0 },
                      { label: "3s", val: 3 },
                      { label: "5s", val: 5 }
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => {
                          if (!countdownActive) {
                            setPanicDelay(item.val as any);
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                          panicDelay === item.val
                            ? "bg-purple-700 text-white shadow"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Giant Glowing Red Trigger Icon */}
                  <div className="relative flex items-center justify-center h-48 w-48 select-none">
                    <div className="absolute inset-0 rounded-full bg-red-600/10 animate-ping" />
                    <div className="absolute inset-3 rounded-full bg-red-700/15 animate-pulse" />
                    
                    <button
                      onClick={triggerPanic}
                      disabled={countdownActive}
                      className="relative flex flex-col items-center justify-center h-36 w-36 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 border-4 border-white text-white shadow-xl transition transform hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-90"
                    >
                      <ShieldAlert className="h-8 w-8 text-white drop-shadow" />
                      <span className="text-xs font-black uppercase tracking-widest mt-1.5 font-heading">
                        SALVA-ME
                      </span>
                      <span className="text-[8px] text-red-105 text-red-100 mt-0.5 uppercase font-bold tracking-wider">
                        SOS PÂNICO
                      </span>
                    </button>
                  </div>
                </div>

                {/* Safety assistance directory & safety circle */}
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 font-mono block">
                      Autoridades Públicas & Apoio Nacional:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { number: "180", name: "Central de Apoio à Mulher", icon: "💜" },
                        { number: "190", name: "Polícia Militar", icon: "👮" },
                        { number: "192", name: "SAMU (Ambulância)", icon: "🚑" },
                        { number: "193", name: "Corpo de Bombeiros", icon: "🚒" }
                      ].map((chan) => (
                        <a
                          key={chan.number}
                          href={`tel:${chan.number}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-neutral-100/50 border border-neutral-200/80 transition text-neutral-900"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{chan.icon}</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-neutral-850 leading-none">{chan.name}</p>
                              <p className="text-[9px] text-neutral-500 mt-0.5">Ligação de voz gratuita</p>
                            </div>
                          </div>
                          <span className="rounded-lg bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-bold font-mono">
                            {chan.number}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Trusted contacts editor */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3 text-neutral-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 font-mono block text-left">
                      Meus Contatos de Cobertura:
                    </span>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                      {contacts.length === 0 ? (
                        <div className="text-center py-4 text-xs italic text-neutral-400 border border-dashed border-neutral-300 rounded-xl bg-white">
                          Nenhum protetor cadastrado.
                        </div>
                      ) : (
                        contacts.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-neutral-900"
                          >
                            <div className="space-y-0.5 text-left">
                              <p className="font-bold text-neutral-800 leading-none">{c.name}</p>
                              <p className="text-[10px] text-neutral-550">{c.relationship} • {c.phone}</p>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${c.phone}`}
                                className="rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 p-1.5 hover:text-purple-900 transition"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                className="rounded-lg bg-red-50 hover:bg-red-100 text-red-600 p-1.5 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Circle adding form */}
                    <form onSubmit={handleAddContact} className="space-y-2 bg-white p-3 rounded-xl border border-neutral-200 text-left">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          required
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="Nome protetor"
                          className="bg-neutral-50 text-xs rounded-lg px-2 py-1.5 border border-neutral-200 focus:outline-none focus:border-purple-600 text-neutral-900 placeholder-neutral-400 font-medium"
                        />
                        <input
                          type="text"
                          value={newContactRel}
                          onChange={(e) => setNewContactRel(e.target.value)}
                          placeholder="Grau de parentesco"
                          className="bg-neutral-50 text-xs rounded-lg px-2 py-1.5 border border-neutral-200 focus:outline-none focus:border-purple-600 text-neutral-900 placeholder-neutral-400 font-medium"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="tel"
                          required
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          placeholder="Telefone móvel com DDD"
                          className="flex-1 bg-neutral-50 text-xs rounded-lg px-2 py-1.5 border border-neutral-200 focus:outline-none focus:border-purple-600 text-neutral-900 placeholder-neutral-400 font-medium"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold p-1.5 px-3.5 transition flex items-center justify-center shrink-0 cursor-pointer text-xs"
                        >
                          Adicionar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Location updates & siren sirens */}
                <div className="grid grid-cols-1 gap-4">
                  <EmergencyTracker lang={lang} onLocationUpdate={(lat, lng) => setCoords({ lat, lng })} />
                  <SirenSection lang={lang} />
                </div>

                {/* Survival Safety Manual Guides */}
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3 text-neutral-900">
                  <div className="flex items-center gap-1.5 text-left">
                    <BookOpen className="h-4.5 w-4.5 text-purple-700" />
                    <h3 className="text-xs font-bold text-neutral-950 font-heading">
                      Manuais de Direção de Crise (Offline)
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    {SAFETY_GUIDES.map((guide) => {
                      const isExpanded = expandedGuideId === guide.id;
                      const gTitle = lang === "pt" ? guide.title : guide.englishTitle;
                      const gDesc = lang === "pt" ? guide.description : guide.englishDescription;
                      const gSteps = lang === "pt" ? guide.steps : guide.englishSteps;

                      return (
                        <div
                          key={guide.id}
                          className="rounded-xl border border-neutral-200 bg-white overflow-hidden text-xs"
                        >
                          <button
                            onClick={() => setExpandedGuideId(isExpanded ? null : guide.id)}
                            className="w-full text-left p-2.5 flex justify-between items-center hover:bg-neutral-50 transition"
                          >
                            <div className="space-y-0.5">
                              <p className="text-neutral-850 font-bold text-[11px]">{gTitle}</p>
                              <p className="text-[9px] text-neutral-500 font-medium">{gDesc}</p>
                            </div>
                            <span className="text-neutral-400 text-base font-bold select-none p-1">
                              {isExpanded ? "−" : "+"}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-1.5 text-left">
                              {gSteps.map((step, stepIdx) => (
                                <div key={stepIdx} className="flex gap-2 items-start text-neutral-700 leading-relaxed">
                                  <span className="font-mono text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold shrink-0 mt-0.5">
                                    {stepIdx + 1}
                                  </span>
                                  <p className="text-[10px]">{step}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI SAFETY CHAT ADVISOR */}
            {activeTab === "aiAdvisor" && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50/55 rounded-2xl border border-purple-100 space-y-1 text-left">
                  <span className="p-1 px-2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold font-mono tracking-wider uppercase">{lang === "pt" ? "ORIENTADORA VIRTUAL" : "VIRTUAL ADVISOR"}</span>
                  <h3 className="text-sm font-black text-neutral-950">{lang === "pt" ? "Inteligência Artificial de Diálogo" : "Dialogue Artificial Intelligence"}</h3>
                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    {lang === "pt"
                      ? "Nossa assessoria jurídica e psicológica simulada oferece resoluções inteligentes em tempo real. Discuta ocorrências ou tire as suas dúvidas livremente de forma segura."
                      : "Our simulated psychological and legal support offers smart live advisory. Check verbal suggestions or clear safety doubts freely."}
                  </p>
                </div>
                <AiAssistant lang={lang} coords={coords} />
              </div>
            )}

            {/* TAB 4: MODERATOR/ADMIN PANEL */}
            {activeTab === "admin" && (
              <div className="space-y-4 text-left">
                <div className="p-4 bg-purple-50/55 rounded-2xl border border-purple-100 space-y-1">
                  <span className="p-1 px-2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold font-mono tracking-wider uppercase">{lang === "pt" ? "ADMINISTRAÇÃO" : "ADMINISTRATION"}</span>
                  <h3 className="text-sm font-black text-neutral-950">{lang === "pt" ? "Portal do Conselho de Moderação" : "Council Board Management Portal"}</h3>
                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    {lang === "pt"
                      ? "Publique novos scripts de comebacks verbais machistas, revise denúncias, sincronize banco de dados locais e aprove cenários enviados pela rede."
                      : "Publish new custom anti-harassment scripts, check complaint flags, sync offline catalogs and manage suggested network contexts."}
                  </p>
                </div>
                <AdminPanel lang={lang} />
              </div>
            )}

          </main>
        </div>

        {/* HIGH-END STICKY BOTTOM NAVIGATION BAR */}
        <nav className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-neutral-100 dark:border-zinc-800 p-2 flex justify-around items-center z-40 shadow-inner">
          {[
            { id: "responseCenter", label: lang === "pt" ? "Respostas" : "Responses", icon: Compass },
            { id: "communityStories", label: lang === "pt" ? "Histórias" : "Stories", icon: Users },
            { id: "aiAdvisor", label: lang === "pt" ? "Assistente" : "Assistant", icon: MessageSquare },
            { id: "emergencyCenter", label: lang === "pt" ? "SOS Pânico" : "SOS Alarm", icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition duration-200 cursor-pointer transform active:scale-95 text-center shrink-0 ${
                  isSel 
                    ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 mb-1 ${isSel ? "scale-105" : ""}`} />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Simulated emergency buzzer/delay countdown details */}
        {countdownActive && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur p-6 text-center">
            <div className="max-w-xs space-y-6">
              <ShieldAlert className="mx-auto h-12 w-12 text-red-600 animate-bounce" />
              <div className="space-y-1">
                <h2 className="text-lg font-black text-neutral-950 dark:text-zinc-100 uppercase tracking-tight font-heading">
                  Disparo SOS Ativo
                </h2>
                <p className="text-xs text-neutral-600 dark:text-zinc-400 leading-relaxed">
                  Disparando avisos preventivos em tempo limitado. Toque em abortar para cancelar o sinal.
                </p>
              </div>

              <div className="font-mono text-5xl font-extrabold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-3xl h-28 w-28 flex items-center justify-center mx-auto animate-pulse">
                {secondsLeft}s
              </div>

              <button
                onClick={() => setCountdownActive(false)}
                className="w-full py-3 bg-neutral-900 dark:bg-zinc-800 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-neutral-950 dark:hover:bg-zinc-700 transition active:scale-95 cursor-pointer"
              >
                Abortar Transmissão
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Fully Functional Simulated Smartphone Caller Wrapper */}
      <FakeCallModal 
        isOpen={showFakeCall} 
        onClose={() => setShowFakeCall(false)} 
        lang={lang} 
      />
    </div>
  );
}
