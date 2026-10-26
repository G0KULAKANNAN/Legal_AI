import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, X, Check, ArrowRight } from 'lucide-react';

interface SubscriptionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const SubscriptionRequiredModal: React.FC<SubscriptionRequiredModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <Zap className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base text-slate-900">
            Subscription Required
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {message ||
              'To upload documents and unlock AI legal analysis, risk identification, and Tamil/English voice explanations, you must have an active LegalAI subscription.'}
          </p>
        </div>

        {/* Feature Highlight Pill */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between pb-1 border-b border-blue-100">
            <span className="font-extrabold text-blue-900">Premium Plan</span>
            <span className="font-black text-blue-700 text-sm">₹299 / month</span>
          </div>
          <ul className="space-y-1.5 text-[11px]">
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Full clause analysis, risks & hidden penalty detection</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Tamil & English explanations with audio narration</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Document AI Q&A chat & 50 document analyses/month</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>Subscribe to Premium (₹299/mo)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
