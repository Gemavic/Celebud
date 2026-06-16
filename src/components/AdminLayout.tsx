import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  Video,
  BarChart3,
  DollarSign,
  Globe,
  LogOut,
  Star,
  Menu,
  X,
  Shield,
  Bell,
  ChevronLeft,
  ChevronRight,
  PenLine,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/articles', label: 'Articles', icon: FileText },
  { path: '/admin/writers', label: "Writer's Production", icon: PenLine },
  { path: '/admin/creators', label: 'Creators', icon: Users },
  { path: '/studio', label: 'Content Studio', icon: Video },
  { path: '/admin/metrics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/ad-revenue', label: 'Ad Revenue', icon: DollarSign },
  { path: '/editorial', label: 'Editorial', icon: Globe },
];

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">You need admin privileges to access this area.</p>
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white z-50 flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${mobileSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'}
          lg:translate-x-0`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-gray-800 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div className={`overflow-hidden transition-all ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-base font-bold tracking-tight leading-none">CelebUD</h1>
            <p className="text-xs text-gray-400 mt-0.5">Admin Portal</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="ml-auto p-1.5 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                  ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-gray-800 p-2 space-y-0.5">
          <Link
            to="/"
            onClick={() => setMobileSidebarOpen(false)}
            title={sidebarCollapsed ? 'View Site' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <Globe className="w-[18px] h-[18px] flex-shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>View Site</span>
          </Link>
          <button
            onClick={handleSignOut}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-red-800/60 hover:text-white transition-all ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-all mt-1"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile hamburger + title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden flex-shrink-0 p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
                {subtitle && <p className="text-xs text-gray-500 truncate hidden sm:block">{subtitle}</p>}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {profile.username?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-none">{profile.username || 'Admin'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
