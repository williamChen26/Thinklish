import type { ReaderSettings } from '../../hooks/useSettings';
import { cn } from '../../lib/utils';

interface ReaderToolbarProps {
  settings: ReaderSettings;
  articleTitle: string;
  onBack: () => void;
  onToggleTheme: () => void;
  onCycleFontSize: () => void;
  onCycleContentWidth: () => void;
}

const FONT_SIZE_LABEL: Record<string, string> = {
  small: 'A',
  medium: 'A',
  large: 'A'
};

const FONT_SIZE_CLASS: Record<string, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base'
};

const WIDTH_LABEL: Record<string, string> = {
  narrow: '▐▌',
  medium: '▐ ▌',
  wide: '▐  ▌'
};

export function ReaderToolbar({
  settings,
  articleTitle,
  onBack,
  onToggleTheme,
  onCycleFontSize,
  onCycleContentWidth
}: ReaderToolbarProps): JSX.Element {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-2 h-12 px-4">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <span>←</span>
          <span>Articles</span>
        </button>

        {/* Title */}
        <span className="flex-1 text-sm text-muted-foreground truncate px-4">
          {articleTitle}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Font size */}
          <button
            type="button"
            onClick={onCycleFontSize}
            title={`Font size: ${settings.fontSize}`}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
              FONT_SIZE_CLASS[settings.fontSize]
            )}
          >
            {FONT_SIZE_LABEL[settings.fontSize]}
          </button>

          {/* Content width */}
          <button
            type="button"
            onClick={onCycleContentWidth}
            title={`Width: ${settings.contentWidth}`}
            className="w-8 h-8 rounded-md flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors tracking-tighter"
          >
            {WIDTH_LABEL[settings.contentWidth]}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={settings.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {settings.theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </div>
  );
}
