import axios from 'axios';
import { config } from '../config/env';

export interface LevanterSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  phone?: string;
  endpointUsed?: string;
}

export interface ProbeResult {
  endpoint: string;
  method: string;
  status: number | string;
  success: boolean;
  response: any;
}

export class LevanterService {
  // Official Levanter API endpoint path
  private static activeEndpointPath: string = '/api/send';

  public static getActiveEndpoint(): string {
    return this.activeEndpointPath;
  }

  public static setActiveEndpoint(newPath: string): void {
    if (newPath) {
      this.activeEndpointPath = newPath.startsWith('/') ? newPath : `/${newPath}`;
      console.log(`[Levanter] Active endpoint updated to: ${this.activeEndpointPath}`);
    }
  }

  /**
   * Sanitizes and normalizes phone numbers into standard numeric format: 233XXXXXXXXX without '+'
   * e.g., '0540001122' -> '233540001122'
   * e.g., '+233540001122' -> '233540001122'
   * e.g., '233 54 000 1122' -> '233540001122'
   */
  public static normalizePhoneNumber(rawPhone: string): string {
    let clean = (rawPhone || '').replace(/[^0-9]/g, '');
    
    // If standard Ghana local number starting with 0 (e.g. 0540001122 -> 10 digits)
    if (clean.startsWith('0') && clean.length === 10) {
      clean = '233' + clean.substring(1);
    }
    
    // If entered without leading 0 or 233 (e.g. 540001122 -> 9 digits)
    if (!clean.startsWith('233') && clean.length === 9) {
      clean = '233' + clean;
    }
    
    return clean;
  }

  /**
   * Sends a live WhatsApp message through the Levanter Bot API Gateway on Pterodactyl VPS.
   * Conforms strictly to the official lyfe00011/levanter REST API schema.
   */
  public static async sendMessage(phone: string, text: string): Promise<LevanterSendResponse> {
    const formattedPhone = this.normalizePhoneNumber(phone);

    // If mock mode is explicitly turned on in development
    if (config.levanter.mockMode) {
      console.log('\n' + '='.repeat(70));
      console.log('📱 [LEVANTER WHATSAPP GATEWAY - SIMULATION]');
      console.log(`To: ${formattedPhone}`);
      console.log(`Content:\n${text}`);
      console.log('='.repeat(70) + '\n');

      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        phone: formattedPhone,
        endpointUsed: 'MOCK',
      };
    }

    const baseUrl = config.levanter.apiUrl.replace(/\/$/, '');

    // Strict lyfe00011/levanter API payload:
    const payload = {
      to: formattedPhone,
      type: 'text',
      text: text,
      session: 0,
      // Fallback compatibility keys
      message: text,
      number: formattedPhone,
      jid: `${formattedPhone}@s.whatsapp.net`,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.levanter.apiKey,
      'Authorization': `Bearer ${config.levanter.apiKey}`,
    };

    // Attempt primary official endpoint first (/api/send)
    const candidateEndpoints = [
      this.activeEndpointPath,
      '/api/send',
      '/send',
      '/message',
      '/messages',
      '/send-message',
    ];

    const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
    let lastError: any = null;

