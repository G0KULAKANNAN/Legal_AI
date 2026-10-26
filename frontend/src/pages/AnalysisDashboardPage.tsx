import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import {
  Scale,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload,
  Folder,
  MessageSquare,
  Settings,
  Home,
  Search,
  Bell,
  User,
  Copy,
  Check,
  Globe,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Sparkles,
  X,
  Send,
  ChevronRight,
  HelpCircle,
  FileCheck,
  AlertCircle,
  ChevronDown,
  Info,
  Menu,
  Loader2,
} from 'lucide-react';

interface QuickChip {
  id: string;
  label: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  badges?: string[];
  bullets?: string[];
}

export const AnalysisDashboardPage: React.FC = () => {
  // Navigation & Drawer States
  const [activeNav, setActiveNav] = useState('analysis');
  const [chatDrawerOpen, setChatDrawerOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState('en');

  // Copy State
  const [copied, setCopied] = useState(false);

  // Notification State
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Checklist Interactive State
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello Priya! I am your LegalAI assistant. Ask me any legal question (e.g. 'What is a contract?', 'What is Section 420 IPC?') or questions regarding your document.",
      timestamp: '10:42 AM',
      badges: ['LegalAI Assistant'],
    },
  ]);

  const quickChips: QuickChip[] = [
    { id: '1', label: 'What is a contract?' },
    { id: '2', label: 'What is Section 420 IPC?' },
    { id: '3', label: 'What is the difference between civil and criminal law?' },
  ];

  const negotiationDraft = `Dear Landlord,

Thank you for sending over the draft rental agreement. I have reviewed the terms and would like to propose a few standard adjustments before signing:

1. Security Deposit Refund: Requesting to amend Clause 4 from 90 days to 15 business days post-handover.
2. Termination Notice: Requesting reciprocal 30-day notice period for both tenant and landlord.
3. Delayed Rent Interest: Requesting to cap penalty at 1% per month standard charge instead of 24% per annum.
4. Maintenance Terms: Requesting structural maintenance over ₹2,000 to remain landlord responsibility as per Model Tenancy Guidelines.

Looking forward to your confirmation so we can finalize the agreement.

Best regards,
Priya S`;

  const handleCopyNegotiation = () => {
    navigator.clipboard.writeText(negotiationDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historyPayload = chatMessages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/chat', {
        message: text.trim(),
        history: historyPayload,
      });

      if (res.data?.success) {
        const replyText = res.data.reply || res.data.data?.reply || 'No response text generated.';
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg = res.data?.error?.message || res.data?.error || 'Unable to process question.';
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `⚠️ Error: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to backend server.';
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-slate-800 font-sans antialiased overflow-x-hidden">
      
      {/* ---------------------------------------------------------------------- */}
      {/* 1. LEFT NAVIGATION SIDEBAR (DARK NAVY THEME)                           */}
      {/* ---------------------------------------------------------------------- */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0F172A] text-slate-300 flex flex-col transition-all duration-300 z-30 shrink-0 border-r border-slate-800`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="text-lg font-bold text-white tracking-tight flex items-center space-x-1">
                  <span>Legal</span>
                  <span className="text-blue-400">AI</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-wide uppercase">Analysis Suite</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
            { id: 'upload', label: 'Upload Document', icon: Upload, path: '/dashboard' },
            { id: 'analysis', label: 'Analysis Report', icon: FileCheck, path: '#' },
            { id: 'documents', label: 'My Documents', icon: Folder, path: '/dashboard' },
            { id: 'chat', label: 'Chat with AI', icon: MessageSquare, path: '#' },
            { id: 'settings', label: 'Settings', icon: Settings, path: '#' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.id === 'chat') setChatDrawerOpen(true);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {isActive && sidebarOpen && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Badge & Language Selector */}
        {sidebarOpen ? (
          <div className="p-4 m-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs font-semibold text-slate-200">Smarter Legal Decisions</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              "Smarter legal decisions for a safer you" — AI verified clauses & protections.
            </p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Language:</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="ta">Tamil + Regional</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="p-3 text-center text-slate-400 border-t border-slate-800">
            <Globe className="w-5 h-5 mx-auto text-slate-400" />
          </div>
        )}
      </aside>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. MAIN DASHBOARD CONTENT AREA                                         */}
      {/* ---------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Rental Agreement Analysis
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3" />
                <span>Action Needed</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Document: <span className="font-semibold text-slate-700">House_Rental_Agreement_Priya.pdf</span> • Uploaded: Sep 23, 2026 • 8 Pages parsed
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative hidden sm:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clauses, risks, dates..."
                className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-600 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-30 text-xs space-y-3">
                  <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-2">
                    <span>Notifications</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">3 New</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-red-50 text-red-800 font-medium">
                      ⚠️ 90-day deposit refund clause detected.
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                      ⚡ Termination notice asymmetry requires negotiation.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-md ring-2 ring-offset-2 ring-indigo-500">
                PS
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">Priya S</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Student / Tenant</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">

          {/* ------------------------------------------------------------------ */}
          {/* TOP SECTION GRID: Health Check + Document Overview                */}
          {/* ------------------------------------------------------------------ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Legal Document Health Check Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span>Legal Document Health Check</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    AI automated safety score based on standard Indian Tenancy laws.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  High Risk Accent
                </span>
              </div>

              {/* Gauge & Warning Row */}
              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                
                {/* Circular Score Gauge SVG */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-red-500"
                      strokeDasharray="72, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-900">72</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ 100 Health</span>
                  </div>
                </div>

                {/* Warning Callout Box */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl space-y-1">
                    <h3 className="text-sm font-bold text-red-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Don't sign yet. Review 4 clauses first.</span>
                    </h3>
                    <p className="text-xs text-red-700 leading-relaxed">
                      This rental agreement contains 2 high-risk unfair clauses and 2 medium-risk hidden charges that put your security deposit at risk.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                      <span className="block text-lg font-bold text-red-600">2</span>
                      <span className="text-[10px] text-red-800 font-semibold">High Risk</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                      <span className="block text-lg font-bold text-amber-600">2</span>
                      <span className="text-[10px] text-amber-800 font-semibold">Medium Risk</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="block text-lg font-bold text-emerald-600">8</span>
                      <span className="text-[10px] text-emerald-800 font-semibold">Safe Clauses</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Overview Metadata Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Document Overview</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Extracted metadata & law compatibility.</p>
              </div>

              <div className="space-y-3 py-1">
                {[
                  { label: 'Document Type', value: 'Rental Agreement', icon: FileCheck },
                  { label: 'Language', value: 'English', icon: Globe },
                  { label: 'Country / Jurisdiction', value: 'India', icon: Scale },
                  { label: 'AI Confidence Score', value: '92% High Precision', icon: Sparkles },
                  { label: 'Law Check', value: 'Verified (Contract Act)', icon: CheckCircle2, highlight: true },
                ].map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500 flex items-center space-x-2">
                        <ItemIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.label}</span>
                      </span>
                      <span className={`font-semibold ${item.highlight ? 'text-emerald-600 font-bold' : 'text-slate-800'}`}>
                        {item.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setChatDrawerOpen(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Ask AI About Overview</span>
              </button>
            </div>

          </div>

          {/* ------------------------------------------------------------------ */}
          {/* MIDDLE SECTION GRID: Key Issues + Financial Impact + Clause Fairness */}
          {/* ------------------------------------------------------------------ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Key Issues Detected Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>Key Issues Detected</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Priority status tags for critical contract clauses.</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">4 Findings</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Refund Timeline Delay',
                    clause: 'Clause 4: Security Deposit Refund',
                    desc: 'Landlord takes 90 days to return deposit after vacating. Industry standard is 15-30 days.',
                    risk: 'HIGH RISK',
                    riskBg: 'bg-red-100 text-red-800 border-red-200',
                  },
                  {
                    title: 'Termination Notice Asymmetry',
                    clause: 'Clause 9: Notice Period',
                    desc: 'Tenant must give 3 months notice to vacate; landlord can terminate with only 7 days notice.',
                    risk: 'HIGH RISK',
                    riskBg: 'bg-red-100 text-red-800 border-red-200',
                  },
                  {
                    title: 'Excessive Delay Penalty Rate',
                    clause: 'Clause 6: Payment Terms',
                    desc: '24% annual interest charged on delayed rent payments. Cap recommended at 1-2% per month.',
                    risk: 'MEDIUM RISK',
                    riskBg: 'bg-amber-100 text-amber-800 border-amber-200',
                  },
                  {
                    title: 'Structural Maintenance Liability',
                    clause: 'Clause 12: Repairs & Upkeep',
                    desc: 'Tenant responsible for major structural maintenance over ₹5,000. Should be landlord duty.',
                    risk: 'MEDIUM RISK',
                    riskBg: 'bg-amber-100 text-amber-800 border-amber-200',
                  },
                ].map((issue, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{issue.title}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${issue.riskBg}`}>
                        {issue.risk}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">{issue.clause}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{issue.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Stack: Financial Impact & Clause Fairness Score */}
            <div className="space-y-6">

              {/* Financial Impact Callout Box */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/30 to-white rounded-2xl p-6 shadow-sm border border-amber-200 space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                    ₹
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Financial Impact Assessment</h4>
                    <p className="text-[11px] text-slate-500">Estimated hidden costs & liabilities</p>
                  </div>
                </div>

                <div className="space-y-2 bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-medium">Potential Hidden Liabilities:</span>
                    <span className="text-lg font-black text-amber-600">₹50,000</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Rent Increase Escalation:</span>
                    <span className="text-xs font-bold text-slate-800">₹3,000/mo (+10% Annual)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Uncapped repair obligations and non-refundable maintenance clauses could increase your annual expense by over ₹50,000.
                </p>
              </div>

              {/* Clause Fairness Score Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Clause Fairness Score</span>
                  </h4>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Moderate (62/100)
                  </span>
                </div>

                {/* Circular Score Visual */}
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-400 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xl font-black text-slate-900">62%</span>
                    <span className="text-[9px] font-bold text-amber-700 uppercase">Fair</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Evaluates clause balance between landlord and tenant. <strong>6 clauses favor landlord</strong>, <strong>2 favor tenant</strong>.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* ------------------------------------------------------------------ */}
          {/* BOTTOM SECTION GRID: Checklist, Actions, Draft, Deadlines          */}
          {/* ------------------------------------------------------------------ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column: What You Should Check + Recommended Actions */}
            <div className="space-y-6">
              
              {/* What You Should Check Checklist */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>What You Should Check (Action Checklist)</span>
                </h3>

                <div className="space-y-2.5">
                  {[
                    { id: 1, text: 'Confirm exact deposit amount (₹1,50,000) matches bank transaction draft.' },
                    { id: 2, text: 'Negotiate deposit refund window from 90 days to 15 business days.' },
                    { id: 3, text: 'Ensure reciprocal 30-day termination notice for both tenant and landlord.' },
                    { id: 4, text: 'Clarify structural maintenance responsibilities in writing.' },
                    { id: 5, text: 'Verify landlord property ownership documents and tax receipts.' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                        checkedItems[item.id]
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                          checkedItems[item.id]
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checkedItems[item.id] && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-xs font-medium leading-normal ${checkedItems[item.id] ? 'line-through text-slate-400' : ''}`}>
                        {item.id}. {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span>Recommended Actions</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Send Counter Proposal', desc: 'Use AI drafted email below to negotiate 4 clauses.', tag: 'Priority 1', icon: MessageSquare },
                    { title: 'Request Addendum', desc: 'Add maintenance liability cap of ₹2,000.', tag: 'Priority 2', icon: FileText },
                  ].map((act, idx) => {
                    const ActIcon = act.icon;
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <ActIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {act.tag}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{act.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Negotiation Message Draft + Important Deadlines */}
            <div className="space-y-6">

              {/* Generate Negotiation Message Box */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                      <span>Generate Negotiation Message</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pre-drafted counter proposal for landlord.</p>
                  </div>
                  <button
                    onClick={handleCopyNegotiation}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={negotiationDraft}
                    rows={10}
                    className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none leading-relaxed resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* Important Deadlines & Agreement Comparison */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>Important Deadlines & Comparison</span>
                </h3>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Rent Due</span>
                    <span className="text-sm font-bold text-slate-800">5th Monthly</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Notice Deadline</span>
                    <span className="text-sm font-bold text-amber-600">Oct 15, 2026</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Expiry Date</span>
                    <span className="text-sm font-bold text-slate-800">Aug 31, 2027</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/dashboard"
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors border border-slate-200"
                  >
                    <span>Compare with Previous Agreements</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. RIGHT SIDEBAR (AI CHAT ASSISTANT DRAWER)                            */}
      {/* ---------------------------------------------------------------------- */}
      <aside
        className={`${
          chatDrawerOpen ? 'w-full lg:w-96' : 'w-0 hidden lg:flex'
        } bg-white border-l border-slate-200 flex flex-col transition-all duration-300 z-30 shrink-0 shadow-lg`}
      >
        {chatDrawerOpen && (
          <>
            {/* AI Drawer Header */}
            <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>AI Chat</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-extrabold">Beta</span>
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online & Ready</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setChatDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Badges */}
                    {msg.badges && msg.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.badges.map((b, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bullet Points */}
                    {msg.bullets && msg.bullets.length > 0 && (
                      <ul className="space-y-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                        {msg.bullets.map((bullet, i) => (
                          <li key={i} className="flex items-start space-x-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 flex items-center space-x-2 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Input & Quick Suggestions */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              {/* Quick Suggestion Chips */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {quickChips.map((chip) => (
                  <button
                    key={chip.id}
                    disabled={chatLoading}
                    onClick={() => handleSendChat(chip.label)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 border border-slate-200 text-[11px] font-medium text-slate-600 whitespace-nowrap transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Text Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  disabled={chatLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask AI a legal question..."
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        )}
      </aside>

    </div>
  );
};

export default AnalysisDashboardPage;
