import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/axios';
import { User, AdminDocumentMetadata, ReportedIssue } from '../types';
import {
  Users,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  Lock,
  Plus,
  BookOpen,
} from 'lucide-react';

export const AdminControlsPage: React.FC = () => {
  const [activeControl, setActiveControl] = useState<'users' | 'documents' | 'monitoring' | 'issues' | 'sources'>('users');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentMetadata[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [issues, setIssues] = useState<ReportedIssue[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add legal source form state
  const [showAddSource, setShowAddSource] = useState(false);
  const [act, setAct] = useState('');
  const [section, setSection] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [applicability, setApplicability] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, docsRes, logsRes, jobsRes, issuesRes, sourcesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/documents'),
        api.get('/admin/logs'),
        api.get('/admin/jobs'),
        api.get('/admin/issues'),
        api.get('/admin/legal-sources'),
      ]);

      if (usersRes.data?.success) setUsers(usersRes.data.data);
      if (docsRes.data?.success) setDocuments(docsRes.data.data);
      if (logsRes.data?.success) setLogs(logsRes.data.data);
      if (jobsRes.data?.success) setJobs(jobsRes.data.data);
      if (issuesRes.data?.success) setIssues(issuesRes.data.data);
      if (sourcesRes.data?.success) setSources(sourcesRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus?: boolean) => {
    const newStatus = !currentStatus;
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, { isActive: newStatus });
      if (res.data?.success) {
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user account status');
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';
    try {
      const res = await api.patch(`/admin/issues/${issueId}`, { status: newStatus });
      if (res.data?.success) {
        fetchAllData();
      }
    } catch {
      // Ignore
    }
  };

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
        fetchAllData();
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin Controls</h1>
            <p className="text-xs text-slate-500 font-medium">User account management, document metadata registry, system monitoring, and reported issues.</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter admin records..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchAllData}
              className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh All Admin Controls Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Functional Control Tabs */}
        <div className="border-b border-slate-200 flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'users', label: `User Management (${users.length})`, icon: Users },
            { id: 'documents', label: `Document Management (${documents.length})`, icon: FileText },
            { id: 'monitoring', label: `System Monitoring (${logs.length + jobs.length})`, icon: Activity },
            { id: 'issues', label: `Issue Management (${issues.length})`, icon: AlertTriangle },
            { id: 'sources', label: `Legal Sources (${sources.length})`, icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveControl(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 whitespace-nowrap transition-all ${
                activeControl === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading Admin Controls data...</p>
          </div>
        ) : (
          <>
            {/* CONTROL 1: USER MANAGEMENT */}
            {activeControl === 'users' && (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm space-y-0">
                <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">Registered Users Management</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">User</th>
                        <th className="px-6 py-3.5">Role</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Documents</th>
                        <th className="px-6 py-3.5">Created Date</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {users
                        .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                u.role === 'ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                u.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {u.isActive !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                <span>{u.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}</span>
                              </span>
                            </td>

                            <td className="px-6 py-4 font-bold text-slate-900">
                              {u._count?.documents || 0} Docs
                            </td>

                            <td className="px-6 py-4 text-slate-500 font-medium">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.isActive !== false)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  u.isActive !== false
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.isActive !== false ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CONTROL 2: DOCUMENT MANAGEMENT */}
            {activeControl === 'documents' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3 shadow-sm">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Admin Privacy Rule Enforced:</strong> Displays document metadata only (User, Filename, Upload Date, Status). Confidential clause extractions and raw texts are protected.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3.5">Filename</th>
                          <th className="px-6 py-3.5">Owner User</th>
                          <th className="px-6 py-3.5">Agreement Type</th>
                          <th className="px-6 py-3.5">Analysis Status</th>
                          <th className="px-6 py-3.5">Uploaded Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {documents
                          .filter((d) => d.originalName.toLowerCase().includes(search.toLowerCase()) || (d.user && d.user.email.toLowerCase().includes(search.toLowerCase())))
                          .map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>{doc.originalName}</span>
                              </td>

                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{doc.user?.name || 'User'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{doc.user?.email}</div>
                              </td>

                              <td className="px-6 py-4 font-semibold text-slate-800">
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

                              <td className="px-6 py-4 text-slate-500 font-medium">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CONTROL 3: SYSTEM MONITORING */}
            {activeControl === 'monitoring' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">Background Worker Jobs Telemetry</div>
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
                            <td className="px-6 py-3.5 text-slate-500 font-medium">{new Date(j.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">System Activity Audit Logs</div>
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
              </div>
            )}

            {/* CONTROL 4: ISSUE MANAGEMENT */}
            {activeControl === 'issues' && (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm space-y-0">
                <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">Reported Issues & Queries</div>
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
                      {issues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 max-w-md">{issue.issue}</td>
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
                          <td className="px-6 py-4 text-slate-500 font-medium">{new Date(issue.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleUpdateIssueStatus(issue.id, issue.status)}
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
              </div>
            )}

            {/* CONTROL 5: LEGAL SOURCES */}
            {activeControl === 'sources' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900">Verified Legal Sources & Acts Registry</h3>
                  <button
                    onClick={() => setShowAddSource(!showAddSource)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Legal Source</span>
                  </button>
                </div>

                {showAddSource && (
                  <form onSubmit={handleAddLegalSource} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-xs font-extrabold text-blue-700 uppercase">Add Verifiable Legal Act Reference</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Act Name"
                        value={act}
                        onChange={(e) => setAct(e.target.value)}
                        required
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        required
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <textarea
                        placeholder="Description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                      <textarea
                        placeholder="Applicability..."
                        value={applicability}
                        onChange={(e) => setApplicability(e.target.value)}
                        required
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="Official Source URL"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={() => setShowAddSource(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                        Cancel
                      </button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs">
                        Save Legal Source
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((ls) => (
                    <div key={ls.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-blue-700">{ls.act}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">{ls.section}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{ls.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{ls.description}</p>
                      <a href={ls.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline inline-block pt-1">
                        View Official Source →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default AdminControlsPage;
