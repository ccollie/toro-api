import React from 'react';

export const TableWrapper: React.FC = ({ children }) => {
  return (
    <div className="mt-4 flex flex-col">
      <div className="-my-2 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
