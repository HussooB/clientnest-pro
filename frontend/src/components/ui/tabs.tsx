import * as React from 'react';

export interface TabsPanelProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

const TabsPanel = React.forwardRef<HTMLDivElement, TabsPanelProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={`hidden ${className || ''}`}
    >
      {children}
    </div>
  )
);

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={`flex border-b border-zinc-200 ${className || ''}`}
    >
      {children}
    </div>
  )
);

TabsPanel.displayName = 'Tabs.Panel';
TabsList.displayName = 'Tabs.List';

export { TabsPanel, TabsList };