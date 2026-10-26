import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FileUploadModal } from '../components/FileUploadModal';
import { CompareModal } from '../components/CompareModal';
import { RemindersModal } from '../components/RemindersModal';
import { SubscriptionRequiredModal } from '../components/SubscriptionRequiredModal';
import { api } from '../api/axios';
import { LegalDocument } from '../types';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  GitCompare,
  Bell,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hasActiveSubscription =
    user?.role === 'ADMIN' ||
    (user?.subscription?.status === 'ACTIVE' &&
      new Date(user.subscription.currentPeriodEnd) >= new Date());

  const handleOpenUpload = () => {
    if (!hasActiveSubscription) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    setIsUploadOpen(true);
  };

  const handleOpenCompare = () => {
    if (!hasActiveSubscription) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    setIsCompareOpen(true);
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      if (res.data?.success) {
        setDocuments(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Poll status every 4 seconds for processing documents
    const interval = setInterval(() => {
      setDocuments((prevDocs) => {
        const hasProcessing = prevDocs.some((d) =>
          ['UPLOADED', 'VALIDATING', 'STORED', 'EXTRACTING', 'OCR', 'ANALYZING'].includes(d.status)
        );
        if (hasProcessing) {
          fetchDocuments();
        }
        return prevDocs;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document and all its analysis history?')) return;

    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments();
    } catch {
      // Ignore
    }
  };

  // Stats derived from DB documents
  const completedCount = documents.filter((d) => d.status === 'COMPLETED').length;
  const processingCount = documents.filter((d) =>
    ['UPLOADED', 'VALIDATING', 'STORED', 'EXTRACTING', 'OCR', 'ANALYZING'].includes(d.status)
  ).length;
  const totalRisksDetected = documents.reduce((acc, d) => acc + (d.analysis?._count?.risks || 0), 0);

  const filteredDocuments = documents.filter((doc) =>
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.detectedType && doc.detectedType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner Tagline */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Legal Document Analysis Dashboard</h1>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">Review Before You Sign — Automated Clause Risk Detection</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRemindersOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors border border-slate-200/80"
            >
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Reminders</span>
            </button>
            <button
              onClick={handleOpenCompare}
              disabled={documents.length < 2}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors border border-slate-200/80"
            >
              <GitCompare className="w-4 h-4 text-blue-600" />
              <span>Compare Agreements</span>
            </button>
            <button
              onClick={handleOpenUpload}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Subscription Status Callout Banner */}
        {!hasActiveSubscription ? (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Active Subscription Required</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  You currently do not have an active subscription. Subscribe to the <strong>Premium Plan (₹299/month)</strong> or <strong>Enterprise</strong> to upload documents and unlock AI legal risk analysis.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5 transition-all shrink-0"
            >
              <span>Subscribe Now (₹299/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : user?.subscription ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="font-bold text-slate-500">Subscription:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                {user.subscription.plan}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700">
                Monthly Usage: <strong>{user.subscription.documentsAnalyzedThisMonth || 0} / 50</strong> documents analyzed
              </span>
            </div>
            <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
              <span>Active until: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('en-IN')}</span>
              <Link to="/profile" className="text-blue-600 font-bold hover:underline">
                Manage
              </Link>
            </div>
          </div>
        ) : null}

        {/* Real DB Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Documents</span>
            <div className="text-2xl font-black text-slate-900">{documents.length}</div>
            <p className="text-[11px] text-slate-400 font-medium">Stored in encrypted bucket</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Analyses</span>
            <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
            <p className="text-[11px] text-slate-400 font-medium">Fully parsed & structured</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processing Queue</span>
            <div className="text-2xl font-black text-blue-600">{processingCount}</div>
            <p className="text-[11px] text-slate-400 font-medium">Async OCR & Gemini worker</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Flagged Risks</span>
            <div className="text-2xl font-black text-amber-600">{totalRisksDetected}</div>
            <p className="text-[11px] text-slate-400 font-medium">Flagged across agreements</p>
          </div>
        </div>

        {/* Documents Table / Card Container */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm space-y-0">
          
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <h3 className="font-extrabold text-base text-slate-900">Uploaded Agreements</h3>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                {documents.length}
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter documents..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <button
                onClick={fetchDocuments}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                title="Refresh List"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading documents from encrypted vault...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">No documents uploaded yet</h4>
                <p className="text-xs text-slate-500">Upload a house rental agreement, offer letter, or loan document to start analysis.</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl inline-flex items-center space-x-2 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Document Name</th>
                    <th className="px-6 py-3.5">Agreement Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Key Findings</th>
                    <th className="px-6 py-3.5">Uploaded Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => doc.status === 'COMPLETED' && (window.location.href = `/documents/${doc.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold group-hover:text-blue-600 transition-colors">{doc.originalName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {doc.detectedType || doc.analysis?.documentType || 'Legal Agreement'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            doc.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : doc.status === 'FAILED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                          }`}
                        >
                          {doc.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {doc.status === 'FAILED' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {['UPLOADED', 'EXTRACTING', 'OCR', 'ANALYZING'].includes(doc.status) && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          <span>{doc.status}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {doc.analysis?._count?.risks ? (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                            {doc.analysis._count.risks} Concerns Flagged
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/documents/${doc.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="View Analysis"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchDocuments()}
      />

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        documents={documents}
      />

      <RemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        documents={documents}
      />

      <SubscriptionRequiredModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

      <Footer />
    </div>
  );
};
