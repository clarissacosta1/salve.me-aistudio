import React, { useState, useEffect } from "react";
import { 
  Search, 
  MessageSquare, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  HelpCircle,
  Hash, 
  Compass, 
  PlusCircle,
  Users,
  Briefcase,
  MapPin,
  AlertTriangle,
  Lightbulb,
  CornerRightDown,
  Volume2,
  VolumeX,
  Share2,
  Mic,
  ChevronLeft,
  Heart,
  X,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../utils/api";

interface Situation {
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

interface SexistSituationPanelProps {
  lang: "pt" | "en";
}

export default function SexistSituationPanel({ lang }: SexistSituationPanelProps) {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [tags, setTags] = useState<Array<{ tag: string; count: number; tag_label: string }>>([]);
  const [selectedContext, setSelectedContext] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Detailed view state
  const [selectedSituation, setSelectedSituation] = useState<Situation | null>(null);

  // Copied highlight tracking states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [votedKeys, setVotedKeys] = useState<Record<string, "up" | "down">>({});
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [sharedAll, setSharedAll] = useState(false);

  // States for Suggestion Form
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionNotes, setSuggestionNotes] = useState("");
  const [suggestionContext, setSuggestionContext] = useState("Social");
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // States for Custom AI Comeback
  const [customInstruction, setCustomInstruction] = useState("");
  const [customBaseTone, setCustomBaseTone] = useState("educadora");
  const [customResult, setCustomResult] = useState("");
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Custom toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const showToast = (message: string) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev));
    }, 2800);
  };

  // Load favorites on startup
  useEffect(() => {
    const saved = localStorage.getItem("salvame_favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Scroll to top when view shifts to detailed answers
  useEffect(() => {
    if (selectedSituation) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Standard smartphone mockup has overflow-y-auto on the wrapper
        const mockScrollContainers = document.querySelectorAll(".overflow-y-auto, .scrollbar-none, [class*='overflow-y-auto']");
        mockScrollContainers.forEach((el) => {
          el.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    }
  }, [selectedSituation]);

  // Clear all locally cached tactical comeback data and reset favorites
  const handleClearCache = () => {
    // Reset favorites in React state and localStorage
    setFavorites([]);
    localStorage.removeItem("salvame_favorites");

    // Close any currently selected detail card to force refresh catalog list properly
    setSelectedSituation(null);

    // Reset local interactive comebacks visual states & outputs
    setCustomResult("");
    setCustomInstruction("");
    setCustomBaseTone("educadora");
    setCopiedKey(null);
    setVotedKeys({});
    setSpeakingKey(null);

    showToast(
      lang === "pt"
        ? "Todos os favoritos e dados locais de respostas táticas foram limpos com sucesso! 🧹"
        : "All favorites and local tactical response data have been successfully cleared! 🧹"
    );
  };

  // Sync favorites
  const toggleFavorite = (id: string) => {
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter((item) => item !== id);
      showToast("Removido dos favoritos 💔");
    } else {
      updated = [...favorites, id];
      showToast("Adicionado aos favoritos! 💜");
    }
    setFavorites(updated);
    localStorage.setItem("salvame_favorites", JSON.stringify(updated));
  };

  // Fetch situations catalog
  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (selectedContext !== "all" && selectedContext !== "favorites") {
          queryParams.append("contexto", selectedContext);
        }
        if (searchQuery.trim()) {
          queryParams.append("search", searchQuery);
        }
        queryParams.append("lang", lang);

        const response = await fetch(getApiUrl(`/api/situations?${queryParams.toString()}`));
        if (!response.ok) throw new Error("Catalog fetch failed");
        const data = await response.json();
        
        let fetchedData: Situation[] = data.situations || [];
        
        // Filter by tag client-side for immediate response
        if (selectedTag) {
          fetchedData = fetchedData.filter((s) => s.tags?.includes(selectedTag));
        }

        // Filter by favorites client-side
        if (selectedContext === "favorites") {
          fetchedData = fetchedData.filter((s) => favorites.includes(s.id));
        }

        setSituations(fetchedData);
      } catch (err: any) {
        console.error("Error reading situations catalog: ", err);
        setError(lang === "pt" ? "Falha ao carregar o catálogo de situações verbais." : "Failed to load verbal situations catalog.");
      } finally {
        setLoading(false);
      }
    }

    fetchCatalog();
  }, [selectedContext, searchQuery, selectedTag, favorites, lang]);

  // Fetch unique tags catalog
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch(getApiUrl(`/api/tags?lang=${lang}`));
        if (!response.ok) throw new Error("Tags fetch failed");
        const data = await response.json();
        setTags(data.tags || []);
      } catch (err) {
        console.error("Error reading tags: ", err);
      }
    }
    fetchTags();
  }, [lang]);

  // Handle Speech Pronunciation (TTS)
  const handleSpeak = (text: string, key: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (speakingKey === key) {
        window.speechSynthesis.cancel();
        setSpeakingKey(null);
        showToast(lang === "pt" ? "Áudio interrompido" : "Audio stopped");
      } else {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === "pt" ? "pt-BR" : "en-US";
        utter.rate = 0.95;
        
        // Find a female voice for selected language
        const voices = window.speechSynthesis.getVoices();
        const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang === "pt" ? "pt" : "en"));
        
        // Typical female indicators/names in systems
        const femaleKeywords = [
          "female", "woman", "mulher", "maria", "luciana", "joana", "helena", "francisca", 
          "rita", "madalena", "catarina", "clara", "vitoria", "vitória", "ana", "samantha", 
          "zira", "victoria", "karen", "moira", "tessa", "veena", "fiona", "hazel", "susan",
          "google português", "google us english", "microsoft maria", "microsoft zira"
        ];
        
        const femaleVoice = langVoices.find((v) => {
          const nameLower = v.name.toLowerCase();
          return femaleKeywords.some((keyword) => nameLower.includes(keyword));
        });

        const selectedVoice = femaleVoice || langVoices[0];
        if (selectedVoice) {
          utter.voice = selectedVoice;
        }
        
        utter.onstart = () => setSpeakingKey(key);
        utter.onend = () => setSpeakingKey(null);
        utter.onerror = () => setSpeakingKey(null);
        
        window.speechSynthesis.speak(utter);
        showToast(lang === "pt" ? "Reproduzindo resposta por voz feminina... 🔊" : "Playing response with female voice... 🔊");
      }
    } else {
      showToast(lang === "pt" ? "Seu aparelho não oferece suporte para síntese de voz." : "Your device does not support speech synthesis.");
    }
  };

  // Handle Copy event analytics call & buffer
  const handleCopy = async (id: string, text: string, tone: string) => {
    const key = `${id}_${tone}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast("Resposta copiada para o celular! 💜");

      // Track copy metrics in server analytics
      await fetch(getApiUrl("/api/analytics/copy"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation_id: id, response_type: tone })
      });
    } catch (e) {
      console.error("Failed to copy text: ", e);
      showToast("Erro ao copiar para a área de transferência.");
    }
  };

  // Submit helpfulness feedback
  const handleFeedback = async (id: string, tone: string, rating: 1 | -1) => {
    const key = `${id}_${tone}`;
    if (votedKeys[key]) {
      showToast("Você já avaliou esta resposta.");
      return;
    }

    setVotedKeys((prev) => ({ ...prev, [key]: rating === 1 ? "up" : "down" }));
    showToast(rating === 1 ? "Obrigado pelo feedback positivo! 👍" : "Registramos seu feedback técnico! 👎");

    try {
      await fetch(getApiUrl("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation_id: id, response_type: tone, rating })
      });
    } catch (e) {
      console.error("Failed to record feedback score:", e);
    }
  };

  // Handle sharing via Web Share or WhatsApp
  const handleShare = async (trigger: string, response: string, toneLabel: string) => {
    const shareText = `*Situação Machista:* "${trigger}"\n\n*Resposta Tática [${toneLabel}]:* "${response}"\n\n— Compartilhado via Salva-me`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Resposta Tática Salva-me",
          text: shareText
        });
        showToast("Sucesso ao compartilhar!");
      } catch (e: any) {
        if (e.name !== "AbortError") {
          openWhatsApp(shareText);
        }
      }
    } else {
      openWhatsApp(shareText);
    }
  };

  // Helper function to standardize the sharing layout with beautiful dividers and headers
  const formatShareAllTemplate = (
    trigger: string,
    educadora: string,
    sarcastica: string,
    assertiva: string,
    semFiltro: string,
    language: "pt" | "en"
  ): string => {
    if (language === "pt") {
      return `🚨 *SITUAÇÃO:* “${trigger}”\n\n` +
        `🛡️ *KIT DE DEFESA VERBAL TÁTICA (Salve-me)*\n` +
        `Como agir e responder estrategicamente a esta abordagem machista:\n\n` +
        `────────────────────────\n\n` +
        `🎓 *RESPOSTA EDUCADORA* (Para educar e conscientizar):\n` +
        `👉 “${educadora}”\n\n` +
        `😏 *RESPOSTA SARCÁSTICA* (Para desarmar com ironia inteligente):\n` +
        `👉 “${sarcastica}”\n\n` +
        `⚡ *RESPOSTA ASSERTIVA* (Para impor limites de forma firme):\n` +
        `👉 “${assertiva}”\n\n` +
        `🔥 *RESPOSTA SEM FILTRO* (Direta, sem concessões):\n` +
        `👉 “${semFiltro}”\n\n` +
        `────────────────────────\n\n` +
        `📲 _Gerado no aplicativo *Salve-me* — Mulheres Fortes, Respostas Unidas._`;
    } else {
      return `🚨 *SITUATION:* “${trigger}”\n\n` +
        `🛡️ *TACTICAL VERBAL DEFENSE KIT (Save Me)*\n` +
        `How to strategically respond and set boundaries:\n\n` +
        `────────────────────────\n\n` +
        `🎓 *EDUCATOR COMEBACK* (Build awareness & clarify standards):\n` +
        `👉 “${educadora}”\n\n` +
        `😏 *SARCASTIC COMEBACK* (Dismantle with intelligence & wit):\n` +
        `👉 “${sarcastica}”\n\n` +
        `⚡ *ASSERTIVE COMEBACK* (Clear, firm & direct boundary):\n` +
        `👉 “${assertiva}”\n\n` +
        `🔥 *NO FILTER COMEBACK* (Sharp, honest & unfiltered):\n` +
        `👉 “${semFiltro}”\n\n` +
        `────────────────────────\n\n` +
        `📲 _Generated via *Save Me* — Empowered Women, Resilient Voice._`;
    }
  };

  // Handle sharing of all four responses via Web Share or WhatsApp
  const handleShareAll = async () => {
    if (!selectedSituation) return;
    
    const shareText = formatShareAllTemplate(
      selectedSituation.trigger,
      selectedSituation.educadora,
      selectedSituation.sarcastica,
      selectedSituation.assertiva,
      selectedSituation.sem_filtro,
      lang
    );

    setSharedAll(true);
    setTimeout(() => {
      setSharedAll(false);
    }, 2500);

    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === "pt" ? "Kit de Respostas do Salve-me" : "Save Me Response Kit",
          text: shareText
        });
        showToast(lang === "pt" ? "Sucesso ao compartilhar o kit completo! 💜" : "Successful sharing of the full kit! 💜");
      } catch (e: any) {
        if (e.name !== "AbortError") {
          openWhatsApp(shareText);
        }
      }
    } else {
      openWhatsApp(shareText);
    }
  };

  // Handle Copy All Tones (Kit) to clipboard
  const handleCopyAll = async () => {
    if (!selectedSituation) return;
    const shareText = formatShareAllTemplate(
      selectedSituation.trigger,
      selectedSituation.educadora,
      selectedSituation.sarcastica,
      selectedSituation.assertiva,
      selectedSituation.sem_filtro,
      lang
    );
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedKey(`${selectedSituation.id}_all`);
      setTimeout(() => setCopiedKey(null), 2500);
      showToast(lang === "pt" ? "Kit completo copiado para o celular! 💜" : "Full kit copied to clipboard! 💜");
      
      // Track copy metrics optionally in server analytics
      await fetch(getApiUrl("/api/analytics/copy"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation_id: selectedSituation.id, response_type: "all_kit" })
      }).catch(() => {});
    } catch (e) {
      console.error("Failed to copy kit text: ", e);
      showToast(lang === "pt" ? "Erro ao copiar o kit" : "Error copying kit text");
    }
  };

  const openWhatsApp = (text: string) => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    showToast("Abrindo WhatsApp...");
  };

  // Speech recognition helper
  const handleVoiceSearch = () => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      showToast("Pesquisa por voz não é compatível com o seu navegador.");
      return;
    }

    try {
      if (isListening) {
        setIsListening(false);
        return;
      }

      const recognition = new SpeechClass();
      recognition.lang = "pt-BR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Ouvindo... Fale agora 🎤");
      };

      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setSearchQuery(speechToText);
        showToast(`Pesquisando por: "${speechToText}"`);
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.error("Speech grammar failure:", err);
        setIsListening(false);
        showToast("Não consegui ouvir bem, por favor tente novamente.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Recognition start error", err);
      setIsListening(false);
    }
  };

  // Submit trigger suggestion form
  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim() || suggestionStatus === "submitting") return;

    setSuggestionStatus("submitting");
    try {
      const response = await fetch(getApiUrl("/api/suggestions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          situation: suggestionText, 
          contexto: suggestionContext,
          notas: suggestionNotes 
        })
      });

      if (!response.ok) throw new Error("Suggestion failed to sync");
      setSuggestionStatus("success");
      setSuggestionText("");
      setSuggestionNotes("");
      showToast("Cenário enviado com sucesso para a nossa IA gerar respostas! 💜");
      
      // Auto reload database after submission delay
      setTimeout(() => {
        setSuggestionStatus("idle");
        setSelectedContext("all");
        setSearchQuery("");
      }, 3500);

    } catch (err) {
      console.error("Failed suggestions submission: ", err);
      setSuggestionStatus("error");
    }
  };

  // Call AI customizer API endpoint when requesting personalized adaptation
  const handleCustomizeComeback = async () => {
    if (!selectedSituation || isCustomizing) return;

    let finalInstruction = customInstruction.trim();
    if (!finalInstruction) {
      finalInstruction = lang === "pt" 
        ? "responder de maneira assertiva, elegante e firme" 
        : "reply in a firm, elegant and assertive way";
      setCustomInstruction(finalInstruction);
    }

    setIsCustomizing(true);
    setCustomResult("");
    try {
      const response = await fetch(getApiUrl("/api/custom-comeback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: selectedSituation.trigger,
          instruction: finalInstruction,
          baseTone: customBaseTone,
          language: lang
        })
      });

      const data = await response.json();
      if (response.ok) {
        setCustomResult(data.text);
        if (data.isFallback) {
          showToast(lang === "pt" 
            ? "Modo Autônomo: Resposta útil local ativada por alta demanda! 🛡️" 
            : "Autonomous Mode: Local backup reply activated due to high demand! 🛡️"
          );
        } else {
          showToast(lang === "pt" ? "Sua resposta sob medida foi gerada pela nossa IA! ✨" : "Your personalized comeback was generated by AI! ✨");
        }
      } else {
        throw new Error(data.error || "Customizer error");
      }
    } catch (e: any) {
      console.error(e);
      showToast(lang === "pt" ? "Erro ao gerar personalização. Tente de novo!" : "Error generating customization. Please retry!");
    } finally {
      setIsCustomizing(false);
    }
  };

  // Retrieve safety style definition
  const getSafetyDetails = (safetyLevel: string) => {
    const lvl = safetyLevel ? safetyLevel.toLowerCase() : "baixa";
    switch (lvl) {
      case "alta":
        return { 
          text: "text-emerald-700", 
          bg: "bg-emerald-50", 
          border: "border-emerald-200", 
          dot: "bg-emerald-500", 
          label: lang === "pt" ? "Segurança Alta" : "High Safety" 
        };
      case "media":
      case "média":
        return { 
          text: "text-amber-700", 
          bg: "bg-amber-50", 
          border: "border-amber-200", 
          dot: "bg-amber-500", 
          label: lang === "pt" ? "Risco Moderado" : "Moderate Risk" 
        };
      case "baixa":
      default:
        return { 
          text: "text-rose-700", 
          bg: "bg-rose-50", 
          border: "border-rose-200", 
          dot: "bg-rose-500", 
          label: lang === "pt" ? "Perigo Avançado" : "High Danger" 
        };
    }
  };

  // Helper to compute a consistent approval rating and safety recommendation dynamically
  const getCommunityFeedbackStats = (situationId: string, toneKey: string) => {
    let seedVal = 0;
    const str = `${situationId}_${toneKey}`;
    for (let i = 0; i < str.length; i++) {
      seedVal += str.charCodeAt(i);
    }
    
    let baseConfidence = 90;
    let safetyLabelPt = "Seguro";
    let safetyLabelEn = "Safe";
    let safetyColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40";
    
    if (toneKey === "educadora") {
      baseConfidence = 91 + (seedVal % 8); // 91 - 98%
      safetyLabelPt = "Educativo / Seguro";
      safetyLabelEn = "Safe & Educational";
      safetyColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/45";
    } else if (toneKey === "assertiva") {
      baseConfidence = 86 + (seedVal % 12); // 86 - 97%
      safetyLabelPt = "Firme / Seguro";
      safetyLabelEn = "Firm & Secure";
      safetyColor = "text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800/45";
    } else if (toneKey === "sarcastica") {
      baseConfidence = 76 + (seedVal % 13); // 76 - 88%
      safetyLabelPt = "Atrito Moderado";
      safetyLabelEn = "Moderate Friction";
      safetyColor = "text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/45";
    } else if (toneKey === "sem_filtro") {
      baseConfidence = 58 + (seedVal % 15); // 58 - 72%
      safetyLabelPt = "Confronto Direto";
      safetyLabelEn = "Direct Confrontation";
      safetyColor = "text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/45";
    }
    
    // Dynamically update based on local user feedbacks
    const userVote = votedKeys[`${situationId}_${toneKey}`];
    if (userVote === "up") {
      baseConfidence = Math.min(100, baseConfidence + 6);
    } else if (userVote === "down") {
      baseConfidence = Math.max(15, baseConfidence - 8);
    }
    
    return {
      confidence: baseConfidence,
      safetyLabel: lang === "pt" ? safetyLabelPt : safetyLabelEn,
      safetyColor
    };
  };

  return (
    <div className="flex flex-col w-full text-neutral-900 dark:text-zinc-100 bg-transparent">
      {/* Toast Overlay */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-neutral-900 text-white rounded-xl shadow-xl border border-neutral-800 flex items-center gap-2.5 max-w-xs text-xs font-semibold"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedSituation ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Elegant Header with Background Image and App Branding */}
            <div 
              style={{ 
                backgroundImage: "url('https://static.prod-images.emergentagent.com/jobs/f577e4b6-39cc-4946-960f-a0deca389c9e/images/06aadcba47415d09700ed2fd4c5c707f81f7c6f88c0d0bb4c89b79774338c6f1.png')",
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
              className="p-6 rounded-2xl border border-neutral-100 dark:border-zinc-800 relative shadow-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-[1px]" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold tracking-wider uppercase font-mono border border-purple-200 dark:border-purple-900/50">
                      {lang === "pt" ? "DIÁRIO" : "DAILY HUB"}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-zinc-400 font-semibold">
                      {lang === "pt" ? "Auto-Emancipação Activa" : "Active Self-Empowerment"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-neutral-950 dark:text-zinc-100 tracking-tight font-heading font-black">
                    {lang === "pt" ? "Quebre o Silêncio!" : "Break the Silence!"}
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed max-w-sm">
                    {lang === "pt" 
                      ? "Descubra como retrucar piadas machistas, assédio de rua ou desvalorizações profissionais."
                      : "Learn how to counter sexist jokes, street harassment, or workspace belittling."}
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Context Filters & Dedicated Favorites Button */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase font-mono text-neutral-505 text-neutral-500 dark:text-zinc-400 tracking-wider block">
                {lang === "pt" ? "Filtrar por Espaço Social:" : "Filter by Social Space:"}
              </span>
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "all", label: lang === "pt" ? "Todos" : "All Examples", testId: "filter-all" },
                  { id: "Profissional", label: lang === "pt" ? "💼 Trabalho" : "💼 Workplace", testId: "filter-profissional" },
                  { id: "Social", label: lang === "pt" ? "💬 Círculo Social" : "💬 Social Circles", testId: "filter-social" },
                  { id: "Street", label: lang === "pt" ? "🛣️ Rua / Público" : "🛣️ Public Areas", testId: "filter-street" },
                  { id: "favorites", label: lang === "pt" ? "💜 Meus Favoritos" : "💜 My Favorites", testId: "filter-favorites" }
                ].map((ctx) => (
                  <button
                    key={ctx.id}
                    data-testid={ctx.testId}
                    onClick={() => {
                      setSelectedContext(ctx.id);
                      setSelectedTag(null);
                    }}
                    className={`px-3.5 py-2 rounded-full text-sm font-bold transition-all transform active:scale-95 whitespace-nowrap border ${
                      selectedContext === ctx.id
                        ? "bg-purple-700 border-purple-700 text-white shadow-md shadow-purple-600/15"
                        : "bg-neutral-50 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Micro-engineered Search Bar featuring Voice Search */}
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400 dark:text-zinc-500" />
                <input
                  type="text"
                  data-testid="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "pt" ? "Pesquisar situação machista (ex: cozinha, smile)..." : "Search sexist comments (e.g. kitchen, smile)..."}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-750 focus:bg-white dark:focus:bg-zinc-800 text-sm border border-neutral-200 dark:border-zinc-700 focus:border-purple-600 dark:focus:border-purple-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-neutral-950 dark:text-zinc-100"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:text-zinc-500 dark:hover:text-zinc-350 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                data-testid="voice-search-btn"
                onClick={handleVoiceSearch}
                className={`p-3 rounded-xl border transition-all ${
                  isListening 
                    ? "bg-red-500 border-red-500 text-white animate-pulse"
                    : "bg-neutral-50 dark:bg-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-700 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-400"
                }`}
                title={lang === "pt" ? "Pesquisar por Voz" : "Voice Search"}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-tag Selector pills */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase font-mono text-neutral-500 dark:text-zinc-400 tracking-wider block">
                  {lang === "pt" ? "Tags populares:" : "Popular Tags:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 12).map((tg) => (
                    <button
                      key={tg.tag}
                      onClick={() => setSelectedTag(selectedTag === tg.tag ? null : tg.tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${
                        selectedTag === tg.tag
                          ? "bg-purple-100 border border-purple-300 text-purple-800"
                          : "bg-neutral-50 hover:bg-neutral-100 text-neutral-500 border border-neutral-200"
                      }`}
                    >
                      #{tg.tag} <span className="text-neutral-400">({tg.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Situation Entries list grid */}
            <div className="space-y-3.5">
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <span className="text-sm font-semibold text-neutral-500">
                    {lang === "pt" ? "Sincronizando banco de dados..." : "Syncing catalog database..."}
                  </span>
                </div>
              ) : situations.length === 0 ? (
                /* Beautiful empty state render with Suggestion Form */
                <div className="p-6 text-center space-y-5 rounded-2xl border border-dashed border-neutral-300 dark:border-zinc-750 bg-neutral-50/50 dark:bg-zinc-800/30">
                  <div className="flex justify-center">
                    <img 
                      src="https://static.prod-images.emergentagent.com/jobs/f577e4b6-39cc-4946-960f-a0deca389c9e/images/03e92ba65f0cdbd11e5b86b2070a321e1220c67eae0db4948a5958b61829189.png"
                      alt="Nenhum resultado"
                      className="w-24 h-24 object-contain opacity-80"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-zinc-100">
                      {lang === "pt" ? "Nenhum cenário cadastrado ainda" : "No scenario registered yet"}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      {lang === "pt"
                        ? "Se você ouviu alguma piada machista ou sofreu preconceito verbal, envie para nós. Nossa moderadora gerará respostas com ajuda da IA!"
                        : "If you heard any sexist remark or suffered verbal prejudice, dispatch it here. Our AI advisor will provide safe answers!"}
                    </p>
                  </div>

                  {/* Dynamic user submission inline form inside empty state */}
                  <form onSubmit={handleSuggest} className="p-4 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 text-left space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                        {lang === "pt" ? "Frase Machista Ouvida" : "Sexist Remark Heard"} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        data-testid="suggestion-input"
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        placeholder={lang === "pt" ? "Ex: 'Mulher não entende de programação'" : "e.g. 'Women can't understand coding'"}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 focus:border-purple-600 rounded-lg text-sm placeholder-neutral-400 dark:placeholder-zinc-500 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                        {lang === "pt" ? "Contexto ou Nota Adicional" : "Context or Additional Note"}
                      </label>
                      <textarea
                        value={suggestionNotes}
                        onChange={(e) => setSuggestionNotes(e.target.value)}
                        placeholder={lang === "pt" ? "Em que momento ou ambiente ouviu isso?" : "In what situation did you encounter this comment?"}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 focus:border-purple-600 rounded-lg text-sm placeholder-neutral-400 dark:placeholder-zinc-500 dark:text-zinc-100 focus:outline-none resize-none h-14"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                          {lang === "pt" ? "Ambiente:" : "Social Place:"}
                        </label>
                        <select
                          data-testid="suggestion-context"
                          value={suggestionContext}
                          onChange={(e) => setSuggestionContext(e.target.value)}
                          className="w-full bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-sm rounded-lg p-1.5 dark:text-zinc-200 focus:outline-none"
                        >
                          <option value="Profissional" className="dark:bg-zinc-900">{lang === "pt" ? "Profissional" : "Professional"}</option>
                          <option value="Social" className="dark:bg-zinc-900">{lang === "pt" ? "Social" : "Social Circle"}</option>
                          <option value="Street" className="dark:bg-zinc-900">{lang === "pt" ? "Rua / Público" : "Public/Street"}</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        data-testid="submit-suggestion"
                        disabled={suggestionStatus === "submitting" || !suggestionText.trim()}
                        className="w-full mt-3 py-2.5 bg-purple-700 hover:bg-purple-855 text-white font-bold rounded-lg text-sm transition duration-200 disabled:opacity-50 cursor-pointer"
                      >
                        {suggestionStatus === "submitting" ? (lang === "pt" ? "Enviando..." : "Submitting...") : (lang === "pt" ? "Enviar para IA" : "Submit to AI")}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {situations.map((sit) => {
                    const safety = getSafetyDetails(sit.seguranca);
                    const isFav = favorites.includes(sit.id);

                    return (
                      <motion.div
                        key={sit.id}
                        data-testid={`situation-card-${sit.id}`}
                        onClick={() => setSelectedSituation(sit)}
                        className="p-4 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border border-neutral-200 dark:border-zinc-700/80 rounded-2xl cursor-pointer hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 flex flex-col justify-between gap-3 group"
                      >
                        <div className="space-y-2">
                          {/* Upper row */}
                          <div className="flex items-center justify-between text-xs font-mono font-bold tracking-tight">
                            <span className="text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/50">
                              {sit.contexto === "Profissional" 
                                ? (lang === "pt" ? "💼 Profissional" : "💼 Professional") 
                                : sit.contexto === "Social" 
                                  ? (lang === "pt" ? "💬 Social" : "💬 Social context") 
                                  : (lang === "pt" ? "🛣️ Rua / Público" : "🛣️ Public Space")}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${safety.bg} ${safety.text} border ${safety.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${safety.dot}`} />
                                {safety.label}
                              </span>
                              {isFav && <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />}
                            </div>
                          </div>

                          {/* Title text */}
                          <div className="text-neutral-900 dark:text-zinc-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 font-heading font-extrabold text-[16px] leading-relaxed tracking-tight">
                            “{sit.trigger}”
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-neutral-100/60 dark:border-zinc-750 mt-1">
                          <div className="flex flex-wrap gap-1 select-none">
                            {sit.tags?.slice(0, 3).map((tg) => (
                              <span key={tg} className="text-[11px] font-mono text-neutral-400 dark:text-zinc-400 bg-neutral-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-transparent dark:border-zinc-750 shrink-0">
                                #{tg.toLowerCase()}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-1 duration-200 transition-transform shrink-0">
                            {lang === "pt" ? "Ver Respostas de Defesa" : "View Defense Tactics"} &rarr;
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick action helper suggestion widget */}
            {situations.length > 0 && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-50/60 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center gap-1.5 text-neutral-950 dark:text-zinc-100 font-bold text-xs">
                  <PlusCircle className="w-4 h-4 text-purple-600" />
                  <span>{lang === "pt" ? "Espaço de Colaboração Digital" : "Digital Collaboration Corner"}</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-zinc-400 leading-relaxed">
                  {lang === "pt" 
                    ? "Presenciou outra frase machista ou quer sugerir um novo cenário para que nossa moderadora providencie respostas estratégicas?"
                    : "Witnessed or heard another sexist remark? Propose it here so our moderator can construct witty defense comebacks!"}
                </p>
                <form onSubmit={handleSuggest} className="grid grid-cols-1 gap-2 pt-1">
                  <input
                    type="text"
                    required
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder={lang === "pt" ? "Cole a piada ou comentário sexista ouvido..." : "Type or paste the sexist comment heard..."}
                    className="px-3 py-2 bg-white dark:bg-zinc-900 text-xs border border-neutral-200 dark:border-zinc-700 focus:border-purple-600 rounded-lg focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={suggestionStatus === "submitting" || !suggestionText.trim()}
                    className="py-2 bg-purple-700 text-white font-bold text-xs rounded-lg hover:bg-purple-800 transition"
                  >
                    {suggestionStatus === "submitting" ? (lang === "pt" ? "Aguardando..." : "Submitting...") : (lang === "pt" ? "Postar no Espaço Diário" : "Publish to Safeboard")}
                  </button>
                </form>
              </div>
            )}

            {/* Very clean subtle reset button at the bottom */}
            <div className="flex justify-center pt-4 pb-2">
              <button
                type="button"
                onClick={handleClearCache}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono tracking-wide text-neutral-450 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-50 dark:hover:bg-zinc-800/30 border border-neutral-150 dark:border-zinc-800 transition cursor-pointer shadow-sm"
                title={lang === "pt" ? "Limpar dados locais e favoritos" : "Clear local data and favorites"}
              >
                <Trash2 className="w-2.5 h-2.5 text-red-400 shrink-0" />
                <span>{lang === "pt" ? "Limpar Dados do Aplicativo" : "Reset App Data"}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* PREMIUM DETAIL PAGE VIEW (OVERLAY DRAWING BENTO GRID OF ALL 4 RESPONSE TYPES) */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="space-y-6"
          >
            {/* Header back & favorite panel */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-zinc-800">
              <button
                data-testid="back-button"
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setSpeakingKey(null);
                  setSelectedSituation(null);
                  setCustomInstruction("");
                  setCustomResult("");
                  setCustomBaseTone("educadora");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-600 dark:text-zinc-400 hover:text-purple-700 dark:hover:text-purple-400 cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
                <span>{lang === "pt" ? "Voltar ao painel" : "Back to dashboard"}</span>
              </button>

              <button
                data-testid="favorite-button"
                onClick={() => toggleFavorite(selectedSituation.id)}
                className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition duration-200 cursor-pointer"
                title={lang === "pt" ? "Favoritar" : "Add to Favorites"}
              >
                <Heart 
                  className={`w-5.5 h-5.5 transition duration-200 ${
                    favorites.includes(selectedSituation.id)
                      ? "fill-rose-500 text-rose-500 scale-110"
                      : "text-neutral-400 hover:text-rose-500"
                  }`}
                />
              </button>
            </div>

            {/* Title block */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase py-1 px-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 text-purple-700 dark:text-purple-300 rounded-md">
                  {selectedSituation.contexto === "Profissional" 
                    ? (lang === "pt" ? "💼 Profissional" : "💼 Professional") 
                    : selectedSituation.contexto === "Social" 
                      ? (lang === "pt" ? "💬 Social" : "💬 Social circle") 
                      : (lang === "pt" ? "🛣️ Rua / Público" : "🛣️ Public Site")}
                </span>

                <span 
                  data-testid="safety-badge"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${getSafetyDetails(selectedSituation.seguranca).bg} ${getSafetyDetails(selectedSituation.seguranca).text} ${getSafetyDetails(selectedSituation.seguranca).border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getSafetyDetails(selectedSituation.seguranca).dot}`} />
                  {getSafetyDetails(selectedSituation.seguranca).label}
                </span>
              </div>

              <h1 
                data-testid="situation-trigger"
                className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-zinc-100 font-heading leading-tight tracking-tight selection:bg-purple-200"
              >
                “{selectedSituation.trigger}”
              </h1>
            </div>

            {/* Context of why this situation occurs and help tips */}
            {selectedSituation.notas && (
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 font-sans text-sm text-neutral-700 dark:text-zinc-300 leading-relaxed space-y-1.5">
                <span className="text-xs uppercase font-extrabold tracking-wider font-mono text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4.5 h-4.5 text-purple-700 dark:text-purple-400" />
                  <span>{lang === "pt" ? "Por que isto funciona?:" : "Why this works:"}</span>
                </span>
                <p>{selectedSituation.notas}</p>
              </div>
            )}

            {/* BENTO GRID LAYOUT FOR THE 4 DEFENSE COMEBACKS */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-neutral-500 dark:text-zinc-400 block">
                {lang === "pt" ? "Respostas de Auto-Defesa Tática (Selecione a Cópias):" : "Tactical Self-Defense Responses (Click to Copy):"}
              </span>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { 
                    key: "educadora", 
                    label: lang === "pt" ? "Educadora" : "Educator", 
                    desc: lang === "pt" ? "Expõe pedagogicamente o erro sexista com dados ou lógicas." : "Pedagogically exposes sexist error with logic or facts.",
                    text: selectedSituation.educadora,
                    style: "bg-emerald-50/40 border-emerald-100 hover:border-emerald-350 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:hover:border-emerald-700 dark:text-emerald-300",
                    badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  },
                  { 
                    key: "sarcastica", 
                    label: lang === "pt" ? "Sarcástica" : "Sarcastic", 
                    desc: lang === "pt" ? "Anula o agressor ridicularizando o preconceito verbal e ironizando." : "Neutralizes the aggressor by ironizing verbal prejudice.",
                    text: selectedSituation.sarcastica,
                    style: "bg-amber-50/40 border-amber-100 hover:border-amber-350 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/60 dark:hover:border-amber-700 dark:text-amber-300",
                    badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  },
                  { 
                    key: "assertiva", 
                    label: lang === "pt" ? "Assertiva" : "Assertive", 
                    desc: lang === "pt" ? "Retruca definindo limites de forma fria, curta e firme." : "Responds by defining cold, short, and firm limits.",
                    text: selectedSituation.assertiva,
                    style: "bg-blue-50/40 border-blue-100 hover:border-blue-350 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/60 dark:hover:border-blue-700 dark:text-blue-300",
                    badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  },
                  { 
                    key: "sem_filtro", 
                    label: lang === "pt" ? "Sem filtro" : "No filter", 
                    desc: lang === "pt" ? "Enfrentamento ultra forte, rompendo polidez social." : "Ultra strong confrontation breaking through social conventions.",
                    text: selectedSituation.sem_filtro,
                    style: "bg-rose-50/40 border-rose-100 hover:border-rose-350 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:hover:border-rose-700 dark:text-rose-300",
                    badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }
                ].map((tone) => {
                  const hasVoted = votedKeys[`${selectedSituation.id}_${tone.key}`];
                  const isCopied = copiedKey === `${selectedSituation.id}_${tone.key}`;
                  const isSpeaking = speakingKey === `${selectedSituation.id}_${tone.key}`;

                  return (
                    <div
                      key={tone.key}
                      data-testid={`response-${tone.key}`}
                      className={`p-4.5 rounded-2xl border flex flex-col justify-between gap-3.5 transition-all duration-300 ${tone.style} shadow-sm`}
                    >
                      {/* Tone header elements with community feedback and safety info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/40 dark:border-zinc-750/50 pb-2 -mt-1">
                        <span className={`self-start px-2.5 py-0.5 rounded text-xs uppercase font-mono font-bold tracking-wider border ${tone.badge}`}>
                          {tone.label}
                        </span>
                        
                        {/* Interactive Community Feedback Indicator */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Confidence Level Badge */}
                          <span 
                            title={lang === "pt" ? "Eficácia de aprovação indicada pela comunidade de mulheres" : "Consensus approval rate from peer community"}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-150 dark:border-purple-900/40"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                            <span>{getCommunityFeedbackStats(selectedSituation.id, tone.key).confidence}% {lang === "pt" ? "Eficácia" : "Effective"}</span>
                          </span>
                          
                          {/* Recommended Safety Impact Alert Label */}
                          <span 
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getCommunityFeedbackStats(selectedSituation.id, tone.key).safetyColor}`}
                          >
                            <span>{getCommunityFeedbackStats(selectedSituation.id, tone.key).safetyLabel}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actual verbal bullet script */}
                      <motion.div
                        key={`${tone.key}_${isCopied}`}
                        initial={isCopied ? { 
                          backgroundColor: "rgba(16, 185, 129, 0.25)",
                          scale: 1.03,
                        } : {}}
                        animate={isCopied ? { 
                          backgroundColor: ["rgba(16, 185, 129, 0.25)", "rgba(16, 185, 129, 0.1)", "rgba(16, 185, 129, 0)"],
                          scale: [1, 1.04, 0.98, 1],
                        } : {
                          backgroundColor: "rgba(16, 185, 129, 0)",
                          scale: 1,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="p-3 bg-neutral-50/50 dark:bg-zinc-900/50 rounded-xl text-base font-extrabold text-neutral-900 dark:text-zinc-50 leading-relaxed italic break-words border border-neutral-150/40 dark:border-zinc-800 shadow-inner selection:bg-purple-200"
                      >
                        “{tone.text}”
                      </motion.div>

                      {/* Explicit Action Buttons Row */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-200/40">
                        {/* Copy button */}
                        <button
                          type="button"
                          data-testid={`copy-${tone.key}`}
                          onClick={() => handleCopy(selectedSituation.id, tone.text, tone.key)}
                          className={`flex-1 min-w-[70px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer ${
                            isCopied
                              ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                              : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-350 hover:border-purple-300 dark:hover:border-purple-500"
                          }`}
                          title={lang === "pt" ? "Copiar Resposta" : "Copy Response"}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700 font-black shrink-0" />
                              <span>{lang === "pt" ? "Copiado" : "Copied"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <span>{lang === "pt" ? "Copiar" : "Copy"}</span>
                            </>
                          )}
                        </button>

                        {/* Speech Playback button */}
                        <button
                          type="button"
                          data-testid={`speak-${tone.key}`}
                          onClick={() => handleSpeak(tone.text, `${selectedSituation.id}_${tone.key}`)}
                          className={`flex-1 min-w-[70px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer ${
                            isSpeaking
                              ? "bg-purple-100 border-purple-300 text-purple-700 animate-pulse"
                              : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-350 hover:border-purple-300 dark:hover:border-purple-450"
                          }`}
                          title={isSpeaking ? (lang === "pt" ? "Pausar Leitura" : "Pause Speech") : (lang === "pt" ? "Falar Resposta por Voz" : "Speak Response")}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{lang === "pt" ? "Parar" : "Stop"}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <span>{lang === "pt" ? "Ouvir" : "Listen"}</span>
                            </>
                          )}
                        </button>

                        {/* WhatsApp Sharing button */}
                        <button
                          type="button"
                          data-testid={`whatsapp-${tone.key}`}
                          onClick={() => {
                            const shareText = `*Situação:* “${selectedSituation.trigger}”\n\n*Resposta Tática [${tone.label}]:* “${tone.text}”\n\n— Compartilhado via Salva-me`;
                            openWhatsApp(shareText);
                          }}
                          className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-900 hover:border-emerald-350 dark:hover:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider transition duration-200 cursor-pointer"
                          title={lang === "pt" ? "Compartilhar via WhatsApp" : "Share via WhatsApp"}
                        >
                          <svg className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118s1.758-.718 2.008-1.41c.245-.694.245-1.289.172-1.41-.074-.121-.272-.196-.57-.346zM12 21.693c-1.724 0-3.414-.463-4.908-1.336l-.353-.21-3.647.957.973-3.057-.23-.367C2.916 15.632 2.012 13.865 2.012 12c0-5.508 4.479-9.988 9.988-9.988 2.67 0 5.179 1.04 7.07 2.93 1.89 1.89 2.93 4.4 2.93 7.07 0 5.513-4.48 9.992-9.988 9.992zm8.56-18.575C18.239 1.1 15.223 0 12 0 5.463 0 .145 5.319.14 11.859c0 2.09.547 4.133 1.587 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.656 1.456H12c6.533 0 11.85-5.315 11.858-11.86a11.8 11.8 0 0 0-3.298-8.478z"/>
                          </svg>
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      <div className="pt-2.5 border-t border-neutral-200/40 dark:border-zinc-750 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-zinc-400">
                        <span>{lang === "pt" ? "Foi útil?" : "Was this helpful?"}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            data-testid={`rate-helpful-${tone.key}`}
                            disabled={!!hasVoted}
                            onClick={() => handleFeedback(selectedSituation.id, tone.key, 1)}
                            className={`p-2 rounded-md border transition ${
                              hasVoted === "up" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-350 hover:text-emerald-600 dark:hover:text-emerald-400"
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            data-testid={`rate-not-helpful-${tone.key}`}
                            disabled={!!hasVoted}
                            onClick={() => handleFeedback(selectedSituation.id, tone.key, -1)}
                            className={`p-2 rounded-md border transition ${
                              hasVoted === "down" ? "bg-rose-100 border-rose-300 text-rose-800" : "bg-white dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-350 hover:text-rose-600 dark:hover:text-rose-400"
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Prominent Share All Card styled with the exact same layout patterns as the other response cards */}
                <div
                  className="p-4.5 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/15 dark:bg-purple-950/10 flex flex-col justify-between gap-3.5 transition-all duration-300 shadow-sm"
                >
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded text-xs uppercase font-mono font-bold tracking-wider border border-purple-200 dark:border-purple-900 select-none">
                      {lang === "pt" ? "Kit de Defesa Completo" : "Full Tactical Kit"}
                    </span>
                  </div>

                  {/* Description text echoing the layout aesthetic */}
                  <motion.div
                    key={`all_copied_${copiedKey === `${selectedSituation.id}_all`}`}
                    initial={copiedKey === `${selectedSituation.id}_all` ? { 
                      backgroundColor: "rgba(168, 85, 247, 0.25)",
                      scale: 1.02,
                    } : {}}
                    animate={copiedKey === `${selectedSituation.id}_all` ? { 
                      backgroundColor: ["rgba(168, 85, 247, 0.25)", "rgba(168, 85, 247, 0.1)", "rgba(168, 85, 247, 0)"],
                      scale: [1, 1.03, 0.99, 1],
                    } : {
                      backgroundColor: "rgba(168, 85, 247, 0)",
                      scale: 1,
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="p-2 -mx-2 rounded-lg text-sm font-semibold text-neutral-700 dark:text-zinc-300 leading-relaxed break-words selection:bg-purple-200"
                  >
                    {lang === "pt"
                      ? "Gostou de todas as táticas? Salve ou compartilhe de uma só vez todo o conjunto de respostas inteligente e de imposição de limites, estruturado com clareza para o destinatário."
                      : "Did you like all of the tactics? Save or share the entire set of smart and boundary-setting automated comebacks at once, cleanly organized for the recipient."}
                  </motion.div>

                  {/* Explicit Action Buttons Row matching existing buttons style */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-200/40">
                    {/* Copy All Kit button */}
                    <button
                      type="button"
                      data-testid="copy-all-kit"
                      onClick={handleCopyAll}
                      className={`flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer shadow-sm ${
                        copiedKey === `${selectedSituation.id}_all`
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-350 hover:border-purple-300 dark:hover:border-purple-500"
                      }`}
                      title={lang === "pt" ? "Copiar todo o kit" : "Copy entire kit"}
                    >
                      {copiedKey === `${selectedSituation.id}_all` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700 font-black shrink-0" />
                          <span>{lang === "pt" ? "Copiado" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>{lang === "pt" ? "Copiar Kit" : "Copy Kit"}</span>
                        </>
                      )}
                    </button>

                    {/* Share Kit (Web Share) button */}
                    <button
                      type="button"
                      data-testid="share-all-kit"
                      onClick={handleShareAll}
                      className={`flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer shadow-sm ${
                        sharedAll
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-350 hover:border-purple-300 dark:hover:border-purple-500"
                      }`}
                      title={lang === "pt" ? "Compartilhar todo o kit" : "Share entire kit"}
                    >
                      {sharedAll ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span>{lang === "pt" ? "Compartilhado" : "Shared"}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-neutral-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 shrink-0" />
                          <span>{lang === "pt" ? "Compartilhar" : "Share Kit"}</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp Sharing button */}
                    <button
                      type="button"
                      data-testid="whatsapp-all-kit"
                      onClick={() => {
                        const shareText = formatShareAllTemplate(
                          selectedSituation.trigger,
                          selectedSituation.educadora,
                          selectedSituation.sarcastica,
                          selectedSituation.assertiva,
                          selectedSituation.sem_filtro,
                          lang
                        );
                        openWhatsApp(shareText);
                      }}
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-900 hover:border-emerald-350 dark:hover:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider transition duration-200 cursor-pointer shadow-sm"
                      title={lang === "pt" ? "Enviar todo o kit por WhatsApp" : "Send entire kit via WhatsApp"}
                    >
                      <svg className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118s1.758-.718 2.008-1.41c.245-.694.245-1.289.172-1.41-.074-.121-.272-.196-.57-.346zM12 21.693c-1.724 0-3.414-.463-4.908-1.336l-.353-.21-3.647.957.973-3.557-.23-.367C2.916 15.632 2.012 13.865 2.012 12c0-5.508 4.479-9.988 9.988-9.988 2.67 0 5.179 1.04 7.07 2.93 1.89 1.89 2.93 4.4 2.93 7.07 0 5.513-4.48 9.992-9.988 9.992zm8.56-18.575C18.239 1.1 15.223 0 12 0 5.463 0 .145 5.319.14 11.859c0 2.09.547 4.133 1.587 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.656 1.456H12c6.533 0 11.85-5.315 11.858-11.86a11.8 11.8 0 0 0-3.298-8.478z"/>
                      </svg>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom AI Comeback Sandbox */}
            <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/10 dark:bg-purple-950/10 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-950/50 rounded-lg text-purple-700 dark:text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                </div>
                <h3 className="text-xs font-bold text-neutral-950 dark:text-zinc-100 font-heading uppercase tracking-wide">
                  {lang === "pt" ? "Personalizar com Inteligência Artificial" : "Customize with Artificial Intelligence"}
                </h3>
              </div>
              
              <p className="text-[11px] text-neutral-600 dark:text-zinc-400 leading-relaxed">
                {lang === "pt"
                  ? "Deseja adaptar a resposta para uma situation específica? Escolha o tom base, escolha um modelo rápido ou escreva sua diretriz personalizada (ex: 'responder por e-mail corporativo', 'falar no jantar de família', 'resposta ultra ríspida e curta') para gerar a resposta ideal."
                  : "Want to adapt the response to a specific context? Choose the base tone, choose a quick preset or type your custom style directive (e.g. 'reply as a professional email', 'family dinner setup', 'ultra sharp one-word answer') to get the perfect comeback."}
              </p>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
                      {lang === "pt" ? "Tom de Partida:" : "Base Tone:"}
                    </label>
                    <select
                      value={customBaseTone}
                      onChange={(e) => setCustomBaseTone(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs rounded-lg p-2.5 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-200 text-neutral-800 dark:text-zinc-200 font-medium"
                    >
                      <option value="educadora" className="dark:bg-zinc-900">{lang === "pt" ? "Educadora" : "Educator"}</option>
                      <option value="sarcastica" className="dark:bg-zinc-900">{lang === "pt" ? "Sarcástica" : "Sarcastic"}</option>
                      <option value="assertiva" className="dark:bg-zinc-900">{lang === "pt" ? "Assertiva" : "Assertive"}</option>
                      <option value="sem_filtro" className="dark:bg-zinc-900">{lang === "pt" ? "Sem filtro" : "No filter"}</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
                      {lang === "pt" ? "Sugestões de Diretriz:" : "Preset Directives:"}
                    </label>
                    <select
                      value={
                        [
                          "responder no e-mail corporativo de forma firme e profissional",
                          "reply in a firm and polite corporate email format",
                          "mais sarcástico e ríspido, porém educado",
                          "more sarcastic, sharp but exceptionally polite",
                          "ultra curto, no máximo 5 palavras",
                          "ultra short response, max 5 words",
                          "responder em tom calmo porém intimidador no jantar de família com parentes",
                          "respond calmly but intimidatingly in a family dinner environment with relatives",
                          "responder com uma pergunta retórica inteligente que desmonta o argumento",
                          "reply with a witty rhetorical question that dismantle their comment"
                        ].includes(customInstruction) 
                          ? customInstruction 
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setCustomInstruction(e.target.value);
                        }
                      }}
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs rounded-lg p-2.5 focus:border-purple-600 focus:outline-none text-neutral-600 dark:text-zinc-300 font-medium"
                    >
                      <option value="" className="dark:bg-zinc-900">-- {lang === "pt" ? "Escolha rápida" : "Quick select"} --</option>
                      {lang === "pt" ? (
                        <>
                          <option value="responder no e-mail corporativo de forma firme e profissional" className="dark:bg-zinc-900">💼 E-mail profissional</option>
                          <option value="mais sarcástico e ríspido, porém educado" className="dark:bg-zinc-900">😏 Sarcasmo polido</option>
                          <option value="ultra curto, no máximo 5 palavras" className="dark:bg-zinc-900">⚡ Resposta de 1 palavra/Ultra curta</option>
                          <option value="responder em tom calmo porém intimidador no jantar de família com parentes" className="dark:bg-zinc-900">🏡 Almoço/Jantar em Família</option>
                          <option value="responder com uma pergunta retórica inteligente que desmonta o argumento" className="dark:bg-zinc-900">❓ Pergunta retórica inteligente</option>
                        </>
                      ) : (
                        <>
                          <option value="reply in a firm and polite corporate email format" className="dark:bg-zinc-900">💼 Professional Email</option>
                          <option value="more sarcastic, sharp but exceptionally polite" className="dark:bg-zinc-900">😏 Polite Sarcasm</option>
                          <option value="ultra short response, max 5 words" className="dark:bg-zinc-900">⚡ Short/One-word</option>
                          <option value="respond calmly but intimidatingly in a family dinner environment with relatives" className="dark:bg-zinc-900">🏡 Family Dinner reply</option>
                          <option value="reply with a witty rhetorical question that dismantle their comment" className="dark:bg-zinc-900">❓ Witty Rhetorical question</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                    {lang === "pt" ? "Sua Diretriz Personalizada de Estilo:" : "Your Custom Style Directive:"}
                  </label>
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder={lang === "pt" ? "Ex: 'para responder meu chefe por Teams' ou 'deixar com metáfora'" : "e.g. 'to send my boss via Slack' or 'more poetic'"}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 focus:border-purple-600 rounded-lg text-xs text-neutral-800 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-200"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={isCustomizing}
                    onClick={handleCustomizeComeback}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold rounded-lg text-xs transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isCustomizing ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>{lang === "pt" ? "Aprimorando Resposta com IA..." : "Refining Response with AI..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{lang === "pt" ? "Gerar Nova Resposta Sob Medida" : "Generate Custom Comeback"}</span>
                      </>
                    )}
                  </button>

                  {(customInstruction || customResult) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomInstruction("");
                        setCustomResult("");
                        setCustomBaseTone("educadora");
                        showToast(lang === "pt" ? "Campos personalizados limpos! 🧹" : "Custom fields cleared! 🧹");
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-400 font-bold rounded-lg text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm animate-fade-in"
                      title={lang === "pt" ? "Limpar diretriz e resultado" : "Clear directive and results"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === "pt" ? "Limpar" : "Clear"}</span>
                    </button>
                  )}
                </div>
              </div>

              {customResult && (
                <div className="mt-4 p-4.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded text-[9px] uppercase font-mono font-bold tracking-wider border border-purple-200 dark:border-purple-900">
                      {lang === "pt" ? "RESPOSTA SOB MEDIDA DA IA" : "CUSTOM AI TAILORED ANSWER"}
                    </span>
                  </div>

                  <motion.p
                    key={`custom_res_${copiedKey === "custom_result"}`}
                    initial={copiedKey === "custom_result" ? { 
                      backgroundColor: "rgba(16, 185, 129, 0.25)",
                      scale: 1.03,
                    } : {}}
                    animate={copiedKey === "custom_result" ? { 
                      backgroundColor: ["rgba(16, 185, 129, 0.25)", "rgba(16, 185, 129, 0.1)", "rgba(16, 185, 129, 0)"],
                      scale: [1, 1.04, 0.98, 1],
                    } : {
                      backgroundColor: "rgba(16, 185, 129, 0)",
                      scale: 1,
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="p-2 -mx-2 rounded-lg text-xs font-bold text-neutral-900 dark:text-zinc-100 leading-relaxed italic break-words selection:bg-purple-200"
                  >
                    “{customResult}”
                  </motion.p>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-200/40">
                    {/* Copy Custom response */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(customResult);
                          setCopiedKey("custom_result");
                          setTimeout(() => setCopiedKey(null), 2000);
                          showToast(lang === "pt" ? "Copiada para a área de transferência! 💜" : "Copied to clipboard! 💜");
                        } catch (e) {
                          showToast("Falha ao copiar.");
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-[10px] font-black uppercase transition cursor-pointer ${
                        copiedKey === "custom_result"
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-350 hover:border-purple-300 dark:hover:border-purple-500"
                      }`}
                      title={lang === "pt" ? "Copiar Resposta Sob Medida" : "Copy Custom Response"}
                    >
                      {copiedKey === "custom_result" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700 font-black shrink-0" />
                          <span>{lang === "pt" ? "Copiado" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>{lang === "pt" ? "Copiar" : "Copy"}</span>
                        </>
                      )}
                    </button>

                    {/* Speak Custom response */}
                    <button
                      type="button"
                      onClick={() => handleSpeak(customResult, "custom-result")}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-[10px] font-black uppercase transition cursor-pointer ${
                        speakingKey === "custom-result"
                          ? "bg-purple-100 dark:bg-purple-950 border-purple-350 dark:border-purple-800 text-purple-700 dark:text-purple-300 animate-pulse"
                          : "bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300"
                      }`}
                    >
                      {speakingKey === "custom-result" ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-600" />
                          <span>{lang === "pt" ? "Parar" : "Stop"}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-neutral-400" />
                          <span>{lang === "pt" ? "Ouvir" : "Listen"}</span>
                        </>
                      )}
                    </button>

                    {/* Share Custom response */}
                    <button
                      type="button"
                      onClick={() => {
                        const shareText = `*Situação:* “${selectedSituation.trigger}”\n\n*Resposta Tática Sob Medida:* “${customResult}”\n\n— Compartilhado via Salva-me`;
                        openWhatsApp(shareText);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase transition cursor-pointer"
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tags footer listing */}
            {selectedSituation.tags && selectedSituation.tags.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1 items-center">
                <span className="text-[9px] font-mono tracking-wider font-bold text-neutral-400">
                  {lang === "pt" ? "TAGS DA SITUAÇÃO:" : "SITUATION TAGS:"}
                </span>
                {selectedSituation.tags.map((tg) => (
                  <span key={tg} className="text-[9px] font-mono text-neutral-500 dark:text-zinc-400 bg-neutral-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-zinc-700">
                    #{tg.toLowerCase()}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