    for (const endpointPath of uniqueEndpoints) {
      const fullUrl = `${baseUrl}${endpointPath}`;
      try {
        console.log(`[Levanter] 🚀 Sending message to ${formattedPhone} via ${fullUrl}...`);
        const response = await axios.post(fullUrl, payload, {
          headers,
          timeout: 15000,
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`[Levanter] ✅ Live WhatsApp message delivered via ${endpointPath}! Response:`, response.data);
          this.activeEndpointPath = endpointPath;

          return {
            success: true,
            messageId: response.data?.id || response.data?.messageId || response.data?.key?.id || `live-${Date.now()}`,
            phone: formattedPhone,
            endpointUsed: endpointPath,
          };
        }
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errData = err.response?.data;
        console.warn(`[Levanter] Endpoint ${endpointPath} returned HTTP ${status}:`, errData || err.message);

        // If it's a network refusal or server unreachable, stop looping
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          break;
        }
      }
    }

    const errorMessage = lastError?.response?.data?.message || lastError?.response?.data || lastError?.message || 'Levanter WhatsApp API delivery failed';
    return {
      success: false,
      error: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : String(errorMessage),
      phone: formattedPhone,
    };
  }

  /**
   * Diagnostic Endpoint Prober for Admin Dashboard
   * Probes routes using the exact lyfe00011/levanter payload schema.
   */
  public static async probeAllEndpoints(): Promise<ProbeResult[]> {
    const baseUrl = config.levanter.apiUrl.replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.levanter.apiKey,
      'Authorization': `Bearer ${config.levanter.apiKey}`,
    };

    const validPayload = {
      to: '233540001122',
      type: 'text',
      text: 'Levanter API connectivity probe',
      session: 0,
      number: '233540001122',
      message: 'Levanter API connectivity probe',
    };

    const testRoutes = [
      { path: '/api/send', method: 'POST', payload: validPayload },
      { path: '/send', method: 'POST', payload: validPayload },
      { path: '/message', method: 'POST', payload: validPayload },
      { path: '/messages', method: 'POST', payload: validPayload },
      { path: '/send-message', method: 'POST', payload: validPayload },
      { path: '/api/sessions', method: 'GET' },
      { path: '/', method: 'GET' },
    ];

    const results: ProbeResult[] = [];

    for (const route of testRoutes) {
      const fullUrl = `${baseUrl}${route.path}`;
      try {
        let res;
        if (route.method === 'POST') {
          res = await axios.post(fullUrl, route.payload, { headers, timeout: 8000 });
        } else {
          res = await axios.get(fullUrl, { headers, timeout: 8000 });
        }

        results.push({
          endpoint: route.path,
          method: route.method,
          status: res.status,
          success: res.status >= 200 && res.status < 300,
          response: res.data,
        });
      } catch (err: any) {
        results.push({
          endpoint: route.path,
          method: route.method,
          status: err.response?.status || err.code || 'FAIL',
          success: false,
          response: err.response?.data || err.message,
        });
      }
    }

    return results;
  }

  /**
   * Formats and dispatches a secure One-Time Password message for student authentication.
   */
  public static async sendOtp(
    phone: string,
    studentName: string,
    studentId: string,
    otp: string,
    expiryMinutes: number = 5
  ): Promise<LevanterSendResponse> {
    const message = 
`🗳️ *NEW LIFE COLLEGE ELECTIONS*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${studentName}* (${studentId}),

Your secure Voting Verification One-Time Password is:

👉 *${otp}* 👈

⏱️ This code expires in *${expiryMinutes} minutes*.
⚠️ *Security Notice:* Never share this code with anyone. The Electoral Commission will NEVER ask for your OTP.

_New Life College Electoral Commission_`;

    return this.sendMessage(phone, message);
  }

  /**
   * Dispatches an asynchronous voting confirmation receipt to the student upon ballot submission.
   */
  public static async sendVotingReceipt(
    phone: string,
    studentName: string,
    studentId: string,
    receiptCode: string,
    electionTitle: string
  ): Promise<LevanterSendResponse> {
    const timestamp = new Date().toLocaleString('en-GB', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const message = 
`✅ *VOTE RECORDED - CONFIRMATION RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${studentName}* (${studentId}),

Your official ballot for:
*${electionTitle}*
has been successfully recorded and locked in the anonymous ballot vault.

📜 *Ballot Receipt Reference:* \`${receiptCode}\`
📅 *Timestamp:* ${timestamp} UTC
🔒 *Status:* 100% Anonymous & Irrevocable

Thank you for participating in New Life College democracy!

_New Life College Electoral Commission_`;

    return this.sendMessage(phone, message);
  }

  /**
   * Diagnostic test method for Admin Dashboard to test bot reachability.
   */
  public static async testGatewayConnection(
    testPhone: string,
    customMessage?: string
  ): Promise<LevanterSendResponse> {
    const message = customMessage || 
`🔔 *NEW LIFE COLLEGE BOT TEST*
━━━━━━━━━━━━━━━━━━━━━━
This is a test notification confirming that the Levanter WhatsApp API Gateway is online and successfully communicating with the New Life College Voting Server.

Timestamp: ${new Date().toISOString()}`;

    return this.sendMessage(testPhone, message);
  }

  /**
   * Dispatches messages to a list of voter recipients with pacing to respect gateway rate limits
   */
  public static async sendBulkBroadcast(
    recipients: Array<{ phone_number: string; full_name: string; student_id: string }>,
    messageBuilder: (r: { phone_number: string; full_name: string; student_id: string }) => string
  ): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        const text = messageBuilder(r);
        const res = await this.sendMessage(r.phone_number, text);
        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Levanter Broadcast] Failed for ${r.phone_number}:`, err);
        failed++;
      }
      // Pacing delay between recipients (80ms)
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    return { total: recipients.length, sent, failed };
  }

  /**
   * Broadcast Polls Open announcement
   */
  public static async broadcastPollsOpen(
    recipients: Array<{ phone_number: string; full_name: string; student_id: string }>,
    clientUrl: string,
    electionTitle: string
  ): Promise<{ total: number; sent: number; failed: number }> {
    return this.sendBulkBroadcast(recipients, (r) => {
      return `🗳️ *NEW LIFE COLLEGE ELECTIONS — POLLS ARE OPEN!*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${r.full_name}*,

