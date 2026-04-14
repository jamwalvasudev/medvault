import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        height: 64,
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}
    >
      <Flex align="center" gap={4}>
        {backHref && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backHref)}
            style={{ marginLeft: -8 }}
          />
        )}
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
      </Flex>
      {actions && (
        <Flex align="center" gap={8}>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}
