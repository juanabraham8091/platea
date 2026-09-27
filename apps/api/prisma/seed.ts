/**
 * Seed de desarrollo (Doc 12 §8). Datos ficticios realistas para RD.
 * NUNCA ejecutar contra producción. Idempotente por email/códigos únicos.
 *
 * Uso: pnpm --filter @platea/api prisma:seed
 */
import { PrismaClient, RoleName, StaffPosition } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Platea2026!';

async function hash(pw: string): Promise<string> {
  return argon2.hash(pw, { type: argon2.argon2id });
}

function qrToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Asigna un rol a un usuario de forma idempotente. No se usa upsert sobre la
 * clave compuesta porque contiene columnas nullables (semántica NULL de SQL).
 */
async function ensureRole(
  userId: string,
  role: RoleName,
  organizationId: string | null,
  foodTruckId: string | null,
): Promise<void> {
  const existing = await prisma.userRole.findFirst({ where: { userId, role, organizationId, foodTruckId } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, role, organizationId, foodTruckId } });
  }
}

async function main(): Promise<void> {
  const passwordHash = await hash(DEV_PASSWORD);

  // ── Organización + parque ──
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Food Truck Park Demo',
      billingEmail: 'demo@platea.do',
    },
  });

  const park = await prisma.foodTruckPark.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      organizationId: org.id,
      name: 'Plaza Gastronómica Demo',
      city: 'Santo Domingo',
    },
  });

  // ── Usuarios por rol ──
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@platea.do' },
    update: {},
    create: { email: 'admin@platea.do', name: 'PLATEA Admin', passwordHash, organizationId: null },
  });
  await ensureRole(superAdmin.id, RoleName.SUPER_ADMIN, null, null);

  const parkAdmin = await prisma.user.upsert({
    where: { email: 'parque@platea.do' },
    update: {},
    create: { email: 'parque@platea.do', name: 'Admin del Parque', passwordHash, organizationId: org.id },
  });
  await ensureRole(parkAdmin.id, RoleName.PARK_ADMIN, org.id, null);

  // ── Mesas + QR ──
  for (let n = 1; n <= 20; n++) {
    const table = await prisma.parkTable.upsert({
      where: { parkId_number: { parkId: park.id, number: n } },
      update: {},
      create: { organizationId: org.id, parkId: park.id, number: n, capacity: 4 },
    });
    const hasQr = await prisma.qrCode.findFirst({ where: { tableId: table.id, status: 'ACTIVE' } });
    if (!hasQr) {
      await prisma.qrCode.create({ data: { tableId: table.id, code: qrToken() } });
    }
  }

  // ── Food trucks + menús ──
  const trucks = [
    {
      name: 'Burger House',
      cats: [{ name: 'Hamburguesas', items: [['Cheeseburger', 450], ['Doble Bacon', 620]] }, { name: 'Acompañantes', items: [['Papas Fritas', 200], ['Aros de Cebolla', 250]] }],
    },
    {
      name: 'Tacos MX',
      cats: [{ name: 'Tacos', items: [['Taco al Pastor', 180], ['Taco de Carnita', 190]] }, { name: 'Bebidas', items: [['Agua de Jamaica', 120]] }],
    },
    {
      name: 'Bubble Tea DR',
      cats: [{ name: 'Té', items: [['Té de Boba Clásico', 300], ['Matcha Latte', 350]] }],
    },
  ];

  for (const [idx, t] of trucks.entries()) {
    const truck = await prisma.foodTruck.upsert({
      where: { id: `00000000-0000-0000-0000-00000000010${idx}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-00000000010${idx}`,
        organizationId: org.id,
        parkId: park.id,
        name: t.name,
        displayOrder: idx,
      },
    });

    // Dueño del truck
    const owner = await prisma.user.upsert({
      where: { email: `owner${idx + 1}@platea.do` },
      update: {},
      create: { email: `owner${idx + 1}@platea.do`, name: `Dueño ${t.name}`, passwordHash, organizationId: org.id },
    });
    await ensureRole(owner.id, RoleName.FOOD_TRUCK_OWNER, org.id, truck.id);
    await prisma.foodTruckStaff.upsert({
      where: { foodTruckId_userId: { foodTruckId: truck.id, userId: owner.id } },
      update: {},
      create: { foodTruckId: truck.id, userId: owner.id, position: StaffPosition.OWNER },
    });

    for (const [ci, cat] of t.cats.entries()) {
      const category = await prisma.category.create({
        data: { organizationId: org.id, foodTruckId: truck.id, name: cat.name, displayOrder: ci },
      });
      for (const [pi, item] of cat.items.entries()) {
        await prisma.product.create({
          data: {
            organizationId: org.id,
            foodTruckId: truck.id,
            categoryId: category.id,
            name: item[0] as string,
            price: item[1] as number,
            displayOrder: pi,
          },
        });
      }
    }
  }

  // ── Ajuste de comisión ──
  await prisma.systemSetting.upsert({
    where: { key: 'commission_amount_usd' },
    update: {},
    create: { key: 'commission_amount_usd', value: 0.3 },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed completo.
  Organización: ${org.name}
  Parque: ${park.name} (20 mesas con QR)
  Food trucks: ${trucks.map((t) => t.name).join(', ')}
  Usuarios (password: ${DEV_PASSWORD}):
    - admin@platea.do      (SUPER_ADMIN)
    - parque@platea.do     (PARK_ADMIN)
    - owner1..3@platea.do  (FOOD_TRUCK_OWNER)`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
