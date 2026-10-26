import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Square, RotateCcw, Loader2, Globe } from 'lucide-react';
import { api } from '../api/axios';

interface VoicePlayerProps {
  textEnglish: string;
  textTamil?: string;
  documentId?: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ textEnglish, textTamil, documentId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [tamilScript, setTamilScript] = useState<string>(textTamil || '');
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSynth(window.speechSynthesis);
    }
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
      if (synth) {
        synth.cancel();
      }
    };
  }, [audioElement, audioBlobUrl, synth]);

  useEffect(() => {
    if (textTamil) {
      setTamilScript(textTamil);
      setAudioBlobUrl(null);
    }
  }, [textTamil]);

  const fetchTamilVoiceScript = async (): Promise<string> => {
    if (tamilScript && tamilScript.trim().length > 0) return tamilScript;
    setLoadingScript(true);
    try {
      const endpoint = documentId ? `/documents/${documentId}/voice-script` : '/documents/voice-script';
      const res = await api.post(endpoint, { text: textEnglish, lang: 'ta' });
      const script = res.data?.data?.script || res.data?.script || textEnglish;
      setTamilScript(script);
      return script;
    } catch {
      return textEnglish;
    } finally {
      setLoadingScript(false);
    }
  };

  const playTamilAudio = async (textToSpeak: string) => {
    try {
      setLoadingScript(true);
      if (synth) synth.cancel();
      if (audioElement) {
        audioElement.pause();
      }

      let url = audioBlobUrl;
      if (!url) {
        const res = await api.post('/documents/tts', { text: textToSpeak, lang: 'ta' }, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      }

      const audio = new Audio(url);
      setAudioElement(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      audio.onerror = (e) => {
        console.warn('Audio element error, falling back to speech synthesis:', e);
        speakWithBrowser(textToSpeak, 'ta');
      };

      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.warn('Backend TTS failed, using browser synthesis:', err);
      speakWithBrowser(textToSpeak, 'ta');
    } finally {
      setLoadingScript(false);
    }
  };

  const speakWithBrowser = (text: string, lang: 'en' | 'ta') => {
    if (!synth) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    utterance.rate = lang === 'ta' ? 0.9 : 0.95;

    // Try finding installed Tamil voice
    if (lang === 'ta') {
      const voices = synth.getVoices();
      const tamilVoice = voices.find((v) => v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePlay = async () => {
    if (isPaused) {
      if (audioElement) {
        audioElement.play();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }
      if (synth) {
        synth.resume();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }
    }

    if (language === 'ta') {
      const script = await fetchTamilVoiceScript();
      await playTamilAudio(script);
    } else {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      speakWithBrowser(textEnglish, 'en');
    }
  };

  const handlePause = () => {
    if (audioElement && isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      setIsPaused(true);
      return;
    }
    if (!synth || !isPlaying) return;
    synth.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if (synth) synth.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleReplay = async () => {
    handleStop();
    setTimeout(() => {
      handlePlay();
    }, 100);
  };

  const handleLanguageChange = async (newLang: 'en' | 'ta') => {
    handleStop();
    setLanguage(newLang);
    setAudioBlobUrl(null);

    if (newLang === 'ta' && !tamilScript) {
      await fetchTamilVoiceScript();
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-800 shadow-sm font-sans">
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">Voice Explanation Assistant</h4>
          <p className="text-[11px] text-slate-500 font-medium">
            Listen to AI voice narration in {language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        {/* Voice Language Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <span className="text-[11px] font-bold text-slate-500 pr-1">Voice Language:</span>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('ta')}
            disabled={loadingScript}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
              language === 'ta'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {loadingScript ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>தமிழ்...</span>
              </>
            ) : (
              <span>தமிழ்</span>
            )}
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          {!isPlaying && !isPaused ? (
            <button
              onClick={handlePlay}
              disabled={loadingScript}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-1.5 transition-all"
            >
              {loadingScript ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Play Audio</span>
            </button>
          ) : isPlaying ? (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 flex items-center space-x-1.5 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              onClick={handleStop}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="Stop Audio"
            >
              <Square className="w-4 h-4 fill-current text-red-600" />
            </button>
          )}

          <button
            onClick={handleReplay}
            disabled={loadingScript}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Replay Audio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