The official voting polls for *${electionTitle}* are now officially *OPEN*!

👉 *Cast Your Confidential Ballot Now:*
${clientUrl}

📌 *Simple Steps to Vote:*
1. Enter your Student ID: \`${r.student_id}\`
2. Receive your 6-digit WhatsApp OTP
3. Select your preferred candidates and confirm your submission.

🔒 Your vote is 100% secret, tamper-proof, and anonymous.

_Electoral Commission, New Life College_`;
    });
  }

  /**
   * Broadcast Polls Closed announcement
   */
  public static async broadcastPollsClosed(
    recipients: Array<{ phone_number: string; full_name: string; student_id: string }>,
    clientUrl: string,
    electionTitle: string
  ): Promise<{ total: number; sent: number; failed: number }> {
    return this.sendBulkBroadcast(recipients, (r) => {
      return `🔒 *NEW LIFE COLLEGE ELECTIONS — POLLS ARE CLOSED*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${r.full_name}*,

Voting for *${electionTitle}* has officially *CONCLUDED*.

Thank you for participating and making your voice heard! The Electoral Commission is now collating and certifying final tallies.

📊 *Follow Live Certified Results:*
${clientUrl}/results

_Electoral Commission, New Life College_`;
    });
  }

  /**
   * Broadcast Election Winners announcement to all voters
   */
  public static async broadcastWinners(
    recipients: Array<{ phone_number: string; full_name: string; student_id: string }>,
    winnersList: Array<{
      position_title: string;
      candidate_name: string;
      running_mate: string | null;
      vote_count: number;
      percentage: number;
    }>,
    clientUrl: string,
    electionTitle: string
  ): Promise<{ total: number; sent: number; failed: number }> {
    const winnersFormatted = winnersList
      .map((w) => {
        const runningMate = w.running_mate ? ` (Vice: ${w.running_mate})` : '';
        return `👑 *${w.position_title}:*\n👉 *${w.candidate_name}*${runningMate}\n   Votes: ${w.vote_count} (${w.percentage}%)`;
      })
      .join('\n\n');

    return this.sendBulkBroadcast(recipients, (r) => {
      return `🏆 *OFFICIAL ELECTION WINNERS ANNOUNCEMENT* 🏆
━━━━━━━━━━━━━━━━━━━━━━
*${electionTitle}*
*New Life College Student Representative Council*

Hello *${r.full_name}*,

The Electoral Commission is proud to announce your newly elected student leaders for the 2026/2027 Academic Year:

${winnersFormatted}

━━━━━━━━━━━━━━━━━━━━━━
📊 *Full Certified Results & Tallies:*
${clientUrl}/results

Congratulations to all newly elected SRC Executives!

_Electoral Commission, New Life College_`;
    });
  }
}
