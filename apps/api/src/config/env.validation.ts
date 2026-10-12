import { z } from 'zod';

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
    HARDHAT_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
    HARDHAT_CHAIN_ID: z.coerce.number().int().positive().default(31337),
  })
  .superRefine((env, ctx) => {
    const origins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    if (env.NODE_ENV === 'production' && origins.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ALLOWED_ORIGINS'],
        message: 'Wildcard (*) CORS origin is prohibited in production',
      });
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
