import React, { useState, useEffect } from 'react';
import { X, Bell, Calendar, Plus, CheckCircle, Trash2, Clock, Sparkles } from 'lucide-react';
import { api } from '../api/axios';
import { Reminder, LegalDocument } from '../types';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: LegalDocument[];
}

export const RemindersModal: React.FC<RemindersModalProps> = ({ isOpen, onClose, documents }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [documentId, setDocumentId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reminders');
      if (res.data?.success) {
        setReminders(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !title || !dueDate) return;

    try {
      const res = await api.post('/reminders', { documentId, title, dueDate, notes });
      if (res.data?.success) {
        setShowAddForm(false);
        setTitle('');
        setDueDate('');
        setNotes('');
        fetchReminders();
      }
    } catch {
      // Ignore
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'DISMISSED' : 'PENDING';
    try {
      await api.patch(`/reminders/${id}/status`, { status: newStatus });
      fetchReminders();
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Document Reminders & Deadlines</h3>
              <p className="text-[11px] text-slate-500 font-medium">Review Before You Sign — Expiry & Lock-in Tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Track notice deadlines, lock-in expiries, and rent due dates.</p>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Reminder</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleCreateReminder} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-blue-700 uppercase">Create New Deadline Reminder</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Document</label>
                  <select
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Document</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>{d.originalName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Title / Event</label>
                  <input
                    type="text"
                    placeholder="e.g. 30-Day Notice Deadline"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Send written notice to landlord"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          )}

          {/* List */}
          {reminders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No active reminders created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                    r.status === 'DISMISSED' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => handleStatusToggle(r.id, r.status)}
                      className={`mt-0.5 p-1 rounded-full ${
                        r.status === 'DISMISSED' ? 'text-emerald-600 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <div>
                      <h4 className={`text-xs font-bold ${r.status === 'DISMISSED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {r.title}
                      </h4>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                        <span className="flex items-center space-x-1 text-amber-700 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(r.dueDate).toLocaleDateString()}</span>
                        </span>
                        {r.document && <span className="text-slate-500">Doc: {r.document.originalName}</span>}
                      </div>
                      {r.notes && <p className="text-[11px] text-slate-500 mt-1">{r.notes}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
