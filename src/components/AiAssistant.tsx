import { useState } from "react";
import { Bot, Send, BrainCircuit, ShieldCheck, CornerDownLeft, Sparkles } from "lucide-react";
import { getApiUrl } from "../utils/api";

interface AiAssistantProps {
  lang: "pt" | "en";
  coords: { lat: number; lng: number } | null;
}

export default function AiAssistant({ lang, coords }: AiAssistantProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: lang === "pt"
        ? "Aqui é o assistente Salve-me AI. Selecione uma sugestão rápida abaixo ou digite qualquer pergunta sobre primeiros socorros, segurança urbana ou controle de pânico."
        : "Welcome to the Salve-me AI emergency advisor. Select an immediate scenario preset below or enter any security or first-aid query."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    {
      label: lang === "pt" ? "Seguido na rua" : "Being followed",
      prompt: lang === "pt" ? "Tem um carro/pessoa me seguindo na rua há duas quadras. O que eu faço de imediato para me proteger?" : "A stranger has been following me on foot for two blocks. What immediate tactical steps can I take?",
      category: "safety"
    },
    {
      label: lang === "pt" ? "Crise de pânico" : "Panic attack relief",
      prompt: lang === "pt" ? "Estou tendo um ataque de pânico extremo na rua. Como diminuir a taquicardia e voltar a respirar normalmente?" : "I am experiencing a severe panic attack right now in a public area. How do I slow my heart rate and regulate breathing?",
      category: "panic"
    },
    {
      label: lang === "pt" ? "Socorro de Noite" : "Suspicious home noise",
      prompt: lang === "pt" ? "Ouvi um barulho estranho no quintal ou na porta da frente da minha casa tarde da noite. Quais medidas protetivas tomar?" : "I hear an unusual sound near my front door late tonight. What protective measures should I prioritize?",
      category: "safety"
    },
    {
      label: lang === "pt" ? "Ajuda Doméstica" : "Domestic violence guidance",
      prompt: lang === "pt" ? "Como apoiar uma amiga/vítima que está sob ameaça de violência doméstica prolongada sem despertar suspeita do agressor?" : "How can I support someone experiencing silent domestic abuse without drawing suspicion from the partner?",
      category: "aggression"
    }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setInput("");
    setLoading(true);

    try {
      // Append coordinates internally if they exist to ground geographic questions or advice
      const locationAppend = coords 
        ? `\n\n(Localização atual de referência do usuário: latitude ${coords.lat.toFixed(5)}, longitude ${coords.lng.toFixed(5)})`
        : "";

      const response = await fetch(getApiUrl("/api/safety-consult"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend + locationAppend,
          category: "counseling",
          language: lang === "pt" ? "pt-BR" : "en-US"
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
      } else {
        throw new Error(data.error || "API failure");
      }
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: lang === "pt"
            ? "⚠️ Erro ao contatar conselheiro IA. Certifique-se de estar conectado e com a chave de API configurada no painel de Secrets."
            : "⚠️ Fail to query the AI safety specialist. Verify your network connections or API configurations."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 backdrop-blur-md flex flex-col h-[520px]">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-850/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Salve-me AI Specialist</span>
              <Sparkles className="h-3 w-3 text-amber-400" />
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">
              Powered by gemini-3.5-flash
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
          <ShieldCheck className="h-3 w-3" />
          <span>{lang === "pt" ? "Canal Protegido" : "Response Encrypted"}</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs mb-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-2xl p-3.5 max-w-[85%] leading-relaxed ${
                m.role === "user"
                  ? "bg-zinc-100 text-zinc-950 font-medium rounded-tr-none"
                  : "bg-zinc-950/40 border border-zinc-850 text-zinc-300 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl p-3 bg-zinc-950/40 border border-zinc-850 text-zinc-400 flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce delay-100" />
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce delay-200" />
              <span className="text-[10px] italic">
                {lang === "pt" ? "Especialista em segurança calculando..." : "AI advisor structuring guidelines..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Touch Presets */}
      {messages.length < 4 && (
        <div className="mb-4">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">Toque de segurança rápida</span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item.prompt)}
                disabled={loading}
                className="rounded-lg bg-zinc-950/50 hover:bg-zinc-800/60 border border-zinc-850/80 px-2.5 py-1.5 text-zinc-400 hover:text-white text-[11px] transition text-left"
              >
                + {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-850/60 p-1.5 rounded-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lang === "pt" ? "Pergunte algo sobre primeiros socorros..." : "Ask what to do inside an emergency..."}
          className="flex-1 bg-transparent px-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 transition disabled:opacity-40 disabled:hover:bg-emerald-500 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
