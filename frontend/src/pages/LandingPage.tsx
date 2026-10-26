import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, FileSearch, HelpCircle, DollarSign, Calendar, Lock, CheckCircle2, ArrowRight, Scale, Sparkles, AlertTriangle, ShieldAlert, Award, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  if (user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/controls" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-blue-50/60 via-[#F8FAFC] to-[#F8FAFC] border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Automated Legal Document Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Review Contracts & Agreements <span className="text-blue-600">Before You Sign</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Understand legal risks, hidden charges, and unfair clauses instantly. LegalAI translates complex legalese into clear, actionable, professional insights.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Analyze Your Document Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-xs transition-all"
            >
              Sign In to Dashboard
            </Link>
          </div>

          {/* Interactive Hero Card Mockup */}
          <div className="pt-10 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl text-left space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    <FileSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">House_Rental_Agreement_2026.pdf</h3>
                    <p className="text-xs text-slate-500">8 Pages • Rental & Lease Agreement • Parsed in 1.4s</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>4 Risks Flagged</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Health Score</span>
                  <span className="text-xl font-black text-slate-900">72 / 100</span>
                </div>
                <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-100">
                  <span className="block text-[11px] font-bold text-red-700 uppercase">Deposit Refund Window</span>
                  <span className="text-xs font-bold text-red-900">90 Days (Excessive)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="block text-[11px] font-bold text-amber-700 uppercase">Hidden Liability Risk</span>
                  <span className="text-xs font-bold text-amber-900">₹50,000 Repairs</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Quick Feature Pillars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Comprehensive Legal Document Intelligence
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Built to protect tenants, employees, borrowers, and business owners from unfair contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: ShieldAlert, title: 'Granular Risk Detection', desc: 'Flags one-sided penalties, lock-in terms, and unfair forfeiture conditions.' },
            { icon: DollarSign, title: 'Hidden Fee Analysis', desc: 'Identifies unexpected maintenance fees, administrative taxes, and late charges.' },
            { icon: Calendar, title: 'Deadline Milestone Tracking', desc: 'Extracts lock-in expiry dates, rent payment cycles, and notice deadlines.' },
            { icon: HelpCircle, title: 'Plain English Insights', desc: 'Translates complex legal jargon into clear, actionable advice.' },
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{pillar.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supported Documents */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Supported Agreement Types</h2>
            <p className="text-slate-500 text-xs max-w-2xl mx-auto">
              Our automated Gemini AI pipeline supports digital PDFs, DOCX files, and scanned image agreements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'House Rental Agreements',
                desc: 'Detect deposit return delays, maintenance splits, notice period asymmetries, and rent escalation clauses.',
              },
              {
                title: 'Job Offer Letters & Contracts',
                desc: 'Identify strict non-compete bounds, notice period obligations, lock-in penalties, and IP assignment clauses.',
              },
              {
                title: 'Loan & Commercial Agreements',
                desc: 'Expose compounding penalty interest rates, early prepayment penalties, and dispute resolution venues.',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 transition-all">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>Enterprise Grade Confidentiality</span>
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">Your Legal Documents Remain 100% Confidential</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              All uploaded agreements are processed in encrypted storage isolated per user. Document contents are never shared or used to train global public AI models.
            </p>
          </div>
          <Link
            to="/register"
            className="shrink-0 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Create Account Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};
