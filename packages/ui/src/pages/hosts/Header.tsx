import { Paper, Group } from '@mantine/core';
import React from 'react';
import { CloudServerIcon } from '@/components/Icons';

export const Header = () => {
  return (
    <div>
      <Paper
        shadow="md"
        id="check"
        mb={5}
        className="md:flex dark:bg-gray-800 mb-5 items-center justify-between px-4 visible py-6"
      >
        <div className="flex items-center text-gray-400">
          <CloudServerIcon size={48} />
          <p className="focus:outline-none text-gray-900 dark:text-gray-100 text-base ml-3">
            <span className="text-3xl">Hosts</span>{' '}
          </p>
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
