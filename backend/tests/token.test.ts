import assert from 'node:assert/strict';
import { afterEach, test, mock } from 'node:test';
import {
  signAdminTokenPayload,
  signUserRefreshToken,
  signUserToken,
  verifySignedAdminPayload,
  verifyUserRefreshToken,
  verifyUserToken,
} from '../src/services/token';

const originalEnv = { ...process.env };

afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});

test('user access token verifies signed payload', () => {
  process.env.TRACECRAFT_USER_TOKEN_SECRET = 'test-user-token-secret-at-least-32-chars';
  process.env.TRACECRAFT_USER_TOKEN_TTL_HOURS = '1';

  const token = signUserToken({ userId: 'user-1', provider: 'wechat' });
  const payload = verifyUserToken(token);

  assert.equal(payload?.userId, 'user-1');
  assert.equal(payload?.provider, 'wechat');
  assert.equal(typeof payload?.jti, 'string');
  assert.ok((payload?.exp || 0) > (payload?.ts || 0));
});

test('user access token rejects tampered signature', () => {
  process.env.TRACECRAFT_USER_TOKEN_SECRET = 'test-user-token-secret-at-least-32-chars';

  const token = signUserToken({ userId: 'user-1' });
  const tampered = `${token.slice(0, -1)}x`;

  assert.equal(verifyUserToken(tampered), null);
});

test('user access token rejects expired token', () => {
  process.env.TRACECRAFT_USER_TOKEN_SECRET = 'test-user-token-secret-at-least-32-chars';
  process.env.TRACECRAFT_USER_TOKEN_TTL_HOURS = '1';

  const token = signUserToken({ userId: 'user-1' });
  const issuedAt = verifyUserToken(token)?.ts || Date.now();
  mock.method(Date, 'now', () => issuedAt + 2 * 60 * 60 * 1000);

  assert.equal(verifyUserToken(token), null);
});

test('refresh token uses separate prefix and requires jti', () => {
  process.env.TRACECRAFT_USER_REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-at-least-32-chars';
  process.env.TRACECRAFT_USER_REFRESH_TOKEN_TTL_HOURS = '24';

  const token = signUserRefreshToken({ userId: 'user-2', provider: 'phone' });
  const payload = verifyUserRefreshToken(token);

  assert.ok(token.startsWith('tc_user_refresh.'));
  assert.equal(payload?.userId, 'user-2');
  assert.equal(payload?.provider, 'phone');
  assert.equal(typeof payload?.jti, 'string');
});

test('admin token includes kid and verifies with active key', () => {
  process.env.TRACECRAFT_ADMIN_TOKEN_SECRET = 'test-admin-token-secret-at-least-32-chars';
  process.env.TRACECRAFT_ADMIN_TOKEN_KID = 'k1';

  const token = signAdminTokenPayload({ id: 'admin-1', username: 'root' });
  const payload = verifySignedAdminPayload(token);

  assert.ok(token.startsWith('tc_admin.k1.'));
  assert.equal(payload?.id, 'admin-1');
});

test('admin token verifies rotated key from keyring', async () => {
  process.env.TRACECRAFT_ADMIN_TOKEN_SECRET = 'new-admin-token-secret-at-least-32-chars';
  process.env.TRACECRAFT_ADMIN_TOKEN_KID = 'new';
  process.env.TRACECRAFT_ADMIN_TOKEN_SECRETS = 'old:old-admin-token-secret-at-least-32-chars';

  const encoded = Buffer.from(JSON.stringify({ id: 'admin-old' })).toString('base64url');
  const signedPayload = `old.${encoded}`;
  const sig = await import('node:crypto').then((crypto) =>
    crypto.createHmac('sha256', 'old-admin-token-secret-at-least-32-chars').update(signedPayload).digest('base64url'),
  );

  const payload = verifySignedAdminPayload(`tc_admin.old.${encoded}.${sig}`);
  assert.equal(payload?.id, 'admin-old');
});
