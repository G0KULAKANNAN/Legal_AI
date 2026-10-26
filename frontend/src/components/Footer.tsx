import React from 'react';
import { ShieldCheck, Scale, FileText, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 py-12 mt-auto font-sans no-print print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
          
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">Legal<span className="text-blue-600">AI</span></span>
            </div>
            <p className="text-xs font-semibold text-blue-600">Review Before You Sign</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Empowering individuals and business professionals with automated AI-driven legal document clarity, risk detection, and contract benchmarks.
            </p>
          </div>

          <div>
            <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Supported Documents</span>
            </h4>
            <ul className="text-xs space-y-2.5 text-slate-500 font-medium">
              <li className="hover:text-slate-800 transition-colors">House Rental Agreements & Leases</li>
              <li className="hover:text-slate-800 transition-colors">Job Offer Letters & Employment Contracts</li>
              <li className="hover:text-slate-800 transition-colors">Personal & Commercial Loan Agreements</li>
              <li className="hover:text-slate-800 transition-colors">Terms of Service & Privacy Policies</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Compliance Standards</span>
            </h4>
            <ul className="text-xs space-y-2.5 text-slate-500 font-medium">
              <li className="hover:text-slate-800 transition-colors">Indian Contract Act, 1872</li>
              <li className="hover:text-slate-800 transition-colors">Model Tenancy Act Guidelines</li>
              <li className="hover:text-slate-800 transition-colors">Zod Schema JSON Validation</li>
              <li className="hover:text-slate-800 transition-colors">256-bit Encrypted Local Storage</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Legal Disclaimer</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              LegalAI provides AI-assisted document analysis and legal risk insights for informational and educational purposes. It does not constitute formal legal advice or substitute licensed legal counsel.
            </p>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} LegalAI Platform. All rights reserved.</p>
          <div className="flex space-x-6 mt-3 sm:mt-0 text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Security Audit</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
