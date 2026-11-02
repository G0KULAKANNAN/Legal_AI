import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, Sparkles, Scale } from 'lucide-react';
import { api } from '../api/axios';
import { LegalDocument } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (document: LegalDocument) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds 4.5 MB. Vercel Serverless limit is 4.5 MB.`);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds 4.5 MB. Vercel Serverless limit is 4.5 MB.`);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 4.5 MB. Please select a file under 4.5 MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const uploadedDoc = res.data.data;
        if (uploadedDoc?.id) {
          api.post(`/documents/${uploadedDoc.id}/process`).catch(() => {});
        }
        onSuccess(uploadedDoc);
        onClose();
      }
    } catch (err: any) {
      const resData = err.response?.data;
      const serverMsg = resData?.error?.message || resData?.message || (typeof resData === 'string' ? resData : null);

      if (err.response?.status === 413 || (serverMsg && serverMsg.includes('FUNCTION_PAYLOAD_TOO_LARGE'))) {
        setError('File size too large for Vercel deployment (maximum 4.5 MB). Please select a lighter document.');
      } else if (err.response?.status === 504 || (serverMsg && serverMsg.includes('FUNCTION_INVOCATION_TIMEOUT'))) {
        setError('Document processing timed out on cloud server. The file was received and background analysis is running.');
      } else if (serverMsg && serverMsg.includes('An error occurred with your deployment')) {
        setError('Cloud execution error. Please ensure Supabase Storage bucket and environment variables are active in Vercel.');
      } else {
        setError(serverMsg || 'Failed to upload document. Please check file format and try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-800 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Upload Legal Document</h3>
              <p className="text-[11px] text-slate-500 font-medium">Review Before You Sign</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Tagline Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Review Before You Sign:</strong> Upload your House Rental Agreement, Job Offer, or Contract to extract hidden fees, unfair clauses, and key deadlines.
            </span>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Click or drag document file here</p>
                <p className="text-[11px] text-slate-500">Supports PDF, DOCX, PNG, JPG (Up to 4.5 MB for Cloud Deployment)</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Legal Disclaimer Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 flex items-start space-x-2">
            <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Disclaimer:</strong> AI can make mistakes. LegalAI provides AI-assisted analysis for informational purposes only. Please verify important details before signing.
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading & Initializing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Start Analysis</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
