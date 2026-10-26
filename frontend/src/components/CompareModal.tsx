import React, { useState } from 'react';
import { X, GitCompare, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/axios';
import { LegalDocument } from '../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: LegalDocument[];
  initialDocId?: string;
}

export const CompareModal: React.FC<CompareModalProps> = ({ isOpen, onClose, documents, initialDocId }) => {
  const [docAId, setDocAId] = useState<string>(initialDocId || (documents[0]?.id || ''));
  const [docBId, setDocBId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompare = async () => {
    if (!docAId || !docBId) {
      setError('Please select two documents to compare');
      return;
    }
    if (docAId === docBId) {
      setError('Please select two different documents');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/documents/compare', { docAId, docBId });
      if (res.data?.success) {
        setResult(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate comparison.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Compare Legal Agreements</h3>
              <p className="text-[11px] text-slate-500 font-medium">Review Before You Sign — Side-by-Side Diff Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Document Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Document A (Original Baseline)</label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select Document A</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.originalName} ({d.detectedType || 'Agreement'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Document B (Revised Counterpart)</label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select Document B</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.originalName} ({d.detectedType || 'Agreement'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleCompare}
              disabled={loading || !docAId || !docBId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Differences...</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  <span>Run Side-by-Side Comparison</span>
                </>
              )}
            </button>
          </div>

          {/* Comparison Output */}
          {result && (
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
                <h4 className="text-xs font-extrabold text-blue-900 uppercase">Executive Diff Summary</h4>
                <p className="text-xs text-blue-950 leading-relaxed">{result.diffSummary}</p>
              </div>

              {/* Modified Clauses */}
              {result.modifiedClauses && result.modifiedClauses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Modified Clauses ({result.modifiedClauses.length})</h4>
                  <div className="space-y-3">
                    {result.modifiedClauses.map((mc: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{mc.title}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            mc.impactLevel === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {mc.impactLevel} IMPACT
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-red-700 font-extrabold uppercase block">Document A (Before)</span>
                            <p className="text-slate-800 font-mono text-[11px]">{mc.docAText}</p>
                          </div>
                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-emerald-700 font-extrabold uppercase block">Document B (After)</span>
                            <p className="text-slate-800 font-mono text-[11px]">{mc.docBText}</p>
                          </div>
                        </div>
                        <p className="text-slate-600 text-xs"><strong>Impact Analysis:</strong> {mc.changeAnalysis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
