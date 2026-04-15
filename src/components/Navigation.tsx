import { BookOpen, FileText, Home, Package, Settings } from 'lucide-react';
import type { Page } from '@/lib/types';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isAdmin?: boolean;
}

const navItems: Array<{ id: Page; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'inventory', label: '在庫', icon: Package },
  { id: 'orders', label: '発注', icon: FileText },
  { id: 'protocols', label: 'プロトコル', icon: BookOpen },
];

export default function Navigation({ currentPage, onPageChange, isAdmin = false }: NavigationProps) {
  const visibleNavItems = isAdmin
    ? [...navItems, { id: 'admin' as const, label: '管理', icon: Settings }]
    : navItems;

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm md:w-64 md:border-b-0 md:border-r">
      <div className="p-4 md:p-6">
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex min-w-fit items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 font-semibold text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
