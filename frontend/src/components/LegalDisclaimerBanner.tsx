import React, { useState } from 'react';
import { Scale, AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, X } from 'lucide-react';

interface LegalDisclaimerBannerProps {
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
  dismissible?: boolean;
}

export const LegalDisclaimerBanner: React.FC<LegalDisclaimerBannerProps> = ({
  className = '',
  variant = 'banner',
  dismissible = false,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showTamil, setShowTamil] = useState(false);

  if (dismissed) return null;

  if (variant === 'compact') {
    return (
      <div className={`bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs ${className}`}>
        <div className="flex items-center space-x-2">
          <Scale className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium">
            <strong className="font-bold text-amber-950">Disclaimer:</strong> AI can make mistakes. Please verify important information and contract details before signing.
          </span>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-950 p-1 rounded-md hover:bg-amber-100 transition-colors shrink-0"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs text-amber-950 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-300">
                Mandatory Legal Disclaimer
              </span>
              <span className="text-xs font-bold text-slate-700">
                Review Before You Sign
              </span>
            </div>
            
            <p className="text-xs leading-relaxed text-amber-950 font-normal">
              <strong>Disclaimer: AI can make mistakes.</strong> LegalAI provides AI-generated document insights and risk assessments for informational and educational purposes only. Always verify critical terms, obligations, and contract details before signing.
            </p>

            {showTamil && (
              <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 text-xs text-amber-900 leading-relaxed font-normal bg-amber-100/40 p-2.5 rounded-xl">
                <p>
                  <strong>கவனத்திற்கு:</strong> AI தவறுகள் செய்யக்கூடும் (AI can make mistakes). இங்கு வழங்கப்படும் பகுப்பாய்வு வழிகாட்டுதலுக்கு மட்டுமே. கையொப்பமிடுவதற்கு முன் முக்கியமான ஒப்பந்த விவரங்களை சரிபார்த்துக் கொள்ளவும்.
                </p>
              </div>
            )}

            <div className="pt-1 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowTamil(!showTamil)}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1 underline decoration-amber-400 underline-offset-2 transition-colors cursor-pointer"
              >
                <span>{showTamil ? 'Hide Tamil Disclaimer' : 'தமிழ் சட்ட மறுப்புரை (Tamil Translation)'}</span>
                {showTamil ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-950 p-1.5 rounded-lg hover:bg-amber-100/70 transition-colors shrink-0 cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
