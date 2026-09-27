import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/jwt-auth.guard';

/**
 * Endpoints de salud para monitoreo externo (Doc 11 §8).
 * /health/live  → el proceso responde.
 * /health/ready → dependencias (BD) disponibles.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Public()
  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'up' };
  }
}
