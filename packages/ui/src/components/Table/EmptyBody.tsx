import { Center } from '@mantine/core';
import React from 'react';
import { InboxIcon } from '../Icons/Inbox';

interface EmptyBodyProps {
  className?: string;
  colSpan: number;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}

const DEFAULT_DESCRIPTION = 'No results found';

export const EmptyBody: React.FC<EmptyBodyProps> = (props)  => {
  const { colSpan, children, icon, description = DEFAULT_DESCRIPTION, ...rest } = props;

  function DefaultContent() {
    return (
      <>
        <div
          className="mb-2 h-10 text-center border-0 border-current border-solid box-border"
        >
          {icon ?? <InboxIcon />}
        </div>
        <div className="text-center border-0 border-current border-solid box-border">
          {description}
        </div>
      </>
    );
  }

  return (
    <tbody>
      <tr>
      <td {...rest}
          colSpan={colSpan}
          className="relative p-4 leading-6 text-center text-gray-500 border-0 border-t-0 border-r-0 border-l-0 border-b border-gray-200 border-solid box-border hover:bg-white"
          style={{ transition: 'background 0.3s ease 0s' }}
      >
        <div
          className="my-8 mx-0 text-sm text-gray-500 border-0 border-current border-solid box-border leading-6">
          <Center>
            {children ?? <DefaultContent />}
          </Center>
        </div>
      </td>
    </tr>
    </tbody>
  );
};
