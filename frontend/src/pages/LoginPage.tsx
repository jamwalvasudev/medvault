export default function LoginPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>MedHistory</h1>
        <p style={styles.subtitle}>Your personal medical record, organised.</p>
        <a href="/oauth2/authorization/google" style={styles.button}>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '48px 40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '0 0 32px',
    color: '#64748b',
    fontSize: 15,
  },
  button: {
    display: 'inline-block',
    padding: '12px 28px',
    background: '#4285f4',
    color: '#fff',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 15,
  },
};
