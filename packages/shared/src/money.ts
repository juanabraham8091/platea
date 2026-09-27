/**
 * Cálculo de la cuenta de una mesa (diseño 01 §8, Master Doc 8).
 *
 * Reglas:
 *  - Toda la aritmética se hace en CENTAVOS ENTEROS para evitar errores de
 *    coma flotante. Las entradas vienen en unidades monetarias (RD$) con hasta
 *    2 decimales y se convierten a centavos al entrar.
 *  - Impuesto (ITBIS) y propina se calculan por food truck sobre su subtotal,
 *    con las tasas configurables del parque (D6). Redondeo half-up a 2 decimales.
 *  - La factura suma exactamente los desgloses por truck (invariante probado).
 *  - La comisión PLATEA (US$0.30) NO participa aquí: nace del evento de pago (DD1).
 *
 * Esta función es dominio puro (sin I/O) y es la ÚNICA fuente del cálculo.
 */

export interface AccountLineInput {
  foodTruckId: string;
  /** Precio unitario en unidades monetarias (RD$), 2 decimales máx. */
  unitPrice: number;
  quantity: number;
}

export interface AccountParams {
  /** Tasa de impuesto (ej. 0.18 = ITBIS 18%). */
  taxRate: number;
  /** Tasa de propina (ej. 0.10). */
  tipRate: number;
  /** Si la propina aplica en este parque. */
  tipEnabled: boolean;
}

export interface TruckBreakdown {
  foodTruckId: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
}

export interface AccountResult {
  perTruck: TruckBreakdown[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
}

const CENTS = 100;

/** Convierte unidades monetarias (posibles decimales) a centavos enteros. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error('Monto no finito');
  // Redondeo a centavo más cercano para absorber imprecisión binaria del input.
  return Math.round(amount * CENTS);
}

/** Convierte centavos a número con 2 decimales (para serializar en respuestas). */
export function fromCents(cents: number): number {
  return Math.round(cents) / CENTS;
}

/** Redondeo half-up de centavos aplicando una tasa a una base en centavos. */
function applyRate(baseCents: number, rate: number): number {
  if (rate < 0) throw new Error('Tasa negativa no permitida');
  // baseCents * rate puede tener decimales de centavo → half-up.
  return Math.floor(baseCents * rate + 0.5);
}

/**
 * Calcula la cuenta agrupando por food truck.
 * Las líneas de un mismo truck se suman; el orden de entrada no afecta el total.
 */
export function calculateAccount(lines: AccountLineInput[], params: AccountParams): AccountResult {
  if (params.taxRate < 0 || params.tipRate < 0) {
    throw new Error('Las tasas no pueden ser negativas');
  }

  // Subtotales por truck en centavos.
  const subtotalByTruck = new Map<string, number>();
  const truckOrder: string[] = [];

  for (const line of lines) {
    if (line.quantity <= 0 || !Number.isInteger(line.quantity)) {
      throw new Error('Cantidad inválida');
    }
    const lineCents = toCents(line.unitPrice) * line.quantity;
    if (lineCents < 0) throw new Error('Precio negativo no permitido');

    if (!subtotalByTruck.has(line.foodTruckId)) {
      subtotalByTruck.set(line.foodTruckId, 0);
      truckOrder.push(line.foodTruckId);
    }
    subtotalByTruck.set(line.foodTruckId, subtotalByTruck.get(line.foodTruckId)! + lineCents);
  }

  const perTruck: TruckBreakdown[] = truckOrder.map((foodTruckId) => {
    const subtotalCents = subtotalByTruck.get(foodTruckId)!;
    const taxCents = applyRate(subtotalCents, params.taxRate);
    const tipCents = params.tipEnabled ? applyRate(subtotalCents, params.tipRate) : 0;
    const totalCents = subtotalCents + taxCents + tipCents;
    return { foodTruckId, subtotalCents, taxCents, tipCents, totalCents };
  });

  const result: AccountResult = {
    perTruck,
    subtotalCents: perTruck.reduce((a, t) => a + t.subtotalCents, 0),
    taxCents: perTruck.reduce((a, t) => a + t.taxCents, 0),
    tipCents: perTruck.reduce((a, t) => a + t.tipCents, 0),
    totalCents: perTruck.reduce((a, t) => a + t.totalCents, 0),
  };

  // Invariante: el total de la factura es exactamente la suma de los desgloses.
  const sumOfTruckTotals = perTruck.reduce((a, t) => a + t.totalCents, 0);
  if (result.totalCents !== sumOfTruckTotals) {
    throw new Error('Invariante de suma de desgloses violado');
  }

  return result;
}
