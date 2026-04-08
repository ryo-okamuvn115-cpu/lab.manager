import { Home, Package, FileText, BookOpen } from 'lucide-react';

interface NavigationProps {
  currentPage: 'home' | 'inventory' | 'orders' | 'protocols';
  onPageChange: (page: 'home' | 'inventory' | 'orders' | 'protocols') => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'inventory', label: '在庫', icon: Package },
    { id: 'orders', label: '発注書', icon: FileText },
    { id: 'protocols', label: 'プロトコル', icon: BookOpen },
  ] as const;

  return (
    <nav className="w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
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
