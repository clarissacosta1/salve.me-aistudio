import { useState, useEffect } from "react";
import { MapPin, Navigation, Send, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";

interface EmergencyTrackerProps {
  lang: "pt" | "en";
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export default function EmergencyTracker({ lang, onLocationUpdate }: EmergencyTrackerProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fetchLocation = () => {
    setLoading(true);
    setErrorText(null);
    
    if (!navigator.geolocation) {
      setErrorText(lang === "pt" ? "Geolocalização não suportada." : "Geolocation not supported.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        setLoading(false);
        if (onLocationUpdate) {
          onLocationUpdate(latitude, longitude);
        }
      },
      (error) => {
        console.error("Geolocation error: ", error);
        setLoading(false);
        let msg = lang === "pt" ? "Permissão negada ou erro ao ler sinal GPS." : "Permission denied or GPS signal failure.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = lang === "pt" ? "Permissão de localização negada pelo navegador." : "Location permission denied by browser.";
        }
        setErrorText(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
    // Auto-poll location every 40 seconds to maintain crisp coordinates
    const interval = setInterval(fetchLocation, 40000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    if (!coords) return;
    const text = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppLink = () => {
    if (!coords) return "#";
    const text = lang === "pt"
      ? `🚨 *ALERTA DE SEGURANÇA - SALVE-ME* 🚨\nPreciso de ajuda urgente! Minha rota e localização atual estão representadas neste mapa: \n👉 https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : `🚨 *SAFETY ALERT - SAVE-ME* 🚨\nI need urgent assistance! My current location is mapped here: \n👉 https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5 backdrop-blur-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Navigation className="h-4 w-4 text-emerald-400" />
            {lang === "pt" ? "Monitoramento de Localização" : "Active Location Tracking"}
          </h3>
          <p className="text-xs text-zinc-400">
            {lang === "pt" ? "Coordenadas GPS de precisão para compartilhamento imediato." : "Precision GPS coordinates for fast threat response sharing."}
          </p>
        </div>
        <button 
          onClick={fetchLocation}
          disabled={loading}
          className="rounded-lg p-2 bg-zinc-950/30 text-zinc-400 border border-zinc-850 hover:text-white transition disabled:opacity-50"
          title={lang === "pt" ? "Atualizar GPS" : "Recalibrate GPS"}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>

      {errorText && (
        <div className="mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3">
          {errorText}
          <button 
            onClick={fetchLocation} 
            className="block underline font-medium mt-1 text-red-300 hover:text-red-200"
          >
            {lang === "pt" ? "Tentar novamente" : "Try again"}
          </button>
        </div>
      )}

      {coords ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-xl bg-zinc-950/40 border border-zinc-850/60 p-3">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Latitude</span>
              <span className="text-sm font-mono font-medium text-zinc-200">{coords.lat.toFixed(6)}</span>
            </div>
            
            <div className="rounded-xl bg-zinc-950/40 border border-zinc-850/60 p-3">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Longitude</span>
              <span className="text-sm font-mono font-medium text-zinc-200">{coords.lng.toFixed(6)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-zinc-950/20 px-3 py-2 rounded-lg border border-zinc-850 text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-red-500" />
              <span>{lang === "pt" ? "Raio de precisão:" : "Accuracy limit:"}</span>
            </span>
            <span className="font-mono text-zinc-400">~{coords.accuracy.toFixed(1)}m</span>
          </div>

          <div className="flex gap-2">
            {/* Copy Map Coordinates */}
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-950/40 border border-zinc-800 text-xs font-semibold hover:border-zinc-700 text-zinc-300 py-3 transition"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{lang === "pt" ? "Link Copiado!" : "Link Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{lang === "pt" ? "Copiar Map Link" : "Copy Maps Link"}</span>
                </>
              )}
            </button>

            {/* Direct WhatsApp Share */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noreferrer referrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold py-3 transition shadow-lg shadow-emerald-500/10"
            >
              <Send className="h-4 w-4" />
              <span>{lang === "pt" ? "Enviar no WhatsApp" : "Share to WhatsApp"}</span>
            </a>
          </div>

          {/* Quick link to view locator in external window */}
          <div className="text-center pt-1 border-t border-zinc-850/50">
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer referrer"
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-400 transition"
            >
              <span>{lang === "pt" ? "Abrir satélite externo" : "Show on satellite map"}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-xs">
          {!loading && !errorText && (
            <button 
              onClick={fetchLocation}
              className="px-4 py-2 border border-zinc-800 bg-zinc-950/20 text-zinc-400 rounded-lg hover:text-zinc-200 transition"
            >
              {lang === "pt" ? "Obter Coordenadas GPS" : "Request GPS Signal"}
            </button>
          )}
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
              <span>{lang === "pt" ? "Buscando sinal de satélites..." : "Reading satellite telemetry..."}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
