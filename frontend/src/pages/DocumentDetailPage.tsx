import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { VoicePlayer } from '../components/VoicePlayer';
import { SubscriptionRequiredModal } from '../components/SubscriptionRequiredModal';
import { api } from '../api/axios';
import { LegalDocument, Analysis, Clause, Risk, Charge, ImportantDate, TimelineEvent, FairnessAnalysis } from '../types';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Calendar,
  Clock,
  MessageSquare,
  Download,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Send,
  Loader2,
  FileCheck,
  Scale,
  Sparkles,
  Globe,
  Copy,
  Check,
  Plus,
  History,
  Trash2,
  Volume2,
  Square,
  Printer,
} from 'lucide-react';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'clauses' | 'risks' | 'charges' | 'timeline' | 'fairness' | 'chat'>('overview');

  // Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLang, setChatLang] = useState<'en' | 'ta'>('ta');
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true);
  const [activeVoiceMsgIndex, setActiveVoiceMsgIndex] = useState<number | null>(null);
  const [activeVoiceLang, setActiveVoiceLang] = useState<'ta' | 'en'>('ta');
  const [voiceLoadingIndex, setVoiceLoadingIndex] = useState<number | null>(null);
  const [voiceLoadingLang, setVoiceLoadingLang] = useState<'ta' | 'en' | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioUrlCache, setAudioUrlCache] = useState<{ [key: string]: string }>({});
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Language & translation state
  const [summaryLang, setSummaryLang] = useState<'en' | 'ta'>('en');
  const [translatingSummary, setTranslatingSummary] = useState(false);
  const [translatedSummaryCache, setTranslatedSummaryCache] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalMessage, setSubModalMessage] = useState<string | undefined>();

  const getFullEnglishSummaryText = (): string => {
    if (!document || !document.analysis) return '';
    const a = document.analysis;
    if (a.structuredSummary) return a.structuredSummary;

    const parties = a.partiesInvolved || (a as any).rawAiResponse?.partiesInvolved || 'Executing entities stipulated in document preamble';

    return `### Legal Document Summary

**1. Document Overview**
* Document Type: ${a.documentType || 'Legal Agreement'}
* Main Purpose: ${a.summaryPlain}
* Scope & Context: Legally binding instrument specifying rights, financial obligations, and enforcement terms.

**2. Parties Involved**
* ${parties}

**3. Key Facts**
* ${a.summaryDetailed}

**4. Important Legal Provisions**
${a.clauses && a.clauses.length > 0
  ? a.clauses.map((c) => `* **${c.title}** (${c.category}): ${c.explanationPlain}`).join('\n')
  : '* Standard legal clauses governing obligations, notice periods, and dispute resolution apply.'}

**5. Rights and Obligations**
* ${a.whatYouAreAgreeingTo}

**6. Key Terms and Conditions**
* Financial Terms: ${a.financialSummary}
${a.penalties && a.penalties.length > 0
  ? a.penalties.map((p) => `* Penalty Condition: ${p.triggerCondition} -> ${p.penaltyAmountOrTerm}`).join('\n')
  : ''}

**7. Important Dates and Deadlines**
${a.timelineEvents && a.timelineEvents.length > 0
  ? a.timelineEvents.map((t) => `* ${t.eventDate || `Milestone ${t.sequenceOrder}`}: ${t.title} - ${t.description}`).join('\n')
  : '* Execution Date and standard notice deadlines apply.'}

**8. Legal Issues / Main Points**
${a.risks && a.risks.length > 0
  ? a.risks.map((r) => `* [${r.riskLevel} CONCERN] ${r.title}: ${r.reasonPlain}`).join('\n')
  : '* No immediate high-risk structural issues identified.'}

**9. Practical Takeaways**
* ${a.summaryPlain} Always review notice periods and deposit refund terms before signing.

**10. Important Cautions**
${a.risks && a.risks.length > 0
  ? a.risks.map((r) => `* CAUTION (${r.riskLevel}): ${r.title} - ${r.reasonPlain}`).join('\n')
  : '* Read all clauses carefully before signing.'}`;
  };

  const handleSummaryLangChange = async (lang: 'en' | 'ta') => {
    setSummaryLang(lang);
    setTranslationError(null);

    if (lang === 'ta' && !translatedSummaryCache) {
      setTranslatingSummary(true);
      try {
        const fullSummary = getFullEnglishSummaryText();
        const res = await api.post(`/documents/${id}/translate`, { text: fullSummary, targetLang: 'ta' });
        const translated = res.data?.data?.translatedText || res.data?.translatedText;
        if (translated) {
          setTranslatedSummaryCache(translated);
        } else {
          setTranslationError('Translation service returned empty result.');
        }
      } catch (err: any) {
        if (err.response?.status === 403 || err.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
          setSubModalMessage('An active Premium (₹299/mo) or Enterprise subscription is required to translate summaries into Tamil.');
          setIsSubModalOpen(true);
        }
        setTranslationError(err.response?.data?.error?.message || err.message || 'Failed to generate Tamil translation.');
      } finally {
        setTranslatingSummary(false);
      }
    }
  };

  const handleCopySummary = () => {
    const textToCopy = summaryLang === 'ta' && translatedSummaryCache ? translatedSummaryCache : getFullEnglishSummaryText();
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const fetchDocument = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      if (res.data?.success) {
        setDocument(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (targetSessionId?: string) => {
    try {
      const res = await api.get(`/documents/${id}/chat`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const sessions = res.data.data;
        setChatSessions(sessions);
        if (sessions.length > 0) {
          const sessionToLoad = targetSessionId
            ? sessions.find((s: any) => s.id === targetSessionId)
            : currentSessionId
            ? sessions.find((s: any) => s.id === currentSessionId)
            : sessions[0];

          if (sessionToLoad) {
            setCurrentSessionId(sessionToLoad.id);
            setChatMessages(sessionToLoad.messages || []);
          } else {
            setCurrentSessionId(sessions[0].id);
            setChatMessages(sessions[0].messages || []);
          }
        } else {
          setChatSessions([]);
          setCurrentSessionId(null);
          setChatMessages([]);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchDocument();
    fetchChatHistory();
  }, [id]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const stopChatVoice = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveVoiceMsgIndex(null);
    setVoiceLoadingIndex(null);
    setVoiceLoadingLang(null);
  };

  const speakWithBrowserFallback = (text: string, lang: 'en' | 'ta', index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setActiveVoiceMsgIndex(null);
      return;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const clean = text.replace(/[#*`_>~]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 0.9;

      if (lang === 'ta') {
        const voices = synth.getVoices();
        const tamilVoice = voices.find((v) =>
          v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')
        );
        if (tamilVoice) {
          utterance.voice = tamilVoice;
        }
      }

      utterance.onend = () => {
        setActiveVoiceMsgIndex(null);
      };
      utterance.onerror = () => {
        setActiveVoiceMsgIndex(null);
      };

      synth.speak(utterance);
      setActiveVoiceMsgIndex(index);
      setActiveVoiceLang(lang);
    } catch {
      setActiveVoiceMsgIndex(null);
    }
  };

  const playMessageVoice = async (content: string, index: number, targetLang: 'ta' | 'en' = 'ta') => {
    if (activeVoiceMsgIndex === index && activeVoiceLang === targetLang) {
      stopChatVoice();
      return;
    }

    stopChatVoice();
    setVoiceLoadingIndex(index);
    setVoiceLoadingLang(targetLang);

    try {
      const cacheKey = `${index}_${targetLang}`;
      let audioUrl = audioUrlCache[cacheKey];

      if (!audioUrl) {
        const res = await api.post(
          '/documents/tts',
          { text: content, lang: targetLang },
          { responseType: 'blob' }
        );
        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
        setAudioUrlCache((prev) => ({ ...prev, [cacheKey]: audioUrl }));
      }

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setActiveVoiceMsgIndex(null);
        setCurrentAudio(null);
      };

      audio.onerror = (e) => {
        console.warn('Audio element error, falling back to browser speech synthesis:', e);
        speakWithBrowserFallback(content, targetLang, index);
      };

      await audio.play();
      setCurrentAudio(audio);
      setActiveVoiceMsgIndex(index);
      setActiveVoiceLang(targetLang);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
        setSubModalMessage('An active Premium (₹299/mo) or Enterprise subscription is required for AI voice playback.');
        setIsSubModalOpen(true);
        return;
      }
      console.warn('Backend TTS failed, trying browser synthesis fallback:', err);
      speakWithBrowserFallback(content, targetLang, index);
    } finally {
      setVoiceLoadingIndex(null);
      setVoiceLoadingLang(null);
    }
  };

  const handleNewChat = () => {
    stopChatVoice();
    setCurrentSessionId(null);
    setChatMessages([]);
    setChatQuestion('');
  };

  const handleSelectSession = (session: any) => {
    stopChatVoice();
    setCurrentSessionId(session.id);
    setChatMessages(session.messages || []);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (
      !window.confirm(
        chatLang === 'ta'
          ? 'இந்த உரையாடலை நீக்க விரும்புகிறீர்களா?'
          : 'Are you sure you want to delete this chat session?'
      )
    ) {
      return;
    }
    stopChatVoice();
    try {
      await api.delete(`/documents/${id}/chat/${sessionId}`);
      const updated = chatSessions.filter((s) => s.id !== sessionId);
      setChatSessions(updated);
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].id);
          setChatMessages(updated[0].messages || []);
        } else {
          setCurrentSessionId(null);
          setChatMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim() || chatLoading) return;

    const q = chatQuestion.trim();
    const userMsg = { role: 'user', content: q, createdAt: new Date().toISOString() };

    // Auto-detect if question is in Tamil or explicitly requests Tamil
    const isTamilQuestion = /[\u0B80-\u0BFF]/.test(q) || /tamil|தமிழில்|தமிழ்/i.test(q);
    const activeLang = isTamilQuestion ? 'ta' : chatLang;
    if (isTamilQuestion && chatLang !== 'ta') {
      setChatLang('ta');
    }

    const historyPayload = chatMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    setChatMessages((prev) => [...prev, userMsg]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await api.post(`/documents/${id}/chat`, {
        question: q,
        history: historyPayload,
        sessionId: currentSessionId || undefined,
        lang: activeLang,
      });

      if (res.data?.success) {
        const assistantContent =
          res.data.reply ||
          res.data.data?.message?.content ||
          res.data.data?.reply ||
          'Answer generated.';
        const assistantMsg = res.data.data?.message || {
          role: 'assistant',
          content: assistantContent,
          sources: res.data.data?.sources || res.data.sources,
          createdAt: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);

        const activeId = res.data.data?.sessionId || res.data.sessionId || currentSessionId;
        if (activeId) {
          setCurrentSessionId(activeId);
        }
        // Refresh sidebar sessions to reflect updated session title or new session
        const historyRes = await api.get(`/documents/${id}/chat`);
        if (historyRes.data?.success && Array.isArray(historyRes.data.data)) {
          setChatSessions(historyRes.data.data);
        }
      } else {
        const errMsg = res.data?.error?.message || res.data?.error || 'Unable to process question.';
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error: ${errMsg}`, createdAt: new Date().toISOString() },
        ]);
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
        setSubModalMessage('An active Premium (₹299/mo) or Enterprise subscription is required to use AI Document Chat.');
        setIsSubModalOpen(true);
      }
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to backend server.';
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}`, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const res = await api.post(`/documents/${id}/report`);
      if (res.data?.success && res.data.data.pdfUrl) {
        const url = res.data.data.pdfUrl;
        const link = window.document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `LegalAI_Report_${id ? id.substring(0, 8) : 'doc'}.pdf`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
        setSubModalMessage('An active Premium (₹299/mo) or Enterprise subscription is required to generate and download comprehensive legal PDF reports.');
        setIsSubModalOpen(true);
      } else {
        alert('Failed to generate PDF report: ' + (err.response?.data?.error?.message || err.message));
      }
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Loading document analysis workspace...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!document || !document.analysis) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Analysis Pending or Unavailable</h2>
          <p className="text-slate-500 text-xs">
            Document processing state: <strong>{document?.status || 'UNKNOWN'}</strong>.{' '}
            {document?.processingError && `Error: ${document.processingError}`}
          </p>
          <Link to="/dashboard" className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl inline-block shadow-sm">
            Back to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const analysis: Analysis = document.analysis;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Top Header & Document Banner */}
      <section className="bg-white border-b border-slate-200/90 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto space-y-4">
          <Link to="/dashboard" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{document.originalName}</h1>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                      {analysis.documentType}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Review Before You Sign</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center space-x-1.5 transition-all cursor-pointer no-print print:hidden shadow-xs"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={downloadingReport}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer no-print print:hidden shrink-0"
              >
                {downloadingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Report...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold no-print print:hidden">
          {[
            { id: 'overview', label: 'Overview', icon: FileCheck },
            { id: 'clauses', label: `Clauses (${analysis.clauses.length})`, icon: FileText },
            { id: 'risks', label: `Risks (${analysis.risks.length})`, icon: ShieldCheck },
            { id: 'charges', label: `Charges & Penalties (${analysis.charges.length + analysis.penalties.length})`, icon: DollarSign },
            { id: 'timeline', label: `Timeline (${analysis.timelineEvents.length})`, icon: Calendar },
            { id: 'fairness', label: `Fairness (${analysis.fairnessAnalyses.length})`, icon: Scale },
            { id: 'chat', label: 'AI Assistant Chat', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW / LEGAL SUMMARY */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Voice Player Assistant with Language Selector */}
            <div className="no-print print:hidden">
              <VoicePlayer
                textEnglish={analysis.summaryPlain}
                textTamil={analysis.summaryTamil}
                documentId={id}
              />
            </div>

            {/* Structured Summary Card Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <span>Structured Legal Document Summary</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comprehensive 10-point intelligence breakdown extracted from the contract.
                  </p>
                </div>

                <div className="flex items-center space-x-3 no-print print:hidden print-hide-controls">
                  {/* Language Selector Toggle */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200 text-xs">
                    <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                    <span className="text-[11px] font-bold text-slate-500 pr-1">Language:</span>
                    <button
                      onClick={() => handleSummaryLangChange('en')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        summaryLang === 'en'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => handleSummaryLangChange('ta')}
                      disabled={translatingSummary}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
                        summaryLang === 'ta'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {translatingSummary ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>தமிழ்...</span>
                        </>
                      ) : (
                        <span>தமிழ்</span>
                      )}
                    </button>
                  </div>

                  {/* Copy Summary Button */}
                  <button
                    onClick={handleCopySummary}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 border border-slate-200"
                    title="Copy Summary"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TAMIL SUMMARY VIEW */}
              {summaryLang === 'ta' && (
                <div className="space-y-4">
                  {translatingSummary ? (
                    <div className="py-16 text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Translating Legal Summary into Tamil (தமிழ்)...</p>
                      <p className="text-[11px] text-slate-500">Preserving legal section numbers, dates, terms, and structure...</p>
                    </div>
                  ) : translationError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
                      <p className="font-bold">⚠️ Translation Error</p>
                      <p>{translationError}</p>
                      <button
                        onClick={() => handleSummaryLangChange('ta')}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
                      >
                        Retry Tamil Translation
                      </button>
                    </div>
                  ) : translatedSummaryCache ? (
                    <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-5 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {translatedSummaryCache}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ENGLISH STRUCTURED SUMMARY VIEW */}
              {summaryLang === 'en' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-800">
                  
                  {/* 1. Document Overview */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">1. Document Overview</h4>
                    <p><strong>Document Type:</strong> {analysis.documentType || 'Legal Agreement'}</p>
                    <p><strong>Main Purpose:</strong> {analysis.summaryPlain}</p>
                    <p className="text-slate-500 text-[11px]">Binding agreement setting rights, financial charges, and termination guidelines.</p>
                  </div>

                  {/* 2. Parties Involved */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">2. Parties Involved</h4>
                    <p className="leading-relaxed font-medium text-slate-800">
                      {analysis.partiesInvolved || (analysis as any).rawAiResponse?.partiesInvolved || 'Executing entities stipulated in document preamble.'}
                    </p>
                  </div>

                  {/* 3. Key Facts */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2 md:col-span-2">
                    <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">3. Key Facts & Circumstances</h4>
                    <p className="leading-relaxed">{analysis.summaryDetailed}</p>
                  </div>

                  {/* 4. Important Legal Provisions */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2 md:col-span-2">
                    <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">4. Important Legal Provisions</h4>
                    {analysis.clauses && analysis.clauses.length > 0 ? (
                      <ul className="space-y-2">
                        {analysis.clauses.map((c) => (
                          <li key={c.id} className="border-b border-slate-200/60 pb-2 last:border-0">
                            <span className="font-bold text-slate-900">• {c.title} ({c.category}):</span>{' '}
                            <span>{c.explanationPlain}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Standard legal provisions governing contractual obligations apply.</p>
                    )}
                  </div>

                  {/* 5. Rights and Obligations */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-emerald-700 text-xs uppercase tracking-wider">5. Rights & Core Obligations</h4>
                    <p className="leading-relaxed">{analysis.whatYouAreAgreeingTo}</p>
                  </div>

                  {/* 6. Key Terms and Conditions */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">6. Key Terms & Financial Obligations</h4>
                    <p>{analysis.financialSummary}</p>
                    {analysis.penalties && analysis.penalties.length > 0 && (
                      <div className="pt-1">
                        <span className="font-bold text-red-700 block">Penalties / Defaults:</span>
                        {analysis.penalties.map((p) => (
                          <p key={p.id} className="text-[11px] text-slate-600">• {p.triggerCondition}: {p.penaltyAmountOrTerm}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 7. Important Dates and Deadlines */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-amber-700 text-xs uppercase tracking-wider">7. Important Dates & Timeline</h4>
                    {analysis.timelineEvents && analysis.timelineEvents.length > 0 ? (
                      <ul className="space-y-1">
                        {analysis.timelineEvents.map((t) => (
                          <li key={t.id} className="text-[11px]">
                            <span className="font-bold text-blue-600">{t.eventDate || `Step ${t.sequenceOrder}`}:</span> {t.title} - {t.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Standard execution timeline applies.</p>
                    )}
                  </div>

                  {/* 8. Legal Issues / Main Points */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-amber-700 text-xs uppercase tracking-wider">8. Legal Issues & Findings</h4>
                    {analysis.risks && analysis.risks.length > 0 ? (
                      <ul className="space-y-1 text-[11px]">
                        {analysis.risks.map((r) => (
                          <li key={r.id}>
                            <span className={`font-bold ${r.riskLevel === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`}>
                              [{r.riskLevel} CONCERN] {r.title}:
                            </span>{' '}
                            {r.reasonPlain}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No critical structural legal issues detected.</p>
                    )}
                  </div>

                  {/* 9. Practical Takeaways */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-emerald-700 text-xs uppercase tracking-wider">9. Practical Takeaways</h4>
                    <p className="leading-relaxed">{analysis.summaryPlain} Always verify deposit refund procedures, notice periods, and maintenance caps before executing.</p>
                  </div>

                  {/* 10. Important Cautions */}
                  <div className="bg-red-50/60 border border-red-200 rounded-xl p-5 space-y-2">
                    <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wider">10. Important Cautions & Red Flags</h4>
                    {analysis.risks && analysis.risks.filter((r) => r.riskLevel === 'HIGH').length > 0 ? (
                      <ul className="space-y-1 text-[11px] text-red-900">
                        {analysis.risks.filter((r) => r.riskLevel === 'HIGH').map((r) => (
                          <li key={r.id}>
                            <strong>CAUTION:</strong> {r.title} — {r.reasonPlain}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-red-800">Do not transfer advance deposit funds until all oral promises are reflected in writing.</p>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 2: CLAUSES */}
        {activeTab === 'clauses' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Extracted Key Clauses</h3>
            <div className="grid grid-cols-1 gap-4">
              {analysis.clauses.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{c.title}</span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
                        {c.category}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
                        c.riskLevel === 'HIGH'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : c.riskLevel === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {c.riskLevel} RISK
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 font-mono italic">
                    "{c.extractedText}"
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">Plain English Explanation:</span>
                      <p className="text-slate-800">{c.explanationPlain}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-700 block mb-1">Executive Notes:</span>
                      <p className="text-slate-800">{c.explanationTamil}</p>
                    </div>
                  </div>

                  {c.sourceRef && (
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-medium">
                      Source Reference: {c.sourceRef} {c.pageNumber ? `(Page ${c.pageNumber})` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RISKS */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Identified Concerns & Flagged Risks</h3>
            <div className="grid grid-cols-1 gap-4">
              {analysis.risks.map((r) => (
                <div
                  key={r.id}
                  className={`border rounded-2xl p-6 space-y-4 shadow-sm ${
                    r.riskLevel === 'HIGH' ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                      <AlertTriangle className={`w-4 h-4 ${r.riskLevel === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`} />
                      <span>{r.title}</span>
                    </div>
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        r.riskLevel === 'HIGH'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {r.riskLevel} CONCERN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">Reason (Plain English):</span>
                      <p className="text-slate-800">{r.reasonPlain}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-700 block mb-1">Risk Explanation:</span>
                      <p className="text-slate-800">{r.reasonTamil}</p>
                    </div>
                  </div>

                  {r.suggestedNegotiation && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-1">
                      <span className="font-bold text-emerald-800 block">AI Suggested Counter-Proposal Draft:</span>
                      <p className="text-emerald-900 font-mono">{r.suggestedNegotiation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CHARGES & PENALTIES */}
        {activeTab === 'charges' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-3">Hidden Charges & Mandatory Fees</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.charges.map((ch) => (
                  <div key={ch.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900">{ch.name}</span>
                      <span className="text-amber-700">{ch.amountCondition}</span>
                    </div>
                    <p className="text-xs text-slate-600">{ch.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-3">Penalties & Default Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.penalties.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
                    <div className="text-xs font-bold text-red-700">Trigger: {p.triggerCondition}</div>
                    <div className="text-xs font-mono font-semibold text-slate-900">Penalty Term: {p.penaltyAmountOrTerm}</div>
                    <p className="text-xs text-slate-600">{p.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-slate-900">Chronological Document Timeline</h3>
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
              {analysis.timelineEvents.map((te) => (
                <div key={te.id} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs" />
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-blue-600">{te.eventDate || `Step ${te.sequenceOrder}`}</span>
                      {te.sourceRef && <span className="text-slate-400 text-[10px]">{te.sourceRef}</span>}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{te.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{te.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: FAIRNESS ANALYSIS */}
        {activeTab === 'fairness' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Clause Fairness Benchmark Indicator</h3>
            <p className="text-xs text-slate-500">
              Evaluates clauses against standard industry benchmarks (0.0 = highly one-sided, 1.0 = standard fair balance).
            </p>

            <div className="grid grid-cols-1 gap-4">
              {analysis.fairnessAnalyses.map((fa) => (
                <div key={fa.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{fa.clauseTitle}</h4>
                      <span className="text-[11px] text-slate-500">Category: {fa.benchmarkCategory}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 font-medium">Fairness:</span>
                      <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full ${
                            fa.imbalanceScore < 0.5 ? 'bg-red-500' : fa.imbalanceScore < 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.round(fa.imbalanceScore * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-900">{(fa.imbalanceScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <p className="text-slate-800"><strong>Benchmark Concern:</strong> {fa.reason}</p>
                    <p className="text-slate-600 font-mono"><strong>Evidence:</strong> "{fa.evidence}"</p>
                  </div>

                  {fa.suggestedAlternative && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1">
                      <span className="font-bold text-blue-800 block">Balanced Alternative Wording:</span>
                      <p className="text-blue-900">{fa.suggestedAlternative}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: AI DOCUMENT CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-sm">
            {/* Top Chat Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowHistorySidebar((prev) => !prev)}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    showHistorySidebar
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={showHistorySidebar ? 'Hide Chat History' : 'Show Chat History'}
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline font-bold">
                    {chatLang === 'ta' ? 'வரலாறு' : 'History'} ({chatSessions.length})
                  </span>
                </button>

                <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[180px] sm:max-w-xs">
                    {currentSessionId
                      ? (chatSessions.find((s) => s.id === currentSessionId)?.title || 'Document Q&A')
                      : (chatLang === 'ta' ? 'புதிய உரையாடல்' : 'New Chat Session')}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* New Chat Button */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{chatLang === 'ta' ? '+ புதிய சாட்' : '+ New Chat'}</span>
                </button>

                {/* Language Selector Toggle */}
                <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setChatLang('en')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      chatLang === 'en'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatLang('ta')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      chatLang === 'ta'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    தமிழ்
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Body: Sidebar + Conversation */}
            <div className="flex-1 flex overflow-hidden">
              {/* Collapsible History Sidebar */}
              {showHistorySidebar && (
                <div className="w-64 sm:w-72 border-r border-slate-200 bg-slate-50/70 flex flex-col flex-shrink-0 animate-in fade-in slide-in-from-left duration-200">
                  <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {chatLang === 'ta' ? 'உரையாடல்கள்' : 'Sessions'}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                        {chatSessions.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{chatLang === 'ta' ? 'புதியது' : 'New'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {chatSessions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {chatLang === 'ta' ? 'முந்தைய உரையாடல்கள் எதுவும் இல்லை' : 'No previous chat sessions'}
                      </div>
                    ) : (
                      chatSessions.map((session) => {
                        const isSelected = currentSessionId === session.id;
                        return (
                          <div
                            key={session.id}
                            onClick={() => handleSelectSession(session)}
                            className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border text-left flex items-start justify-between ${
                              isSelected
                                ? 'bg-white border-blue-500 shadow-xs'
                                : 'bg-transparent border-transparent hover:bg-slate-100/90'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div
                                className={`text-xs font-bold truncate ${
                                  isSelected ? 'text-blue-700' : 'text-slate-800'
                                }`}
                              >
                                {session.title || (chatLang === 'ta' ? 'ஆவண விளக்கம்' : 'Document Q&A')}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2">
                                <span>
                                  {new Date(session.createdAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span>•</span>
                                <span>
                                  {session.messages?.length || 0} {chatLang === 'ta' ? 'செய்திகள்' : 'msgs'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-600 text-slate-400 p-1 rounded-md transition-opacity"
                              title={chatLang === 'ta' ? 'நீக்கு' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Main Chat Conversation Panel */}
              <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
                {/* Chat Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {chatLang === 'ta' ? 'ஆவண உரையாடலைத் தொடங்குங்கள்' : 'Start a New Document Discussion'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        {chatLang === 'ta'
                          ? 'இந்த ஆவணத்தைப் பற்றி ஏதேனும் கேள்விகள் கேட்கலாம். விடை உங்கள் திரையில் காட்டப்படுவதுடன், அதை குரல் வழியே கேட்கவும் செய்யலாம்.'
                          : 'Ask specific questions about clauses, notice periods, or signatories. You can also listen to audio explanations with Read to Voice.'}
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((m, idx) => {
                      const isUser = m.role === 'user';
                      const isTamilVoicePlaying = activeVoiceMsgIndex === idx && activeVoiceLang === 'ta';
                      const isTamilVoiceLoading = voiceLoadingIndex === idx && voiceLoadingLang === 'ta';
                      const isEnglishVoicePlaying = activeVoiceMsgIndex === idx && activeVoiceLang === 'en';
                      const isEnglishVoiceLoading = voiceLoadingIndex === idx && voiceLoadingLang === 'en';

                      return (
                        <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                              isUser
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>

                            {m.sources && m.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-blue-600 font-semibold">
                                Sources Cited: {m.sources.join(', ')}
                              </div>
                            )}

                            {/* Read to Voice Explanation Options for Assistant Responses */}
                            {!isUser && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Primary: Tamil Voice Explanation Button */}
                                  <button
                                    type="button"
                                    onClick={() => playMessageVoice(m.content, idx, 'ta')}
                                    disabled={isTamilVoiceLoading || isEnglishVoiceLoading}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all shadow-2xs ${
                                      isTamilVoicePlaying
                                        ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                                        : isTamilVoiceLoading
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-wait'
                                        : 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600'
                                    }`}
                                    title="தமிழில் குரல் வழியே கேட்க (Tamil Voice Explanation)"
                                  >
                                    {isTamilVoiceLoading ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
                                        <span>தமிழ் குரல் தயாராகிறது...</span>
                                      </>
                                    ) : isTamilVoicePlaying ? (
                                      <>
                                        <Square className="w-3.5 h-3.5 fill-red-600 text-red-600 animate-pulse" />
                                        <span>நிறுத்து (Stop Tamil)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 className="w-3.5 h-3.5" />
                                        <span>🔊 தமிழ் குரல் விளக்கம் (Tamil Voice)</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Secondary: English Voice Button */}
                                  <button
                                    type="button"
                                    onClick={() => playMessageVoice(m.content, idx, 'en')}
                                    disabled={isTamilVoiceLoading || isEnglishVoiceLoading}
                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5 transition-all shadow-2xs ${
                                      isEnglishVoicePlaying
                                        ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                                        : isEnglishVoiceLoading
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-wait'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/90 border border-slate-200'
                                    }`}
                                    title="Listen in English"
                                  >
                                    {isEnglishVoiceLoading ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                        <span>Loading...</span>
                                      </>
                                    ) : isEnglishVoicePlaying ? (
                                      <>
                                        <Square className="w-3.5 h-3.5 fill-red-600 text-red-600 animate-pulse" />
                                        <span>Stop English</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                                        <span>English Voice</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <span className="text-[10px] text-slate-400">
                                  {m.createdAt
                                    ? new Date(m.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center space-x-2 shadow-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>
                          {chatLang === 'ta'
                            ? 'ஆவணத்தை ஆராய்ந்து விடை காண்கிறது...'
                            : 'Analyzing document context...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form
                  onSubmit={handleSendChat}
                  className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3"
                >
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder={
                      chatLang === 'ta'
                        ? "கேள்வி கேளுங்கள்... எ.கா. 'யார் உத்தரவிட்டுள்ளார்? சர்வே எண் என்ன?'"
                        : "Ask e.g. 'What is the penalty or notice period?'"
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatQuestion.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{chatLang === 'ta' ? 'அனுப்பு' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      <SubscriptionRequiredModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        message={subModalMessage}
      />

      <Footer />
    </div>
  );
};
