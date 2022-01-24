import React from 'react';
import { Navbar, ScrollArea } from '@mantine/core';
import { QueueHost } from 'src/types';
import { useMatchRoute } from 'react-location';

interface TProps {
  host: QueueHost;
  className?: string;
  href?: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Demo = (props: TProps) => {
  const { host, isSidebarOpen, setSidebarOpen } = props;

  const matchRoute = useMatchRoute();
  const href = props.href || `/hosts/${host.id}`;
  const isActive = !!matchRoute( { to: href } );

  return (
    <Navbar height={600} padding={10} width={{ base: 300 }}>
      <Navbar.Section mt="xs"><Brand /></Navbar.Section>

      <Navbar.Section
        grow
        component={ScrollArea}
        ml={-10}
        mr={-10}
        sx={{ paddingLeft: 10, paddingRight: 10 }}
      >
        {/* scrollable content here */}
      </Navbar.Section>

      <Navbar.Section><User /></Navbar.Section>
    </Navbar>
  );
}
