import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/axios';
import { AdminDocumentMetadata } from '../types';
import { FileText, ShieldCheck, Lock, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Search } from 'lucide-react';

export const AdminDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/documents');
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
  }, []);

  const filteredDocs = documents.filter((d) =>
    d.originalName.toLowerCase().includes(search.toLowerCase()) ||
    (d.user && d.user.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System Document Metadata Registry</h1>
              <p className="text-xs text-slate-500 font-medium">Privacy Protection Active: Displays metadata only (User, Filename, Upload Date, Status).</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search filename or user email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchDocuments}
              className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Privacy Callout */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Enterprise Admin Privacy Rule Enforced:</strong> As an administrator, you can monitor document processing jobs, file size telemetry, and user ownership metadata. Raw document page texts and confidential legal contents remain strictly protected.
          </p>
        </div>

        {/* Documents Metadata Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading document metadata...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Filename</th>
                    <th className="px-6 py-3.5">Owner User</th>
                    <th className="px-6 py-3.5">Agreement Type</th>
                    <th className="px-6 py-3.5">Analysis Status</th>
                    <th className="px-6 py-3.5">File Size</th>
                    <th className="px-6 py-3.5">Uploaded Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{doc.originalName}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{doc.user?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{doc.user?.email}</div>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-800">
                        {doc.detectedType || 'Legal Agreement'}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          doc.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {doc.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                          <span>{doc.status}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium">
                        {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default AdminDocumentsPage;
