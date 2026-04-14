import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Flex, Input, Skeleton, Tag, Typography } from 'antd';
import { EnvironmentOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { api, type Visit } from '@/api';
import PageHeader from '@/components/PageHeader';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.visits.search(query);
      setResults(r);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader title="Search" backHref="/" />
      <main
        style={{
          width: '100%',
          maxWidth: 672,
          margin: '0 auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <form onSubmit={handleSearch}>
          <Flex gap={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search visits, doctors, diagnoses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ flex: 1 }}
            />
            <Button type="primary" htmlType="submit" loading={loading}>
              Search
            </Button>
          </Flex>
        </form>

        {error && <Alert type="error" message={error} showIcon />}

        {loading ? (
          <Flex vertical gap={12}>
            {[1, 2, 3].map((i) => <Skeleton key={i} active />)}
          </Flex>
        ) : searched && results.length === 0 ? (
          <Typography.Text
            type="secondary"
            style={{ textAlign: 'center', display: 'block', padding: '32px 0' }}
          >
            No results for "{query}"
          </Typography.Text>
        ) : (
          <Flex vertical gap={8}>
            {results.map((v) => (
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
                  <RightOutlined style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </main>
    </div>
  );
}
