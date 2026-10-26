import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend folder first, then process.cwd(), then root folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Allow Node fetch to handle local SSL inspection/proxy certificates on Windows environments
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  databaseUrl: process.env.DATABASE_URL || 'postgresql://legalai:legalai_password@localhost:5432/legalai_db?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'legalai_development_jwt_secret_key_32_characters_minimum',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'legalai_development_refresh_jwt_secret_key_32_characters',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },
  
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'supabase',
    localPath: path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads'),
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'legalai-documents',
  },
  
  adminInitial: {
    email: process.env.ADMIN_INITIAL_EMAIL || 'admin@legalai.com',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminPass123!LegalAI',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: (process.env.SMTP_USER || 'blackboyedits2512@gmail.com').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: process.env.SMTP_FROM || 'LegalAI <blackboyedits2512@gmail.com>',
  },

  subscription: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_legalai_sandbox',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'legalai_sandbox_secret_key_32chars',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'legalai_webhook_secret_key',
    },
    plans: {
      PREMIUM: {
        id: 'PREMIUM',
        name: 'Premium Plan',
        priceMonthlyInInr: 299,
        priceInPaise: 29900,
        currency: 'INR',
        documentLimitPerMonth: 50,
        features: [
          'AI-powered legal document summarization',
          'Detailed legal clause analysis',
          'Potential risks, penalties, and hidden-charge identification',
          'Tamil and English explanations with speech audio',
          'Document-based AI chat with multi-session history',
          'Important dates and expiry-date extraction',
          'Support for student job bonds, employment contracts, rental agreements, land & property documents, loan agreements, insurance policies, and other legal documents',
          '50 document analyses per month',
        ],
      },
      ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Enterprise Plan',
        priceMonthlyInInr: 'Custom',
        currency: 'INR',
        documentLimitPerMonth: 500,
        features: [
          'All Premium features included',
          'Support for multiple users within an organization',
          'Centralized subscription and user management',
          'Higher configurable document-processing limits (500+ docs/month)',
          'Organization-level legal risk and compliance usage reports',
          'Custom pricing, billing, and direct invoicing',
          'Dedicated account manager & priority legal support',
        ],
      },
    },
  },
};
