import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AppError } from '../common/errors/app-error';
import { toPublicUser } from '../users/public-user';

import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';

const providerSignInSchema = z.object({
  identityToken: z.string().min(1),
  nonce: z.string().optional(),
  locale: z.string().optional(),
  device: z
    .object({
      name: z.string().max(120).optional(),
      platform: z.enum(['ios', 'android', 'web']).optional(),
      appVersion: z.string().max(20).optional(),
    })
    .optional(),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const usernameSchema = z.object({ username: z.string().min(3).max(30) });

const deviceSchema = z
  .object({
    name: z.string().max(120).optional(),
    platform: z.enum(['ios', 'android', 'web']).optional(),
    appVersion: z.string().max(20).optional(),
  })
  .optional();

const passwordLoginSchema = z.object({
  identifier: z.string().min(1).max(320),
  password: z.string().min(8).max(128),
  locale: z.string().optional(),
  device: deviceSchema,
});

const passwordRegisterSchema = z.object({
  email: z.string().email().max(320),
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(128),
  locale: z.string().optional(),
  device: deviceSchema,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async apple(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.signIn('apple', body, request);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.signIn('google', body, request);
  }

  private async signIn(provider: 'apple' | 'google', body: unknown, request: AuthenticatedRequest) {
    const input = providerSignInSchema.parse(body);

    const result = await this.auth.signInWithProvider(provider, input.identityToken, {
      nonce: input.nonce,
      locale: input.locale ?? request.headers['accept-language'],
      device: {
        deviceName: input.device?.name,
        platform: input.device?.platform,
        appVersion: input.device?.appVersion,
        ip: request.ip,
      },
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      needsUsername: result.needsUsername,
      user: toPublicUser(result.user),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const input = passwordLoginSchema.parse(body);
    await this.auth.consumePasswordAttempt(request.ip ?? 'unknown', input.identifier);

    const result = await this.auth.signInWithPassword(input.identifier, input.password, {
      device: {
        deviceName: input.device?.name,
        platform: input.device?.platform,
        appVersion: input.device?.appVersion,
        ip: request.ip,
      },
    });

    return this.toSession(result);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const input = passwordRegisterSchema.parse(body);
    await this.auth.consumePasswordAttempt(request.ip ?? 'unknown', input.email);

    const result = await this.auth.registerWithPassword(
      { email: input.email, username: input.username, password: input.password },
      {
        locale: input.locale ?? request.headers['accept-language'],
        device: {
          deviceName: input.device?.name,
          platform: input.device?.platform,
          appVersion: input.device?.appVersion,
          ip: request.ip,
        },
      },
    );

    return this.toSession(result);
  }

  private toSession(result: Awaited<ReturnType<AuthService['signInWithPassword']>>) {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      needsUsername: result.needsUsername,
      user: toPublicUser(result.user),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const { refreshToken } = refreshSchema.parse(body);

    const issued = await this.tokens.rotate(refreshToken, { ip: request.ip });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresIn: issued.expiresIn,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    if (request.sessionId) {
      await this.tokens.revokeSession(request.sessionId);
    }
  }

  @Post('username')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async claimUsername(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const { username } = usernameSchema.parse(body);

    if (!request.user) throw AppError.unauthorized();

    const updated = await this.auth.claimUsername(request.user.id, username);
    return { user: toPublicUser(updated) };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return { user: toPublicUser(request.user) };
  }
}
