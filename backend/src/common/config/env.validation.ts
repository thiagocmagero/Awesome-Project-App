import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment, { message: 'NODE_ENV must be one of: development, test, production' })
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL must be set' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(1, { message: 'FRONTEND_ORIGIN must be set (comma-separated list allowed)' })
  FRONTEND_ORIGIN!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(`Invalid environment variables:\n  - ${messages.join('\n  - ')}`);
  }

  return validated;
}
