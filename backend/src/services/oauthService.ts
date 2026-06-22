/**
 * OAuth 授权码验证服务
 *
 * 支持的 Provider 模式：
 *   1. dev：开发模式，直接用 authCode 哈希作为 subject（TRACECRAFT_ALLOW_DEV_AUTH=1）
 *   2. webhook：通过外部 Webhook 代理交换授权码（适用于自建中转服务）
 *   3. wechat：直接调用微信 OAuth2 API 交换 code 获取 openid/unionid
 *   4. alipay：直接调用支付宝 OAuth2 API 交换 code 获取 user_id
 *
 * 环境变量配置：
 *   TRACECRAFT_OAUTH_PROVIDER=wechat|alipay|webhook（决定走哪个 provider）
 *   微信：WECHAT_APP_ID + WECHAT_APP_SECRET
 *   支付宝：ALIPAY_APP_ID + ALIPAY_APP_PRIVATE_KEY + ALIPAY_PUBLIC_KEY
 *   Webhook：TRACECRAFT_OAUTH_WEBHOOK_URL + TRACECRAFT_OAUTH_WEBHOOK_SECRET
 */
import crypto from 'crypto';
import type { QuickAuthProvider } from './authService';
import { logger } from './logger';

export interface VerifiedOAuthIdentity {
  providerSubject: string;
  displayName?: string;
}

function isDevAuthEnabled(): boolean {
  return process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1';
}

// ===== Webhook 模式 =====

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
    signal: AbortSignal.timeout(5000),
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

// ===== 微信 OAuth2 =====

/** 微信 OAuth2 access_token 响应 */
interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/** 微信用户信息响应 */
interface WechatUserInfoResponse {
  openid?: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/** 通过微信 OAuth2 API 交换授权码 */
async function verifyViaWechat(authCode: string): Promise<VerifiedOAuthIdentity> {
  const appId = process.env.WECHAT_APP_ID || '';
  const appSecret = process.env.WECHAT_APP_SECRET || '';
  if (!appId || !appSecret) {
    throw new Error('oauth_wechat_not_configured');
  }

  // 第一步：用 code 换取 access_token + openid
  const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
  tokenUrl.searchParams.set('appid', appId);
  tokenUrl.searchParams.set('secret', appSecret);
  tokenUrl.searchParams.set('code', authCode);
  tokenUrl.searchParams.set('grant_type', 'authorization_code');

  const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(5000) });
  const tokenData = await tokenRes.json() as WechatTokenResponse;

  if (tokenData.errcode) {
    logger.error('oauth_wechat_token_failed', new Error(tokenData.errmsg || 'unknown'), { errcode: tokenData.errcode });
    throw new Error('oauth_provider_failed');
  }

  const openid = tokenData.openid;
  const unionid = tokenData.unionid;
  const accessToken = tokenData.access_token;

  if (!openid && !unionid) {
    throw new Error('oauth_subject_missing');
  }

  // 优先使用 unionid（跨应用唯一标识），其次 openid
  const subject = unionid || openid!;

  // 第二步：尝试获取用户昵称（可选，失败不影响登录）
  let displayName: string | undefined;
  if (accessToken && openid) {
    try {
      const userInfoUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
      userInfoUrl.searchParams.set('access_token', accessToken);
      userInfoUrl.searchParams.set('openid', openid);
      const userInfoRes = await fetch(userInfoUrl, { signal: AbortSignal.timeout(3000) });
      const userInfo = await userInfoRes.json() as WechatUserInfoResponse;
      if (!userInfo.errcode && userInfo.nickname) {
        displayName = userInfo.nickname;
      }
    } catch {
      // 获取用户信息失败不影响登录流程
    }
  }

  return { providerSubject: subject, displayName };
}

// ===== 支付宝 OAuth2 =====

/** 支付宝 RSA2 签名 */
function alipaySign(params: Record<string, string>, privateKey: string): string {
  const sorted = Object.keys(params).filter((k) => params[k] !== '').sort();
  const signString = sorted.map((k) => `${k}=${params[k]}`).join('&');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signString);
  return sign.sign(privateKey, 'base64');
}

/** 支付宝 API 响应 */
interface AlipayResponse {
  alipay_system_oauth_token_response?: {
    user_id?: string;
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  error_response?: {
    code?: string;
    msg?: string;
    sub_msg?: string;
  };
}

/** 通过支付宝 OAuth2 API 交换授权码 */
async function verifyViaAlipay(authCode: string): Promise<VerifiedOAuthIdentity> {
  const appId = process.env.ALIPAY_APP_ID || '';
  const privateKey = process.env.ALIPAY_APP_PRIVATE_KEY || '';
  if (!appId || !privateKey) {
    throw new Error('oauth_alipay_not_configured');
  }

  const params: Record<string, string> = {
    app_id: appId,
    method: 'alipay.system.oauth.token',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    version: '1.0',
    grant_type: 'authorization_code',
    code: authCode,
  };
  params['sign'] = alipaySign(params, privateKey);

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const response = await fetch('https://openapi.alipay.com/gateway.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000),
  });

  const payload = await response.json() as AlipayResponse;

  if (payload.error_response) {
    logger.error('oauth_alipay_failed', new Error(payload.error_response.sub_msg || payload.error_response.msg || 'unknown'), {
      code: payload.error_response.code,
    });
    throw new Error('oauth_provider_failed');
  }

  const userId = payload.alipay_system_oauth_token_response?.user_id;
  if (!userId) {
    throw new Error('oauth_subject_missing');
  }

  return { providerSubject: userId };
}

// ===== 统一入口 =====

/**
 * 验证 OAuth 授权码
 * 根据 TRACECRAFT_OAUTH_PROVIDER 环境变量决定使用哪种验证方式
 */
export async function verifyOAuthCode(
  provider: QuickAuthProvider,
  authCode: string,
  deviceId: string,
): Promise<VerifiedOAuthIdentity> {
  if (provider !== 'wechat' && provider !== 'alipay') {
    throw new Error('unsupported_provider');
  }

  // 开发模式：直接用 authCode 哈希作为 subject
  if (isDevAuthEnabled()) {
    const seed = authCode || deviceId;
    return {
      providerSubject: crypto.createHash('sha256').update(`${provider}:${seed}`).digest('hex'),
    };
  }

  if (!authCode) throw new Error('oauth_code_required');

  // 根据 provider 类型选择验证方式
  const mode = String(process.env.TRACECRAFT_OAUTH_PROVIDER || '').toLowerCase();

  // 优先使用 provider 对应的直接 API 调用
  if (mode === provider && provider === 'wechat') {
    return verifyViaWechat(authCode);
  }
  if (mode === provider && provider === 'alipay') {
    return verifyViaAlipay(authCode);
  }

  // webhook 模式（通过外部代理服务）
  if (mode === 'webhook') {
    return verifyViaWebhook(provider, authCode);
  }

  // 默认：如果配置了对应 provider 的密钥，直接调用对应 API
  if (provider === 'wechat' && process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
    return verifyViaWechat(authCode);
  }
  if (provider === 'alipay' && process.env.ALIPAY_APP_ID && process.env.ALIPAY_APP_PRIVATE_KEY) {
    return verifyViaAlipay(authCode);
  }

  throw new Error('oauth_provider_not_configured');
}
