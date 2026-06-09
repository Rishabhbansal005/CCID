import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <div className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Topbar onMenuToggle={() => setSidebarCollapsed((c) => !c)} />
        <main className="page-content animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
