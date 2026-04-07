export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string; // For files
  children?: string[]; // IDs of items in the folder
  parentId: string | null;
  status: 'deactivated' | 'active' | 'shared';
  size: number;
  authorId: string;
  createdAt: number;
  extension?: string;
  desktopPosition?: { x: number, y: number }; // For desktop icons
}

export interface WindowState {
  id: string;
  title: string;
  isFocused: boolean;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  lastFocusedAt: number;
  type: 'system' | 'app';
  position: { x: number, y: number };
  size: { width: number, height: number };
  appData?: FileSystemItem; 
  path?: string; // Current path for explorer windows
}

export type FocusTarget = 'desktop' | string;

export type NodeRole = 'client' | 'server' | 'dns';

export type PowerState = 'off' | 'bios' | 'booting' | 'on' | 'sleeping';

export interface SystemSettings {
  theme: 'dark' | 'light' | 'glass';
  accentColor: string;
  wallpaper: string;
  username: string;
  hostname: string;
  password?: string;
  transparency: number;
  animations: boolean;
  blur: boolean;
}

export interface Dialog {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'error' | 'warning' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface Node {
  id: string;
  role: NodeRole;
  location: string;
  lastSeen: number;
}

// --- KERNEL TYPES ---

export interface CPUState {
  usage: number;
  cores: number[];
  frequency: number; 
}

export interface RAMState {
  total: number; 
  used: number; 
  processes: { name: string, memory: number }[];
}

export interface DiskState {
  label: string;
  format: 'NTFS' | 'EXT4';
  total: number; 
  used: number; 
}

export interface ClipboardState {
  itemId: string | null;
  action: 'copy' | 'cut' | null;
}

export interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'suspended' | 'zombie';
}
