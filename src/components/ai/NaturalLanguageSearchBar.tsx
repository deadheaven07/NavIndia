import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, Compass, Mic, MicOff } from 'lucide-react';
import { parseCommuteIntent, type ParsedCommuteIntent } from '../../services/gemini';
import type { TransitNode } from '../../algorithms/types';

interface NaturalLanguageSearchBarProps {
  nodes: TransitNode[];
  onRouteDispatched: (originNodeId: string, destNodeId: string, preference?: string) => void;
  isCalculating?: boolean;
}

const QUICK_PROMPTS = [
  '⚡ Fastest from Indiranagar to Airport',
  '💰 Budget route: Majestic to Whitefield under ₹80',
  '🌧️ Koramangala to Hebbal avoiding flood zones',
  '🌿 Low-carbon commute: MG Road to Electronic City',
];

export const NaturalLanguageSearchBar: React.FC<NaturalLanguageSearchBarProps> = ({
  nodes,
  onRouteDispatched,
  isCalculating = false,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Voice recognition is not supported in this browser. Please use Chrome/Edge or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('🎙️ Listening... Speak your origin, destination or commute preference.');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setStatusMessage(`Mic error: ${event.error}. Try typing your route.`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleSearch = async (queryText?: string) => {
    const textToSearch = queryText || prompt;
    if (!textToSearch.trim() || isAiProcessing || isCalculating) return;

    setIsAiProcessing(true);
    setStatusMessage('Consulting Gemini AI Dispatcher...');

    try {
      const landmarks = nodes.map((n) => ({ id: n.id, name: n.name }));
      const parsed: ParsedCommuteIntent | null = await parseCommuteIntent(textToSearch, landmarks);

      if (!parsed || !parsed.originQuery || !parsed.destinationQuery) {
        setStatusMessage('Could not resolve origin/destination. Try naming landmarks like Majestic or Whitefield.');
        setIsAiProcessing(false);
        return;
      }

      // Find best matching node IDs
      const findBestNode = (query: string): TransitNode => {
        const q = query.toLowerCase();
        const exact = nodes.find((n) => n.name.toLowerCase() === q || n.id.toLowerCase() === q);
        if (exact) return exact;

        const partial = nodes.find((n) => n.name.toLowerCase().includes(q) || q.includes(n.name.toLowerCase()));
        if (partial) return partial;

        return nodes[0];
      };

      const originNode = findBestNode(parsed.originQuery);
      let destNode = findBestNode(parsed.destinationQuery);

      if (originNode.id === destNode.id) {
        destNode = nodes.find((n) => n.id !== originNode.id) || nodes[1];
      }

      setStatusMessage(
        parsed.explanation ||
          `Routing from ${originNode.name} to ${destNode.name} (${parsed.preference || 'BALANCED'}).`
      );

      onRouteDispatched(originNode.id, destNode.id, parsed.preference);
    } catch (err) {
      console.error('[NL Search] Dispatch error:', err);
      setStatusMessage('Gemini dispatch error. Falling back to default route.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300 pointer-events-none" />
        <div className="relative flex items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-2xl">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 mr-3 shrink-0">
            {isAiProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            )}
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Ask AI Copilot: 'Take me from Indiranagar to Forum Mall avoiding Silk Board'..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
            disabled={isAiProcessing || isCalculating}
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop listening' : 'Voice commute search (Hands-Free)'}
            className={`p-2 rounded-xl border transition-all cursor-pointer mr-1 shrink-0 ${
              isListening
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse ring-2 ring-rose-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-sky-300'
            }`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-rose-400 animate-bounce" />
            ) : (
              <Mic className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <button
            onClick={() => handleSearch()}
            disabled={!prompt.trim() || isAiProcessing || isCalculating}
            className="ml-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            <span>Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar py-1 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
          <Compass className="w-3 h-3 text-sky-400" />
          Prompts:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(qp.replace(/^[^\s]+\s/, ''));
              handleSearch(qp.replace(/^[^\s]+\s/, ''));
            }}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Live AI Status Feedback */}
      {statusMessage && (
        <div className="mt-1.5 text-xs text-sky-300/90 font-mono bg-sky-950/40 border border-sky-800/40 px-3 py-1.5 rounded-lg flex items-center justify-between animate-fadeIn">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
