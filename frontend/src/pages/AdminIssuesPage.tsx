import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/axios';
import { ReportedIssue } from '../types';
import { AlertTriangle, CheckCircle2, RefreshCw, Loader2, Search } from 'lucide-react';

export const AdminIssuesPage: React.FC = () => {
  const [issues, setIssues] = useState<ReportedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/issues');
      if (res.data?.success) {
        setIssues(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleUpdateStatus = async (issueId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';
    try {
      const res = await api.patch(`/admin/issues/${issueId}`, { status: newStatus });
      if (res.data?.success) {
        fetchIssues();
      }
    } catch {
      // Ignore
    }
  };

  const filteredIssues = issues.filter((i) =>
    i.issue.toLowerCase().includes(search.toLowerCase()) ||
    (i.user && i.user.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Reported Issues & Support Queries</h1>
              <p className="text-xs text-slate-500 font-medium">Review and resolve user reported clause queries and technical issues.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchIssues}
              className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading reported issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">No active reported issues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Reported Issue</th>
                    <th className="px-6 py-3.5">Reported By</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Reported Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 max-w-md">
                        {issue.issue}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{issue.user?.name || 'User'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{issue.user?.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 text-[10px]">
                          {issue.category}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          issue.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {issue.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUpdateStatus(issue.id, issue.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            issue.status === 'OPEN'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {issue.status === 'OPEN' ? 'Mark Resolved' : 'Reopen Issue'}
                        </button>
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

export default AdminIssuesPage;
