import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, Mic, ShieldAlert, Volume2, Grid, UserRound } from "lucide-react";

interface FakeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "pt" | "en";
}

export default function FakeCallModal({ isOpen, onClose, lang }: FakeCallModalProps) {
  const [callerName, setCallerName] = useState("Mãe / Mother");
  const [callerType, setCallerType] = useState<"mother" | "father" | "boss" | "detective">("mother");
  const [delaySecs, setDelaySecs] = useState(0);
  const [status, setStatus] = useState<"idle" | "countdown" | "ringing" | "active">("idle");
  const [countdown, setCountdown] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringIntervRef = useRef<NodeJS.Timeout | null>(null);

  const callerPresets = {
    mother: {
      pt: { name: "Mãe", phrase: "Oi filha! Tudo bem? Onde você está? Já cheguei aqui na esquina com seu irmão e estamos te procurando. Você está perto?" },
      en: { name: "Mother", phrase: "Hi daughter! Are you okay? Where are you? I've arrived at the corner with your brother and we are looking for you. Are you close?" }
    },
    father: {
      pt: { name: "Pai", phrase: "Oi! Estou saindo do carro agora mesmo para te buscar. Fica em um lugar iluminado, estacionei a duas quadras de você." },
      en: { name: "Father", phrase: "Hey! I'm getting out of the car right now to meet you. Stay in a lit spot, I parked just two blocks away from you." }
    },
    boss: {
      pt: { name: "Dr. Roberto (Chefe)", phrase: "Olá, preciso que venha à recepção do escritório imediatamente. A equipe de segurança já está atenta e aguardando." },
      en: { name: "Dr. Robert (Boss)", phrase: "Hello, I need you to come to the office reception immediately. The security team is alert and waiting." }
    },
    detective: {
      pt: { name: "Inspetor Martins (Polícia)", phrase: "Aqui é o Inspetor Martins. Estou rastreando sua localização em tempo real e nossa viatura de apoio está a caminho do seu quadrante." },
      en: { name: "Inspector Martins", phrase: "This is Inspector Martins. I am tracking your location in real time and our support unit is heading towards your quadrant." }
    }
  };

  useEffect(() => {
    if (callerType) {
      const preset = callerPresets[callerType];
      setCallerName(preset[lang].name);
    }
  }, [callerType, lang]);

  // Handle ring Beeps using Web Audio Context so it works anywhere offline
  const playRingTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard ringback/telephone tone
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

      // Dual tone pairing (typical US ringing is 440hz + 480hz, PT ring is slightly different)
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc2.start();
      
      setTimeout(() => {
        osc.stop();
        osc2.stop();
        ctx.close();
      }, 1000);
    } catch (e) {
      console.warn("AudioContext ringtone error:", e);
    }
  };

  // Trigger countdown or direct ring
  const handleLaunch = () => {
    if (delaySecs === 0) {
      startRinging();
    } else {
      setCountdown(delaySecs);
      setStatus("countdown");
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            startRinging();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const startRinging = () => {
    setStatus("ringing");
    playRingTone();
    ringIntervRef.current = setInterval(() => {
      playRingTone();
    }, 3000);
  };

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ringIntervRef.current) clearInterval(ringIntervRef.current);
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
  };

  // Answer call
  const handleAnswer = () => {
    clearAllTimers();
    setStatus("active");
    setCallDuration(0);

    // Audio duration increment
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Trigger synthetic speech
    speakPresetPhrase();
    // Re-speak or check speaking loops to simulate background talk
    speechIntervalRef.current = setInterval(() => {
      speakPresetPhrase();
    }, 12000);
  };

  const speakPresetPhrase = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Reset previous speaking queues
      const phrase = callerPresets[callerType][lang].phrase;
      const utterance = new SpeechSynthesisUtterance(phrase);
      
      // Try to select appropriate female native locale voice
      const voices = window.speechSynthesis.getVoices();
      const targetLang = lang === "pt" ? "pt-BR" : "en-US";
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

      const selectedVoice = femaleVoice || langVoices.find((v) => v.lang.startsWith(targetLang)) || langVoices[0];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 0.95; // Slightly slower for crisp speaker clarity
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDeclineOrHangup = () => {
    clearAllTimers();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4">
      {/* Configuration Stage */}
      {status === "idle" && (
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition text-sm px-2 py-1 rounded-md bg-zinc-850"
            >
              x
            </button>
          </div>
          
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {lang === "pt" ? "Chamada Simulada" : "Simulated Fake Call"}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === "pt" ? "Gere uma ligação falsa para afastar abordagens suspeitas." : "Trigger a mockup phone call to deter anyone near."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {lang === "pt" ? "Quem simuladamente liga?" : "Identify Caller Prefix"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(callerPresets) as Array<keyof typeof callerPresets>).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCallerType(type)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                      callerType === type
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850"
                    }`}
                  >
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span>{callerPresets[type][lang].name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                {lang === "pt" ? "Iniciar ligação após:" : "Trigger Ringing After:"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "0s (Imediato)", val: 0 },
                  { label: "10s", val: 10 },
                  { label: "30s", val: 30 }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setDelaySecs(item.val)}
                    className={`rounded-lg py-2 text-xs font-medium border transition ${
                      delaySecs === item.val
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-905 text-zinc-400 hover:bg-zinc-850"
                    }`}
                  >
                    {lang === "pt" ? item.label : item.label.replace("Imediato", "Immediate")}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/5 p-3.5 border border-zinc-850 text-zinc-400">
              <div className="flex gap-2 items-start">
                <ShieldAlert className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  {lang === "pt" 
                    ? "O celular simulará um áudio artificial de voz falando pelo alto-falante principal sugerindo que você está sendo acompanhado ou aguardado no local."
                    : "The smartphone speaker will synthesize automated realistic voice lines suggesting that you are monitored and met nearby."}
                </p>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              {lang === "pt" ? "Programar Chamador" : "Arm Simulated Caller"}
            </button>
          </div>
        </div>
      )}

      {/* Countdown overlay indicator */}
      {status === "countdown" && (
        <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-white p-8 shadow-2xl">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-400 animate-pulse mb-3" />
          <h3 className="text-lg font-semibold mb-1">
            {lang === "pt" ? "Carregando Contato" : "Preparing caller overlay"}
          </h3>
          <p className="text-zinc-400 text-xs mb-6">
            {lang === "pt" ? "Mantenha o celular na mão. O toque dispara em:" : "Ringing interface scheduled in:"}
          </p>
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-zinc-950 border border-zinc-850 text-3xl font-bold text-amber-400 font-mono">
            {countdown}s
          </div>
          <button
            onClick={handleDeclineOrHangup}
            className="mt-8 text-xs text-zinc-500 underline hover:text-white transition"
          >
            {lang === "pt" ? "Cancelar Alerta" : "Cancel Call Alert"}
          </button>
        </div>
      )}

      {/* Simulated RINGING Screen */}
      {status === "ringing" && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-between bg-zinc-950 text-white p-8">
          <div className="pt-20 text-center">
            <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase mb-1">
              {lang === "pt" ? "Chamada de Voz de" : "Incoming Voice Call"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{callerName}</h1>
            <p className="text-emerald-400 font-mono text-xs mt-2 tracking-widest animate-pulse">
              {lang === "pt" ? "CHAMANDO..." : "RINGING..."}
            </p>
          </div>

          <div className="mb-12 flex justify-around w-full max-w-md mx-auto">
            {/* Decline Trigger */}
            <button
              onClick={handleDeclineOrHangup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg text-white transition transform active:scale-95 hover:bg-red-500"
            >
              <PhoneOff className="h-7 w-7" />
            </button>

            {/* Accept Trigger */}
            <button
              onClick={handleAnswer}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 shadow-lg text-white transition transform active:scale-95 hover:bg-emerald-500 animate-bounce"
            >
              <Phone className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}

      {/* Active Call Interface */}
      {status === "active" && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-between bg-zinc-950 text-white p-8">
          <div className="pt-20 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">{callerName}</h1>
            <p className="text-zinc-500 font-mono text-sm mt-1">{formatTime(callDuration)}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Volume2 className="h-3 w-5 animate-bounce" />
              <span>{lang === "pt" ? "Simulador Orador de Voz Ativo" : "AI Voice Speaker Active"}</span>
            </div>
          </div>

          {/* Active Call Grid Icons for realism */}
          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto w-full my-6 text-zinc-400">
            {[
              { icon: Mic, label: lang === "pt" ? "mudo" : "mute" },
              { icon: Grid, label: lang === "pt" ? "teclado" : "keypad" },
              { icon: Volume2, label: lang === "pt" ? "alto-falante" : "speaker", active: true },
              { icon: Video, label: "FaceTime" },
              { icon: UserRound, label: lang === "pt" ? "contatos" : "contacts" },
              { icon: ShieldAlert, label: lang === "pt" ? "silenciar" : "hold" }
            ].map((btn, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                  btn.active ? "bg-white text-zinc-950" : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                }`}>
                  <btn.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-1 capitalize text-zinc-400">{btn.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-12 flex justify-center w-full">
            <button
              onClick={handleDeclineOrHangup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg text-white transition transform active:scale-95 hover:bg-red-500"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
