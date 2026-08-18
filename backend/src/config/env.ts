import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'nlc_user',
    password: process.env.DB_PASSWORD || 'nlc_secure_password_2026',
    database: process.env.DB_NAME || 'nlc_voting_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  },

  levanter: {
    mockMode: process.env.LEVANTER_MOCK_MODE === 'true',
    apiUrl: process.env.LEVANTER_API_URL || 'http://82.208.23.107:2030',
    apiKey: process.env.LEVANTER_API_KEY || '52d192da6e86b2e9121f15079b879c57',
    endpointPath: process.env.LEVANTER_ENDPOINT_PATH || '/api/send',
  },

  security: {
    adminPassword: process.env.ADMIN_PASSWORD || 'nlc_admin_2026',
    jwtSecret: process.env.JWT_SECRET || 'nlc_voting_secret_session_key_2026_jwt',
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    maxOtpPerWindow: parseInt(process.env.MAX_OTP_PER_WINDOW || '5', 10),
  },
};
