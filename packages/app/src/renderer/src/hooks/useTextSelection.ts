import { useState, useEffect, useCallback, useRef } from 'react';

export interface TextSelection {
  text: string;
  contextBefore: string;
  contextAfter: string;
  rect: DOMRect;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>): {
  selection: TextSelection | null;
  clearSelection: () => void;
} {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          return;
        }

        const text = sel.toString().trim();
        if (!text || text.length < 1) return;

        if (!container.contains(sel.anchorNode)) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const fullText = container.textContent ?? '';
        const selStart = getTextOffset(container, range.startContainer, range.startOffset);
        const selEnd = getTextOffset(container, range.endContainer, range.endOffset);

        const contextRadius = 80;
        const contextBefore = fullText.slice(Math.max(0, selStart - contextRadius), selStart);
        const contextAfter = fullText.slice(selEnd, Math.min(fullText.length, selEnd + contextRadius));
        setSelection({ text, contextBefore, contextAfter, rect });
      }, 150);
    };

    container.addEventListener('mouseup', handleMouseUp);
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [containerRef]);

  return { selection, clearSelection };
}

function getTextOffset(root: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += (node.textContent?.length ?? 0);
    node = walker.nextNode();
  }

  return offset;
}
