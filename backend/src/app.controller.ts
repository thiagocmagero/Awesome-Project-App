import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('hello')
export class AppController {
  @Get()
  getHello(): object {
    return {
      message: 'Hello World from awesome-project-app',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(@Req() request: Request & { user: { sub: number; email: string; role: string } }): object {
    return {
      message: 'Rota protegida acessível com JWT',
      user: request.user,
    };
  }
}
