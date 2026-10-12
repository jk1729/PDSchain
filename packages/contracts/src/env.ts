import { z } from 'zod';

const externalDeployEnvSchema = z.object({
  SEPOLIA_RPC_URL: z.string().url('SEPOLIA_RPC_URL must be a valid HTTPS/HTTP RPC URL'),
  SEPOLIA_CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  DEPLOYER_PRIVATE_KEY: z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]{64}$/, 'DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key'),
});

export type ExternalDeployEnv = z.infer<typeof externalDeployEnvSchema>;

/**
 * Validates required environment variables before attempting deployment
 * to any non-local external network (e.g. Sepolia in Phase 3+).
 */
export function validateExternalDeploymentEnv(
  envInput: NodeJS.ProcessEnv = process.env,
): ExternalDeployEnv {
  const result = externalDeployEnvSchema.safeParse(envInput);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid external blockchain deployment configuration: ${issues}`);
  }
  return result.data;
}
