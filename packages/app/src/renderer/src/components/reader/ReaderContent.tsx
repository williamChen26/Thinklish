import { useRef } from 'react';
import type { ReaderSettings } from '../../hooks/useSettings';
import { useTextSelection } from '../../hooks/useTextSelection';
import { FloatingPanel } from '../ai/FloatingPanel';
import { lookupsAPI } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ReaderContentProps {
  articleId: number;
  title: string;
  contentHtml: string;
  sourceDomain: string;
  publishedAt: string | null;
  settings: ReaderSettings;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: 'text-[15px] leading-[1.7]',
  medium: 'text-[17px] leading-[1.8]',
  large: 'text-[19px] leading-[1.9]'
};

const WIDTH_MAP: Record<string, string> = {
  narrow: 'max-w-[560px]',
  medium: 'max-w-[680px]',
  wide: 'max-w-[780px]'
};

function detectLookupType(text: string): 'word' | 'phrase' | 'sentence' {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount === 1) return 'word';
  if (wordCount <= 3 && !/[.!?,;:]/.test(trimmed)) return 'phrase';
  return 'sentence';
}

export function ReaderContent({
  articleId,
  title,
  contentHtml,
  sourceDomain,
  publishedAt,
  settings
}: ReaderContentProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(contentRef);

  const handleSave = async (
    selectedText: string,
    aiResponse: string,
    contextBefore: string,
    contextAfter: string
  ): Promise<void> => {
    await lookupsAPI.create({
      articleId,
      selectedText,
      contextBefore,
      contextAfter,
      lookupType: detectLookupType(selectedText),
      aiResponse
    });
    clearSelection();
  };

  return (
    <div className="flex-1 overflow-auto">
      <article
        className={cn(
          'mx-auto px-8 py-10',
          WIDTH_MAP[settings.contentWidth]
        )}
      >
        <header className="mb-8">
          <h1 className="text-2xl font-bold leading-tight mb-3">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{sourceDomain}</span>
            {publishedAt && (
              <>
                <span>·</span>
                <span>{new Date(publishedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </header>

        <div
          ref={contentRef}
          className={cn(
            'reader-content',
            FONT_SIZE_MAP[settings.fontSize]
          )}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      {selection && (
        <FloatingPanel
          selection={selection}
          onClose={clearSelection}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
