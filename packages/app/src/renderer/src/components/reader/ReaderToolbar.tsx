import type { ReaderSettings, AiProvider } from '../../hooks/useSettings';
import type { AgentInfo } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ReaderToolbarProps {
  settings: ReaderSettings;
  articleTitle: string;
  agents: AgentInfo[];
  onBack: () => void;
  onToggleTheme: () => void;
  onCycleFontSize: () => void;
  onCycleContentWidth: () => void;
  onChangeAiProvider: (provider: AiProvider) => void;
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
  agents,
  onBack,
  onToggleTheme,
  onCycleFontSize,
  onCycleContentWidth,
  onChangeAiProvider,
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
          {/* AI Provider */}
          <select
            value={settings.aiProvider}
            onChange={(e) => onChangeAiProvider(e.target.value as AiProvider)}
            title="AI Provider"
            className={cn(
              'h-8 px-2 rounded-md text-xs',
              'bg-transparent text-muted-foreground',
              'border border-border hover:border-foreground/20',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'transition-colors cursor-pointer'
            )}
          >
            <option value="auto">Auto</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id} disabled={agent.status !== 'ready'}>
                {agent.name}{agent.status !== 'ready' ? ' (未安装)' : ''}
              </option>
            ))}
          </select>

          <div className="w-px h-4 bg-border mx-1" />

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
