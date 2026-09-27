import { describe, it, expect } from 'vitest';
import { canTransition, nextStates } from './states';

describe('máquina de estados: session', () => {
  it('permite transiciones válidas', () => {
    expect(canTransition('session', 'OPEN', 'AWAITING_PAYMENT')).toBe(true);
    expect(canTransition('session', 'AWAITING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition('session', 'PAID', 'CLOSED')).toBe(true);
    expect(canTransition('session', 'OPEN', 'VOIDED')).toBe(true);
  });
  it('rechaza transiciones inválidas', () => {
    expect(canTransition('session', 'OPEN', 'PAID')).toBe(false);
    expect(canTransition('session', 'CLOSED', 'OPEN')).toBe(false);
    expect(canTransition('session', 'PAID', 'VOIDED')).toBe(false);
  });
});

describe('máquina de estados: subOrder', () => {
  it('avanza en orden y permite cancelar salvo estados finales', () => {
    expect(canTransition('subOrder', 'PENDING', 'ACCEPTED')).toBe(true);
    expect(canTransition('subOrder', 'READY', 'DELIVERED')).toBe(true);
    expect(canTransition('subOrder', 'PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('subOrder', 'DELIVERED', 'CANCELLED')).toBe(false);
    expect(canTransition('subOrder', 'PENDING', 'READY')).toBe(false);
  });
});

describe('máquina de estados: invoice y payment', () => {
  it('la factura pagada es inmutable', () => {
    expect(canTransition('invoice', 'PENDING', 'PAID')).toBe(true);
    expect(nextStates('invoice', 'PAID')).toEqual([]);
  });
  it('el cobro confirmado es final', () => {
    expect(canTransition('payment', 'PENDING', 'CONFIRMED')).toBe(true);
    expect(nextStates('payment', 'CONFIRMED')).toEqual([]);
  });
});

describe('máquina de estados: commission', () => {
  it('sigue el ciclo ACCRUED → BILLED → PAID', () => {
    expect(canTransition('commission', 'ACCRUED', 'BILLED')).toBe(true);
    expect(canTransition('commission', 'BILLED', 'PAID')).toBe(true);
    expect(canTransition('commission', 'ACCRUED', 'PAID')).toBe(false);
  });
});
