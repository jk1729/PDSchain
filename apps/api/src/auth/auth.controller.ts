import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, SkipCsrf } from '../rbac/decorators';
import { AuthenticatedPrincipal, AuthenticatedRequest } from '../rbac/rbac.types';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCitizenDto } from './dto/register-citizen.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @SkipCsrf()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterCitizenDto, @Req() req: AuthenticatedRequest) {
    return this.authService.registerCitizen(dto, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
      correlationId: req.correlationId,
    });
  }

  @Post('verify-email')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: AuthenticatedRequest) {
    return this.authService.verifyEmail(dto, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
      correlationId: req.correlationId,
    });
  }

  @Post('resend-verification')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: AuthenticatedRequest) {
    return this.authService.resendVerification(dto, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
      correlationId: req.correlationId,
    });
  }

  @Post('login')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.authService.getSessionCookieName();
    return this.authService.login(
      dto,
      {
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
        correlationId: req.correlationId,
        existingSessionCookie: req.cookies?.[cookieName],
      },
      res,
    );
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(
      principal,
      {
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
        correlationId: req.correlationId,
      },
      res,
    );
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getCurrentUser(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      status: 'authenticated',
      user: principal,
      csrfToken: req.cookies?.['pdschain_csrf'] ?? null,
    };
  }

  @Post('forgot-password')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: AuthenticatedRequest) {
    return this.authService.forgotPassword(dto, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
      correlationId: req.correlationId,
    });
  }

  @Post('reset-password')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.resetPassword(
      dto,
      {
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
        correlationId: req.correlationId,
      },
      res,
    );
  }
}
