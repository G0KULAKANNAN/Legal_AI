import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/axios';
import { ShieldCheck, Users, FileText, Activity, AlertTriangle, Database, BookOpen, Plus, Loader2 } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [legalSources, setLegalSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'metrics' | 'jobs' | 'logs' | 'sources'>('metrics');

  const [showAddSource, setShowAddSource] = useState(false);
  const [act, setAct] = useState('');
  const [section, setSection] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [applicability, setApplicability] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const fetchData = async () => {
    try {
      const [metricsRes, jobsRes, logsRes, sourcesRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/jobs'),
        api.get('/admin/logs'),
        api.get('/admin/legal-sources'),
      ]);

      if (metricsRes.data?.success) setMetrics(metricsRes.data.data);
      if (jobsRes.data?.success) setJobs(jobsRes.data.data);
      if (logsRes.data?.success) setLogs(logsRes.data.data);
      if (sourcesRes.data?.success) setLegalSources(sourcesRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLegalSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/legal-sources', { act, section, title, description, applicability, sourceUrl });
      if (res.data?.success) {
        setShowAddSource(false);
        setAct('');
        setSection('');
        setTitle('');
        setDescription('');
        setApplicability('');
        setSourceUrl('');
        fetchData();
      }
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Loading system metrics & telemetry...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const overview = metrics?.overview || {};

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 font-bold">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">LegalAI System Telemetry & Admin Control</h1>
              <p className="text-xs text-slate-500 font-medium">System health, background worker jobs, audit trails, and legal sources registry.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/users" className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all">
              User Management
            </Link>
            <Link to="/admin/documents" className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-all">
              Doc Metadata
            </Link>
            <Link to="/admin/issues" className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-all">
              Reported Issues
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'metrics', label: 'Metrics Overview', icon: Activity },
            { id: 'jobs', label: `Processing Jobs (${jobs.length})`, icon: FileText },
            { id: 'logs', label: `Audit Logs (${logs.length})`, icon: Database },
            { id: 'sources', label: `Legal Sources (${legalSources.length})`, icon: BookOpen },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200/80'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered Users</span>
                <div className="text-2xl font-black text-slate-900">{overview.totalUsers || 0}</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Uploaded Docs</span>
                <div className="text-2xl font-black text-blue-600">{overview.totalDocuments || 0}</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Analyses</span>
                <div className="text-2xl font-black text-emerald-600">{overview.completedAnalyses || 0}</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed Worker Jobs</span>
                <div className="text-2xl font-black text-red-600">{overview.failedJobs || 0}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900">Recent System Audit Trails</h3>
              <div className="space-y-2">
                {metrics?.recentAuditLogs?.map((log: any) => (
                  <div key={log.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-x-2">
                      <span className="font-bold text-blue-700">{log.action}</span>
                      <span className="text-slate-500 font-mono">[{log.resource}]</span>
                      {log.user && <span className="text-slate-700 font-medium">by {log.user.email}</span>}
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* JOBS */}
        {activeTab === 'jobs' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">Background Worker Processing Jobs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Document</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Attempts</th>
                    <th className="px-6 py-3.5">Error</th>
                    <th className="px-6 py-3.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{j.document?.originalName || j.documentId}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          {j.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium">{j.attempts}</td>
                      <td className="px-6 py-3.5 text-red-600 max-w-xs truncate font-mono">{j.error || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-500">{new Date(j.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">Full System Audit Logs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Resource</th>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 text-slate-500 font-mono">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3.5 font-bold text-amber-700">{l.action}</td>
                      <td className="px-6 py-3.5 font-mono">{l.resource}</td>
                      <td className="px-6 py-3.5 font-medium">{l.user?.email || 'System / Unauth'}</td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono">{l.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEGAL SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Verified Legal Sources & Acts Registry</h3>
              <button
                onClick={() => setShowAddSource(!showAddSource)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Legal Source</span>
              </button>
            </div>

            {showAddSource && (
              <form onSubmit={handleAddLegalSource} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
                <h4 className="text-xs font-extrabold text-amber-700 uppercase">Add Verifiable Legal Act Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Act Name (e.g. Indian Contract Act)"
                    value={act}
                    onChange={(e) => setAct(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Section (e.g. Section 27)"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <textarea
                    placeholder="Description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Applicability..."
                    value={applicability}
                    onChange={(e) => setApplicability(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="url"
                  placeholder="Official Source URL (e.g. https://www.indiacode.nic.in/...)"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowAddSource(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs">
                    Save Legal Source
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {legalSources.map((ls) => (
                <div key={ls.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-blue-700">{ls.act}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">{ls.section}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{ls.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{ls.description}</p>
                  <a
                    href={ls.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline inline-block pt-1"
                  >
                    View Verification Link →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};
