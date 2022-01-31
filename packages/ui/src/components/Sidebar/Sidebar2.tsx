import React from 'react';
import { Navbar, ScrollArea } from '@mantine/core';
import { DarkModeSelectorIcon } from '@/components/DarkModeSelectorIcon';
import { Brand } from 'src/components/Sidebar/Brand';
import { QueueHost } from 'src/types';
import { useMatchRoute } from 'react-location';

interface TProps {
  host: QueueHost;
  className?: string;
  href?: string;
  hosts: QueueHost[];
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Demo = (props: TProps) => {
  const { host, isSidebarOpen, setSidebarOpen } = props;

  const matchRoute = useMatchRoute();
  const href = props.href || `/hosts/${host.id}`;
  const isActive = !!matchRoute( { to: href } );

  return (
    <Navbar padding={10} width={{ base: 420 }} fixed position={{ top: 0, left: 0 }}>
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

      <Navbar.Section><DarkModeSelectorIcon/></Navbar.Section>
    </Navbar>
  );
};
