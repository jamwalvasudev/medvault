import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Flex, Skeleton, Tag, Typography } from 'antd';
import { EnvironmentOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { api, type Visit } from '@/api';
import PageHeader from '@/components/PageHeader';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.visits
      .list()
      .then((v) => { setVisits(v); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const byYear = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const year = v.visitDate.slice(0, 4);
    (acc[year] ??= []).push(v);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title="Your Visits"
        actions={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigate('/visits/new')}>
            Add Visit
          </Button>
        }
      />
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 672,
          margin: '0 auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {error && <Alert type="error" message={error} showIcon />}

        {loading ? (
          <Flex vertical gap={12}>
            {[1, 2, 3].map((i) => <Skeleton key={i} active />)}
          </Flex>
        ) : visits.length === 0 ? (
          <Flex vertical align="center" justify="center" style={{ paddingTop: 80, paddingBottom: 80, gap: 16 }}>
            <Typography.Text type="secondary">No visits yet.</Typography.Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/visits/new')}>
              Add your first visit
            </Button>
          </Flex>
        ) : (
          years.map((year) => (
            <section key={year}>
              <Typography.Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                {year}
              </Typography.Text>
              <Flex vertical gap={8}>
                {byYear[year].map((v) => (
                  <Card
                    key={v.id}
                    hoverable
                    onClick={() => navigate(`/visits/${v.id}`)}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Flex justify="space-between" align="flex-start" gap={16}>
                      <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Flex align="center" gap={8} wrap="wrap">
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {v.visitDate}
                          </Typography.Text>
                          {v.specialty && <Tag bordered={false}>{v.specialty}</Tag>}
                        </Flex>
                        <Typography.Text strong style={{ fontSize: 14 }}>
                          {v.doctorName}
                        </Typography.Text>
                        {v.clinic && (
                          <Flex align="center" gap={4}>
                            <EnvironmentOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {v.clinic}
                            </Typography.Text>
                          </Flex>
                        )}
                        {v.diagnosis && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                            {v.diagnosis}
                          </Typography.Text>
                        )}
                      </Flex>
                      <RightOutlined style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} />
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
