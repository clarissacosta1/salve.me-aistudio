import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Heart, 
  Send, 
  PlusCircle, 
  Users, 
  Compass, 
  Check, 
  AlertCircle, 
  Briefcase, 
  HeartHandshake, 
  Clock, 
  Lock,
  User,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../utils/api";

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  date: string;
  solidarityCount: number;
  comments: Comment[];
  audioUrl?: string;
}

interface CommunityStoriesPanelProps {
  lang: "pt" | "en";
}

export default function CommunityStoriesPanel({ lang }: CommunityStoriesPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // New Story Form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Profissional");
  const [newAuthor, setNewAuthor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Comments state
  const [activeCommentsStoryId, setActiveCommentsStoryId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");
  const [commentingStoryId, setCommentingStoryId] = useState<string | null>(null);

  // Tracks which stories the user has already sent solidarity to locally
  const [votedStories, setVotedStories] = useState<Record<string, boolean>>({});

  // Audio Playback state & reference
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount or active filter/lang changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
    };
  }, [selectedCategories, lang]);

  const handlePlayAudio = (storyId: string, url: string) => {
    if (playingAudioId === storyId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioId(storyId);
      
      audio.play().catch(err => {
        console.error("Audio playback error:", err);
        setPlayingAudioId(null);
      });

      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // Toggle dynamic categories search filters
  const handleToggleCategory = (catKey: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catKey)) {
        return prev.filter((c) => c !== catKey);
      } else {
        return [...prev, catKey];
      }
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  // Fetch stories from API
  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = getApiUrl("/api/stories");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load stories");
      const data = await res.json();
      setStories(data.stories || []);
    } catch (err: any) {
      console.error(err);
      setError(lang === "pt" ? "Erro ao carregar vivências." : "Error loading community stories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [lang]);

  // Handle solidarity click
  const handleSolidarity = async (storyId: string) => {
    if (votedStories[storyId]) return; // prevent redundant clicks

    // Optimistic UI updates
    setStories((prev) => 
      prev.map((s) => s.id === storyId ? { ...s, solidarityCount: s.solidarityCount + 1 } : s)
    );
    setVotedStories((prev) => ({ ...prev, [storyId]: true }));

    try {
      await fetch(getApiUrl(`/api/stories/${storyId}/solidarity`), {
        method: "POST"
      });
    } catch (err) {
      console.error("Solidarity submission failed:", err);
    }
  };

  // Handle Comment Submission
  const handleSendComment = async (e: React.FormEvent, storyId: string) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setCommentingStoryId(storyId);
    const authorVal = newCommentAuthor.trim() || (lang === "pt" ? "Anônima" : "Anonymous");

    try {
      const res = await fetch(getApiUrl(`/api/stories/${storyId}/comments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: authorVal,
          text: newCommentText.trim()
        })
      });

      if (!res.ok) throw new Error();
      const addedComment = await res.json();

      // Update story comments locally
      setStories((prev) => 
        prev.map((s) => {
          if (s.id === storyId) {
            return {
              ...s,
              comments: [...(s.comments || []), addedComment]
            };
          }
          return s;
        })
      );

      setNewCommentText("");
      setNewCommentAuthor("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setCommentingStoryId(null);
    }
  };

  // Handle Story Submit
  const handleNewStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const mappedCategory = newCategory;
    const authorVal = newAuthor.trim() || (lang === "pt" ? "Anônima" : "Anonymous");

    try {
      const res = await fetch(getApiUrl("/api/stories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: mappedCategory,
          author: authorVal
        })
      });

      if (!res.ok) throw new Error();
      
      setSubmitSuccess(true);
      setNewTitle("");
      setNewContent("");
      setNewAuthor("");
      
      // Auto close and refresh after a small prompt
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
        fetchStories();
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(lang === "pt" ? "Erro ao publicar relato. Tente novamente." : "Error posting story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast helper to format timestamps in pt/en
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (lang === "pt") {
        if (diffMins < 1) return "Agora mesmo";
        if (diffMins < 60) return `Há ${diffMins} minutos`;
        if (diffHrs < 24) return `Há ${diffHrs} horas`;
        return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      } else {
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      }
    } catch (_) {
      return "";
    }
  };

  // Support translation tags for UI representation
  const categoryLabels: Record<string, { pt: string; en: string; icon: string }> = {
    "Profissional": { pt: "💼 Trabalho & Carreira", en: "💼 Career & Work", icon: "💼" },
    "Social": { pt: "🏡 Família & Amigos", en: "🏡 Social & Family", icon: "🏡" },
    "Rua / Transporte": { pt: "🚇 Transporte & Rua", en: "🚇 Street & Transit", icon: "🚇" },
    "Outros": { pt: "🧩 Outras Vivências", en: "🧩 Other Setting", icon: "🧩" }
  };

  const getCategoryLabel = (cat: string) => {
    const label = categoryLabels[cat];
    if (!label) return cat;
    return lang === "pt" ? label.pt : label.en;
  };

  // Group stats calculations
  const totalSolidarity = stories.reduce((acc, curr) => acc + (curr.solidarityCount || 0), 0);
  const totalCommentsCount = stories.reduce((acc, curr) => acc + (curr.comments?.length || 0), 0);

  const filteredStories = selectedCategories.length === 0
    ? stories
    : stories.filter((story) => selectedCategories.includes(story.category));

  return (
    <div className="space-y-4">
      
      {/* Intro Header Section with Sisterhood concept */}
      <div className="rounded-2xl border border-purple-150 border-purple-100 bg-purple-50/40 p-4 sm:p-5 relative overflow-hidden select-none">
        
        <div className="flex flex-col gap-4 relative z-10 text-left">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-100 border border-purple-200/50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 animate-pulse text-purple-600" />
              <span>{lang === "pt" ? "Rede de Sororidade" : "Sisterhood Network"}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 font-sans uppercase">
              {lang === "pt" ? "Minhas Histórias & Relatos" : "My Stories & Shared Experiences"}
            </h2>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-sans font-medium">
              {lang === "pt" 
                ? "Um espaço moderado e seguro para mulheres compartilharem situações cotidianas de preconceito, expressarem apoio mútuo e trocarem conselhos práticos de defesa verbal." 
                : "A safe, daily space to exchange histories, leave supportive comments, and foster community alliances against microaggressions."}
            </p>
          </div>

          <button
            id="expand-story-form-btn"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold transition shadow active:scale-95 cursor-pointer justify-center uppercase tracking-wider"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{lang === "pt" ? "Compartilhar Relato" : "Share Your Story"}</span>
          </button>
        </div>

        {/* Cohesive design micro-indicators */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-purple-100 bg-transparent">
          <div className="bg-white rounded-xl p-2.5 border border-purple-100/50 flex flex-col justify-between shadow-sm">
            <span className="text-[9px] text-neutral-500 font-mono tracking-wider block uppercase">
              {lang === "pt" ? "Ativos" : "Total Stories"}
            </span>
            <span className="text-sm sm:text-base font-black text-neutral-900 font-mono block tracking-tight">
              {loading ? "..." : stories.length}
            </span>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-purple-100/50 flex flex-col justify-between shadow-sm">
            <span className="text-[9px] text-neutral-500 font-mono tracking-wider block uppercase">
              {lang === "pt" ? "Apoios 💜" : "Solidarity Acts"}
            </span>
            <span className="text-sm sm:text-base font-black text-purple-700 font-mono block tracking-tight">
              {loading ? "..." : totalSolidarity}
            </span>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-purple-100/50 flex flex-col justify-between shadow-sm">
            <span className="text-[9px] text-neutral-500 font-mono tracking-wider block uppercase">
              {lang === "pt" ? "Diálogos" : "Dialogue Acts"}
            </span>
            <span className="text-sm sm:text-base font-black text-neutral-900 font-mono block tracking-tight">
              {loading ? "..." : totalCommentsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Collapsible Form Section */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            id="new-story-form-card"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-2xl border border-purple-200 bg-purple-50 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                <HeartHandshake className="h-4.5 w-4.5 text-purple-700" />
                <span>{lang === "pt" ? "Espaço Seguro de Relato" : "Safe & Anonymous Reporting"}</span>
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-neutral-500 hover:text-neutral-800 text-xs px-2.5 py-1 rounded bg-neutral-200/50 font-bold cursor-pointer"
              >
                {lang === "pt" ? "Fechar" : "Close"}
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-neutral-900 uppercase">
                  {lang === "pt" ? "Relato publicado com sucesso!" : "Story published successfully!"}
                </h4>
                <p className="text-xs text-neutral-550 leading-relaxed max-w-xs mx-auto">
                  {lang === "pt" 
                    ? "Sua voz importa. Obrigado por construir esse espaço seguro conosco." 
                    : "Your voice matters. Thank you for contributing to our community forum."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleNewStorySubmit} className="space-y-4 font-sans">
                
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* Nickname selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">
                      {lang === "pt" ? "Como deseja se identificar (Opcional)" : "Display Name (Optional)"}
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      placeholder={lang === "pt" ? "Ex: Anônima, Camila S." : "Ex: Anonymous, Fighter_99..."}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-purple-600 font-sans font-medium"
                    />
                  </div>

                  {/* Category selections */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">
                      {lang === "pt" ? "Contexto / Categoria" : "Contextual Category"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: "Profissional", label: lang === "pt" ? "💼 Profissional" : "💼 Career" },
                        { key: "Social", label: lang === "pt" ? "🏡 Social" : "🏡 Social" },
                        { key: "Rua / Transporte", label: lang === "pt" ? "🚇 Transporte" : "🚇 Transit" },
                        { key: "Outros", label: lang === "pt" ? "🧩 Outros" : "🧩 Other" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setNewCategory(item.key)}
                          className={`rounded-lg py-1.5 text-[11px] font-bold tracking-tight transition cursor-pointer ${
                            newCategory === item.key
                              ? "bg-purple-700 text-white shadow-sm"
                              : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-800"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Story Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">
                    {lang === "pt" ? "Título do Relato" : "Story Title (Minimum 5 characters)"}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={100}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={lang === "pt" ? "Ex: Condescendência em comitê, comentários impróprios" : "Ex: Patronizing behaviour in planning meeting..."}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-purple-600 font-medium"
                  />
                </div>

                {/* Story Content */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">
                      {lang === "pt" ? "Conte o ocorrido" : "Describe what happened"}
                    </label>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {newContent.length}/1200
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={1200}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder={lang === "pt" ? "Compartilhe sobre a situação de preconceito de gênero, como se posicionou se aplicável, e conselhos práticos que darias para nós..." : "Faced a sexist remark, doubled down on clear comebacks, or simply sharing to feel safe. We stand with you..."}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-purple-600 leading-relaxed font-sans font-medium"
                  />
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-neutral-500 leading-normal flex items-start gap-1.5 bg-purple-100/30 p-2.5 rounded-lg border border-purple-100/50">
                  <AlertCircle className="h-3.5 w-3.5 text-purple-700 shrink-0 mt-0.5" />
                  <span>
                    {lang === "pt" 
                      ? "Nossas mediadoras auditam as mensagens para remover conteúdo ofensivo, vazamento de names reais ou insultos diretos. Mantenha os relatos focados na dinâmica social."
                      : "Our administrators review daily postings to safeguard against hate speech, offensive content or leakage of real names. Respect our sisterhood standards."}
                  </span>
                </p>

                {/* Action buttons */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-2 text-xs text-neutral-600 transition font-bold cursor-pointer"
                  >
                    {lang === "pt" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                    className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 text-xs font-black transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "..." : (lang === "pt" ? "PUBLICAR RELATO 🚀" : "SUBMIT REPORT 🚀")}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Feed Section */}
      <div className="space-y-4">
        
        {/* Filter categories pills */}
        <div className="flex items-center gap-2 pb-1 overflow-x-auto scrollbar-none">
          <span className="text-neutral-500 flex items-center gap-1 text-xs font-bold whitespace-nowrap mr-2 select-none">
            <Filter className="h-3.5 w-3.5 text-neutral-500" />
            <span>{lang === "pt" ? "Filtrar vivências:" : "Filter settings:"}</span>
          </span>

          <button
            onClick={handleClearCategories}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer select-none ${
              selectedCategories.length === 0
                ? "bg-purple-700 text-white shadow"
                : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-805 hover:bg-neutral-50"
            }`}
          >
            {lang === "pt" ? "🔥 Todas" : "🔥 All Stories"}
          </button>

          {Object.keys(categoryLabels).map((catKey) => {
            const data = categoryLabels[catKey];
            const isSelected = selectedCategories.includes(catKey);
            return (
              <button
                key={catKey}
                onClick={() => handleToggleCategory(catKey)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer select-none ${
                  isSelected
                    ? "bg-purple-700 text-white shadow"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-850 hover:bg-neutral-50"
                }`}
              >
                {lang === "pt" ? data.pt : data.en}
              </button>
            );
          })}
        </div>

        {/* Active tags visualizer */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs select-none">
            <span className="text-neutral-500 font-bold mr-1">
              {lang === "pt" ? "Filtros ativos:" : "Active filters:"}
            </span>
            {selectedCategories.map((catKey) => {
              const labelData = categoryLabels[catKey];
              return (
                <span
                  key={catKey}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] uppercase shadow-sm"
                >
                  <span>{lang === "pt" ? labelData?.pt : labelData?.en}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(catKey)}
                    className="hover:bg-purple-200/50 rounded-full p-0.5 ml-0.5 inline-flex items-center justify-center cursor-pointer text-purple-800 transition"
                    title={lang === "pt" ? "Remover filtro" : "Remove filter"}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2500/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              );
            })}
            <button
              onClick={handleClearCategories}
              className="px-2 py-1 text-[10px] font-mono text-neutral-550 hover:text-purple-700 underline underline-offset-2 transition cursor-pointer uppercase font-bold"
            >
              {lang === "pt" ? "[Limpar Filtros]" : "[Clear Filters]"}
            </button>
          </div>
        )}

        {/* The List of Stories */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-neutral-500 font-mono">
              {lang === "pt" ? "Conectando ao feed coletivo..." : "Opening dynamic storyboards..."}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-250 bg-rose-50 p-5 text-center space-y-2">
            <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
            <p className="text-xs text-rose-800 font-bold">{error}</p>
            <button 
              onClick={fetchStories}
              className="px-4 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-700 hover:text-neutral-900 cursor-pointer"
            >
              {lang === "pt" ? "Tentar Novamente" : "Retry"}
            </button>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-purple-200 bg-white text-xs italic text-neutral-450 space-y-4">
            <Users className="h-7 w-7 text-purple-250 mx-auto" strokeWidth={1.5} />
            <div>
              <p>
                {selectedCategories.length > 0
                  ? (lang === "pt" ? "Nenhum relato encontrado nesta combinação de categorias." : "No community stories found with this combination of categories.")
                  : (lang === "pt" ? "Nenhum relato encontrado nesta categoria." : "No communities stories found on this list.")}
              </p>
              {selectedCategories.length > 0 ? (
                <button
                  onClick={handleClearCategories}
                  className="mt-3 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 transition cursor-pointer font-sans"
                >
                  {lang === "pt" ? "Limpar todos os filtros" : "Clear all filters"}
                </button>
              ) : (
                <p className="text-[10px] text-neutral-500 mt-1">
                  {lang === "pt" ? "Seja a primeira a relatar tocando no botão acima!" : "Be the first to share your setting by tapping above!"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStories.map((story) => {
              const hasVotedLocal = votedStories[story.id];
              const isCommentsExpanded = activeCommentsStoryId === story.id;
              
              return (
                <article
                  key={story.id}
                  className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm transition hover:border-purple-300 space-y-3.5 text-left"
                >
                  
                  {/* Card top banner: Author, Timestamp, Category Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-50 pb-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-6 w-6 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-[10px] capitalize font-bold">
                        {story.author?.substring(0, 2) || "AN"}
                      </div>
                      <div>
                        <span className="font-bold text-neutral-800 block">{story.author}</span>
                        <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3 inline-block" />
                          <span>{formatTime(story.date)}</span>
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wider">
                      {getCategoryLabel(story.category)}
                    </span>
                  </div>

                  {/* Title & Body content */}
                  <div className="space-y-1 text-left col-span-1">
                    <div className="flex items-start justify-between gap-2.5">
                      <h4 className="text-sm font-black text-neutral-905 text-neutral-900 leading-tight uppercase tracking-tight flex-1">
                        {story.title}
                      </h4>
                      {story.audioUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(story.id, story.audioUrl!);
                          }}
                          className={`p-1.5 rounded-lg border transition shrink-0 cursor-pointer flex items-center justify-center ${
                            playingAudioId === story.id
                              ? "bg-purple-100 border-purple-300 text-purple-700 animate-pulse"
                              : "bg-neutral-50 hover:bg-neutral-100 border-neutral-250 hover:border-purple-300 text-neutral-500 hover:text-purple-705"
                          }`}
                          title={playingAudioId === story.id ? (lang === "pt" ? "Pausar áudio" : "Pause audio") : (lang === "pt" ? "Ouvir relato" : "Listen to story")}
                        >
                          {playingAudioId === story.id ? (
                            <VolumeX className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5 text-purple-600 font-black" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed font-sans font-normal whitespace-pre-wrap">
                      {story.content}
                    </p>
                  </div>

                  {/* Actions Row: Solidarity 💜 and Comments 💬 */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-purple-50">
                    
                    {/* Solidarity Button */}
                    <button
                      onClick={() => handleSolidarity(story.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                        hasVotedLocal
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-neutral-50 text-neutral-600 border border-neutral-200/60 hover:text-neutral-850"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 shrink-0 ${hasVotedLocal ? "fill-purple-700 text-purple-700" : ""}`} />
                      <span>
                        {hasVotedLocal 
                          ? (lang === "pt" ? "Solidária!" : "Supported!") 
                          : (lang === "pt" ? "Apoiar" : "Solidarity")}
                      </span>
                      <span className="ml-1 border-l border-neutral-300 pl-1.5 text-[10px] font-mono">
                        {story.solidarityCount || 0}
                      </span>
                    </button>

                    {/* Comments accordion toggler */}
                    <button
                      onClick={() => {
                        setActiveCommentsStoryId(isCommentsExpanded ? null : story.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                        isCommentsExpanded
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-neutral-50 text-neutral-600 border border-neutral-200/60 hover:text-neutral-850"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span>{lang === "pt" ? "Mensagens" : "Sisterhood Chat"}</span>
                      <span className="ml-1 border-l border-neutral-300 pl-1.5 text-[10px] font-mono text-neutral-500">
                        {story.comments ? story.comments.length : 0}
                      </span>
                      {isCommentsExpanded ? <ChevronUp className="h-3 w-3 text-neutral-500 ml-1" /> : <ChevronDown className="h-3 w-3 text-neutral-500 ml-1" />}
                    </button>

                  </div>

                  {/* Embedded comments thread */}
                  <AnimatePresence>
                    {isCommentsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-purple-50 pt-3 mt-3 space-y-3"
                      >
                        <span className="block text-[9px] uppercase font-mono tracking-wider text-neutral-550 font-bold mb-1">
                          {lang === "pt" ? "Apoios e mensagens enviadas" : "Support Messages from Sisters"}
                        </span>

                        {/* Speech bubbles list */}
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {!story.comments || story.comments.length === 0 ? (
                            <p className="text-[11px] text-neutral-500 italic text-center py-4 bg-neutral-50 rounded-xl">
                              {lang === "pt" ? "Sem mensagens de apoio. Escreva uma mensagem abaixo!" : "No messages of solidarity yet. Be the first!"}
                            </p>
                          ) : (
                            story.comments.map((comm) => (
                              <div
                                key={comm.id}
                                className="p-3 rounded-xl bg-purple-50/50 border border-purple-100/40 text-xs text-neutral-800 space-y-0.5 block leading-relaxed"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-neutral-800 text-[10px] block">{comm.author}</span>
                                  <span className="text-[9px] text-neutral-500 font-mono block">{formatTime(comm.timestamp)}</span>
                                </div>
                                <p className="text-neutral-700 text-xs leading-relaxed font-sans">{comm.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Send support comment form */}
                        <form
                          onSubmit={(e) => handleSendComment(e, story.id)}
                          className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/60 space-y-2 mt-3"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={25}
                              value={newCommentAuthor}
                              onChange={(e) => setNewCommentAuthor(e.target.value)}
                              placeholder={lang === "pt" ? "Seu Nome" : "Name"}
                              className="bg-white border border-neutral-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-600 text-neutral-800 placeholder-neutral-400 w-24 sm:w-32 placeholder:text-[10px] font-medium"
                            />
                            
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                required
                                max-length={250}
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder={lang === "pt" ? "Deixe sua palavra de força..." : "Write a word of comfort..."}
                                className="flex-1 bg-white border border-neutral-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-600 text-neutral-800 placeholder-neutral-400 placeholder:text-[10px] font-medium"
                              />
                              <button
                                type="submit"
                                disabled={commentingStoryId === story.id || !newCommentText.trim()}
                                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black p-2 shrink-0 transition cursor-pointer disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </form>

                      </motion.div>
                    )}
                  </AnimatePresence>

                </article>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
