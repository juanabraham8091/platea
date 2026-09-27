/**
 * Máquinas de estado canónicas de PLATEA 2.0 (DECISIONES.md DD2, diseño 01 §7).
 *
 * Fuente única de verdad para transiciones. La API valida contra estas tablas;
 * una transición ilegal se rechaza con error 409 y sin efectos.
 */

// ── Sesión de mesa (cuenta abierta, D1) ─────────────────────────────
export const SessionStatus = {
  OPEN: 'OPEN',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  CLOSED: 'CLOSED',
  VOIDED: 'VOIDED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  OPEN: [SessionStatus.AWAITING_PAYMENT, SessionStatus.VOIDED],
  // Volver a OPEN se permite solo si ningún cobro fue confirmado (regla de negocio
  // adicional validada en el servicio, no aquí).
  AWAITING_PAYMENT: [SessionStatus.OPEN, SessionStatus.PAID, SessionStatus.VOIDED],
  PAID: [SessionStatus.CLOSED],
  CLOSED: [],
  VOIDED: [],
};

// ── Sub-pedido (por food truck, DD3) ────────────────────────────────
export const SubOrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubOrderStatus = (typeof SubOrderStatus)[keyof typeof SubOrderStatus];

const SUBORDER_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
  PENDING: [SubOrderStatus.ACCEPTED, SubOrderStatus.CANCELLED],
  ACCEPTED: [SubOrderStatus.PREPARING, SubOrderStatus.CANCELLED],
  PREPARING: [SubOrderStatus.READY, SubOrderStatus.CANCELLED],
  // Cancelar tras READY requiere PARK_ADMIN (validado en el servicio).
  READY: [SubOrderStatus.DELIVERED, SubOrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

// ── Factura (recibo interno, D6) ────────────────────────────────────
export const InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  VOIDED: 'VOIDED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  PENDING: [InvoiceStatus.PAID, InvoiceStatus.VOIDED],
  PAID: [], // inmutable tras el pago
  VOIDED: [],
};

// ── Cobro por truck (breakdown, D5) ─────────────────────────────────
export const PaymentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  VOIDED: 'VOIDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: [PaymentStatus.CONFIRMED, PaymentStatus.VOIDED],
  CONFIRMED: [],
  VOIDED: [],
};

// ── Comisión PLATEA (DD1) ───────────────────────────────────────────
export const CommissionStatus = {
  ACCRUED: 'ACCRUED',
  BILLED: 'BILLED',
  PAID: 'PAID',
} as const;
export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus];

const COMMISSION_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  ACCRUED: [CommissionStatus.BILLED],
  BILLED: [CommissionStatus.PAID],
  PAID: [],
};

// ── Ciclo de facturación SaaS ───────────────────────────────────────
export const BillingCycleStatus = {
  OPEN: 'OPEN',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type BillingCycleStatus = (typeof BillingCycleStatus)[keyof typeof BillingCycleStatus];

const BILLING_CYCLE_TRANSITIONS: Record<BillingCycleStatus, BillingCycleStatus[]> = {
  OPEN: [BillingCycleStatus.ISSUED],
  ISSUED: [BillingCycleStatus.PAID, BillingCycleStatus.OVERDUE],
  OVERDUE: [BillingCycleStatus.PAID],
  PAID: [],
};

// ── Helpers genéricos ───────────────────────────────────────────────
const TRANSITION_TABLES = {
  session: SESSION_TRANSITIONS,
  subOrder: SUBORDER_TRANSITIONS,
  invoice: INVOICE_TRANSITIONS,
  payment: PAYMENT_TRANSITIONS,
  commission: COMMISSION_TRANSITIONS,
  billingCycle: BILLING_CYCLE_TRANSITIONS,
} as const;

export type StateMachine = keyof typeof TRANSITION_TABLES;

/** Devuelve true si `from → to` es una transición válida para la máquina dada. */
export function canTransition(machine: StateMachine, from: string, to: string): boolean {
  const table = TRANSITION_TABLES[machine] as Record<string, string[]>;
  return table[from]?.includes(to) ?? false;
}

/** Estados a los que se puede avanzar desde `from`. */
export function nextStates(machine: StateMachine, from: string): string[] {
  const table = TRANSITION_TABLES[machine] as Record<string, string[]>;
  return table[from] ?? [];
}
