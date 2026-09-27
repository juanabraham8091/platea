/**
 * Landing provisional de la Fase 1 (Fundación).
 * La experiencia real del cliente (QR → menú → carrito) llega en fases
 * posteriores del roadmap (Master Doc 2, Fase 4).
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 38, margin: 0, color: 'var(--color-primary)' }}>PLATEA 2.0</h1>
      <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', maxWidth: 460 }}>
        Una mesa. Un QR. Una experiencia.
      </p>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
        Fundación del proyecto en marcha — API, base de datos y autenticación.
      </p>
    </main>
  );
}
