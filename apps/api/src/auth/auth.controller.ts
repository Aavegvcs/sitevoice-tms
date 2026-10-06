import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../common/public.decorator';
import { AuthService, REFRESH_TTL_MS, Session } from './auth.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { AuthedRequest } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { ACCESS_COOKIE } from './jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';
// Attempts per minute per IP; slows password guessing. Tests raise it via LOGIN_RATE_LIMIT.
const LOGIN_LIMIT = Number(process.env.LOGIN_RATE_LIMIT ?? 10);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  @Public()
  @Throttle({ default: { limit: LOGIN_LIMIT, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.login(dto.email, dto.password);
    this.setCookies(res, session);
    return { user: session.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setCookies(res, session);
    return { user: session.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  me(@Req() req: Request & AuthedRequest) {
    return { user: req.user, rules: this.casl.toClientRules(req.permissions) };
  }

  private setCookies(res: Response, s: Session) {
    const base = {
      httpOnly: true,
      sameSite: 'lax' as const,
      // Secure cookies are dropped by browsers over plain http, so a deployment without HTTPS
      // must set COOKIE_SECURE=false. Defaults to secure in production.
      secure: (this.config.get('COOKIE_SECURE') ?? String(this.config.get('NODE_ENV') === 'production')) === 'true',
    };
    // The cookie outlives the 15-minute JWT inside it so the web proxy can tell "has a session"
    // from "logged out"; an expired JWT gets a 401 and the client refreshes.
    res.cookie(ACCESS_COOKIE, s.accessToken, { ...base, path: '/', maxAge: REFRESH_TTL_MS });
    res.cookie(REFRESH_COOKIE, s.refreshToken, {
      ...base,
      path: '/api/auth',
      maxAge: REFRESH_TTL_MS,
    });
  }
}
