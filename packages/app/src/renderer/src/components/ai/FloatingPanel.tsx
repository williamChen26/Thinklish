import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TextSelection } from '../../hooks/useTextSelection';
import { aiAPI, type AiStreamChunkEvent } from '../../lib/api';
import { cn } from '../../lib/utils';

interface FloatingPanelProps {
  selection: TextSelection;
  aiProvider: string;
  onClose: () => void;
  onSave: (selectedText: string, aiResponse: string, contextBefore: string, contextAfter: string) => void;
}

type PanelState = 'loading' | 'streaming' | 'success' | 'error';

export function FloatingPanel({ selection, aiProvider, onClose, onSave }: FloatingPanelProps): JSX.Element {
  const [state, setState] = useState<PanelState>('loading');
  const [content, setContent] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [error, setError] = useState('');
  const [agentName, setAgentName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const streamIdRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    if (streamIdRef.current) {
      aiAPI.cancelStream(streamIdRef.current);
      streamIdRef.current = null;
    }
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    cleanup();
    setState('loading');
    setContent('');
    setFullResponse('');
    setError('');

    const earlyBuffer: AiStreamChunkEvent[] = [];
    let resolvedStreamId: string | null = null;

    const processEvent = (event: AiStreamChunkEvent): void => {
      if (event.error) {
        setError(event.error);
        setState('error');
        streamIdRef.current = null;
        return;
      }

      if (event.done) {
        setFullResponse(event.fullText ?? '');
        setState('success');
        streamIdRef.current = null;
        return;
      }

      setContent((prev) => prev + event.chunk);
      setState('streaming');
    };

    unsubRef.current = aiAPI.onStreamChunk((event: AiStreamChunkEvent) => {
      if (resolvedStreamId === null) {
        earlyBuffer.push(event);
        return;
      }
      if (event.streamId !== resolvedStreamId) return;
      processEvent(event);
    });

    const result = await aiAPI.explain({
      selectedText: selection.text,
      contextBefore: selection.contextBefore,
      contextAfter: selection.contextAfter,
      aiProvider,
    });

    if (!result.success) {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      setError(result.error);
      setState('error');
      return;
    }

    streamIdRef.current = result.streamId;
    resolvedStreamId = result.streamId;
    setAgentName(result.agentName);

    for (const buffered of earlyBuffer) {
      if (buffered.streamId === resolvedStreamId) {
        processEvent(buffered);
      }
    }
  }, [selection, aiProvider, cleanup]);

  useEffect(() => {
    startStream();
    return cleanup;
  }, [startStream, cleanup]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  const panelStyle = useMemo(
    () => computePosition(selection.rect),
    [selection.rect],
  );

  const displayContent = state === 'success' ? fullResponse : content;

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={cn(
        'fixed z-50 w-[420px] overflow-auto',
        'bg-popover text-popover-foreground',
        'border border-border rounded-xl shadow-xl',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
      {/* Header */}
      <div className="sticky top-0 bg-popover/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground truncate max-w-[240px]">
          &ldquo;{selection.text.length > 40 ? selection.text.slice(0, 40) + '...' : selection.text}&rdquo;
        </span>
        <div className="flex items-center gap-1">
          {agentName && (
            <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/50 mr-1 select-none">
              {agentName}
            </span>
          )}
          {state === 'success' && (
            <button
              type="button"
              onClick={() => onSave(selection.text, fullResponse, selection.contextBefore, selection.contextAfter)}
              className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={startStream}
            title="Retry"
            disabled={state === 'loading' || state === 'streaming'}
            className="text-xs px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Thinking...</span>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4">
            <p className="text-sm text-destructive whitespace-pre-line">{error}</p>
            <button
              type="button"
              onClick={startStream}
              className="mt-3 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {(state === 'streaming' || state === 'success') && (
          <div className="ai-response text-sm leading-relaxed prose prose-sm prose-neutral dark:prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{displayContent}</Markdown>
            {state === 'streaming' && (
              <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PANEL_PADDING = 12;
const PANEL_WIDTH = 420;
const PANEL_MAX_HEIGHT = 480;
const PANEL_MIN_HEIGHT = 120;

function computePosition(rect: DOMRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left + rect.width / 2 - PANEL_WIDTH / 2;
  left = Math.max(PANEL_PADDING, Math.min(left, vw - PANEL_WIDTH - PANEL_PADDING));

  const spaceBelow = vh - rect.bottom - PANEL_PADDING * 2;
  const spaceAbove = rect.top - PANEL_PADDING * 2;

  let top: number;
  let maxHeight: number;

  if (spaceBelow >= PANEL_MAX_HEIGHT) {
    top = rect.bottom + PANEL_PADDING;
    maxHeight = PANEL_MAX_HEIGHT;
  } else if (spaceAbove >= PANEL_MAX_HEIGHT) {
    top = rect.top - PANEL_MAX_HEIGHT - PANEL_PADDING;
    maxHeight = PANEL_MAX_HEIGHT;
  } else if (spaceBelow >= spaceAbove) {
    top = rect.bottom + PANEL_PADDING;
    maxHeight = Math.max(spaceBelow, PANEL_MIN_HEIGHT);
  } else {
    maxHeight = Math.max(spaceAbove, PANEL_MIN_HEIGHT);
    top = rect.top - maxHeight - PANEL_PADDING;
  }

  top = Math.max(PANEL_PADDING, top);

  return { top, left, maxHeight };
}
