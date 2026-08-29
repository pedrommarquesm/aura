import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AppError } from '../common/errors/app-error';

import { StaffAuthGuard, type StaffRequest } from './staff-auth.guard';
import { StaffService, toPublicStaff } from './staff.service';
import { StaffTokensService } from './staff-tokens.service';

const googleSignInSchema = z.object({
  identityToken: z.string().min(1),
  nonce: z.string().optional(),
  device: z
    .object({
      name: z.string().max(120).optional(),
      platform: z.enum(['ios', 'android', 'web']).optional(),
      appVersion: z.string().max(20).optional(),
    })
    .optional(),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

@Controller('staff/auth')
export class StaffAuthController {
  constructor(
    private readonly staff: StaffService,
    private readonly tokens: StaffTokensService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() body: unknown, @Req() request: StaffRequest) {
    const input = googleSignInSchema.parse(body);

    const result = await this.staff.signInWithGoogle(input.identityToken, {
      nonce: input.nonce,
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
      staff: result.staff,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown, @Req() request: StaffRequest) {
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
  @UseGuards(StaffAuthGuard)
  async logout(@Req() request: StaffRequest): Promise<void> {
    if (request.staffSessionId) {
      await this.tokens.revokeSession(request.staffSessionId);
    }
  }

  @Get('me')
  @UseGuards(StaffAuthGuard)
  me(@Req() request: StaffRequest) {
    if (!request.staff) throw AppError.unauthorized();
    return { staff: toPublicStaff(request.staff) };
  }
}
