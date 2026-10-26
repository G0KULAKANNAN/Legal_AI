import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { api } from '../api/axios';
import {
  ShieldCheck,
  Check,
  Sparkles,
  Building2,
  Zap,
  ArrowRight,
  Loader2,
  HelpCircle,
  CreditCard,
  Phone,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const PricingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Enterprise Lead Modal State
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: '',
    phone: '',
    expectedUsers: 10,
    notes: '',
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Sandbox Payment Modal State (for seamless testing without live keys)
  const [sandboxOrder, setSandboxOrder] = useState<any>(null);

  // Dynamic Razorpay script loader
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubscribePremium = async () => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    setLoadingCheckout(true);
    setCheckoutError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/subscription/checkout', { plan: 'PREMIUM' });
      if (!res.data?.success) {
        throw new Error(res.data?.error?.message || 'Failed to initialize payment');
      }

      const orderData = res.data.data;

      // If in sandbox mode or test keys, present clear interactive test payment modal
      if (orderData.isSandbox || !window.Razorpay) {
        setSandboxOrder(orderData);
        setLoadingCheckout(false);
        return;
      }

      // Live / Standard Razorpay Gateway Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LegalAI',
        description: 'LegalAI Premium Subscription (₹299/mo)',
        image: '/favicon.ico',
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#2563EB',
        },
        handler: async (response: any) => {
          try {
            setLoadingCheckout(true);
            const verifyRes = await api.post('/subscription/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              await refreshUser();
              setSuccessMessage('Payment verified successfully! Your Premium subscription is now active.');
              setTimeout(() => {
                navigate('/dashboard');
              }, 1500);
            }
          } catch (vErr: any) {
            setCheckoutError(vErr.response?.data?.error?.message || 'Payment signature verification failed.');
          } finally {
            setLoadingCheckout(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingCheckout(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setCheckoutError(`Payment failed: ${response.error?.description || 'Transaction cancelled'}`);
        setLoadingCheckout(false);
      });
      rzp.open();
    } catch (err: any) {
      setCheckoutError(err.response?.data?.error?.message || err.message || 'Payment initiation failed.');
      setLoadingCheckout(false);
    }
  };

  const handleSandboxSimulatePayment = async (status: 'SUCCESS' | 'FAILED') => {
    if (!sandboxOrder) return;
    setLoadingCheckout(true);

    if (status === 'FAILED') {
      setCheckoutError('Sandbox payment was cancelled or declined by user.');
      setSandboxOrder(null);
      setLoadingCheckout(false);
      return;
    }

    try {
      const paymentId = `pay_sandbox_${Date.now()}`;
      const verifyRes = await api.post('/subscription/verify', {
        orderId: sandboxOrder.orderId,
        paymentId,
        signature: 'sandbox_verified',
      });

      if (verifyRes.data?.success) {
        await refreshUser();
        setSandboxOrder(null);
        setSuccessMessage('Payment verified successfully in sandbox mode! Your Premium subscription is now active.');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setCheckoutError(err.response?.data?.error?.message || 'Payment verification failed.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitting(true);
    try {
      const res = await api.post('/subscription/enterprise-inquiry', leadForm);
      if (res.data?.success) {
        setLeadSuccess(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit inquiry.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  const isUserPremium = user?.subscription?.plan === 'PREMIUM' && user?.subscription?.status === 'ACTIVE';
  const isUserEnterprise = user?.subscription?.plan === 'ENTERPRISE' && user?.subscription?.status === 'ACTIVE';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Simple, Transparent Pricing – No Free Tier, No Compromises</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Protect Your Legal Rights <span className="text-blue-600">Before You Sign</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            LegalAI provides deep contractual risk analysis, penalty detection, and Tamil & English voice explanations. Choose the plan tailored for your needs.
          </p>
        </div>

        {/* Global Alert Messages */}
        {checkoutError && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="font-medium">{checkoutError}</p>
          </div>
        )}

        {successMessage && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="font-bold">{successMessage}</p>
          </div>
        )}

        {/* 2 Plans Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* PLAN 1: PREMIUM (₹299/mo) */}
          <div className="relative bg-white rounded-3xl border-2 border-blue-600 p-8 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-4 py-1.5 rounded-bl-xl shadow-xs">
              Recommended for Citizens & Students
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">Premium Plan</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Full access to AI document summarization, clause risk breakdown, Tamil voice explanations, and document chat.
                </p>
              </div>

              {/* Price Tag */}
              <div className="pt-2 pb-4 border-b border-slate-100">
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">₹299</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Billed monthly • Cancel anytime with one click</p>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Everything Included:</p>
                
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>AI Document Summarization:</strong> Plain English and conversational Tamil explanations.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Detailed Legal Clause Analysis:</strong> Categorizes rights, duties, and covenants.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Risk & Hidden Penalty Detection:</strong> Identifies predatory lock-ins and excessive charges.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Read to Voice Narration:</strong> Natural Tamil and English audio playback.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Document-Based AI Chat:</strong> Ask questions with multi-session history.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Important Dates & Timeline:</strong> Auto-extracts expiry dates, notice windows, and milestones.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Comprehensive Document Support:</strong> Student job bonds, employment contracts, rental agreements, land & property orders, loan agreements, and insurance policies.</span>
                  </li>
                  <li className="flex items-start space-x-2.5 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>50 Document Analyses per Month</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Premium CTA Button */}
            <div className="pt-8">
              {isUserPremium ? (
                <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl text-center flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Current Active Plan (Renews {new Date(user.subscription!.currentPeriodEnd).toLocaleDateString('en-IN')})</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribePremium}
                  disabled={loadingCheckout}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  {loadingCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>{!user ? 'Sign In to Subscribe – ₹299/mo' : 'Subscribe to Premium – ₹299/mo'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* PLAN 2: ENTERPRISE (Custom Pricing) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">Enterprise Plan</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Engineered for legal teams, enterprises, universities, and organizations requiring high-volume compliance and multi-user access.
                </p>
              </div>

              {/* Price Tag */}
              <div className="pt-2 pb-4 border-b border-slate-100">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Custom</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Annual invoicing & flexible seat-based billing</p>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Enterprise Inclusions:</p>
                
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>All Premium Plan Features Included:</strong> Full legal extraction and Tamil/English voice engine.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Multi-User Organization Access:</strong> Centralized workspace for HR, legal, and operational staff.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Centralized Subscription & Seat Management:</strong> Admin controls and member permissions.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Higher Configurable Limits:</strong> 500+ document analyses per month with custom surge capacity.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Organization-Level Audit Reports:</strong> Enterprise compliance matrices and aggregated risk logs.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Custom SLAs & Invoicing:</strong> Direct PO/GST billing, vendor compliance, and dedicated support.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise CTA Button */}
            <div className="pt-8">
              {isUserEnterprise ? (
                <div className="w-full py-3.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center">
                  Active Enterprise Subscription
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEnterpriseModalOpen(true)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Contact Sales for Enterprise</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Why No Free Plan Callout */}
        <div className="max-w-4xl mx-auto p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Why LegalAI Does Not Offer a Free Plan</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Legal document analysis requires high-performance, non-hallucinating AI models, rigorous OCR pre-processing, and secure confidential storage. Free tiers in AI software frequently compromise data confidentiality by training on private documents or use degraded, inaccurate models that miss critical legal penalties. LegalAI charges an affordable ₹299/month so everyday citizens can access genuine legal-grade document intelligence without data harvesting.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6 pt-4">
          <h2 className="text-xl font-extrabold text-slate-900 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">What payment methods are supported for the ₹299 plan?</h4>
              <p className="text-xs text-slate-600">All major Indian payment methods are supported via Razorpay, including UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards (RuPay, Visa, Mastercard), and NetBanking.</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">Can I cancel my subscription at any time?</h4>
              <p className="text-xs text-slate-600">Yes. You can cancel your subscription with a single click from your profile page. You will retain full Premium access until the end of your 30-day billing cycle, and no further charges will occur.</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">What happens if I reach the 50-document monthly limit?</h4>
              <p className="text-xs text-slate-600">The 50-document limit resets automatically at the start of each 30-day billing cycle. If your workflow requires analyzing hundreds of contracts per month, contact our Enterprise sales team for a custom quota.</p>
            </div>
          </div>
        </div>

      </main>

      {/* Sandbox Test Payment Modal */}
      {sandboxOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Razorpay Payment Gateway (Sandbox)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSandboxOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Item:</span>
                <span className="font-bold text-slate-900">LegalAI Premium (1 Month)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Order ID:</span>
                <span className="font-mono text-[11px] text-blue-700">{sandboxOrder.orderId}</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-blue-100">
                <span className="font-bold text-slate-700">Total Amount:</span>
                <span className="font-extrabold text-base text-blue-600">₹299.00</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This sandbox payment simulator verifies payment signature verification, subscription activation, and database persistence.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSandboxSimulatePayment('SUCCESS')}
                disabled={loadingCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {loadingCheckout ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Payment (Simulate Success ₹299)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSandboxSimulatePayment('FAILED')}
                disabled={loadingCheckout}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel / Simulate Failed Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Contact Sales Modal */}
      {isEnterpriseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">LegalAI Enterprise Inquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEnterpriseModalOpen(false);
                  setLeadSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {leadSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Inquiry Received</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Thank you! Our enterprise legal solutions director will contact you via email and phone within 24 business hours to discuss custom pricing and limits.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsEnterpriseModalOpen(false);
                    setLeadSuccess(false);
                  }}
                  className="px-6 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnterpriseSubmit} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Tell us about your organization to receive custom document limits, multi-seat pricing, and team compliance features.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Advocate / General Counsel Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Company / Firm Name</label>
                    <input
                      type="text"
                      value={leadForm.company}
                      onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Organization Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Estimated Users</label>
                    <input
                      type="number"
                      min={1}
                      value={leadForm.expectedUsers}
                      onChange={(e) => setLeadForm({ ...leadForm, expectedUsers: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Requirements & Document Types</label>
                  <textarea
                    rows={2}
                    value={leadForm.notes}
                    onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 500+ commercial leases and employment contracts per month..."
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEnterpriseModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={leadSubmitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md"
                  >
                    {leadSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Submit Inquiry</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
