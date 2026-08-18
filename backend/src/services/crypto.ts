import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit numeric One-Time Password.
 */
export const generateNumericOtp = (): string => {
  const otpNumber = crypto.randomInt(100000, 1000000); // 100000 to 999999 inclusive
  return otpNumber.toString();
};

/**
 * Computes a standard SHA-256 hex digest of the given input.
 */
export const hashSha256 = (value: string): string => {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
};

/**
 * Masks a phone number to protect student privacy while providing an identifiable hint.
 * e.g., '233540001122' or '+233540001122' -> '+233 ••• ••• 1122'
 */
export const maskPhoneNumber = (phone: string): string => {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 7) {
    return '••••••••' + clean.slice(-2);
  }
  const countryPrefix = clean.startsWith('233') ? '+233' : '+' + clean.slice(0, clean.length - 9);
  const lastFour = clean.slice(-4);
  return `${countryPrefix} ••• ••• ${lastFour}`;
};

/**
 * Generates an anonymous cryptographic receipt hash for a submitted ballot batch.
 * This guarantees proof of submission without linking to student identity.
 */
export const generateBallotReceiptHash = (electionId: string, timestamp: number): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  return crypto
    .createHash('sha256')
    .update(`${electionId}:${timestamp}:${salt}`)
    .digest('hex')
    .toUpperCase();
};

/**
 * Generates an official human-readable receipt reference code.
 * e.g., 'NLC-VOTE-7A4B-9F2E'
 */
export const generateReceiptReferenceCode = (): string => {
  const segment1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const segment2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `NLC-VOTE-${segment1}-${segment2}`;
};
