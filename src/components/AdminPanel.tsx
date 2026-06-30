import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, 
  Unlock, 
  TrendingUp, 
  CheckCircle, 
  Trash2, 
  Edit3, 
  FileSpreadsheet, 
  Sparkles, 
  Eye, 
  Inbox, 
  Plus, 
  FolderSync, 
  Activity, 
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Check,
  Lightbulb,
  Bell,
  RefreshCw,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  lang: "pt" | "en";
}

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

interface UserSuggestion {
  id: string;
  situation: string;
  contexto: string;
  created_at: string;
}

interface AnalyticsData {
  total_copies: number;
  by_response_type: Record<string, number>;
  copies_by_day: Array<{ date: string; copies: number }>;
  top_situations: Array<{ situation_id: string; trigger: string; copies: number }>;
}

interface FeedbackData {
  total_feedback: number;
  helpful_count: number;
  unhelpful_count: number;
  helpfulness_percentage: number;
  by_response_type: Record<string, { helpful: number; unhelpful: number }>;
  top_rated_scenarios: Array<{ situation_id: string; trigger: string; score: number; count: number }>;
}

export default function AdminPanel({ lang }: AdminPanelProps) {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Core administrative states
  const [catalog, setCatalog] = useState<Situation[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [adminStories, setAdminStories] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);

  // UI state managers
  const [adminTab, setAdminTab] = useState<"analytics" | "catalog" | "suggestions" | "stories" | "sync">("analytics");
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  // Editing state
  const [editingSituation, setEditingSituation] = useState<Situation | null>(null);
  const [updating, setUpdating] = useState(false);

  // New situation form (manual or AI-compiled)
  const [triggerPhrase, setTriggerPhrase] = useState("");
  const [newContext, setNewContext] = useState("Social");
  const [newNotes, setNewNotes] = useState("");
  const [safetyRating, setSafetyRating] = useState("Média");
  const [customTags, setCustomTags] = useState("");
  
  // Custom manual responses fields (if editing or adding manually)
  const [tempEdu, setTempEdu] = useState("");
  const [tempSar, setTempSar] = useState("");
  const [tempAss, setTempAss] = useState("");
  const [tempFil, setTempFil] = useState("");

  const [generatingWithAi, setGeneratingWithAi] = useState(false);
  const [promotionalGeneratingId, setPromotionalGeneratingId] = useState<string | null>(null);
  const [csvUploadStatus, setCsvUploadStatus] = useState<string | null>(null);

  // Enhanced CSV Batch Validation and Import States
  const [validationRows, setValidationRows] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [totalValidToImport, setTotalValidToImport] = useState(0);

  // Load password token from sessionStorage if present
  useEffect(() => {
    const saved = sessionStorage.getItem("salveme_admin_token");
    if (saved) {
      setToken(saved);
      setIsAuthorized(true);
    }
  }, []);

  // Fetch admin resources when authenticated
  useEffect(() => {
    if (isAuthorized) {
      fetchAdminResources();
    }
  }, [isAuthorized]);

  const fetchAdminResources = async () => {
    setLoadingRefresh(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // Parallel reads
      const [resSituations, resSuggestions, resAnalytics, resFeedback, resStories] = await Promise.all([
        fetch("/api/situations?lang=pt"), // default base situations
        fetch("/api/suggestions", { headers }),
        fetch("/api/admin/analytics", { headers }),
        fetch("/api/admin/feedback", { headers }),
        fetch("/api/admin/stories", { headers })
      ]);

      if (resSituations.ok) {
        const d = await resSituations.json();
        setCatalog(d.situations || []);
      }
      if (resSuggestions.ok) {
        const d = await resSuggestions.json();
        setSuggestions(d.suggestions || []);
      }
      if (resAnalytics.ok) {
        const d = await resAnalytics.json();
        setAnalytics(d);
      }
      if (resFeedback.ok) {
        const d = await resFeedback.json();
        setFeedback(d);
      }
      if (resStories.ok) {
        const d = await resStories.json();
        setAdminStories(d.stories || []);
      }
    } catch (e) {
      console.error("Failed to load admin resources: ", e);
    } finally {
      setLoadingRefresh(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || verifying) return;

    setVerifying(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setToken(data.token);
        setIsAuthorized(true);
        sessionStorage.setItem("salveme_admin_token", data.token);
      } else {
        setAuthError(lang === "pt" ? "Frase de acesso administrativa inválida." : "Unauthorized credential payload.");
      }
    } catch (err) {
      setAuthError("API Server Connection error.");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("salveme_admin_token");
    setIsAuthorized(false);
    setToken("");
    setPassword("");
  };

  // AI-Compiler content generation
  const handleAiCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhrase.trim() || generatingWithAi) return;

    setGeneratingWithAi(true);
    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          trigger: triggerPhrase,
          contexto: newContext,
          notas: newNotes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "AI script compiling failed");
      }

      // Success
      setTriggerPhrase("");
      setNewNotes("");
      await fetchAdminResources();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGeneratingWithAi(false);
    }
  };

  // Promote User Suggestion to situation database list
  const handlePromoteSuggestion = async (id: string) => {
    if (promotionalGeneratingId) return;
    setPromotionalGeneratingId(id);

    try {
      const response = await fetch(`/api/admin/suggestions/${id}/generate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Compilation trigger failed");
      
      await fetchAdminResources();
    } catch (err: any) {
      alert(`Fail processing AI generation of suggestion: ${err.message}`);
    } finally {
      setPromotionalGeneratingId(null);
    }
  };

  // Delete User suggestion from list
  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm(lang === "pt" ? "Deseja excluir esta sugestão de frase?" : "Prune user suggestion from list?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/suggestions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchAdminResources();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Situation from catalog
  const handleDeleteSituation = async (id: string) => {
    if (!confirm(lang === "pt" ? "Deseja remover este item definitivamente do catálogo?" : "Remove this microaggression trigger permanently?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/situations/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchAdminResources();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Community Story from admin board
  const handleDeleteStory = async (id: string) => {
    if (!confirm(lang === "pt" ? "Deseja remover este relato da comunidade definitivamente por violação?" : "Delete this community story permanently for violation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/stories/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchAdminResources();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit edits inline
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSituation || updating) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/situations/${editingSituation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          contexto: editingSituation.contexto,
          trigger: editingSituation.trigger,
          educadora: tempEdu,
          sarcastica: tempSar,
          assertiva: tempAss,
          sem_filtro: tempFil,
          seguranca: editingSituation.seguranca,
          notas: editingSituation.notas,
          tags: Array.isArray(editingSituation.tags) 
            ? editingSituation.tags 
            : (editingSituation.tags as string).toString().split(",").map(t => t.trim())
        })
      });

      if (response.ok) {
        setEditingSituation(null);
        await fetchAdminResources();
      } else {
        alert("Fail to save edited details.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Trigger editing overlays
  const startEdit = (sit: Situation) => {
    setEditingSituation({ ...sit });
    setTempEdu(sit.educadora || "");
    setTempSar(sit.sarcastica || "");
    setTempAss(sit.assertiva || "");
    setTempFil(sit.sem_filtro || "");
  };

  // Handle CSV Bulk imports with fine-grained client-side validation first
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploadStatus(null);
    setValidationRows([]);
    setImportProgress(0);
    setImportedCount(0);
    setTotalValidToImport(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const rawItems = parseCSVClient(text);
        if (rawItems.length === 0) {
          setCsvUploadStatus("error_Planilha vazia ou com formato inválido.");
          return;
        }
        await validateCSVRows(rawItems);
      } catch (err: any) {
        setCsvUploadStatus(`error_Falha ao processar arquivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Parser that handles quoted commas, quotes inside quotes etc.
  const parseCSVClient = (text: string): any[] => {
    const lines = text.split(/\r?\n/);
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

    const rawHeaders = parseCSVLine(lines[0]);
    const headers = rawHeaders.map(h => h.trim().toLowerCase());
    const results: any[] = [];

    // Header mappings / aliases helper
    const getHeaderIndex = (aliases: string[]): number => {
      return headers.findIndex(h => aliases.includes(h));
    };

    const triggerIdx = getHeaderIndex(["trigger", "gatilho", "frase", "frase machista", "frase sexista", "comentario", "comentário"]);
    const contextoIdx = getHeaderIndex(["contexto", "context", "ambiente", "espaço"]);
    const educadoraIdx = getHeaderIndex(["educadora", "educador", "educational", "education"]);
    const sarcasticaIdx = getHeaderIndex(["sarcastica", "sarcástica", "sarcastic", "ironica", "irônica"]);
    const assertivaIdx = getHeaderIndex(["assertiva", "assertive", "firme"]);
    const semFiltroIdx = getHeaderIndex(["sem_filtro", "sem filtro", "unfiltered", "sem-filtro"]);
    const segurancaIdx = getHeaderIndex(["seguranca", "segurança", "security", "classificacao"]);
    const notasIdx = getHeaderIndex(["notas", "cultura", "criticas", "critical", "notes", "nota"]);
    const tagsIdx = getHeaderIndex(["tags", "marcas", "palavras-chave", "palavras_chave"]);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCSVLine(line);
      
      const getValue = (idx: number): string => {
        if (idx === -1 || idx >= values.length) return "";
        let val = values[idx] || "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        return val.trim();
      };

      results.push({
        rowNum: i + 1,
        trigger: getValue(triggerIdx),
        contexto: getValue(contextoIdx),
        educadora: getValue(educadoraIdx),
        sarcastica: getValue(sarcasticaIdx),
        assertiva: getValue(assertivaIdx),
        sem_filtro: getValue(semFiltroIdx),
        seguranca: getValue(segurancaIdx),
        notas: getValue(notasIdx),
        tags: getValue(tagsIdx)
      });
    }
    return results;
  };

  const validateCSVRows = async (rawRows: any[]) => {
    setIsValidating(true);
    setValidationProgress(0);
    const validated: any[] = [];
    
    const chunkCount = rawRows.length;
    for (let index = 0; index < chunkCount; index++) {
      const r = rawRows[index];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Let's enforce trigger check
      let finalTrigger = r.trigger || "";
      if (!finalTrigger) {
        errors.push(lang === "pt" ? "Gatilho/Frase sexista obrigatório está ausente." : "Required sexist trigger/phrase is missing.");
      }

      // Contexto validation & auto-correction
      let finalContext = r.contexto || "";
      if (!finalContext) {
        errors.push(lang === "pt" ? "Contexto obrigatório está ausente." : "Required context category is missing.");
      } else {
        const lowerCtx = finalContext.toLowerCase();
        if (lowerCtx.includes("social") || lowerCtx.includes("fam")) {
          finalContext = "Social";
        } else if (lowerCtx.includes("prof") || lowerCtx.includes("trab") || lowerCtx.includes("corp")) {
          finalContext = "Profissional";
        } else if (lowerCtx.includes("street") || lowerCtx.includes("rua") || lowerCtx.includes("trans")) {
          finalContext = "Street";
        } else {
          warnings.push(lang === "pt" 
            ? `Contexto desconhecido "${finalContext}". Ajustado para 'Social'.` 
            : `Unknown context "${finalContext}". Adjusted to 'Social'.`
          );
          finalContext = "Social"; // Default fallback
        }
      }

      // Security check
      let finalSeguranca = r.seguranca || "Média";
      const lowerSeg = finalSeguranca.toLowerCase();
      if (lowerSeg.startsWith("alt") || lowerSeg === "high") {
        finalSeguranca = "Alta";
      } else if (lowerSeg.startsWith("méd") || lowerSeg.startsWith("med") || lowerSeg === "medium") {
        finalSeguranca = "Média";
      } else if (lowerSeg.startsWith("baix") || lowerSeg === "low") {
        finalSeguranca = "Baixa";
      } else {
        warnings.push(lang === "pt"
          ? `Segurança desconhecida "${finalSeguranca}". Redefinida como 'Média'.`
          : `Unknown safety level "${finalSeguranca}". Defaulted to 'Média'.`
        );
        finalSeguranca = "Média";
      }

      // Check for responses empty warning
      const hasAnyComeback = r.educadora || r.sarcastica || r.assertiva || r.sem_filtro;
      if (!hasAnyComeback) {
        warnings.push(lang === "pt"
          ? "Todas as respostas de tom estão vazias (cadastrado em branco)."
          : "All comeback fields are empty (will seed as blank)."
        );
      }

      const status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success";

      validated.push({
        ...r,
        trigger: finalTrigger,
        contexto: finalContext,
        seguranca: finalSeguranca,
        status,
        errors,
        warnings
      });

      // Animate progress smoothly
      const currentProgress = Math.round(((index + 1) / chunkCount) * 100);
      setValidationProgress(currentProgress);
      
      // Yield to main thread for a microtask to allow UI rendering & smooth progress bar
      if (index % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    setValidationRows(validated);
    setTotalValidToImport(validated.filter(v => v.status !== "error").length);
    setIsValidating(false);
  };

  const handleCommitValidationRows = async () => {
    const validRows = validationRows.filter(r => r.status !== "error");
    if (validRows.length === 0) {
      alert(lang === "pt" ? "Nenhuma linha válida para importar." : "No valid lines to import.");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportedCount(0);

    const batchSize = 5;
    const total = validRows.length;
    let saved = 0;

    for (let i = 0; i < total; i += batchSize) {
      const chunk = validRows.slice(i, i + batchSize);
      try {
        const response = await fetch("/api/admin/bulk-import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ situations: chunk })
        });

        if (!response.ok) {
          throw new Error("Erro na solicitação de lote");
        }

        saved += chunk.length;
        setImportedCount(saved);
        setImportProgress(Math.round((saved / total) * 100));
      } catch (err) {
        console.error("Batch import error:", err);
      }
      
      // Delay to show smooth transition
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    setIsImporting(false);
    setCsvUploadStatus(`success_parsed_${saved}`);
    setValidationRows([]);
    await fetchAdminResources();
  };

  // Send Test Webpush trigger
  const triggerPushTest = async () => {
    try {
      const response = await fetch("/api/admin/push/test", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const d = await response.json();
      alert(`Notificação teste enviada! Alvos registrados: ${d.targets}. Entregues com sucesso: ${d.delivered}`);
    } catch (err: any) {
      alert(`Push test failed: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // RENDER: PASSWORD ACCESS SCREEN
  // ----------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 md:p-8 backdrop-blur-md max-w-md mx-auto my-12 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-lg">
          <Lock className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight uppercase">
            {lang === "pt" ? "Central Administrativa" : "Moderator Log"}
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {lang === "pt" 
              ? "Forneça a frase de acesso administrativa do portal para gerenciar cenários e analisar dados estatísticos."
              : "Access metrics charts and compilation utilities. Enter administrative password to verify credentials."}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3 pt-2">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lang === "pt" ? "Frase de acesso (ex: salveme2024)" : "Staff Access Secret"}
            className="w-full bg-zinc-950 text-xs text-center text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 border border-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
          />

          <button
            type="submit"
            disabled={verifying}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition"
          >
            {verifying ? (lang === "pt" ? "Cruzando dados..." : "Verifying credentials...") : (lang === "pt" ? "Desbloquear Console 🔓" : "Unlock Control 🔓")}
          </button>
        </form>

        {authError && (
          <div className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {authError}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: COMPANION OVERLAY IF EDITING EXITS
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {editingSituation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-6 text-white shadow-2xl space-y-4 my-8"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-emerald-400 font-bold" />
                  <h3 className="text-base font-bold text-white tracking-tight">Editar Cenário do Catálogo</h3>
                </div>
                <button 
                  onClick={() => setEditingSituation(null)}
                  className="rounded-lg bg-zinc-955 px-3 py-1.5 hover:text-red-400 text-xs transition"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-medium text-zinc-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Frase Sexista (Gatilho)</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-950 rounded-xl px-3.5 py-3 border border-zinc-850 text-white font-semibold"
                      value={editingSituation.trigger}
                      onChange={(e) => setEditingSituation(p => p ? { ...p, trigger: e.target.value } : null)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Contexto</label>
                    <select
                      className="w-full bg-zinc-950 rounded-xl px-3.5 py-3 border border-zinc-850 text-white"
                      value={editingSituation.contexto}
                      onChange={(e) => setEditingSituation(p => p ? { ...p, contexto: e.target.value } : null)}
                    >
                      <option value="Profissional">Profissional</option>
                      <option value="Social">Social</option>
                      <option value="Street">Street</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Classif. Segurança</label>
                    <select
                      className="w-full bg-zinc-950 rounded-xl px-3.5 py-3 border border-zinc-850 text-white"
                      value={editingSituation.seguranca}
                      onChange={(e) => setEditingSituation(p => p ? { ...p, seguranca: e.target.value } : null)}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Média">Média</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </div>
                </div>

                {/* Edit grid tones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-emerald-400 mb-1">💡 Tom Educadora</label>
                    <textarea
                      rows={3}
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-850 text-zinc-200"
                      value={tempEdu}
                      onChange={(e) => setTempEdu(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-emerald-400 mb-1">😏 Tom Sarcástica</label>
                    <textarea
                      rows={3}
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-850 text-zinc-200"
                      value={tempSar}
                      onChange={(e) => setTempSar(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-emerald-400 mb-1">🛡️ Tom Assertiva</label>
                    <textarea
                      rows={3}
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-850 text-zinc-200"
                      value={tempAss}
                      onChange={(e) => setTempAss(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-emerald-400 mb-1">🔥 Tom Sem Filtro</label>
                    <textarea
                      rows={3}
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-850 text-zinc-200"
                      value={tempFil}
                      onChange={(e) => setTempFil(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Notas Culturais e Críticas</label>
                    <textarea
                      rows={2.5}
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2 border border-zinc-850 text-zinc-200"
                      value={editingSituation.notas}
                      onChange={(e) => setEditingSituation(p => p ? { ...p, notas: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Tags (Separadas por vírgula)</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-950 rounded-xl px-3 py-2.5 border border-zinc-850 text-zinc-200"
                      value={Array.isArray(editingSituation.tags) ? editingSituation.tags.join(", ") : editingSituation.tags as any}
                      onChange={(e) => setEditingSituation(p => p ? { ...p, tags: e.target.value.split(",").map(tg => tg.trim()) as any } : null)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingSituation(null)}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold text-xs"
                  >
                    Descartar Alterações
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400 text-xs"
                  >
                    {updating ? "Armazenando dados..." : "Salvar Cenário ✔️"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Control Console Head Bar */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Unlock className="h-4.5 w-4.5 text-emerald-400" />
            <span>Módulo Administrativo Salve-me 🚀</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Gerenciamento global de inteligência de conteúdo, analytics de cópias e moderação de sugestões.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminResources}
            disabled={loadingRefresh}
            className="rounded-xl px-3 py-2 border border-zinc-850 bg-zinc-950/20 text-xs text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            title="Sincronizar dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRefresh ? "animate-spin text-emerald-400" : ""}`} />
            <span>Sincronizar</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="rounded-xl px-3.5 py-2 border border-red-500/10 hover:border-red-500/30 bg-red-500/5 text-red-400 text-xs font-semibold hover:bg-red-500 hover:text-zinc-950 transition"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Horizontal Administration Sub-navigation */}
      <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-900 overflow-x-auto scrollbar-none">
        {[
          { id: "analytics", label: "Analytics & Trends", icon: Activity },
          { id: "catalog", label: "Catálogo de Frases", icon: BookOpen },
          { id: "suggestions", label: `Sugestões dos Usuários (${suggestions.length})`, icon: Inbox },
          { id: "stories", label: `Moderar Relatos (${adminStories.length})`, icon: Inbox },
          { id: "sync", label: "CSV Sync & Web-Push Alert", icon: FolderSync }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 text-xs font-bold whitespace-nowrap transition-all ${
              adminTab === tab.id
                ? "bg-zinc-850 text-emerald-400 shadow-sm border border-zinc-800"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENTS SWITCH */}
      <div className="space-y-6">

        {/* TAB: ANALYTICS & TRENDS */}
        {adminTab === "analytics" && (
          <div className="space-y-6">
            {/* Cards totalizers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4.5 space-y-1 backdrop-blur">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Total de Cópias Efetuadas</span>
                <p className="text-3xl font-black text-white leading-tight font-mono">
                  {analytics ? analytics.total_copies : 0}
                </p>
                <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-sans">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>Clipping de engajamento ativo</span>
                </span>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4.5 space-y-1 backdrop-blur">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Índice de Utilidade</span>
                <p className="text-3xl font-black text-emerald-400 leading-tight font-mono">
                  {feedback ? `${feedback.helpfulness_percentage}%` : "100%"}
                </p>
                <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                  <span>Avaliações positivas do usuário</span>
                </span>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4.5 space-y-1 backdrop-blur">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Interações de Feedback</span>
                <p className="text-3xl font-black text-white leading-tight font-mono">
                  {feedback ? feedback.total_feedback : 0}
                </p>
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 self-start">
                  {feedback ? `👍 ${feedback.helpful_count}  👎 ${feedback.unhelpful_count}` : ""}
                </span>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4.5 space-y-1 backdrop-blur">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Scenários Ativos</span>
                <p className="text-3xl font-black text-white leading-tight font-mono">
                  {catalog.length}
                </p>
                <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-purple-400" />
                  <span>Cenários de reação salvos</span>
                </span>
              </div>
            </div>

            {/* Micro graphs block explicitly formatted in CSS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Graph 1: Distribution of response tones copied */}
              <div className="bg-zinc-900/40 border border-zinc-855 rounded-2xl p-5 backdrop-blur space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight uppercase">Preferência de Tons Reativos</h4>
                  <p className="text-[10px] text-zinc-500">Tipos de comebacks mais copiados pelos usuários em apuros.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { key: "assertiva", label: "🛡️ Assertiva", color: "bg-emerald-500", text: "text-emerald-400" },
                    { key: "sarcastica", label: "😏 Sarcástica", color: "bg-amber-500", text: "text-amber-400" },
                    { key: "educadora", label: "💡 Educadora", color: "bg-blue-500", text: "text-blue-400" },
                    { key: "sem_filtro", label: "🔥 Sem Filtro", color: "bg-red-500", text: "text-red-400" }
                  ].map((item) => {
                    const count = analytics?.by_response_type?.[item.key] || 0;
                    const maxVal = Math.max(...(Object.values(analytics?.by_response_type || { safety: 1 }) as number[]), 1);
                    const percentage = Math.round((count / maxVal) * 100);

                    return (
                      <div key={item.key} className="space-y-1 text-xs font-semibold">
                        <div className="flex justify-between items-center text-zinc-300">
                          <span>{item.label}</span>
                          <span className={`font-mono text-[11px] ${item.text}`}>{count} cópias</span>
                        </div>
                        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 p-[1px]">
                          <div 
                            style={{ width: `${Math.max(percentage, 3)}%` }}
                            className={`${item.color} h-full rounded-full transition-all duration-500`} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leader board: Highest Kopied Scenarios */}
              <div className="bg-zinc-900/40 border border-zinc-855 rounded-2xl p-5 backdrop-blur space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight uppercase">Situações Críticas Mais Copiadas</h4>
                  <p className="text-[10px] text-zinc-500">Frases sexistas mais incidentes que demandaram maior defesa verbal.</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {analytics && analytics.top_situations && analytics.top_situations.length > 0 ? (
                    analytics.top_situations.map((item, idx) => (
                      <div 
                        key={item.situation_id} 
                        className="flex items-center justify-between p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-850 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="font-mono text-[10px] h-5 w-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                            {idx + 1}
                          </span>
                          <span className="text-zinc-300 font-bold truncate">“{item.trigger}”</span>
                        </div>
                        <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-400">
                          {item.copies}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-600 italic">Nenhum evento de cópia registrado ainda.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Custom SVG line-trend chart for copies over time */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 backdrop-blur space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight uppercase">Volumetria de Uso do Portal por dia</h4>
                <p className="text-[10px] text-zinc-500">Frequência histórica diária de interações de cópia.</p>
              </div>

              {analytics && analytics.copies_by_day && analytics.copies_by_day.length > 0 ? (
                <div className="pt-2">
                  <div className="h-44 w-full bg-zinc-950 rounded-xl border border-zinc-900 relative flex items-end p-2 justify-between gap-1 overflow-hidden">
                    {analytics.copies_by_day.map((d, index) => {
                      const maxCopies = Math.max(...analytics.copies_by_day.map(item => item.copies), 1);
                      const heightPercent = (d.copies / maxCopies) * 80;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col justify-end items-center h-full group cursor-pointer">
                          {/* Tooltip on hover */}
                          <div className="absolute top-2 opacity-0 group-hover:opacity-100 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[9px] font-mono text-emerald-400 font-black tracking-wider transition">
                            {d.date}: {d.copies}
                          </div>
                          <div 
                            style={{ height: `${Math.max(heightPercent, 8)}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t group-hover:brightness-110 transition-all duration-500"
                          />
                          <span className="text-[8px] text-zinc-600 mt-1.5 font-mono group-hover:text-zinc-400 transition-colors">
                            {d.date.substring(5, 10)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-650 font-mono text-xs italic">Aguardando amostragem histórica diária...</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SEXIST SITUATIONS DATABASE LIST & COMPILER FORM */}
        {adminTab === "catalog" && (
          <div className="space-y-6">
            
            {/* MAKE AI MAGIC FORM */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Gerar Conteúdo Automático por IA (Gemini)</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed max-w-3xl">
                O editor de conteúdo assistido por IA facilita o preenchimento de todas as respostas do catálogo. Digite qualquer comentário sexista, machista, ou de ofensa urbana e nossa IA redigirá instantaneamente as respostas nos 4 tons exigidos (Educadora, Sarcástica, Assertiva, Sem Filtro) combinados com notas críticas!
              </p>

              <form onSubmit={handleAiCompile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5 font-semibold">Comentário machista comum (ex: "Tens cara de canhão")</label>
                    <input
                      type="text"
                      required
                      value={triggerPhrase}
                      onChange={(e) => setTriggerPhrase(e.target.value)}
                      placeholder="Não sejas histérica"
                      className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3.5 py-3.5 border border-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5 font-semibold">Espaço do Viés</label>
                    <select
                      value={newContext}
                      onChange={(e) => setNewContext(e.target.value)}
                      className="w-full bg-zinc-950 text-xs text-white rounded-xl px-3.5 py-3.5 border border-zinc-900 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Social">Social / Familiar</option>
                      <option value="Profissional">Profissional / Trabalho</option>
                      <option value="Street">Street / Rua</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={generatingWithAi || !triggerPhrase.trim()}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      {generatingWithAi ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Pensando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Fazer Mágica ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* CATALOG LIST TABLE */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">Catálogo de Defesas Cadastrados ({catalog.length})</h3>
                <span className="text-[10px] text-zinc-500 font-mono">Totalizador em tempo real</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {catalog.length === 0 ? (
                  <div className="text-center py-12 text-zinc-550 text-xs italic">A base de dados do catálogo está limpa.</div>
                ) : (
                  catalog.map((sit) => (
                    <div 
                      key={sit.id} 
                      className="p-3.5 rounded-xl bg-zinc-950/45 border border-zinc-855 hover:border-zinc-800 transition flex items-center justify-between gap-4 text-xs font-semibold"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono uppercase bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                            {sit.contexto}
                          </span>
                          <span className="text-[9px] font-mono uppercase text-zinc-500">
                            Tags: {sit.tags ? sit.tags.join("; ") : "Nenhuma"}
                          </span>
                        </div>
                        <p className="text-white">“{sit.trigger}”</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => startEdit(sit)}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition"
                          title="Editar registros"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSituation(sit.id)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/10 text-red-400 hover:text-white hover:bg-red-500 transition"
                          title="Remover definitivamente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: USER CONVENIENT SUGGESTIONS */}
        {adminTab === "suggestions" && (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-850">
              <Inbox className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Caixa de entrada de Sugestões</h3>
                <p className="text-[10px] text-zinc-500">Propostas de novos cenários que chegaram através do formulário de usuários.</p>
              </div>
            </div>

            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-xl">
                  Não há novas sugestões pendentes nesta caixa de entrada.
                </div>
              ) : (
                suggestions.map((sug) => (
                  <div 
                    key={sug.id} 
                    className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-855 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[9px] font-mono uppercase">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900/40 border border-zinc-800 text-zinc-400">{sug.contexto}</span>
                        <span className="text-zinc-500">Registrado em: {new Date(sug.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-relaxed">“{sug.situation}”</p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <button
                        onClick={() => handlePromoteSuggestion(sug.id)}
                        disabled={!!promotionalGeneratingId}
                        className="px-4 py-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-zinc-950 font-bold hover:brightness-110 active:scale-95 text-xs transition flex items-center gap-1.5 shadow"
                      >
                        {promotionalGeneratingId === sug.id ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Processando com IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Aprovar & Preencher com IA 🧙</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteSuggestion(sug.id)}
                        className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: DATA SYNC CSV IMPORT/EXPORT & TEST PUSH NOTIFS */}
        {adminTab === "sync" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CSV COMPANION */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-white pb-2 border-b border-zinc-850">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-tight">
                    {lang === "pt" ? "Importar / Exportar Planilha CSV" : "Import / Export CSV Spreadsheet"}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === "pt" 
                    ? "Você pode fazer backup de todos os dados salvos baixando uma tabela CSV do Excel, ou importar múltiplos cenários de uma única vez."
                    : "Back up your scenarios database through local Excel CSV spreadsheet download, or run bulk ingestion cycles all at once."}
                </p>

                <div className="space-y-3.5 pt-2">
                  {/* 1. Export */}
                  <div className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl text-xs">
                    <div>
                      <h5 className="font-bold text-zinc-200">
                        {lang === "pt" ? "Exportar Base como planilha.csv" : "Export Base as spreadsheet.csv"}
                      </h5>
                      <p className="text-[10px] text-zinc-500">
                        {lang === "pt" ? "Útil para exportar dados para backups locais." : "Export raw situations files for offline backups."}
                      </p>
                    </div>
                    <a
                      href={`/api/admin/export-csv?password=${token}`}
                      download="salveme_situations.csv"
                      className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-emerald-400 font-bold hover:text-white transition shadow-sm"
                    >
                      Download .csv
                    </a>
                  </div>

                  {/* 2. Import */}
                  <div className="p-4 bg-zinc-950/40 border border-dashed border-zinc-850 rounded-xl text-center space-y-3">
                    <span className="block text-[10px] uppercase font-mono text-zinc-500 font-medium">
                      {lang === "pt" ? "Fazer upload bulk CSV" : "Upload Bulk CSV"}
                    </span>
                    
                    <div className="relative inline-block mx-auto cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        disabled={isValidating || isImporting}
                        onChange={handleFileInputChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      />
                      <button 
                        disabled={isValidating || isImporting}
                        className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 font-bold text-xs text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {lang === "pt" ? "Selecionar Planilha .CSV 📂" : "Select Spreadsheet .CSV 📂"}
                      </button>
                    </div>

                    {csvUploadStatus?.startsWith("success_parsed_") && (
                      <div className="text-xs text-emerald-400 font-semibold p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                        {lang === "pt" 
                          ? `Planilha processada com sucesso! Importadas ${csvUploadStatus.substring(15)} frases machistas.`
                          : `Spreadsheet processed successfully! Imported ${csvUploadStatus.substring(15)} sexist remarks.`
                        }
                      </div>
                    )}

                    {csvUploadStatus?.startsWith("error_") && (
                      <div className="text-xs text-red-400 font-semibold whitespace-pre-wrap p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                        {lang === "pt" ? "Falha na importação CSV:" : "CSV import failed:"} {csvUploadStatus.substring(6)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PUSH SERVICES TEST */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-white pb-2 border-b border-zinc-850">
                  <Bell className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-tight">
                    {lang === "pt" ? "Serviços Web Push Administrativos" : "Administrative Web Push Services"}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === "pt"
                    ? "Quando novos usuários sugerem frases sexistas em perigo, o sistema transmite alertas em tempo real. Você pode habilitar ou disparar disparos de teste no canal."
                    : "When threat-level suggested sexist patterns are captured, real-time push events trigger. Send simulation signals to monitor listener integrity."}
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl text-xs">
                    <div>
                      <h5 className="font-bold text-zinc-200">
                        {lang === "pt" ? "Disparar Alerta Push de Teste" : "Trigger Test Push Notification"}
                      </h5>
                      <p className="text-[10px] text-zinc-500">
                        {lang === "pt" ? "Testa o envio de notificações push nos navegadores dos moderadores cadastrados." : "Sends test push notification to authorized client configurations."}
                      </p>
                    </div>

                    <button
                      onClick={triggerPushTest}
                      className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-amber-400 hover:text-white transition font-bold"
                    >
                      Testar Push
                    </button>
                  </div>

                  <div className="p-3.5 bg-zinc-950/20 border border-zinc-850 rounded-xl space-y-1 text-xs text-zinc-400">
                    <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Instruções de Push:</span>
                    <p className="leading-relaxed text-[11px]">
                      Para iniciar recebimento, certifique-se de habilitar notificações para este site no rodapé do navegador. O worker registrará o endpoint nas rotas do servidor Express.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PROGRESS & VALIDATION PANEL */}
            {(isValidating || isImporting || validationRows.length > 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5 md:p-6 backdrop-blur-md space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                      <span>
                        {lang === "pt" 
                          ? "Painel de Integridade e Validação CSV" 
                          : "CSV Integrity & Validation Console"}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {lang === "pt"
                        ? "Revise e analise a consistência estrutural antes de registrar permanentemente na base de dados ativa."
                        : "Inspect row structural metrics and solve critical errors before committing payload to the database."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setValidationRows([])}
                      disabled={isImporting}
                      className="px-3.5 py-1.5 text-xs text-zinc-400 bg-zinc-900/50 hover:bg-zinc-900 hover:text-white rounded-lg border border-zinc-800 transition disabled:opacity-50"
                    >
                      {lang === "pt" ? "Descartar" : "Discard"}
                    </button>
                    
                    <button
                      onClick={handleCommitValidationRows}
                      disabled={isImporting || totalValidToImport === 0}
                      className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 rounded-xl transition shadow disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>
                        {lang === "pt" 
                          ? `Importar ${totalValidToImport} Linhas Válidas` 
                          : `Import ${totalValidToImport} Valid Rows`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Loading / Progress Bars */}
                {isValidating && (
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-2 animate-pulse">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-400 font-mono flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                        {lang === "pt" ? "Varrendo dados estruturais e aplicando heurísticas..." : "Scanning structural rows & parsing formatting..."}
                      </span>
                      <span className="font-mono text-zinc-500">{validationProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden p-[1px] border border-zinc-900">
                      <div 
                        style={{ width: `${validationProgress}%` }}
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {isImporting && (
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        {lang === "pt" 
                          ? `Gravando lotes no banco de dados (${importedCount} de ${totalValidToImport})...` 
                          : `Committing payloads to db (${importedCount} of ${totalValidToImport})...`}
                      </span>
                      <span className="font-mono text-zinc-500">{importProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden p-[1px] border border-zinc-900">
                      <div 
                        style={{ width: `${importProgress}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Validation Stats Totalizer Widgets */}
                {validationRows.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                        {lang === "pt" ? "Total de Linhas" : "Total Rows"}
                      </span>
                      <div className="text-xl font-black text-white font-mono">{validationRows.length}</div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-emerald-500/80 uppercase tracking-wider font-mono font-bold">
                        {lang === "pt" ? "Válidas (Salvar)" : "Valid (Ready)"}
                      </span>
                      <div className="text-xl font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        {totalValidToImport}
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-amber-500/80 uppercase tracking-wider font-mono font-bold">
                        {lang === "pt" ? "Com Alertas" : "With Warnings"}
                      </span>
                      <div className="text-xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        {validationRows.filter(r => r.status === "warning").length}
                      </div>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-red-500/80 uppercase tracking-wider font-mono font-bold">
                        {lang === "pt" ? "Bloqueadas (Erro)" : "Blocked (Errors)"}
                      </span>
                      <div className="text-xl font-black text-red-400 font-mono flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                        {validationRows.filter(r => r.status === "error").length}
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Summary Table */}
                {validationRows.length > 0 && (
                  <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/80">
                    <div className="max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur">
                            <th className="py-3 px-4 text-center w-14">#</th>
                            <th className="py-3 px-4 w-1/3">{lang === "pt" ? "Gatilho / Frase" : "Trigger / Remark"}</th>
                            <th className="py-3 px-4 w-28">{lang === "pt" ? "Contexto" : "Context"}</th>
                            <th className="py-3 px-4 w-32">{lang === "pt" ? "Segurança" : "Safety"}</th>
                            <th className="py-3 px-4 w-28">{lang === "pt" ? "Status" : "Status"}</th>
                            <th className="py-3 px-4">{lang === "pt" ? "Detalhes e inconsistências" : "Details & inconsistencies"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {validationRows.map((row) => (
                            <tr 
                              key={row.rowNum}
                              className={`hover:bg-zinc-900/20 transition-colors ${
                                row.status === "error" 
                                  ? "bg-red-500/5" 
                                  : row.status === "warning" 
                                    ? "bg-amber-500/5" 
                                    : ""
                              }`}
                            >
                              <td className="py-2.5 px-4 font-mono text-zinc-500 text-center">{row.rowNum}</td>
                              <td className="py-2.5 px-4 font-bold text-zinc-200">
                                <span className="line-clamp-2" title={row.trigger}>
                                  {row.trigger || <span className="text-red-500 italic font-medium font-mono text-[10px]">&lt;ausente / empty&gt;</span>}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                  row.contexto === "Social" 
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" 
                                    : row.contexto === "Profissional" 
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/10" 
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                                }`}>
                                  {row.contexto || "Social"}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="text-zinc-400 font-mono text-[11px]">
                                  {row.seguranca || "Média"}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 opacity-90">
                                {row.status === "success" && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[10px] font-bold uppercase tracking-wider">
                                    <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                                    {lang === "pt" ? "Válido" : "Valid"}
                                  </span>
                                )}
                                {row.status === "warning" && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/10 text-[10px] font-bold uppercase tracking-wider">
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                                    {lang === "pt" ? "Ajustado" : "Warning"}
                                  </span>
                                )}
                                {row.status === "error" && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/10 text-[10px] font-bold uppercase tracking-wider">
                                    <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                                    {lang === "pt" ? "Erro" : "Error"}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px] leading-snug">
                                {row.status === "success" && (
                                  <span className="text-zinc-500 italic">Sem irregularidades detectadas.</span>
                                )}
                                {row.status === "warning" && (
                                  <ul className="list-disc pl-4 text-amber-400/90 space-y-0.5">
                                    {row.warnings.map((w: string, idx: number) => (
                                      <li key={idx}>{w}</li>
                                    ))}
                                  </ul>
                                )}
                                {row.status === "error" && (
                                  <ul className="list-disc pl-4 text-red-400 font-bold space-y-0.5">
                                    {row.errors.map((e: string, idx: number) => (
                                      <li key={idx} className="flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                        <span>{e}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* TAB: STORIES MODERATION */}
        {adminTab === "stories" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-md">
              <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-2">
                Moderação de Relatos & Vivências Coletivas
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Audite e gerencie relatos compartilhados no diário coletivo público por usuárias. Remova publicações que violem diretrizes de privacidade ou usem linchamento virtual.
              </p>
            </div>

            <div className="space-y-3">
              {adminStories.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-900 bg-zinc-950/10 text-xs italic text-zinc-400">
                  Nenhum relato publicado no diário.
                </div>
              ) : (
                adminStories.map((story) => (
                  <div
                    key={story.id}
                    className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-5 flex flex-col sm:flex-row gap-4 justify-between items-start"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="font-bold text-zinc-200">De: {story.author}</span>
                        <span className="text-zinc-500 font-mono">• {new Date(story.date).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-955 border border-zinc-900 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          {story.category}
                        </span>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
                          💜 {story.solidarityCount} apoios
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold bg-zinc-950 px-1.5 py-0.5 rounded">
                          💬 {story.comments ? story.comments.length : 0} comentários
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">{story.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{story.content}</p>

                      {story.comments && story.comments.length > 0 && (
                        <div className="mt-3 bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl space-y-2">
                          <span className="text-[9px] uppercase font-mono tracking-wider font-semibold text-zinc-500 block">Comentários Associados:</span>
                          {story.comments.map((c: any) => (
                            <div key={c.id} className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg leading-relaxed flex items-start justify-between gap-2">
                              <div>
                                <strong className="text-zinc-350">{c.author}:</strong> {c.text}
                              </div>
                              <span className="text-[9px] font-mono text-zinc-500 shrink-0">{new Date(c.timestamp).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteStory(story.id)}
                      className="rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-xs font-bold p-3 hover:bg-red-500 hover:text-zinc-950 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir Relato</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
