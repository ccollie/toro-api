import React from 'react';
import { Alert, Button, Group } from '@mantine/core';
import { CrossCircledIcon } from '@radix-ui/react-icons';

type TProps = {
  refetch: () => any;
  message?: string;
};
const DEFAULT_MESSAGE = 'There was an error during request.';
export default function NetworkError({
                                       refetch,
                                       message = DEFAULT_MESSAGE,
                                     }: TProps) {
  return (
    <Alert
      color="red"
      icon={<CrossCircledIcon height={16} width={16}/>}
    >
      {message}
      <Group position="right">
        <Button onClick={() => refetch()} color="inherit" size="sm">
          Refetch
        </Button>
      </Group>
    </Alert>
  );
}
