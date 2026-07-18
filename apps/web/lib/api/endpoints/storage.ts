import client from '../client';
import type { FileNode, SignedURLResponse, UploadResponse } from '@/types/file';

export const storageApi = {
  getFileTree: async (projectId: string): Promise<FileNode[]> => {
    const response = await client.get<FileNode>(`/projects/${projectId}/tree`);
    // backend returns root node with children
    const root = response.data as unknown as FileNode;
    return root?.children || [];
  },

  getSignedURL: async (params: { key: string }): Promise<SignedURLResponse> => {
    // The backend streams text files directly (Content-Type: text/*) and returns JSON {url, expires} for non-text files
    const response = await client.get<string | any>('/signed-url', {
      params,
      responseType: 'text' as const,
    });

    const ct = response.headers?.['content-type'] || '';
    const raw = response.data as string;

    if (ct && ct.startsWith('text/')) {
      return { content: raw } as SignedURLResponse;
    }

    // try parse json
    try {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url,
        expires: parsed.expires,
      } as SignedURLResponse;
    } catch (_e) {
      // fallback: return raw text
      return { content: raw } as SignedURLResponse;
    }
  },

  uploadFile: async (
    projectId: string,
    file: File,
    fileType = 'file',
    onProgress?: (pct: number) => void
  ): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', fileType);

    const response = await client.post(`/projects/${projectId}/storage/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (ev: any) => {
        if (onProgress && ev?.total) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      },
    });

    return response.data as UploadResponse;
  },
};

export default storageApi;
