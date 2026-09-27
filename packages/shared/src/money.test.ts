import { describe, it, expect } from 'vitest';
import { calculateAccount, toCents, fromCents, type AccountLineInput, type AccountParams } from './money';

const RD: AccountParams = { taxRate: 0.18, tipRate: 0.1, tipEnabled: true };

describe('toCents / fromCents', () => {
  it('convierte sin errores de coma flotante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
    expect(toCents(450)).toBe(45000);
    expect(fromCents(45000)).toBe(450);
    expect(fromCents(30)).toBe(0.3);
  });
});

describe('calculateAccount', () => {
  it('calcula ITBIS y propina por truck sobre el subtotal', () => {
    const lines: AccountLineInput[] = [{ foodTruckId: 'burger', unitPrice: 450, quantity: 1 }];
    const r = calculateAccount(lines, RD);
    expect(r.perTruck).toHaveLength(1);
    expect(r.subtotalCents).toBe(45000);
    expect(r.taxCents).toBe(8100); // 45000 * 0.18
    expect(r.tipCents).toBe(4500); // 45000 * 0.10
    expect(r.totalCents).toBe(57600);
  });

  it('agrupa múltiples líneas del mismo truck', () => {
    const lines: AccountLineInput[] = [
      { foodTruckId: 'burger', unitPrice: 450, quantity: 1 },
      { foodTruckId: 'burger', unitPrice: 200, quantity: 2 },
    ];
    const r = calculateAccount(lines, RD);
    expect(r.perTruck).toHaveLength(1);
    expect(r.perTruck[0].subtotalCents).toBe(85000); // 450 + 400
  });

  it('separa por food truck y el total es la suma exacta de los desgloses', () => {
    const lines: AccountLineInput[] = [
      { foodTruckId: 'burger', unitPrice: 450, quantity: 1 },
      { foodTruckId: 'tacos', unitPrice: 600, quantity: 1 },
      { foodTruckId: 'bubble', unitPrice: 300, quantity: 1 },
    ];
    const r = calculateAccount(lines, RD);
    expect(r.perTruck).toHaveLength(3);
    const sum = r.perTruck.reduce((a, t) => a + t.totalCents, 0);
    expect(r.totalCents).toBe(sum);
  });

  it('el orden de las líneas no afecta el total', () => {
    const a = calculateAccount(
      [
        { foodTruckId: 't1', unitPrice: 123.45, quantity: 3 },
        { foodTruckId: 't2', unitPrice: 99.99, quantity: 1 },
      ],
      RD,
    );
    const b = calculateAccount(
      [
        { foodTruckId: 't2', unitPrice: 99.99, quantity: 1 },
        { foodTruckId: 't1', unitPrice: 123.45, quantity: 3 },
      ],
      RD,
    );
    expect(a.totalCents).toBe(b.totalCents);
  });

  it('no aplica propina si tipEnabled es false', () => {
    const r = calculateAccount([{ foodTruckId: 't', unitPrice: 1000, quantity: 1 }], {
      taxRate: 0.18,
      tipRate: 0.1,
      tipEnabled: false,
    });
    expect(r.tipCents).toBe(0);
    expect(r.totalCents).toBe(118000);
  });

  it('redondea half-up el impuesto', () => {
    // 333 centavos * 0.18 = 59.94 → 60
    const r = calculateAccount([{ foodTruckId: 't', unitPrice: 3.33, quantity: 1 }], {
      taxRate: 0.18,
      tipRate: 0,
      tipEnabled: false,
    });
    expect(r.taxCents).toBe(60);
  });

  it('cuenta vacía da ceros', () => {
    const r = calculateAccount([], RD);
    expect(r.totalCents).toBe(0);
    expect(r.perTruck).toHaveLength(0);
  });

  it('rechaza cantidades y tasas inválidas', () => {
    expect(() => calculateAccount([{ foodTruckId: 't', unitPrice: 10, quantity: 0 }], RD)).toThrow();
    expect(() => calculateAccount([{ foodTruckId: 't', unitPrice: 10, quantity: 1.5 }], RD)).toThrow();
    expect(() =>
      calculateAccount([{ foodTruckId: 't', unitPrice: 10, quantity: 1 }], { taxRate: -0.1, tipRate: 0, tipEnabled: false }),
    ).toThrow();
  });
});
