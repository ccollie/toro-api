import React, { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
}

export const Card: React.FC<CardProps> = (props) => {
  const { title, actions, children } = props;
  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white shadow-lg rounded-sm border border-gray-200">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {actions &&
          <span className="right-8">
          {actions}
          </span>
        }
      </header>
      <div className="flex flex-col flex-1 px-5 py-4">
        {children}
      </div>
    </div>
  );
}

export default Card;
