import React, { ReactNode, useCallback } from 'react';
import { Link, useMatchRoute, useNavigate } from 'react-location';
import { useDisclosure } from '@/hooks';
import SidebarLinkGroup from './SidebarLinkGroup';

type ClickHandler = () => void;

export interface SidebarSectionItem {
  className?: string;
  title?: string;
  content?: ReactNode;
  href?: string;
  isExpanded?: boolean;
  onClick?: ClickHandler;
}

interface SidebarLinkProps extends SidebarSectionItem {
}

export const SidebarNavLink: React.FC<SidebarLinkProps> = (props) => {
  const { href = '#', children } = props;
  const content: ReactNode = props.content ?? props.title ?? children;
  return (
    <Link to={href} className="block text-gray-400 hover:text-gray-200 transition duration-150 truncate">
      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
        {content}
      </span>
    </Link>
  );
};

interface SidebarSimpleItemProps {
  title: ReactNode;
  href?: string;
  icon?: ReactNode;
  isActive?: boolean;
}

export const SidebarLink: React.FC<SidebarSimpleItemProps> = (props) => {
  const { children, isActive = false, title, href = '#' } = props;
  const content: ReactNode = title ?? children;
  const icon = props.icon ?? <span></span>; // todo: space properly
  return (
    <li
      className={`px-3 py-2 rounded-sm mb-0.5 last:mb-0 ${
        isActive && 'bg-gray-900'
      }`}
    >
      <Link to={href}
        className={`block text-gray-200 hover:text-white truncate transition duration-150 ${
          isActive && 'hover:text-gray-200'
        }`}
      >
        <div className="flex items-center">
          {icon}
          <span className="text-sm font-medium ml-3 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
            {content}
          </span>
        </div>
      </Link>
    </li>
  );
};

interface SidebarSectionProps {
  title: string;
  href?: string;
  isSidebarExpanded: boolean;
  icon?: ReactNode;
  setSidebarExpanded: (isSidebarExpanded: boolean) => void;
  items?: SidebarSectionItem[];
}

export const SidebarSection: React.FC<SidebarSectionProps> = (props) => {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const href = props.href ?? '#';
  const isActive = !!matchRoute( { to: href } );
  const { isSidebarExpanded, setSidebarExpanded, title, items = [] } = props;
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: isActive });

  let onClick: ClickHandler;

  const clickHandler = useCallback(() => {
    if (isSidebarExpanded) {
      onClick?.();
    } else {
      setSidebarExpanded(true);
    }
  }, []);

  function onHeaderClick(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (href !== '#') {
      navigate({ to: href });
    }
    onToggle();
  }

  function Icon(): JSX.Element {
    if (props.icon) {
      return <>{props.icon}</>;
    }
    return (
      <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
        <path className={`fill-current text-gray-400 ${isActive && 'text-indigo-300'}`} d="M13 15l11-7L11.504.136a1 1 0 00-1.019.007L0 7l13 8z" />
        <path className={`fill-current text-gray-700 ${isActive && '!text-indigo-600'}`} d="M13 15L0 7v9c0 .355.189.685.496.864L13 24v-9z" />
        <path className={`fill-current text-gray-600 ${isActive && 'text-indigo-500'}`} d="M13 15.047V24l10.573-7.181A.999.999 0 0024 16V8l-11 7.047z" />
      </svg>
    );
  }

  function Content(): JSX.Element {
    onClick = onToggle;
    if (!items.length) {
      return <li className="mt-1">
        {props.children}
      </li>;
    }
    return (
      <>
        {items.map((item, index) => (
          <li key={index} className="mt-1">
            <SidebarNavLink {...item} onClick={clickHandler} />
          </li>
        ))}
      </>
    );
  }

  return (
    <SidebarLinkGroup isActive={isActive}>
      <React.Fragment>
        <a href="#" className={`block text-gray-200 hover:text-white truncate transition duration-150 ${isActive && 'hover:text-gray-200'}`}
           onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center" onClick={onHeaderClick}>
              {/* Section Icon */}
              <Icon />
              <span className="text-sm font-medium ml-3 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                {title}
              </span>
            </div>
            {/* Arrow Icon */}
            <div className="flex shrink-0 ml-2">
              <svg className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${isOpen && 'transform rotate-180'}`} viewBox="0 0 12 12">
                <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
              </svg>
            </div>
          </div>
        </a>
        <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
          <ul className={`pl-9 mt-1 ${!isOpen && 'hidden'}`}>
            <Content />
          </ul>
        </div>
      </React.Fragment>
    </SidebarLinkGroup>
  );
};

export default SidebarSection;
