import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma como servicio inyectable. Fuente única de acceso a la BD
 * (ninguna app accede a la base fuera de aquí — Master Doc 6 §2).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
