import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from './logger';

/**
 * Audit trail for sensitive actions (chip movements, user blocks/resets,
 * settings changes): who did what, to whom, when, from which IP.
 *
 * IP/user-agent travel via AsyncLocalStorage so domains don't need the
 * Request threaded through every call site. Writes are fire-and-forget —
 * an audit failure must never fail the underlying operation, but it is
 * logged loudly.
 */
interface AuditRequestInfo {
  ip: string | null;
  userAgent: string | null;
}

const auditInfoStore = new AsyncLocalStorage<AuditRequestInfo>();

/** Express middleware: capture request IP/UA for any audit written downstream. */
export const auditContext = (req: Request, _res: Response, next: NextFunction): void => {
  auditInfoStore.run(
    { ip: req.ip ?? null, userAgent: (req.headers['user-agent'] as string | undefined) ?? null },
    () => next()
  );
};

export interface AuditEvent {
  /** Who performed the action (null for system/anonymous). */
  requesterId: string | null;
  /** Dotted verb, e.g. 'chips.sell', 'user.block', 'settings.update'. */
  action: string;
  entityType: 'user' | 'chips' | 'settings';
  /** Target of the action (e.g. the player receiving chips). */
  entityId?: string | null;
  oldValues?: object | null;
  newValues?: object | null;
}

export function writeAudit(event: AuditEvent): void {
  if ((config.server?.env ?? process.env.NODE_ENV) === 'test') return;
  // Lazy import: keeps unit tests (which mock sequelize) from initialising
  // the real model just by importing a domain that audits.
  const info = auditInfoStore.getStore();
  import('../features/users/audit-log.model')
    .then(({ AuditLogModel }) =>
      AuditLogModel.create({
        userId: event.requesterId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        oldValues: event.oldValues ?? null,
        newValues: event.newValues ?? null,
        ipAddress: info?.ip ?? null,
        userAgent: info?.userAgent ?? null
      })
    )
    .catch(err => {
      logger.error({ err, action: event.action, requesterId: event.requesterId }, '[Audit] write failed');
    });
}
