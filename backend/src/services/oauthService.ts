import crypto from 'crypto';
import type { QuickAuthProvider } from './authService';

export interface VerifiedOAuthIdentity {
  providerSubject: string;
  displayName?: string;
}

function isDevAuthEnabled(): boolean {
  return process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1';
}

async function verifyViaWebhook(provider: QuickAuthProvider, authCode: string): Promise<VerifiedOAuthIdentity> {
  const url = process.env.TRACECRAFT_OAUTH_WEBHOOK_URL || '';
  if (!url) throw new Error('oauth_provider_not_configured');
  const body = JSON.stringify({ provider, authCode });
  const secret = process.env.TRACECRAFT_OAUTH_WEBHOOK_SECRET || '';
  const signature = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : '';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'X-TraceCraft-Signature': signature } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error('oauth_provider_failed');
  const payload = await response.json() as { providerSubject?: unknown; openid?: unknown; unionid?: unknown; displayName?: unknown; nickname?: unknown };
  const subject = String(payload.providerSubject || payload.unionid || payload.openid || '').trim();
  if (!subject) throw new Error('oauth_subject_missing');
  return {
    providerSubject: subject,
    displayName: typeof payload.displayName === 'string'
      ? payload.displayName
      : typeof payload.nickname === 'string'
        ? payload.nickname
        : undefined,
  };
}

export async function verifyOAuthCode(provider: QuickAuthProvider, authCode: string, deviceId: string): Promise<VerifiedOAuthIdentity> {
  if (provider !== 'wechat' && provider !== 'alipay') {
    throw new Error('unsupported_provider');
  }
  if (isDevAuthEnabled()) {
    const seed = authCode || deviceId;
    return {
      providerSubject: crypto.createHash('sha256').update(`${provider}:${seed}`).digest('hex'),
    };
  }
  if (!authCode) throw new Error('oauth_code_required');
  const mode = String(process.env.TRACECRAFT_OAUTH_PROVIDER || '').toLowerCase();
  if (mode === 'webhook') return verifyViaWebhook(provider, authCode);
  throw new Error('oauth_provider_not_configured');
}
