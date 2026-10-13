import { z } from 'zod';

const booleanFromEnv = z.union([z.boolean(), z.string()]).transform((val) => {
  if (typeof val === 'boolean') return val;
  return val.trim().toLowerCase() === 'true';
});

const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().min(1).default('pdschain-v2'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    API_HOST: z.string().min(1).default('127.0.0.1'),
    API_PORT: z.coerce
      .number()
      .int('API_PORT must be an integer')
      .min(1, 'API_PORT must be >= 1')
      .max(65535, 'API_PORT must be <= 65535')
      .default(4000),
    WEB_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL is required' })
      .min(1, 'DATABASE_URL cannot be empty')
      .refine(
        (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string (postgresql:// or postgres://)',
      ),
    CORS_ALLOWED_ORIGINS: z
      .string()
      .min(1, 'CORS_ALLOWED_ORIGINS must specify at least one origin')
      .default('http://localhost:5173,http://127.0.0.1:5173'),
    SESSION_COOKIE_NAME: z.string().min(1).default('pdschain_session'),
    CSRF_COOKIE_NAME: z.string().min(1).default('pdschain_csrf'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
    SESSION_COOKIE_SECURE: booleanFromEnv.default(false),
    ARGON2_MEMORY_COST: z.coerce.number().int().min(4096).default(19456),
    ARGON2_TIME_COST: z.coerce.number().int().min(1).default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().min(1).default(1),
    EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(10080).default(60),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(10),
    EMAIL_DELIVERY_MODE: z.enum(['dev_outbox', 'smtp', 'disabled']).default('dev_outbox'),
    EMAIL_DEV_OUTBOX_DIR: z.string().min(1).default('.dev-mailbox'),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_FROM: z.string().default('noreply@pdschain.example.org'),
    HARDHAT_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
    HARDHAT_CHAIN_ID: z.coerce.number().int().positive().default(31337),
  })
  .superRefine((env, ctx) => {
    const origins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    if (origins.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ALLOWED_ORIGINS'],
        message: 'Wildcard (*) CORS origin is prohibited with credentialed sessions',
      });
    }
    if (env.NODE_ENV === 'production') {
      if (env.EMAIL_DELIVERY_MODE === 'dev_outbox') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['EMAIL_DELIVERY_MODE'],
          message: 'Development email outbox (dev_outbox) is strictly prohibited in production',
        });
      }
      if (!env.SESSION_COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_COOKIE_SECURE'],
          message: 'SESSION_COOKIE_SECURE must be true in production',
        });
      }
    }
  });

export type ApiEnvConfig = z.infer<typeof apiEnvSchema>;

/**
 * Validates raw environment variables for the NestJS API.
 * Throws a descriptive Error if required configuration is missing or malformed.
 */
export function validateApiEnv(config: Record<string, unknown>): ApiEnvConfig {
  const parsed = apiEnvSchema.safeParse(config);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid API environment configuration: ${formatted}`);
  }
  return parsed.data;
}
