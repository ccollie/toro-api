import { Paper, Group, Center } from '@mantine/core';
import React from 'react';
import { CloudServerIcon } from '@/components/Icons';

export const Header = () => {
  return (
    <div>
      <Paper
        p="xl"
        shadow="sm"
        radius="md"
        px={4}
        py={6}
        mb={5}
        className="md:flex dark:bg-gray-800 items-center justify-between"
      >
        <div className="flex items-center text-gray-400 ml-5">
          <Center>
            <CloudServerIcon size={48} />
            <p className="focus:outline-none text-gray-900 dark:text-gray-100 text-base ml-3">
              <span className="text-3xl">Hosts</span>{' '}
            </p>
          </Center>
        </div>
        <Group
          position="center"
          mt={4}
          mr={10}
          className="dark:text-gray-400"
        >
          here
        </Group>
      </Paper>
    </div>
  );
};

export default Header;
