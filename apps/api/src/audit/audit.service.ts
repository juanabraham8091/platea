import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Registro de auditoría inmutable (Master Doc 5 §16, Doc 9 §12).
 * Toda acción importante debe pasar por aquí. Los registros nunca se
 * modifican ni eliminan desde la aplicación.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId ?? null,
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          oldValue: entry.oldValue === undefined ? undefined : (entry.oldValue as object),
          newValue: entry.newValue === undefined ? undefined : (entry.newValue as object),
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // La auditoría nunca debe tumbar la operación principal, pero sí alertar.
      this.logger.error({ err, action: entry.action, entity: entry.entity }, 'Fallo al registrar auditoría');
    }
  }
}
