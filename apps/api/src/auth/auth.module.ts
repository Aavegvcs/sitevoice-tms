import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CaslModule } from '../casl/casl.module';
import { PoliciesGuard } from '../casl/policies.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    CaslModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
        if (config.get('NODE_ENV') === 'production' && (secret.length < 32 || secret.startsWith('change-me'))) {
          throw new Error('JWT_ACCESS_SECRET must be a random string of at least 32 characters in production');
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  // Order matters: authenticate first (builds req.ability), then check route permissions.
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
