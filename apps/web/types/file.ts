export type FileNode = {
  id?: string;
  name: string;
  type: 'file' | 'directory' | 'folder' | 'directory';
  children?: FileNode[];
  object_key?: string;
};

export type SignedURLResponse = {
  url?: string;
  expires?: string | number;
  content?: string;
};

export type UploadResponse = {
  object_key: string;
};
