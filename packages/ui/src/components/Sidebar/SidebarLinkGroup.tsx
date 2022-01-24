import React, { useState } from 'react';

export type SidebarLinkClickHandler = () => void;

interface SidebarLinkGroupProps {
  isActive?: boolean;
}

const SidebarLinkGroup: React.FC<SidebarLinkGroupProps> = ({ children, isActive }) => {
  const [open, setOpen] = useState(!!isActive);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <li className={`px-3 py-2 rounded-sm mb-0.5 last:mb-0 ${isActive && 'bg-gray-900'}`}>
      {typeof children === 'function' ? children(handleClick, open) : children}
    </li>
  );
};

export default SidebarLinkGroup;
