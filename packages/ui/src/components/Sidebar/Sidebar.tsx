import { Center } from '@mantine/core';
import React, { useEffect } from 'react';
import { Logo } from '@/components/Icons/Logo';
import { HostSidebarSection } from '@/components/Sidebar/HostSidebarSection';
import { DarkModeSelectorIcon } from '@/components/DarkModeSelectorIcon';
import { SettingsItems } from './sidebar-items';
import { SidebarSection } from './SidebarSection';
import { useEscPressed } from '@/hooks/use-esc-pressed';

import { QueueHost } from '@/types';
import { Link } from '@tanstack/react-location';

interface SidebarProps {
  className?: string;
  hosts: QueueHost[];
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}

const Sidebar = (props: SidebarProps) => {
  const { sidebarOpen, setSidebarOpen, hosts } = props;

  const { pathname } = window.location; // hack

  function closeSidebar() {
    props.setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  useEscPressed(closeSidebar);

  useEffect(() => {
    const body = document.querySelector('body');
    if (!body) return;
    if (sidebarOpen) {
      body.classList.add('sidebar-expanded');
    } else {
      body.classList.remove('sidebar-expanded');
    }
  }, [sidebarOpen]);

  return (
    <div>
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 transform h-screen overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:!w-64 shrink-0 bg-gray-800 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={toggleSidebar}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <Link to="/">
            <div className="flex items-center justify-center">
              <Logo />{' '}
              <span
                className={`text-2xl text-white-500 ml-2 ${
                  !sidebarOpen && 'hidden'
                }`}
              >
                Alpen
              </span>
            </div>
          </Link>
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-500 font-semibold pl-3">
              <span
                className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6"
                aria-hidden="true"
              >
                •••
              </span>
              <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                Environments
              </span>
            </h3>
            <ul className="mt-3">
              {/* Hosts/Queues */}
              {hosts.map((host) => (
                <HostSidebarSection
                  host={host}
                  key={host.id}
                  isSidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                />
              ))}
              {/* Utility */}
              <SidebarSection
                title="Settings"
                href="/settings"
                isSidebarExpanded={sidebarOpen}
                setSidebarExpanded={closeSidebar}
                items={SettingsItems}
                icon={
                  <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
                    <circle
                      className={`fill-current text-gray-400 ${
                        pathname.includes('utility') && 'text-indigo-300'
                      }`}
                      cx="18.5"
                      cy="5.5"
                      r="4.5"
                    />
                    <circle
                      className={`fill-current text-gray-600 ${
                        pathname.includes('utility') && 'text-indigo-500'
                      }`}
                      cx="5.5"
                      cy="5.5"
                      r="4.5"
                    />
                    <circle
                      className={`fill-current text-gray-600 ${
                        pathname.includes('utility') && 'text-indigo-500'
                      }`}
                      cx="18.5"
                      cy="18.5"
                      r="4.5"
                    />
                    <circle
                      className={`fill-current text-gray-400 ${
                        pathname.includes('utility') && 'text-indigo-300'
                      }`}
                      cx="5.5"
                      cy="18.5"
                      r="4.5"
                    />
                  </svg>
                }
              />
              <li>
                <Center>
                  <DarkModeSelectorIcon />
                </Center>
              </li>
            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="px-3 py-2">
            <button onClick={toggleSidebar}>
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg
                className="w-6 h-6 fill-current sidebar-expanded:rotate-180"
                viewBox="0 0 24 24"
              >
                <path
                  className="text-gray-400"
                  d="M19.586 11l-5-5L16 4.586 23.414 12 16 19.414 14.586 18l5-5H7v-2z"
                />
                <path className="text-gray-600" d="M3 23H1V1h2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
