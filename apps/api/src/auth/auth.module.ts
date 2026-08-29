import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthGuard, OptionalAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AppleProvider } from './providers/apple.provider';
import { GoogleProvider } from './providers/google.provider';
import { TokensService } from './tokens.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    AppleProvider,
    GoogleProvider,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthService, TokensService, AuthGuard, OptionalAuthGuard, GoogleProvider],
})
export class AuthModule {}
