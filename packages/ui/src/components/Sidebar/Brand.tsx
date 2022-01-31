import React from 'react';
import { Group, useMantineTheme, Text } from '@mantine/core';
import DarkModeSelectorIcon from '@/components/DarkModeSelectorIcon';
import { Logo } from '@/components/Icons/Logo';

export function Brand() {
  const theme = useMantineTheme();

  return (
    <div
      style={{
        paddingLeft: theme.spacing.xs,
        paddingRight: theme.spacing.xs,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${
          theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
        }`,
      }}
    >
      <Group position="apart">
        <div>
          <Logo style={{ display: 'inline-block'}}/><Text size="md" ml={3}>Alpen</Text>
        </div>
        <DarkModeSelectorIcon />
      </Group>
    </div>
  );
}
