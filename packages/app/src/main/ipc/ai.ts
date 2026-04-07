import { ipcMain, type BrowserWindow } from 'electron';
import type { AcpQueryHandle } from '../services/acp-connection';
import { explainTextStream, detectMode } from '../services/ai-provider';

const activeStreams = new Map<string, AcpQueryHandle>();
let streamCounter = 0;

export function registerAiHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('ai:explain', async (_event, input: {
    selectedText: string;
    contextBefore: string;
    contextAfter: string;
  }) => {
    const streamId = `stream-${++streamCounter}-${Date.now()}`;
    const win = getWindow();
    if (!win) {
      return { success: false, error: '窗口未就绪' };
    }

    const handle = explainTextStream(input, {
      onChunk: (chunk: string) => {
        if (win.isDestroyed()) return;
        win.webContents.send('ai:stream-chunk', { streamId, chunk, done: false });
      },
      onDone: (fullText: string) => {
        activeStreams.delete(streamId);
        if (win.isDestroyed()) return;
        win.webContents.send('ai:stream-chunk', { streamId, chunk: '', done: true, fullText });
      },
      onError: (error: string) => {
        activeStreams.delete(streamId);
        if (win.isDestroyed()) return;
        win.webContents.send('ai:stream-chunk', { streamId, chunk: '', done: true, error });
      }
    });

    if (handle) {
      activeStreams.set(streamId, handle);
      return { success: true, streamId };
    }

    return { success: false, error: '无法启动 AI 进程' };
  });

  ipcMain.handle('ai:stream-cancel', (_event, streamId: string) => {
    const handle = activeStreams.get(streamId);
    if (handle) {
      handle.cancel();
      activeStreams.delete(streamId);
    }
  });

  ipcMain.handle('ai:detectMode', (_event, text: string) => {
    return detectMode(text);
  });
}
