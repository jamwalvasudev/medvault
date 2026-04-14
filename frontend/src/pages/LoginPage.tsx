import { Button, Card, Typography } from 'antd';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            MedHistory
          </Typography.Title>
          <Typography.Text type="secondary">
            Your personal medical record, organised.
          </Typography.Text>
        </div>
        <Button type="primary" size="large" block href="/oauth2/authorization/google">
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
