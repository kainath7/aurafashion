import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  LayoutDashboard,
  Shirt,
  Boxes,
  FolderTree,
  ShoppingBag,
  Users,
  Sparkles,
  Settings,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout, token } = useAdminAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket: Socket = io(socketUrl);

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_admin_channel', token);
    });

    socket.on('new_order', (data: any) => {
      setNewOrderNotification(`New Order ${data.orderNumber} placed for ₹${data.grandTotal}!`);
      // Auto clear after 8 seconds
      setTimeout(() => setNewOrderNotification(null), 8000);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Products', path: '/products', icon: Shirt },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Categories', path: '/categories', icon: FolderTree },
    { label: 'Orders', path: '/orders', icon: ShoppingBag },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Promotions', path: '/promotions', icon: Sparkles },
    { label: 'Store Settings', path: '/settings', icon: Settings },
    { label: 'Reports & Exports', path: '/reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800">
            <div>
              <span className="font-serif text-lg font-bold tracking-widest text-white uppercase block">
                Aura Fashion
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                Executive Portal
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#832729] text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>Customer Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="pt-2 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{admin?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">{admin?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {navItems.find((i) => i.path === location.pathname)?.label || 'Administration'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Socket Status Pill */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="hidden sm:inline">
                {socketConnected ? 'Real-Time Sync Active' : 'Connecting to Gateway...'}
              </span>
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center font-bold text-xs">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                {admin?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Real-time Toast Alert for New Orders */}
        {newOrderNotification && (
          <div className="bg-[#832729] text-white text-xs font-bold py-3 px-6 shadow-xl flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span>{newOrderNotification}</span>
            </div>
            <button
              onClick={() => setNewOrderNotification(null)}
              className="text-white/80 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
