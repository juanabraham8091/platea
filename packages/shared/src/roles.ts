/**
 * Roles y matriz de permisos de PLATEA 2.0 (DECISIONES.md DD5, Master Doc 6 §7).
 *
 * En el MVP la matriz rol→permiso vive en código (este archivo, compartido por
 * API y web). Se migrará a tablas cuando existan permisos personalizables.
 *
 * CUSTOMER no aparece aquí: el cliente es invitado (guest), sin login, y se
 * autoriza mediante el token de sesión de mesa, no por rol (DD6).
 */

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN', // Equipo PLATEA (organization_id = null)
  PARK_ADMIN: 'PARK_ADMIN', // Administrador del Food Truck Park
  FOOD_TRUCK_OWNER: 'FOOD_TRUCK_OWNER', // Dueño de un food truck
  FOOD_TRUCK_STAFF: 'FOOD_TRUCK_STAFF', // Empleado del food truck
  KITCHEN_USER: 'KITCHEN_USER', // Cocina (interfaz mínima)
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Permisos atómicos. Nombrados `dominio:accion`.
 * El backend valida SIEMPRE en servidor; el frontend los usa solo para ocultar UI.
 */
export const Permission = {
  // Organizaciones (solo PLATEA)
  ORG_MANAGE: 'org:manage',
  PLATFORM_METRICS_VIEW: 'platform:metrics:view',
  BILLING_CYCLE_MANAGE: 'billing:cycle:manage',

  // Parque
  PARK_MANAGE: 'park:manage',
  PARK_DASHBOARD_VIEW: 'park:dashboard:view',
  TABLE_MANAGE: 'table:manage',
  QR_MANAGE: 'qr:manage',
  STAFF_MANAGE: 'staff:manage',
  SESSION_VOID: 'session:void',
  PARK_REPORTS_VIEW: 'park:reports:view',
  PARK_SETTINGS_MANAGE: 'park:settings:manage',

  // Food truck
  TRUCK_MANAGE: 'truck:manage',
  MENU_MANAGE: 'menu:manage',
  PRODUCT_AVAILABILITY_TOGGLE: 'product:availability:toggle',
  SUBORDER_VIEW: 'suborder:view',
  SUBORDER_ADVANCE: 'suborder:advance', // aceptar/preparar/entregar
  SUBORDER_KITCHEN_ADVANCE: 'suborder:kitchen:advance', // solo PREPARING→READY
  PAYMENT_CONFIRM: 'payment:confirm', // confirmar cobro de su parte (D5)
  TRUCK_REPORTS_VIEW: 'truck:reports:view',
  TRUCK_REVIEWS_VIEW: 'truck:reviews:view',

  // Auditoría
  AUDIT_VIEW: 'audit:view',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Matriz rol → permisos. SUPER_ADMIN se resuelve como "todos" en el guard,
 * pero se lista explícitamente lo esencial para claridad.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    Permission.ORG_MANAGE,
    Permission.PLATFORM_METRICS_VIEW,
    Permission.BILLING_CYCLE_MANAGE,
    Permission.AUDIT_VIEW,
    Permission.PARK_DASHBOARD_VIEW,
    Permission.PARK_REPORTS_VIEW,
  ],
  PARK_ADMIN: [
    Permission.PARK_MANAGE,
    Permission.PARK_DASHBOARD_VIEW,
    Permission.TABLE_MANAGE,
    Permission.QR_MANAGE,
    Permission.STAFF_MANAGE,
    Permission.SESSION_VOID,
    Permission.PARK_REPORTS_VIEW,
    Permission.PARK_SETTINGS_MANAGE,
    Permission.TRUCK_MANAGE,
    Permission.AUDIT_VIEW,
  ],
  FOOD_TRUCK_OWNER: [
    Permission.MENU_MANAGE,
    Permission.PRODUCT_AVAILABILITY_TOGGLE,
    Permission.SUBORDER_VIEW,
    Permission.SUBORDER_ADVANCE,
    Permission.PAYMENT_CONFIRM,
    Permission.TRUCK_REPORTS_VIEW,
    Permission.TRUCK_REVIEWS_VIEW,
  ],
  FOOD_TRUCK_STAFF: [
    Permission.SUBORDER_VIEW,
    Permission.SUBORDER_ADVANCE,
    Permission.PAYMENT_CONFIRM,
    Permission.PRODUCT_AVAILABILITY_TOGGLE,
  ],
  KITCHEN_USER: [Permission.SUBORDER_VIEW, Permission.SUBORDER_KITCHEN_ADVANCE],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function anyRoleHasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => roleHasPermission(r, permission));
}
