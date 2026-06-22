/**
 * 环境变量启动时校验
 *
 * 在服务启动时检查关键环境变量是否已正确配置，
 * 生产环境下缺失必需变量将阻止启动并输出明确错误信息。
 */

/** 环境变量校验结果 */
interface EnvCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 必需环境变量（生产环境） */
const REQUIRED_PROD_VARS: Array<{ name: string; description: string }> = [
  { name: 'TRACECRAFT_USER_TOKEN_SECRET', description: '用户访问 Token 签名密钥（>=32字符）' },
  { name: 'TRACECRAFT_USER_REFRESH_TOKEN_SECRET', description: '用户刷新 Token 签名密钥（>=32字符）' },
  { name: 'TRACECRAFT_ADMIN_TOKEN_SECRET', description: '管理员 Token 签名密钥（>=32字符）' },
  { name: 'DATABASE_URL', description: 'PostgreSQL 数据库连接字符串' },
];

/** 推荐配置的环境变量（非阻断，仅警告） */
const RECOMMENDED_VARS: Array<{ name: string; description: string; condition?: () => boolean }> = [
  { name: 'REDIS_URL', description: 'Redis 连接地址（不配置将降级为单进程模式）' },
  { name: 'AMAP_KEY', description: '高德地图 API Key（不配置将跳过路线可跑性校验）' },
  {
    name: 'TRACECRAFT_SMS_PROVIDER',
    description: '短信服务提供商（未设置时需开启 TRACECRAFT_ALLOW_DEV_AUTH=1）',
    condition: () => process.env.TRACECRAFT_ALLOW_DEV_AUTH !== '1',
  },
  {
    name: 'TRACECRAFT_ASSET_STORAGE_PROVIDER',
    description: '文件存储提供商（默认 local，生产环境建议使用 s3 或 webhook）',
    condition: () => process.env.NODE_ENV === 'production' && (process.env.TRACECRAFT_ASSET_STORAGE_PROVIDER || 'local') === 'local',
  },
];

/** 检查密钥强度 */
function isWeakSecret(value: string): boolean {
  return !value || value.length < 32 || value.startsWith('replace-with') || value.includes('change-me');
}

/** 执行环境变量校验 */
export function validateEnv(): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  // 生产环境检查必需变量
  if (isProd) {
    for (const { name, description } of REQUIRED_PROD_VARS) {
      const value = process.env[name];
      if (!value) {
        errors.push(`[ENV] 缺少必需环境变量: ${name} (${description})`);
      } else if ((name.includes('SECRET') || name.includes('TOKEN')) && isWeakSecret(value)) {
        errors.push(`[ENV] 环境变量 ${name} 强度不足: 需 >=32 字符且不能使用占位符`);
      }
    }

    // 生产环境禁止开启 dev 模式
    if (process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1') {
      errors.push('[ENV] 生产环境禁止开启 TRACECRAFT_ALLOW_DEV_AUTH=1');
    }
    if (process.env.TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK === '1') {
      errors.push('[ENV] 生产环境禁止开启 TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK=1');
    }
  }

  // 推荐变量检查（仅警告）
  for (const { name, description, condition } of RECOMMENDED_VARS) {
    if (condition && !condition()) continue;
    const value = process.env[name];
    if (!value || value.trim() === '') {
      warnings.push(`[ENV] 建议配置: ${name} (${description})`);
    }
  }

  // 数据库连接检查
  if (isProd && !process.env.DATABASE_URL) {
    errors.push('[ENV] 生产环境必须配置 DATABASE_URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** 启动时校验环境变量，失败时输出错误并退出进程 */
export function assertEnvOrExit(): void {
  const result = validateEnv();
  for (const warning of result.warnings) {
    console.warn(`\x1b[33m${warning}\x1b[0m`);
  }
  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`\x1b[31m${error}\x1b[0m`);
    }
    console.error('\x1b[31m[ENV] 环境变量校验失败，服务无法启动。请检查上述错误后重试。\x1b[0m');
    process.exit(1);
  }
}
