import React from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import { ErrorBoundary } from 'react-error-boundary';
import { useInterval } from '@/hooks';
import { useStore } from '@/stores/hosts';
import { Outlet } from 'react-location';
import { ErrorFallback } from 'src/components/App/ErrorFallback';
import { useSidebarState } from 'src/stores';
import shallow from 'zustand/shallow';

export function Root() {
  const [hosts, getHosts] = useStore((x) => [x.hosts, x.getHosts], shallow);
  const [isSidebarOpen, openSidebar, closeSidebar] = useSidebarState(state => [
    state.isOpen,
    state.open,
    state.close
  ], shallow)

  function setSidebarOpen(value: boolean) {
    if (value) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  function refreshHosts() {
    getHosts()
      .catch(e => console.error(e));
  }

  useInterval(refreshHosts, 10000);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <Sidebar hosts={hosts} sidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">

        {/*  Site header
          <Header sidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        */}
        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto dark:bg-gray-800">

            <ErrorBoundary
              FallbackComponent={ErrorFallback}
            >
              <Outlet />
            </ErrorBoundary>

          </div>
        </main>

      </div>
    </div>
  );
}

export default Root;
