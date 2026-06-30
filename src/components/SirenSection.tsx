import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Flame, Zap, ShieldCheck } from "lucide-react";

interface SirenSectionProps {
  lang: "pt" | "en";
}

export default function SirenSection({ lang }: SirenSectionProps) {
  const [activeAlert, setActiveAlert] = useState<"none" | "siren" | "whistle">("none");
  const [strobeActive, setStrobeActive] = useState(false);
  const [strobeColor, setStrobeColor] = useState<"red" | "blue">("red");
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillator1Ref = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const modulationIntervalRef = useRef<any>(null);
  const strobeIntervalRef = useRef<any>(null);

  // Stop sound on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    };
  }, []);

  // Handle strobe flash effect
  useEffect(() => {
    if (strobeActive) {
      strobeIntervalRef.current = setInterval(() => {
        setStrobeColor((prev) => (prev === "red" ? "blue" : "red"));
      }, 100);
    } else {
      if (strobeIntervalRef.current) {
        clearInterval(strobeIntervalRef.current);
      }
    }
    return () => {
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    };
  }, [strobeActive]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
  };

  const playSiren = () => {
    try {
      stopSound();
      initAudio();
      
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      // Resume context if suspended (common in browsers until user gesture)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth"; // Harsh warning wave
      osc2.type = "sine";      // Smooth backing tone

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1); // Safe loud volume

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      oscillator1Ref.current = osc1;
      oscillator2Ref.current = osc2;
      gainNodeRef.current = gain;

      // Frequency modulation for police siren sweep
      let toggle = false;
      modulationIntervalRef.current = setInterval(() => {
        const time = ctx.currentTime;
        if (toggle) {
          osc1.frequency.exponentialRampToValueAtTime(950, time + 0.45);
          osc2.frequency.exponentialRampToValueAtTime(750, time + 0.45);
        } else {
          osc1.frequency.exponentialRampToValueAtTime(600, time + 0.45);
          osc2.frequency.exponentialRampToValueAtTime(450, time + 0.45);
        }
        toggle = !toggle;
      }, 500);

      setActiveAlert("siren");
      setStrobeActive(true);
    } catch (e) {
      console.error("Failed to start siren audio: ", e);
    }
  };

  const playWhistle = () => {
    try {
      stopSound();
      initAudio();

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(2600, ctx.currentTime); // Very high annoying pitch

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      oscillator1Ref.current = osc;
      gainNodeRef.current = gain;

      // Pulse the high whistle
      let muted = false;
      modulationIntervalRef.current = setInterval(() => {
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(muted ? 0.4 : 0.01, ctx.currentTime);
          muted = !muted;
        }
      }, 250);

      setActiveAlert("whistle");
      setStrobeActive(true);
    } catch (e) {
      console.error("Failed to start whistle audio: ", e);
    }
  };

  const stopSound = () => {
    try {
      if (oscillator1Ref.current) {
        oscillator1Ref.current.stop();
        oscillator1Ref.current.disconnect();
        oscillator1Ref.current = null;
      }
      if (oscillator2Ref.current) {
        oscillator2Ref.current.stop();
        oscillator2Ref.current.disconnect();
        oscillator2Ref.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (modulationIntervalRef.current) {
        clearInterval(modulationIntervalRef.current);
        modulationIntervalRef.current = null;
      }
      setActiveAlert("none");
      setStrobeActive(false);
    } catch (e) {
      console.warn("Error stopping audio components: ", e);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 backdrop-blur-md relative overflow-hidden">
      {/* Full screen Flash Strobe Overlay when active */}
      {strobeActive && (
        <div 
          onClick={() => setStrobeActive(false)}
          className={`absolute inset-0 z-10 opacity-15 pointer-events-none transition-colors duration-100 ${
            strobeColor === "red" ? "bg-red-500" : "bg-blue-500"
          }`}
        />
      )}

      <div className="relative z-20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              {lang === "pt" ? "Sinalizadores de Pânico" : "Auditory Panic Devices"}
            </h3>
            <p className="text-xs text-zinc-400">
              {lang === "pt" ? "Gere barulho para atrair auxílio visual ou sonoro imediatamente." : "Produce loud discomfort to call bystander support."}
            </p>
          </div>
          {strobeActive && (
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Siren Button */}
          <button
            onClick={activeAlert === "siren" ? stopSound : playSiren}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition active:scale-95 ${
              activeAlert === "siren"
                ? "bg-red-500/10 border-red-500 text-red-400 font-semibold"
                : "bg-zinc-950/20 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-850"
            }`}
          >
            <Flame className={`h-6 w-6 mb-2 ${activeAlert === "siren" ? "animate-bounce" : ""}`} />
            <span className="text-xs font-semibold">
              {lang === "pt" ? "Sirene Policial" : "Police Siren"}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">
              {activeAlert === "siren" ? (lang === "pt" ? "TOCANDO" : "PLAYING") : (lang === "pt" ? "Emitir Alarme" : "Emit Alarm")}
            </span>
          </button>

          {/* High Whistle Button */}
          <button
            onClick={activeAlert === "whistle" ? stopSound : playWhistle}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition active:scale-95 ${
              activeAlert === "whistle"
                ? "bg-amber-500/10 border-amber-500 text-amber-400 font-semibold"
                : "bg-zinc-950/20 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-850"
            }`}
          >
            <Volume2 className={`h-6 w-6 mb-2 ${activeAlert === "whistle" ? "animate-pulse" : ""}`} />
            <span className="text-xs font-semibold">
              {lang === "pt" ? "Apito Agudo" : "High Whistle"}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">
              {activeAlert === "whistle" ? (lang === "pt" ? "TOCANDO" : "PLAYING") : (lang === "pt" ? "Emitir Apito" : "Emit Whistle")}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-850 pt-3.5">
          {/* Strobe Light Toggle */}
          <button
            onClick={() => setStrobeActive(!strobeActive)}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition border ${
              strobeActive 
                ? "bg-blue-500/10 border-blue-500 text-blue-300"
                : "bg-zinc-950/20 border-zinc-800 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${strobeActive ? "bg-blue-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{lang === "pt" ? "Visual Estrobocópio" : "Visual Strobe Light"}</span>
          </button>

          {/* Stop / Reset Button */}
          {activeAlert !== "none" && (
            <button
              onClick={stopSound}
              className="flex items-center gap-1.5 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-1.5 text-xs font-semibold transition"
            >
              <VolumeX className="h-3.5 w-3.5" />
              <span>{lang === "pt" ? "Silenciar Tudo" : "Mute Alerts"}</span>
            </button>
          )}

          {activeAlert === "none" && (
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{lang === "pt" ? "Sintetizadores desarmados" : "Sounders disarmed"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
