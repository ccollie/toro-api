import React from 'react';
import NetworkError from 'src/components/NetworkError';
import { useRedisInfoModalStore } from 'src/stores';
import { RedisStatsFragment, useGetRedisStatsQuery } from 'src/types';
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  Space,
} from '@mantine/core';
import ms from 'ms';
import { getPollingInterval } from '@/stores/network-settings';

type TKVProps = {
  k: string;
  v?: string | number;
};

const KV = ({ k, v }: TKVProps) => {
  return (
    <ul
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        marginBottom: '0.5rem',
        borderColor: '#E5E7EB',
        fontWeight: '300',
        borderBottomWidth: '1px',
      }}
    >
      <span>{k}</span>
      <span>{v}</span>
    </ul>
  );
};

interface RedisInfoProps {
  hostId: string;
  isOpen: boolean;
}

export const RedisInfo = ({ hostId, isOpen }: RedisInfoProps) => {
  const [data, setData] = React.useState<RedisStatsFragment | undefined>();
  const refetchInterval = getPollingInterval();
  const onClose = useRedisInfoModalStore((state) => state.close);

  const { loading, error, called, refetch } = useGetRedisStatsQuery({
    variables: {
      hostId,
    },
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      setData(data.host?.redis);
    },
    skip: !isOpen,
    pollInterval: refetchInterval || undefined,
  });
  return (
    <Modal
      size="md"
      opened={isOpen}
      onClose={onClose}
      transition="fade"
      transitionDuration={500}
      title="Redis Info"
      radius="sm"
      shadow="md"
      centered
    >
      <Box sx={{ minHeight: '300px' }}>
        <LoadingOverlay visible={loading && !called} />
        {error && <NetworkError message={error.message} refetch={refetch} />}
        {data && (
          <ul>
            <KV k="Used memory" v={data.used_memory_human} />
            <KV k="Peak Used memory" v={data.used_memory_peak_human} />
            <KV k="Total memory" v={data.total_system_memory_human} />
            <KV k="Connected clients" v={data.connected_clients} />
            <KV k="Blocked clients" v={data.blocked_clients} />
            <KV k="Uptime" v={formatMins(data.uptime_in_seconds)} />
            <KV k="CPU time" v={formatMins(data.used_cpu_sys)} />
            <KV k="Fragmentation ratio" v={data.mem_fragmentation_ratio ?? 0} />
            <KV k="Version" v={data.redis_version} />
            <KV k="Mode" v={data.redis_mode} />
            <KV k="OS" v={data.os} />
            <KV k="Port" v={data.tcp_port} />
          </ul>
        )}
      </Box>
      <Space h="lg" />
      <Group position="right">
        <Button color="inherit" variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
};

function formatMins(mins: number) {
  return ms(Number(mins) * 1000, { long: true });
}
export default RedisInfo;
