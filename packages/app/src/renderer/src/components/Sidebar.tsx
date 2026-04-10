import { cn } from '../lib/utils';

export type NavItem = 'articles' | 'sources' | 'log' | 'cardOverview' | 'review';

interface NavEntry {
  id: NavItem;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavEntry[] = [
  { id: 'articles', label: 'Articles', icon: '📄' },
  { id: 'sources', label: 'Sources', icon: '📡' },
  { id: 'log', label: 'Learning Log', icon: '📝' },
  { id: 'cardOverview', label: 'Card overview', icon: '📊' },
  { id: 'review', label: 'Review', icon: '🔄' }
];

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
  reviewCount: number;
}

export function Sidebar({ activeNav, onNavChange, reviewCount }: SidebarProps): JSX.Element {
  return (
    <nav className="w-56 border-r border-border bg-muted/30 flex flex-col">
      <div className="h-12 flex items-end px-4 pb-2 draggable">
        <h1 className="text-base font-semibold tracking-tight">Thinklish</h1>
      </div>

      <ul className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                activeNav === item.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'review' && reviewCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {reviewCount}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
    </nav>
  );
}
