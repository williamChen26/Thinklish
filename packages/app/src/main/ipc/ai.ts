import { ipcMain, type BrowserWindow } from 'electron';
import type { ChildProcess } from 'child_process';
import { explainTextStream, detectMode } from '../services/ai-provider';

const activeStreams = new Map<string, ChildProcess>();
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

    const child = await explainTextStream(input, {
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

    if (child) {
      activeStreams.set(streamId, child);
      return { success: true, streamId };
    }

    return { success: false, error: '无法启动 AI 进程' };
  });

  ipcMain.handle('ai:stream-cancel', (_event, streamId: string) => {
    const child = activeStreams.get(streamId);
    if (child) {
      child.kill('SIGTERM');
      activeStreams.delete(streamId);
    }
  });

  ipcMain.handle('ai:detectMode', (_event, text: string) => {
    return detectMode(text);
  });
}
