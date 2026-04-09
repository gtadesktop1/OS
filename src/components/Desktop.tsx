import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Monitor, AppWindow, LayoutGrid, Package, Code, Folder, Settings, 
  Server, Globe, User, ShieldAlert, ShieldCheck, Download, Upload, 
  Trash2, Cpu, Database, HardDrive, Activity, Terminal as TerminalIcon, 
  Power, Moon, RefreshCw, Maximize2, Minimize2, Square, Search, 
  ChevronRight, AlertCircle, Info, HelpCircle, Minus, Maximize,
  FileText, Music, Play, Pause, SkipBack, SkipForward, Volume2,
  Terminal as KernelIcon, Zap, Cpu as CpuIcon, Cloud, Share2, Database as DbIcon
} from 'lucide-react';
import { 
  WindowState, FocusTarget, NodeRole, Node, FileSystemItem, 
  CPUState, RAMState, DiskState, Process, PowerState, Dialog, SystemSettings 
} from '../types';

// --- INITIAL FILE SYSTEM ---
const INITIAL_FS: FileSystemItem[] = [
  { id: 'root', name: 'C:', type: 'folder', parentId: null, status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'users', name: 'Users', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'user_home', name: 'User', type: 'folder', parentId: 'users', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'documents', name: 'Dokumente', type: 'folder', parentId: 'user_home', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'pictures', name: 'Bilder', type: 'folder', parentId: 'user_home', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'music', name: 'Musik', type: 'folder', parentId: 'user_home', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'desktop_folder', name: 'Desktop', type: 'folder', parentId: 'user_home', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'cloud_drive', name: 'Cloud Drive', type: 'folder', parentId: 'user_home', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'nas_storage', name: 'NAS Storage', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'system32', name: 'System32', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'drivers', name: 'Drivers', type: 'folder', parentId: 'system32', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'usb_driver', name: 'usb_ntfs.sys', type: 'file', extension: 'sys', parentId: 'drivers', status: 'active', size: 45000, authorId: 'system', createdAt: Date.now() },
  { id: 'net_driver', name: 'net_p2p.sys', type: 'file', extension: 'sys', parentId: 'drivers', status: 'active', size: 32000, authorId: 'system', createdAt: Date.now() },
  { id: 'apps', name: 'Apps', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'deactivated', name: 'Deactivated', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'active', name: 'Active', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'shared', name: 'Shared', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'trash', name: 'Papierkorb', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'readme', name: 'README', type: 'file', extension: 'txt', content: 'Willkommen bei Debian-NTFS.\nDies ist eine Simulation eines Betriebssystems.\nKernel: Rust-WASM-Bridge v0.1\nStatus: Stable', parentId: 'root', status: 'active', size: 120, authorId: 'system', createdAt: Date.now() },
];

// --- KERNEL SIMULATION HOOK ---

const useKernel = (powerState: PowerState) => {
  const [cpu, setCpu] = useState<CPUState>({ usage: 0, cores: [0, 0, 0, 0], frequency: 3200 });
  const [ram, setRam] = useState<RAMState>({ total: 16384, used: 2048, processes: [] });
  const [processes, setProcesses] = useState<Process[]>([
    { pid: 1, name: 'System Idle Process', cpu: 98, memory: 1, status: 'running' },
    { pid: 4, name: 'System', cpu: 1, memory: 128, status: 'running' },
    { pid: 102, name: 'Kernel.exe', cpu: 0.5, memory: 512, status: 'running' },
    { pid: 256, name: 'OS_UI.exe', cpu: 0.5, memory: 256, status: 'running' },
  ]);

  useEffect(() => {
    if (powerState !== 'on') {
      setCpu(prev => ({ ...prev, usage: 0, cores: [0, 0, 0, 0] }));
      return;
    }

    const interval = setInterval(() => {
      setCpu(prev => {
        const newCores = prev.cores.map(c => Math.max(0, Math.min(100, c + (Math.random() - 0.5) * 15)));
        const avg = newCores.reduce((a, b) => a + b, 0) / newCores.length;
        return { ...prev, cores: newCores, usage: avg };
      });

      setRam(prev => {
        const jitter = (Math.random() - 0.5) * 40;
        return { ...prev, used: Math.max(2000, Math.min(16000, prev.used + jitter)) };
      });

      setProcesses(prev => prev.map(p => {
        if (p.pid === 1) return p;
        return { ...p, cpu: Math.random() * 3, memory: p.memory + (Math.random() - 0.5) * 5 };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [powerState]);

  return { cpu, ram, processes, setProcesses };
};

// --- COMPONENTS ---

const Window: React.FC<{
  window: WindowState;
  settings: SystemSettings;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  children: React.ReactNode;
}> = ({ window, settings, onClose, onFocus, onMinimize, onMaximize, onDragEnd, onContextMenu, children }) => {
  if (window.isMinimized) return null;

  const isGlass = settings.theme === 'glass';
  const isLight = settings.theme === 'light';

  return (
    <motion.div
      drag
      dragHandleClassName="window-header"
      dragMomentum={false}
      onDragEnd={(_, info) => onDragEnd(window.id, info.point.x, info.point.y)}
      initial={false}
      animate={{ 
        zIndex: window.zIndex,
        width: window.isMaximized ? '100%' : window.size.width,
        height: window.isMaximized ? 'calc(100% - 48px)' : window.size.height,
        x: window.isMaximized ? 0 : window.position.x,
        y: window.isMaximized ? 0 : window.position.y,
        opacity: settings.animations ? 1 : 1,
        scale: settings.animations ? 1 : 1,
        boxShadow: window.isFocused ? '0 25px 50px -12px rgb(0 0 0 / 0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.2)',
        borderColor: window.isFocused ? (settings.accentColor || '#3b82f6') : '#334155'
      }}
      transition={settings.animations ? { type: 'spring', damping: 25, stiffness: 300 } : { duration: 0 }}
      className={`absolute border-2 overflow-hidden flex flex-col pointer-events-auto shadow-2xl 
        ${window.isMaximized ? '' : 'rounded-lg'} 
        ${isGlass ? 'bg-slate-900/40 backdrop-blur-xl' : isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}
      `}
      onClick={() => onFocus(window.id)}
      onContextMenu={(e) => onContextMenu(e, window.id)}
    >
      <div 
        className={`window-header p-2 flex items-center justify-between cursor-default select-none 
          ${window.isFocused 
            ? (isLight ? 'bg-slate-100 text-slate-900' : 'bg-blue-600 text-white') 
            : (isLight ? 'bg-slate-50 text-slate-400' : 'bg-slate-800 text-slate-400')
          }
          ${isGlass ? 'bg-white/10' : ''}
        `}
        style={window.isFocused && !isLight && !isGlass ? { backgroundColor: settings.accentColor } : {}}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {window.type === 'system' ? <Settings size={14} /> : <AppWindow size={14} />}
          <span className="text-[10px] font-bold tracking-widest uppercase truncate max-w-[200px]">{window.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onMinimize(window.id); }} className="hover:bg-white/10 rounded p-1 transition-colors">
            <Minimize2 size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMaximize(window.id); }} className="hover:bg-white/10 rounded p-1 transition-colors">
            {window.isMaximized ? <Square size={12} /> : <Maximize2 size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(window.id); }}
            className="hover:bg-red-500 hover:text-white rounded p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={`flex-1 overflow-auto ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-300'}`}>
        {children}
      </div>
    </motion.div>
  );
};

const DialogBox: React.FC<{ 
  dialog: Dialog, 
  onClose: () => void,
  onConfirm: (value?: string) => void
}> = ({ dialog, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-[400px] bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="p-4 bg-slate-800/50 flex items-center gap-3 border-b border-slate-700">
          <div className={`p-2 rounded-lg ${
            dialog.type === 'error' ? 'bg-red-500/20 text-red-500' : 
            dialog.type === 'confirm' ? 'bg-amber-500/20 text-amber-500' :
            'bg-blue-500/20 text-blue-500'
          }`}>
            {dialog.type === 'error' && <ShieldAlert size={20} />}
            {dialog.type === 'confirm' && <HelpCircle size={20} />}
            {dialog.type === 'info' && <Info size={20} />}
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">{dialog.title}</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">{dialog.message}</p>
          
          {dialog.type === 'confirm' && (dialog.message.includes('Name') || dialog.message.includes('Passwort') || dialog.message.includes('Geben')) && (
            <input 
              autoFocus
              type={dialog.message.includes('Passwort') ? 'password' : 'text'}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              placeholder="Eingabe..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(inputValue);
              }}
            />
          )}
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-end gap-3 border-t border-slate-800">
          {dialog.type === 'confirm' ? (
            <>
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:bg-white/5 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => onConfirm(inputValue)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-blue-900/20"
              >
                Bestätigen
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-bold uppercase transition-all"
            >
              OK
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- OS DESKTOP ---

export const Desktop: React.FC = () => {
  // Power State
  const [powerState, setPowerState] = useState<PowerState>('on');
  const [bootProgress, setBootProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  const { cpu, ram, processes, setProcesses } = useKernel(powerState);
  
  // OS State
  const [isSetup, setIsSetup] = useState(() => {
    const saved = localStorage.getItem('ntfs_os_setup');
    return saved === 'true';
  });
  const [role, setRole] = useState<NodeRole>(() => {
    return (localStorage.getItem('ntfs_os_role') as NodeRole) || 'client';
  });
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('ntfs_os_location') || 'Berlin, DE';
  });
  const [nodeId] = useState(() => {
    const saved = localStorage.getItem('ntfs_os_nodeid');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(7);
    localStorage.setItem('ntfs_os_nodeid', newId);
    return newId;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('ntfs_os_settings');
    if (saved) return JSON.parse(saved);
    return {
      theme: 'dark',
      accentColor: '#3b82f6',
      wallpaper: 'default',
      username: 'User',
      hostname: 'NTFS-NODE',
      password: '',
      transparency: 90,
      animations: true,
      blur: true
    };
  });
  
  // Network State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [sharedApps, setSharedApps] = useState<FileSystemItem[]>([]);
  
  // File System State (NTFS Simulation)
  const [fs, setFs] = useState<FileSystemItem[]>(() => {
    const saved = localStorage.getItem('ntfs_os_fs');
    if (saved) return JSON.parse(saved);
    return INITIAL_FS;
  });

  const [disk, setDisk] = useState<DiskState>({
    label: 'Local Disk (C:)',
    format: 'NTFS',
    total: 512,
    used: 42
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('ntfs_os_setup', isSetup.toString());
    localStorage.setItem('ntfs_os_role', role);
    localStorage.setItem('ntfs_os_location', location);
    localStorage.setItem('ntfs_os_fs', JSON.stringify(fs));
    localStorage.setItem('ntfs_os_settings', JSON.stringify(settings));
  }, [isSetup, role, location, fs, settings]);
  
  // Window Manager State
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>('desktop');
  const [nextZIndex, setNextZIndex] = useState(10);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState<{ x: number, y: number } | null>(null);
  
  // Dialog System
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [clipboard, setClipboard] = useState<{ itemId: string | null, action: 'copy' | 'cut' | null }>({ itemId: null, action: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);
  const [windowContextMenu, setWindowContextMenu] = useState<{ x: number, y: number, windowId: string } | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    if (powerState === 'bios') {
      const timer = setTimeout(() => setPowerState('booting'), 2000);
      return () => clearTimeout(timer);
    }
    if (powerState === 'booting') {
      const interval = setInterval(() => {
        setBootProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setPowerState('on');
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [powerState]);

  // --- NETWORK SYNC ---
  useEffect(() => {
    if (!isSetup || powerState !== 'on') return;

    const sync = async () => {
      try {
        const regRes = await fetch('/api/network/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: nodeId, role, location })
        });
        const regData = await regRes.json();
        setNodes(regData.nodes);

        const appsRes = await fetch('/api/shared/list');
        const appsData = await appsRes.json();
        setSharedApps(appsData);
      } catch (e) {
        console.error("Network sync failed", e);
      }
    };

    const interval = setInterval(sync, 5000);
    sync();
    return () => clearInterval(interval);
  }, [isSetup, nodeId, role, location, powerState]);

  // --- DIALOG ACTIONS ---
  const showDialog = useCallback((title: string, message: string, type: Dialog['type'] = 'info', onConfirm?: () => void) => {
    const id = Math.random().toString(36).substring(7);
    setDialogs(prev => [...prev, { id, title, message, type, onConfirm }]);
  }, []);

  // --- WINDOW ACTIONS ---
  const openWindow = useCallback((title: string, type: 'system' | 'app' = 'app', appData?: FileSystemItem, path: string = 'root') => {
    // Single Instance Check
    const existing = windows.find(w => w.title === title && w.type === type && (type === 'system' || w.appData?.id === appData?.id));
    if (existing) {
      focusWindow(existing.id);
      setIsStartMenuOpen(false);
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const newWindow: WindowState = {
      id,
      title,
      isFocused: true,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZIndex,
      lastFocusedAt: Date.now(),
      type,
      position: { x: 100 + (windows.length * 20), y: 100 + (windows.length * 20) },
      size: { width: 800, height: 500 },
      appData,
      path
    };
    
    setWindows(prev => prev.map(w => ({ ...w, isFocused: false })).concat(newWindow));
    setNextZIndex(prev => prev + 1);
    setFocusTarget(id);
    setIsStartMenuOpen(false);

    setProcesses(prev => [...prev, {
      pid: Math.floor(Math.random() * 9000) + 1000,
      name: `${title}.exe`,
      cpu: 0.1,
      memory: 12 + Math.random() * 20,
      status: 'running'
    }]);
  }, [nextZIndex, windows.length, setProcesses]);

  const closeWindow = useCallback((id: string) => {
    const win = windows.find(w => w.id === id);
    if (win) {
      setProcesses(prev => prev.filter(p => p.name !== `${win.title}.exe`));
    }
    setWindows(prev => prev.filter(w => w.id !== id));
    setFocusTarget('desktop');
  }, [windows, setProcesses]);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      isFocused: w.id === id,
      isMinimized: w.id === id ? false : w.isMinimized,
      zIndex: w.id === id ? nextZIndex : w.zIndex,
      lastFocusedAt: w.id === id ? Date.now() : w.lastFocusedAt
    })));
    setFocusTarget(id);
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const toggleMinimize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: !w.isMinimized, isFocused: false } : w
    ));
    setFocusTarget('desktop');
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
    ));
  }, []);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, position: { x, y } } : w
    ));
  }, []);

  const handleIconDragEnd = useCallback((id: string, x: number, y: number) => {
    setFs(prev => prev.map(item => 
      item.id === id ? { ...item, desktopPosition: { x, y } } : item
    ));
  }, []);

  // --- POWER ACTIONS ---
  const shutdown = () => {
    showDialog('System', 'Möchten Sie das System wirklich herunterfahren?', 'confirm', () => {
      setPowerState('off');
      setWindows([]);
      setProcesses([]);
    });
  };

  const sleep = () => {
    setPowerState('sleeping');
    setIsStartMenuOpen(false);
  };

  const boot = () => {
    setPowerState('bios');
    setBootProgress(0);
  };

  const activateApp = (appId: string) => {
    setFs(prev => prev.map(item => item.id === appId ? { ...item, status: 'active', parentId: 'active' } : item));
    showDialog('System', 'Anwendung wurde erfolgreich aktiviert und ist nun ausführbar.', 'info');
  };

  const shareApp = async (app: FileSystemItem) => {
    try {
      await fetch('/api/shared/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: app.name,
          code: app.content,
          authorId: nodeId,
          type: 'app'
        })
      });
      setFs(prev => prev.map(a => a.id === app.id ? { ...a, status: 'shared', parentId: 'shared' } : a));
      showDialog('Netzwerk', `${app.name} wurde im Shared Folder freigegeben.`, 'info');
    } catch (e) {
      showDialog('Fehler', 'Freigabe im Netzwerk fehlgeschlagen.', 'error');
    }
  };

  const downloadApp = async (remoteApp: FileSystemItem) => {
    const newApp: FileSystemItem = {
      ...remoteApp,
      id: Math.random().toString(36).substring(7),
      status: 'deactivated',
      parentId: 'deactivated',
      size: Math.floor(Math.random() * 5000) + 100,
      createdAt: Date.now()
    };
    setFs(prev => [...prev, newApp]);
    showDialog('Download', `${remoteApp.name} wurde heruntergeladen. Bitte im NTFS Explorer aktivieren.`, 'info');
  };

  // --- FILE OPERATIONS ---
  const copyItem = (id: string) => {
    setClipboard({ itemId: id, action: 'copy' });
    setFileContextMenu(null);
  };

  const cutItem = (id: string) => {
    setClipboard({ itemId: id, action: 'cut' });
    setFileContextMenu(null);
  };

  const pasteItem = (targetFolderId: string) => {
    if (!clipboard.itemId || !clipboard.action) return;

    const itemToPaste = fs.find(i => i.id === clipboard.itemId);
    if (!itemToPaste) return;

    if (clipboard.action === 'copy') {
      const newItem: FileSystemItem = {
        ...itemToPaste,
        id: Math.random().toString(36).substring(7),
        parentId: targetFolderId,
        createdAt: Date.now(),
        name: `${itemToPaste.name} - Kopie`
      };
      setFs(prev => [...prev, newItem]);
    } else if (clipboard.action === 'cut') {
      setFs(prev => prev.map(i => i.id === clipboard.itemId ? { ...i, parentId: targetFolderId } : i));
      setClipboard({ itemId: null, action: null });
    }
    setFileContextMenu(null);
  };

  const deleteItem = (id: string) => {
    setFs(prev => prev.filter(i => i.id !== id));
    setFileContextMenu(null);
  };

  const renameItem = (id: string, newName: string) => {
    setFs(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));
  };

  // --- RENDERING ---

  if (powerState === 'off') {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-8">
        <Monitor size={100} className="text-slate-800" />
        <button 
          onClick={boot}
          className="group flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-500 group-hover:text-blue-500 group-hover:border-blue-500 transition-all">
            <Power size={32} />
          </div>
          <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">Power On</span>
        </button>
      </div>
    );
  }

  if (powerState === 'bios') {
    return (
      <div className="w-full h-screen bg-black text-slate-300 font-mono p-8 text-xs flex flex-col gap-1">
        <div className="flex justify-between border-b border-slate-800 pb-2 mb-4">
          <span>NTFS BIOS v4.2.0</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <p>CPU: SIMULATED X86_64 @ 3.20GHz</p>
        <p>MEMORY: 16384MB OK</p>
        <p>STORAGE: 512GB NVME OK</p>
        <p className="mt-4">Detecting bootable media...</p>
        <p className="text-emerald-500">Found: NTFS OS KERNEL (C:\System32\kernel.exe)</p>
        <p className="mt-4 animate-pulse">Starting bootloader...</p>
      </div>
    );
  }

  if (powerState === 'booting') {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-4 mb-12">
          <Monitor size={48} className="text-blue-600" />
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">NTFS OS Kernel</h1>
        </div>
        <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${bootProgress}%` }}
            className="h-full bg-blue-600"
          />
        </div>
        <div className="mt-4 text-slate-500 font-mono text-[10px] uppercase tracking-widest">
          Loading System Modules... {bootProgress}%
        </div>
      </div>
    );
  }

  if (powerState === 'on' && isSetup && !isLoggedIn) {
    return (
      <LoginScreen 
        username={settings.username} 
        onLogin={(p) => {
          if (p === settings.password) {
            setIsLoggedIn(true);
          } else {
            showDialog('Sicherheit', 'Falsches Passwort. Bitte versuchen Sie es erneut.', 'error');
          }
        }} 
      />
    );
  }

  if (powerState === 'sleeping') {
    return (
      <div 
        className="w-full h-screen bg-black flex items-center justify-center cursor-pointer"
        onClick={() => setPowerState('on')}
      >
        <motion.div 
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <Moon size={48} className="text-slate-800" />
          <span className="text-slate-800 text-[10px] font-bold uppercase tracking-[0.5em]">System Sleeping</span>
        </motion.div>
      </div>
    );
  }

  if (!isSetup) {
    return (
      <SetupWizard 
        onComplete={(r, l, u, h, p) => {
          setRole(r);
          setLocation(l);
          setSettings(prev => ({ ...prev, username: u, hostname: h, password: p }));
          setIsSetup(true);
          setIsLoggedIn(true);
        }} 
      />
    );
  }

  return (
    <div 
      className={`relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none ${settings.theme === 'glass' ? 'bg-gradient-to-br from-slate-900 to-blue-900/20' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setDesktopContextMenu({ x: e.clientX, y: e.clientY });
        setFileContextMenu(null);
        setWindowContextMenu(null);
        setContextMenu(null);
      }}
      onClick={() => {
        setWindows(prev => prev.map(w => ({ ...w, isFocused: false })));
        setFocusTarget('desktop');
        setIsStartMenuOpen(false);
        setDesktopContextMenu(null);
        setFileContextMenu(null);
        setWindowContextMenu(null);
        setContextMenu(null);
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-5">
        <Monitor size={400} className="text-white" />
        <h1 className="text-9xl font-black text-white uppercase tracking-tighter">NTFS</h1>
      </div>

      {/* Desktop Icons */}
      <div className="absolute inset-0 pointer-events-none p-8" ref={desktopRef}>
        <div className="relative w-full h-full">
          <DesktopIcon 
            id="store"
            icon={<Package size={32} />} 
            label="Store" 
            color="bg-blue-600" 
            position={fs.find(i => i.id === 'store')?.desktopPosition || { x: 0, y: 0 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('Paketmanager', 'system')} 
          />
          <DesktopIcon 
            id="ide"
            icon={<Code size={32} />} 
            label="IDE" 
            color="bg-emerald-600" 
            position={fs.find(i => i.id === 'ide')?.desktopPosition || { x: 0, y: 100 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('Programmer Editor', 'system')} 
          />
          <DesktopIcon 
            id="explorer"
            icon={<HardDrive size={32} />} 
            label="C: Drive" 
            color="bg-amber-600" 
            position={fs.find(i => i.id === 'explorer')?.desktopPosition || { x: 0, y: 200 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('NTFS Explorer', 'system')} 
          />
          <DesktopIcon 
            id="tasks"
            icon={<Activity size={32} />} 
            label="Tasks" 
            color="bg-red-600" 
            position={fs.find(i => i.id === 'tasks')?.desktopPosition || { x: 0, y: 300 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('Task Manager', 'system')} 
          />
          <DesktopIcon 
            id="terminal"
            icon={<TerminalIcon size={32} />} 
            label="Terminal" 
            color="bg-slate-700" 
            position={fs.find(i => i.id === 'terminal')?.desktopPosition || { x: 0, y: 400 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('Terminal', 'system')} 
          />
          <DesktopIcon 
            id="settings"
            icon={<Settings size={32} />} 
            label="Settings" 
            color="bg-slate-600" 
            position={fs.find(i => i.id === 'settings')?.desktopPosition || { x: 0, y: 500 }}
            onDragEnd={handleIconDragEnd}
            onClick={() => openWindow('System Settings', 'system')} 
          />
        </div>
      </div>

      {/* Desktop Context Menu */}
      <AnimatePresence>
        {desktopContextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-[2000] w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl py-1"
            style={{ left: desktopContextMenu.x, top: desktopContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem label="Neu laden" icon={<RefreshCw size={14} />} onClick={() => window.location.reload()} />
            <div className="h-px bg-slate-800 my-1" />
            <ContextMenuItem label="Anpassen" icon={<Settings size={14} />} onClick={() => openWindow('System Settings', 'system')} />
            <ContextMenuItem label="Task Manager" icon={<Activity size={14} />} onClick={() => openWindow('Task Manager', 'system')} />
            <div className="h-px bg-slate-800 my-1" />
            <ContextMenuItem label="Herunterfahren" icon={<Power size={14} />} onClick={shutdown} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fileContextMenu && fs.find(i => i.id === fileContextMenu.itemId) && (
          <FileContextMenu 
            x={fileContextMenu.x}
            y={fileContextMenu.y}
            item={fs.find(i => i.id === fileContextMenu.itemId)!}
            onClose={() => setFileContextMenu(null)}
            onCopy={copyItem}
            onCut={cutItem}
            onDelete={deleteItem}
            onActivate={activateApp}
            onShare={shareApp}
            onRun={(app) => openWindow(app.name, 'app', app)}
            onRename={(id) => {
              showDialog('Umbenennen', 'Geben Sie einen neuen Namen ein:', 'confirm', (name) => {
                if (name) renameItem(id, name);
              });
            }}
            onOpenWithEditor={(item) => openWindow('Text Editor', 'system', item)}
          />
        )}
        {windowContextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[3000] w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl py-1"
            style={{ left: windowContextMenu.x, top: windowContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem label="Minimieren" icon={<Minus size={14} />} onClick={() => { toggleMinimize(windowContextMenu.windowId); setWindowContextMenu(null); }} />
            <ContextMenuItem label="Maximieren" icon={<Maximize size={14} />} onClick={() => { toggleMaximize(windowContextMenu.windowId); setWindowContextMenu(null); }} />
            <div className="h-px bg-slate-800 my-1" />
            <ContextMenuItem label="Schließen" icon={<X size={14} />} onClick={() => { closeWindow(windowContextMenu.windowId); setWindowContextMenu(null); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Windows Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {windows.map(w => (
            <Window 
              key={w.id} 
              window={w} 
              settings={settings}
              onClose={closeWindow} 
              onFocus={focusWindow}
              onMinimize={toggleMinimize}
              onMaximize={toggleMaximize}
              onDragEnd={handleDragEnd}
              onContextMenu={(e, id) => {
                e.preventDefault();
                e.stopPropagation();
                setWindowContextMenu({ x: e.clientX, y: e.clientY, windowId: id });
                setDesktopContextMenu(null);
                setFileContextMenu(null);
              }}
            >
              {w.title === 'Browser' && (
                <Browser />
              )}
              {w.title === 'Paketmanager' && (
                <PackageManager sharedApps={sharedApps} onDownload={downloadApp} nodes={nodes} />
              )}
              {w.title === 'NTFS Explorer' && (
                <FileManager 
                  fs={fs}
                  currentPath={w.path || 'root'}
                  onNavigate={(path) => {
                    setWindows(prev => prev.map(win => win.id === w.id ? { ...win, path } : win));
                  }}
                  onActivate={activateApp} 
                  onShare={shareApp}
                  onRun={(app) => openWindow(app.name, 'app', app)}
                  onDelete={deleteItem}
                  onCopy={copyItem}
                  onCut={cutItem}
                  onPaste={pasteItem}
                  onContextMenu={(e, itemId) => {
                    if (!e) {
                      setFileContextMenu(null);
                      return;
                    }
                    setFileContextMenu({ x: e.clientX, y: e.clientY, itemId });
                  }}
                />
              )}
              {w.title === 'Programmer Editor' && (
                <ProgrammerEditor 
                  onSave={(name, code) => {
                    const newApp: FileSystemItem = {
                      id: Math.random().toString(36).substring(7),
                      name,
                      content: code,
                      status: 'active',
                      parentId: 'active',
                      authorId: nodeId,
                      type: 'file',
                      extension: 'exe',
                      size: code.length,
                      createdAt: Date.now()
                    };
                    setFs(prev => [...prev, newApp]);
                    showDialog('IDE', 'Anwendung erfolgreich kompiliert und gespeichert.', 'info');
                  }}
                />
              )}
              {w.title === 'Task Manager' && (
                <TaskManager 
                  cpu={cpu} 
                  ram={ram} 
                  processes={processes} 
                  onKill={(pid) => setProcesses(prev => prev.filter(p => p.pid !== pid))} 
                />
              )}
              {w.title === 'System Monitor' && (
                <SystemMonitor 
                  cpu={cpu} 
                  ram={ram} 
                  processes={processes}
                  onKill={(pid) => setProcesses(prev => prev.filter(p => p.pid !== pid))}
                />
              )}
              {w.title === 'Kernel Console' && (
                <KernelConsole />
              )}
              {w.title === 'Text Editor' && (
                <TextEditor 
                  file={w.appData} 
                  onSave={(content) => {
                    if (w.appData) {
                      setFs(prev => prev.map(i => i.id === w.appData!.id ? { ...i, content, size: content.length } : i));
                    }
                  }} 
                />
              )}
              {w.title === 'Media Player' && (
                <MediaPlayer fs={fs} />
              )}
              {w.title === 'Network Manager' && (
                <NetworkManager nodes={nodes} />
              )}
              {w.title === 'Server Manager' && (
                <ServerManager />
              )}
              {w.title === 'Cloud Storage' && (
                <CloudStorage fs={fs} />
              )}
              {w.title === 'DNS Registrar' && (
                <DNSRegistrar />
              )}
              {w.title === 'Terminal' && (
                <Terminal 
                  nodes={nodes} 
                  role={role} 
                  location={location} 
                  hostname={settings.hostname}
                  username={settings.username}
                  fs={fs}
                  onExecute={(cmd) => {
                    if (cmd === 'reboot') boot();
                    if (cmd === 'shutdown') setPowerState('off');
                    if (cmd === 'clear') return [];
                    return null;
                  }}
                />
              )}
              {w.title === 'System Settings' && (
                <SettingsApp 
                  settings={settings} 
                  onUpdate={(newSettings) => setSettings(newSettings)} 
                />
              )}
              {w.type === 'app' && w.appData && (
                <AppRunner app={w.appData} />
              )}
            </Window>
          ))}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {dialogs.map(d => (
          <DialogBox 
            key={d.id} 
            dialog={d} 
            onClose={() => setDialogs(prev => prev.filter(x => x.id !== d.id))} 
            onConfirm={(val) => {
              d.onConfirm?.(val);
              setDialogs(prev => prev.filter(x => x.id !== d.id));
            }}
          />
        ))}
      </AnimatePresence>

      {/* Start Menu */}
      <AnimatePresence>
        {isStartMenuOpen && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-14 left-2 w-80 bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[1000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-800/50 flex items-center gap-4 border-b border-slate-700">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {role[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-white uppercase tracking-wider">{role} Node</div>
                <div className="text-[10px] text-slate-400">{location}</div>
              </div>
            </div>

            <div className="p-2">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Apps suchen..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              <StartMenuItem icon={<Globe size={16} />} label="Browser" onClick={() => openWindow('Browser', 'system')} />
              <StartMenuItem icon={<Server size={16} />} label="Network Manager" onClick={() => openWindow('Network Manager', 'system')} />
              <StartMenuItem icon={<DbIcon size={16} />} label="Server Manager" onClick={() => openWindow('Server Manager', 'system')} />
              <StartMenuItem icon={<Cloud size={16} />} label="Cloud Storage" onClick={() => openWindow('Cloud Storage', 'system')} />
              <StartMenuItem icon={<Zap size={16} />} label="DNS Registrar" onClick={() => openWindow('DNS Registrar', 'system')} />
              <StartMenuItem icon={<Package size={16} />} label="App Store" onClick={() => openWindow('Paketmanager', 'system')} />
              <StartMenuItem icon={<HardDrive size={16} />} label="NTFS Explorer" onClick={() => openWindow('NTFS Explorer', 'system')} />
              <StartMenuItem icon={<Code size={16} />} label="IDE Editor" onClick={() => openWindow('Programmer Editor', 'system')} />
              <StartMenuItem icon={<Activity size={16} />} label="Task Manager" onClick={() => openWindow('Task Manager', 'system')} />
              <StartMenuItem icon={<CpuIcon size={16} />} label="System Monitor" onClick={() => openWindow('System Monitor', 'system')} />
              <StartMenuItem icon={<Music size={16} />} label="Media Player" onClick={() => openWindow('Media Player', 'system')} />
              <StartMenuItem icon={<KernelIcon size={16} />} label="Kernel Console" onClick={() => openWindow('Kernel Console', 'system')} />
              <StartMenuItem icon={<TerminalIcon size={16} />} label="Terminal" onClick={() => openWindow('Terminal', 'system')} />
              <StartMenuItem icon={<Settings size={16} />} label="System Settings" onClick={() => openWindow('System Settings', 'system')} />
            </div>

            <div className="p-2 bg-slate-800/30 border-t border-slate-700 flex justify-between">
              <button onClick={shutdown} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2 text-[10px] font-bold uppercase">
                <Power size={14} /> Shutdown
              </button>
              <button onClick={sleep} className="p-2 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors flex items-center gap-2 text-[10px] font-bold uppercase">
                <Moon size={14} /> Sleep
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 flex items-center px-2 gap-1 z-[1001]">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsStartMenuOpen(!isStartMenuOpen); }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isStartMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          <Monitor size={20} />
        </button>
        
        <div className="w-px h-6 bg-white/10 mx-1" />

        {windows.map(w => (
          <button
            key={w.id}
            onClick={(e) => { e.stopPropagation(); focusWindow(w.id); }}
            className={`px-3 h-10 rounded-lg flex items-center gap-2 transition-all min-w-[100px] max-w-[150px] ${w.isFocused ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            {w.type === 'system' ? <Settings size={12} /> : <AppWindow size={12} />}
            <span className="text-[10px] font-bold uppercase truncate">{w.title}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* System Tray */}
        <div className="flex items-center gap-4 px-4 h-full border-l border-white/5">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Cpu size={10} className="text-blue-400" />
              <span className="text-[10px] font-mono text-white">{cpu.usage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Database size={10} className="text-emerald-400" />
              <span className="text-[10px] font-mono text-white">{Math.round(ram.used)}MB</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white text-[10px] font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-white/30 text-[8px] uppercase tracking-widest">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const SetupWizard: React.FC<{ onComplete: (role: NodeRole, loc: string, user: string, host: string, pass: string) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<NodeRole>('client');
  const [loc, setLoc] = useState('Berlin, DE');
  const [user, setUser] = useState('User');
  const [host, setHost] = useState('NTFS-NODE');
  const [pass, setPass] = useState('');

  const steps = [
    { title: 'Sprache & Region', icon: <Globe size={32} /> },
    { title: 'Netzwerk-Rolle', icon: <Server size={32} /> },
    { title: 'Benutzerkonto', icon: <User size={32} /> },
    { title: 'Sicherheit', icon: <ShieldCheck size={32} /> },
    { title: 'Zusammenfassung', icon: <ShieldCheck size={32} /> }
  ];

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]"
      >
        <div className="p-8 bg-slate-800/50 flex items-center gap-6 border-b border-slate-700">
          <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/40">
            {steps[step].icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">{steps[step].title}</h2>
            <p className="text-slate-400 text-xs uppercase tracking-tighter">Schritt {step + 1} von {steps.length}</p>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          {step === 0 && (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">Wählen Sie Ihren Standort für die Netzwerk-Synchronisation.</p>
              <input 
                type="text" 
                value={loc} 
                onChange={e => setLoc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Berlin, DE"
              />
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-cols-3 gap-4">
              {(['client', 'server', 'dns'] as NodeRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${role === r ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                >
                  {r === 'client' && <User size={24} />}
                  {r === 'server' && <Server size={24} />}
                  {r === 'dns' && <Globe size={24} />}
                  <span className="text-xs font-bold uppercase tracking-widest">{r}</span>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Benutzername</label>
                <input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Hostname</label>
                <input type="text" value={host} onChange={e => setHost(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">Legen Sie ein Passwort für Ihr System fest.</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Passwort</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">USER:</span><span className="text-blue-400">{user}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">HOST:</span><span className="text-blue-400">{host}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ROLE:</span><span className="text-blue-400 uppercase">{role}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">LOC:</span><span className="text-blue-400">{loc}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SEC:</span><span className="text-blue-400">PASSWORD SET</span></div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-800/30 border-t border-slate-700 flex justify-between">
          <button 
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl disabled:opacity-0 transition-all"
          >
            Zurück
          </button>
          <button 
            onClick={() => {
              if (step === steps.length - 1) onComplete(role, loc, user, host, pass);
              else setStep(s => s + 1);
            }}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all"
          >
            {step === steps.length - 1 ? 'Fertigstellen' : 'Weiter'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LoginScreen: React.FC<{ username: string, onLogin: (pass: string) => void }> = ({ username, onLogin }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-950" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center gap-8"
      >
        <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border-4 border-slate-700 shadow-2xl">
          <User size={64} />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">{username}</h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.3em]">Willkommen zurück</p>
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); onLogin(pass); }}
          className="w-64 space-y-4"
        >
          <input 
            autoFocus
            type="password" 
            placeholder="Passwort"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(false); }}
            className={`w-full bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} rounded-xl p-4 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          />
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/40 transition-all">
            Anmelden
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const FileContextMenu: React.FC<{ 
  x: number, 
  y: number, 
  item: FileSystemItem, 
  onClose: () => void,
  onCopy: (id: string) => void,
  onCut: (id: string) => void,
  onDelete: (id: string) => void,
  onActivate: (id: string) => void,
  onShare: (item: FileSystemItem) => void,
  onRun: (item: FileSystemItem) => void,
  onRename: (id: string) => void,
  onOpenWithEditor: (item: FileSystemItem) => void
}> = ({ x, y, item, onClose, onCopy, onCut, onDelete, onActivate, onShare, onRun, onRename, onOpenWithEditor }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[3000] w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {item.type === 'file' && item.status === 'active' && (
        <>
          <ContextMenuItem label="Ausführen" icon={<AppWindow size={14} />} onClick={() => { onRun(item); onClose(); }} />
          {item.extension === 'txt' && (
            <ContextMenuItem label="Bearbeiten" icon={<FileText size={14} />} onClick={() => { onOpenWithEditor(item); onClose(); }} />
          )}
        </>
      )}
      {item.type === 'file' && item.status === 'deactivated' && (
        <ContextMenuItem label="Aktivieren" icon={<ShieldCheck size={14} />} onClick={() => { onActivate(item.id); onClose(); }} />
      )}
      <div className="h-px bg-slate-800 my-1" />
      <ContextMenuItem label="Kopieren" icon={<LayoutGrid size={14} />} onClick={() => { onCopy(item.id); onClose(); }} />
      <ContextMenuItem label="Ausschneiden" icon={<LayoutGrid size={14} />} onClick={() => { onCut(item.id); onClose(); }} />
      <div className="h-px bg-slate-800 my-1" />
      <ContextMenuItem label="Umbenennen" icon={<RefreshCw size={14} />} onClick={() => { onRename(item.id); onClose(); }} />
      {item.status === 'active' && (
        <ContextMenuItem label="Teilen" icon={<Globe size={14} />} onClick={() => { onShare(item); onClose(); }} />
      )}
      <ContextMenuItem label="Löschen" icon={<Trash2 size={14} />} onClick={() => { onDelete(item.id); onClose(); }} />
    </motion.div>
  );
};

const FileManager: React.FC<{ 
  fs: FileSystemItem[], 
  currentPath: string,
  onNavigate: (path: string) => void,
  onActivate: (id: string) => void, 
  onShare: (app: FileSystemItem) => void, 
  onRun: (app: FileSystemItem) => void,
  onDelete: (id: string) => void,
  onCopy: (id: string) => void,
  onCut: (id: string) => void,
  onPaste: (targetId: string) => void,
  onContextMenu: (e: React.MouseEvent, itemId: string) => void
}> = ({ fs, currentPath, onNavigate, onActivate, onShare, onRun, onDelete, onCopy, onCut, onPaste, onContextMenu }) => {
  const currentFolder = fs.find(f => f.id === currentPath);
  const items = fs.filter(f => f.parentId === currentPath);
  
  const getPathString = (id: string): string => {
    const item = fs.find(f => f.id === id);
    if (!item || !item.parentId) return item?.name || '';
    return getPathString(item.parentId) + ' / ' + item.name;
  };

  const sidebarItems = [
    { id: 'root', name: 'Lokaler Datenträger (C:)', icon: <HardDrive size={16} /> },
    { id: 'user_home', name: 'Benutzer', icon: <User size={16} /> },
    { id: 'cloud_drive', name: 'Cloud Drive', icon: <Cloud size={16} /> },
    { id: 'nas_storage', name: 'NAS Storage', icon: <Server size={16} /> },
    { id: 'active', name: 'Anwendungen', icon: <AppWindow size={16} /> },
    { id: 'trash', name: 'Papierkorb', icon: <Trash2 size={16} /> },
  ];

  return (
    <div className="flex h-full bg-slate-950 text-slate-300 font-sans">
      {/* Sidebar */}
      <div className="w-48 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Orte</div>
        <div className="p-2 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${currentPath === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              {item.icon}
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPath === 'root'}
              onClick={() => currentFolder?.parentId && onNavigate(currentFolder.parentId)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 disabled:opacity-20"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1 text-[10px] font-mono text-slate-500 flex items-center gap-2">
            <Folder size={12} className="text-amber-500" />
            {getPathString(currentPath)}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onPaste(currentPath)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400" title="Einfügen"><Download size={14} /></button>
            <div className="w-px h-4 bg-slate-800 mx-1" />
            <Search size={14} className="text-slate-600 ml-2" />
            <input type="text" placeholder="Suchen..." className="bg-transparent text-[10px] focus:outline-none w-32" />
          </div>
        </div>

        <div 
          className="flex-1 overflow-auto p-4"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(null as any, '');
          }}
          onClick={() => onContextMenu(null as any, '')}
        >
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 content-start">
            {items.map(item => (
              <button
                key={item.id}
                onDoubleClick={() => {
                  if (item.type === 'folder') onNavigate(item.id);
                  else if (item.status === 'active') onRun(item);
                  else if (item.status === 'deactivated') onActivate(item.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, item.id);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-blue-600/20 group transition-all border border-transparent hover:border-blue-600/30"
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-md transition-transform group-active:scale-95 ${item.type === 'folder' ? 'text-amber-500' : 'text-blue-500'}`}>
                  {item.type === 'folder' ? <Folder size={32} fill="currentColor" fillOpacity={0.2} /> : <AppWindow size={32} fill="currentColor" fillOpacity={0.2} />}
                </div>
                <span className="text-[10px] font-medium text-slate-300 text-center truncate w-full px-1">{item.name}{item.extension ? `.${item.extension}` : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-1 bg-slate-900 border-t border-slate-800 flex justify-between text-[9px] font-medium text-slate-500">
          <span>{items.length} Objekte</span>
          <span>Freier Speicher: 42.8 GB</span>
        </div>
      </div>
    </div>
  );
};

const DesktopIcon: React.FC<{ 
  id: string,
  icon: React.ReactNode, 
  label: string, 
  color: string, 
  position: { x: number, y: number },
  onDragEnd: (id: string, x: number, y: number) => void,
  onClick: () => void 
}> = ({ id, icon, label, color, position, onDragEnd, onClick }) => (
  <motion.div
    drag
    dragMomentum={false}
    onDragEnd={(_, info) => onDragEnd(id, position.x + info.offset.x, position.y + info.offset.y)}
    initial={false}
    animate={{ x: position.x, y: position.y }}
    className="absolute pointer-events-auto"
  >
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex flex-col items-center gap-1 group w-16"
    >
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all active:scale-95`}>
        {icon}
      </div>
      <span className="text-white text-[8px] font-bold uppercase tracking-tighter text-center drop-shadow-lg">{label}</span>
    </button>
  </motion.div>
);

const ContextMenuItem: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void }> = ({ label, icon, onClick }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="w-full px-3 py-1.5 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center gap-3 transition-colors text-[10px] font-bold uppercase tracking-widest"
  >
    <div className="opacity-50 group-hover:opacity-100">{icon}</div>
    {label}
  </button>
);

const StartMenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full p-3 hover:bg-white/5 rounded-lg flex items-center gap-3 transition-colors group"
  >
    <div className="text-slate-500 group-hover:text-blue-400 transition-colors">{icon}</div>
    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{label}</span>
    <ChevronRight size={12} className="ml-auto text-slate-700" />
  </button>
);

const TaskManager: React.FC<{ cpu: CPUState, ram: RAMState, processes: Process[] }> = ({ cpu, ram, processes }) => (
  <div className="p-4 h-full flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPU Performance</span>
          <span className="text-xs font-mono text-blue-400">{cpu.usage.toFixed(1)}%</span>
        </div>
        <div className="flex gap-1 h-12 items-end">
          {cpu.cores.map((c, i) => (
            <div key={i} className="flex-1 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
              <motion.div animate={{ height: `${c}%` }} className="bg-blue-500 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Usage</span>
          <span className="text-xs font-mono text-emerald-400">{Math.round(ram.used)} / {ram.total} MB</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
          <motion.div animate={{ width: `${(ram.used / ram.total) * 100}%` }} className="h-full bg-emerald-500" />
        </div>
        <div className="text-[8px] text-slate-600 uppercase tracking-tighter">DDR4-3200 SIMULATED</div>
      </div>
    </div>

    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      <div className="grid grid-cols-4 p-3 bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>Process</span>
        <span>PID</span>
        <span>CPU</span>
        <span>Memory</span>
      </div>
      <div className="flex-1 overflow-auto">
        {processes.sort((a, b) => b.cpu - a.cpu).map(p => (
          <div key={p.pid} className="grid grid-cols-4 p-3 border-b border-slate-800 text-[10px] font-mono hover:bg-white/5 transition-colors">
            <span className="text-slate-200 truncate">{p.name}</span>
            <span className="text-slate-500">{p.pid}</span>
            <span className="text-blue-400">{p.cpu.toFixed(1)}%</span>
            <span className="text-emerald-400">{Math.round(p.memory)} MB</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SettingsApp: React.FC<{ settings: SystemSettings, onUpdate: (s: SystemSettings) => void }> = ({ settings, onUpdate }) => {
  return (
    <div className="p-8 h-full bg-slate-950 overflow-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="flex items-center gap-6 border-b border-slate-800 pb-8">
          <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl">
            <Settings size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white uppercase tracking-widest">Systemsteuerung</h2>
            <p className="text-slate-500 text-xs uppercase tracking-tighter">Debian-Style Konfiguration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <User size={14} /> Benutzerprofil
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Benutzername</label>
                  <input 
                    type="text" 
                    value={settings.username} 
                    onChange={e => onUpdate({ ...settings, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Passwort ändern</label>
                  <input 
                    type="password" 
                    placeholder="Neues Passwort"
                    onChange={e => onUpdate({ ...settings, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Monitor size={14} /> Erscheinungsbild
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3">Theme</label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'glass'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => onUpdate({ ...settings, theme: t })}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${settings.theme === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Transparenz</span>
                  <input 
                    type="range" 
                    min="50" max="100" 
                    value={settings.transparency} 
                    onChange={e => onUpdate({ ...settings, transparency: parseInt(e.target.value) })}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Blur-Effekt</span>
                  <button 
                    onClick={() => onUpdate({ ...settings, blur: !settings.blur })}
                    className={`w-10 h-5 rounded-full transition-all relative ${settings.blur ? 'bg-blue-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.blur ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Activity size={14} /> System-Verhalten
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Animationen</span>
                  <button 
                    onClick={() => onUpdate({ ...settings, animations: !settings.animations })}
                    className={`w-10 h-5 rounded-full transition-all relative ${settings.animations ? 'bg-blue-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.animations ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Hostname</label>
                  <input 
                    type="text" 
                    value={settings.hostname} 
                    onChange={e => onUpdate({ ...settings, hostname: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <ShieldCheck size={14} /> Kernel Info
              </h3>
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 font-mono text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">VERSION:</span><span className="text-blue-400">Debian-NTFS 1.2.0</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ARCH:</span><span className="text-blue-400">x86_64_WASM</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SECURITY:</span><span className="text-emerald-400">ENCRYPTED</span></div>
                <div className="flex justify-between"><span className="text-slate-500">P2P_PROT:</span><span className="text-amber-400">ACTIVE</span></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const PackageManager: React.FC<{ sharedApps: FileSystemItem[], onDownload: (app: FileSystemItem) => void, nodes: Node[] }> = ({ sharedApps, onDownload, nodes }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-widest">Network Repository</h3>
        <p className="text-[10px] text-slate-500 uppercase">P2P Protocol Active • {nodes.length} Nodes</p>
      </div>
      <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
        <Globe size={24} className="text-blue-500" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3">
      {sharedApps.map(app => (
        <div key={app.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{app.name}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Author: {app.authorId} • {app.size} Bytes</div>
            </div>
          </div>
          <button 
            onClick={() => onDownload(app)} 
            className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-90"
          >
            <Download size={20} />
          </button>
        </div>
      ))}
      {sharedApps.length === 0 && (
        <div className="text-center py-20">
          <Search size={48} className="mx-auto text-slate-800 mb-4" />
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Scanning Network...</p>
        </div>
      )}
    </div>
  </div>
);

const ProgrammerEditor: React.FC<{ onSave: (name: string, code: string) => void }> = ({ onSave }) => {
  const [name, setName] = useState('NewApp');
  const [code, setCode] = useState('// NTFS OS Kernel API v1.0\n\nfunction main() {\n  System.log("Hello from " + System.nodeId);\n  System.notify("App Started", "Successfully executed!");\n}');

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/20 rounded">
            <TerminalIcon size={16} className="text-emerald-500" />
          </div>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none border-b border-transparent focus:border-emerald-500 transition-colors" 
          />
        </div>
        <button 
          onClick={() => onSave(name, code)} 
          className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          Compile & Deploy
        </button>
      </div>
      <textarea 
        value={code} 
        onChange={e => setCode(e.target.value)} 
        className="flex-1 bg-transparent p-6 text-emerald-500 font-mono text-sm focus:outline-none resize-none leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
};

const Terminal: React.FC<{ 
  nodes: Node[], 
  role: NodeRole, 
  location: string, 
  hostname: string,
  username: string,
  fs: FileSystemItem[],
  onExecute: (cmd: string) => string[] | null
}> = ({ nodes, role, location, hostname, username, fs, onExecute }) => {
  const [history, setHistory] = useState<string[]>(['NTFS-OS Terminal v1.0', 'Type "help" for a list of commands.', '']);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim().toLowerCase();
    const newHistory = [...history, `${username}@${hostname}:~$ ${input}`];
    
    const customResult = onExecute(cmd);
    if (customResult) {
      setHistory([...newHistory, ...customResult]);
      setInput('');
      return;
    }

    let result: string[] = [];
    switch (cmd) {
      case 'help':
        result = [
          'Available commands:',
          '  help     - Show this help',
          '  nodes    - List network nodes',
          '  ls       - List files in root',
          '  whoami   - Show current user info',
          '  info     - System information',
          '  ping     - Test network latency',
          '  reboot   - Restart system',
          '  shutdown - Power off',
          '  clear    - Clear terminal'
        ];
        break;
      case 'nodes':
        result = nodes.length > 0 
          ? nodes.map(n => `[${n.role.toUpperCase()}] ${n.id} @ ${n.location}`)
          : ['No nodes detected in local network.'];
        break;
      case 'ls':
        result = fs.filter(f => f.parentId === 'root').map(f => `${f.type === 'folder' ? 'DIR ' : 'FILE'} ${f.name}`);
        break;
      case 'whoami':
        result = [`User: ${username}`, `Host: ${hostname}`, `Role: ${role}`, `Location: ${location}`];
        break;
      case 'info':
        result = ['NTFS-OS v1.0', 'Kernel: NTFS_CORE_X64', 'Architecture: Simulated x86_64'];
        break;
      case 'ping':
        result = [`PING 127.0.0.1: 64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=${(Math.random() * 5).toFixed(2)}ms`];
        break;
      default:
        result = [`Command not found: ${cmd}`];
    }

    setHistory([...newHistory, ...result]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono text-xs p-4 text-emerald-500 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-auto mb-2 custom-scrollbar">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap min-h-[1.2em]">{line}</div>
        ))}
      </div>
      <form onSubmit={handleCommand} className="flex gap-2">
        <span className="text-blue-400">{username}@{hostname}:~$</span>
        <input 
          autoFocus
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-emerald-500"
        />
      </form>
    </div>
  );
};

const Browser: React.FC = () => {
  const [url, setUrl] = useState('ntfs://home.os');
  const [history, setHistory] = useState<string[]>(['ntfs://home.os']);
  const [isLoading, setIsLoading] = useState(false);

  const sites: Record<string, React.ReactNode> = {
    'ntfs://home.os': (
      <div className="p-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-900/40">
            <Globe size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter">NTFS Web Registrar</h1>
          <p className="text-slate-500 uppercase text-[10px] font-bold tracking-[0.3em]">Secure P2P Domain Services</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Eigene Domain</h3>
            <p className="text-xs text-slate-400">Registrieren Sie eine kostenlose .os Domain für Ihre P2P-Dienste. Verschlüsselt und dezentral.</p>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all">Jetzt Registrieren</button>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">DNS Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono"><span className="text-slate-500">ROOT_DNS:</span><span className="text-emerald-500">ONLINE</span></div>
              <div className="flex justify-between text-[10px] font-mono"><span className="text-slate-500">P2P_PEERS:</span><span className="text-blue-500">128 ACTIVE</span></div>
              <div className="flex justify-between text-[10px] font-mono"><span className="text-slate-500">KEY_SYNC:</span><span className="text-amber-500">ROTATING</span></div>
            </div>
          </div>
        </div>
      </div>
    ),
    'ntfs://kernel.info': (
      <div className="p-12 space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4">Kernel Documentation</h2>
        <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
          <p>Das NTFS-OS basiert auf einer Rust-WASM Bridge, die Bare-Metal Syscalls simuliert.</p>
          <div className="bg-black p-4 rounded-xl font-mono text-xs text-emerald-500">
            # Syscall Interface v1.2<br/>
            0x01: SYS_READ_FS<br/>
            0x02: SYS_WRITE_FS<br/>
            0x03: SYS_NET_P2P_SEND
          </div>
          <p>Sicherheit wird durch einen rotierenden RSA-Schlüssel gewährleistet, der bei jedem Paket-Header validiert wird.</p>
        </div>
      </div>
    )
  };

  const navigate = (newUrl: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUrl(newUrl);
      setHistory(prev => [...prev, newUrl]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => history.length > 1 && navigate(history[history.length - 2])} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><ChevronRight size={16} className="rotate-180" /></button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><RefreshCw size={16} /></button>
        </div>
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <ShieldCheck size={14} className="text-emerald-500" />
          <input 
            value={url} 
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate(url)}
            className="bg-transparent text-xs font-mono text-slate-300 w-full outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {sites[url] || (
          <div className="p-20 text-center space-y-4">
            <Search size={64} className="mx-auto text-slate-800" />
            <h3 className="text-lg font-bold text-white uppercase tracking-widest">404 - Not Found</h3>
            <p className="text-xs text-slate-500 uppercase">Domain {url} nicht im DNS-Registrar gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SystemMonitor: React.FC<{ cpu: CPUState, ram: RAMState, processes: Process[], onKill: (pid: number) => void }> = ({ cpu, ram, processes, onKill }) => {
  return (
    <div className="p-6 space-y-8 bg-slate-950 h-full overflow-auto custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CpuIcon className="text-blue-500" size={24} />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">CPU Auslastung</h3>
            </div>
            <span className="text-2xl font-mono text-blue-400">{cpu.usage.toFixed(1)}%</span>
          </div>
          <div className="h-32 flex items-end gap-1">
            {cpu.cores.map((usage, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-800 rounded-t-lg relative overflow-hidden h-24">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${usage}%` }}
                    className="absolute bottom-0 left-0 right-0 bg-blue-600"
                  />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">C{i}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Database className="text-emerald-500" size={24} />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">RAM Belegung</h3>
            </div>
            <span className="text-2xl font-mono text-emerald-400">{Math.round(ram.used)} MB</span>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(ram.used / ram.total) * 100}%` }}
                className="h-full bg-emerald-600"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 MB</span>
              <span>{ram.total} MB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Laufende Prozesse</h3>
          <Activity size={14} className="text-amber-500" />
        </div>
        <div className="p-4 space-y-2">
          {processes.map(p => (
            <div key={p.pid} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-300 uppercase">{p.name}</span>
                  <span className="text-[8px] text-slate-500 font-mono">PID: {p.pid} • {p.memory.toFixed(0)} MB</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-blue-400">{p.cpu.toFixed(1)}% CPU</span>
                {p.pid > 100 && (
                  <button 
                    onClick={() => onKill(p.pid)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const KernelConsole: React.FC = () => {
  const [logs, setLogs] = useState<string[]>(['[Kernel] Initializing Rust-WASM Bridge...', '[Kernel] Mapping memory regions...', '[Kernel] Starting scheduler...']);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim().toLowerCase();
    setLogs(prev => [...prev, `> ${input}`]);
    
    setTimeout(() => {
      let response = '';
      if (cmd === 'help') response = 'Available syscalls: mem_info, thread_list, panic_test, version';
      else if (cmd === 'mem_info') response = 'Memory: 16384MB Total, 2048MB Used, 14336MB Free';
      else if (cmd === 'version') response = 'Kernel v0.1.0-alpha (Rust no_std)';
      else if (cmd === 'panic_test') response = 'KERNEL PANIC: Manual trigger at 0xDEADBEEF';
      else response = `Unknown syscall: ${cmd}`;
      
      setLogs(prev => [...prev, `[Syscall] ${response}`]);
    }, 100);

    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono text-[10px] p-4 text-amber-500 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 text-amber-600 border-b border-amber-900/30 pb-2">
        <Zap size={14} />
        <span className="font-bold uppercase tracking-widest">Bare Metal Rust Console</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto mb-2 custom-scrollbar">
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap min-h-[1.2em]">{line}</div>
        ))}
      </div>
      <form onSubmit={handleCommand} className="flex gap-2">
        <span className="text-amber-700">#</span>
        <input 
          autoFocus
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-amber-500"
        />
      </form>
    </div>
  );
};

const TextEditor: React.FC<{ file?: FileSystemItem, onSave: (content: string) => void }> = ({ file, onSave }) => {
  const [content, setContent] = useState(file?.content || '');
  
  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 font-mono">
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <FileText size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{file?.name || 'Unbenannt'}.txt</span>
        </div>
        <button 
          onClick={() => onSave(content)}
          className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-colors uppercase tracking-widest"
        >
          Speichern
        </button>
      </div>
      <textarea 
        value={content}
        onChange={e => setContent(e.target.value)}
        className="flex-1 bg-transparent p-4 outline-none resize-none text-xs leading-relaxed custom-scrollbar"
        spellCheck={false}
      />
    </div>
  );
};

const MediaPlayer: React.FC<{ fs: FileSystemItem[] }> = ({ fs }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState('Rust Kernel Beats - Track 1');
  const [progress, setProgress] = useState(35);

  const loadFile = () => {
    const audioFiles = fs.filter(f => f.extension === 'mp3' || f.extension === 'wav');
    if (audioFiles.length === 0) {
      alert('Keine Musikdateien im Dateisystem gefunden.');
      return;
    }
    setCurrentTrack(audioFiles[0].name);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 p-8 items-center justify-center gap-8">
      <div className="w-48 h-48 bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-center border border-slate-800 relative overflow-hidden group">
        <Music size={80} className={`${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-700'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">{currentTrack}</h3>
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">NTFS Media Engine v1.0</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          />
        </div>
        <div className="flex items-center justify-center gap-6">
          <button onClick={loadFile} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><Upload size={20} /></button>
          <button className="text-slate-500 hover:text-white transition-colors"><SkipBack size={20} /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          <button className="text-slate-500 hover:text-white transition-colors"><SkipForward size={20} /></button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-slate-600">
        <Volume2 size={14} />
        <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-2/3 h-full bg-slate-600" />
        </div>
      </div>
    </div>
  );
};

const DNSRegistrar: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [ip, setIp] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.includes('.')) {
      alert('Ungültige Domain. Bitte nutzen Sie das Format domain.ntfs');
      return;
    }
    setIsRegistered(true);
  };

  return (
    <div className="p-6 space-y-8 bg-slate-950 h-full overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">DNS Registrar</h3>
          <p className="text-[10px] text-slate-500 uppercase">NTFS-P2P Domain Registry</p>
        </div>
        <div className="p-3 bg-purple-600/10 rounded-xl border border-purple-500/20">
          <Globe size={24} className="text-purple-500" />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Neue Domain registrieren</h4>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Domain Name</label>
            <input 
              type="text" 
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="meine-seite.ntfs"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ziel IP (A-Record)</label>
            <input 
              type="text" 
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-purple-900/40 transition-all"
          >
            Domain registrieren
          </button>
        </form>
      </div>

      {isRegistered && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4"
        >
          <ShieldCheck className="text-emerald-500" size={20} />
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Erfolgreich registriert</p>
            <p className="text-[10px] text-slate-400 font-mono">{domain} &rarr; {ip}</p>
          </div>
        </motion.div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/50 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Meine Domains</h3>
        </div>
        <div className="p-4">
          <p className="text-center text-[10px] text-slate-600 italic">Keine weiteren Domains gefunden.</p>
        </div>
      </div>
    </div>
  );
};

const NetworkManager: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
  const [publicIp, setPublicIp] = useState('Lade...');
  const [localIp, setLocalIp] = useState('192.168.1.42');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setPublicIp(data.ip))
      .catch(() => setPublicIp('8.8.8.8 (Simulated)'));
  }, []);

  return (
    <div className="p-6 space-y-8 bg-slate-950 h-full overflow-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Network Manager</h3>
          <p className="text-[10px] text-slate-500 uppercase">NTFS-P2P Protocol Stack v1.2</p>
        </div>
        <div className="p-3 bg-amber-600/10 rounded-xl border border-amber-500/20">
          <Server size={24} className="text-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">P2P Status</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[8px] font-bold rounded">CONNECTED</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Öffentliche IP</span>
            <span className="text-xs font-mono text-white">{publicIp}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Lokale IP</span>
            <span className="text-xs font-mono text-white">{localIp}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">IPv6</span>
            <span className="text-xs font-mono text-slate-500">fe80::1ff:fe23:4567:890a</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">DNS Resolver</span>
            <span className="text-xs font-mono text-white">ntfs://dns.root</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Key Rotation</span>
            <span className="text-xs font-mono text-amber-500">Every 60s</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/50 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Active Connections</h3>
        </div>
        <div className="p-4 space-y-2">
          {nodes.map(n => (
            <div key={n.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-mono text-slate-300 uppercase">{n.id}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{n.location}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ServerManager: React.FC = () => {
  const [services, setServices] = useState([
    { name: 'Apache2', status: 'stopped', port: 80, icon: <Globe size={16} /> },
    { name: 'MySQL', status: 'stopped', port: 3306, icon: <DbIcon size={16} /> },
    { name: 'DNS Server', status: 'stopped', port: 53, icon: <Server size={16} /> },
    { name: 'FTP Server', status: 'stopped', port: 21, icon: <Share2 size={16} /> },
  ]);

  const toggleService = (name: string) => {
    setServices(prev => prev.map(s => 
      s.name === name ? { ...s, status: s.status === 'running' ? 'stopped' : 'running' } : s
    ));
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 h-full overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Server Manager</h3>
          <p className="text-[10px] text-slate-500 uppercase">NTFS Server Stack v2.0</p>
        </div>
        <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
          <DbIcon size={24} className="text-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {services.map(s => (
          <div key={s.name} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-800/50 transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.status === 'running' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                {s.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">{s.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono">Port: {s.port} • {s.status.toUpperCase()}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleService(s.name)}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                s.status === 'running' 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' 
                  : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              {s.status === 'running' ? 'Stop' : 'Start'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CloudStorage: React.FC<{ fs: FileSystemItem[] }> = ({ fs }) => {
  const [connected, setConnected] = useState(false);
  const cloudFiles = fs.filter(f => f.parentId === 'cloud_drive');

  return (
    <div className="p-6 space-y-6 bg-slate-950 h-full overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Cloud Storage</h3>
          <p className="text-[10px] text-slate-500 uppercase">Hybrid Cloud Integration</p>
        </div>
        <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
          <Cloud size={24} className="text-indigo-500" />
        </div>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-6">
          <Cloud size={64} className="text-slate-800 animate-bounce" />
          <div className="text-center">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Nicht verbunden</h4>
            <p className="text-xs text-slate-500">Verbinden Sie Ihr NTFS-Cloud Konto oder NAS.</p>
          </div>
          <button 
            onClick={() => setConnected(true)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-indigo-900/40 transition-all"
          >
            Cloud verbinden
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Speicherplatz</span>
              <span className="text-xs font-mono text-white">1.2 TB / 5 TB</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <span className="text-xs font-mono text-emerald-500">Synchronisiert</span>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-800/50 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Cloud Dateien</h3>
            </div>
            <div className="p-4">
              {cloudFiles.length === 0 ? (
                <p className="text-center text-xs text-slate-600 py-8 italic">Keine Dateien in der Cloud gefunden.</p>
              ) : (
                <div className="space-y-2">
                  {cloudFiles.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-mono text-slate-300 uppercase">{f.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppRunner: React.FC<{ app: FileSystemItem }> = ({ app }) => {
  const [logs, setLogs] = useState<string[]>(['[System] Initializing execution environment...', `[System] Loading ${app.name}...`]);
  const [isDone, setIsDone] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const run = async () => {
      await new Promise(r => setTimeout(r, 800));
      
      if (app.extension === 'exe') {
        setLogs(prev => [...prev, '[Kernel] PE Header detected.', '[Kernel] Verifying NTFS-Signature...']);
        await new Promise(r => setTimeout(r, 600));
        setLogs(prev => [...prev, '[Kernel] Signature VALID.', '[Kernel] Mapping sections to memory...']);
        await new Promise(r => setTimeout(r, 1000));
      }

      setLogs(prev => [...prev, '[Runtime] main() entry point found.', '[Runtime] Executing code...']);
      
      const lines = (app.content || '').split('\n');
      const localVars: Record<string, any> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        // Variable assignment simulation
        if (trimmed.startsWith('let ') || trimmed.startsWith('var ') || trimmed.startsWith('const ')) {
          const match = trimmed.match(/(?:let|var|const)\s+(\w+)\s*=\s*(.*);?/);
          if (match) {
            const name = match[1];
            let val = match[2].replace(/;$/, '').trim();
            if (val.startsWith('"') || val.startsWith("'")) val = val.replace(/['"]/g, '');
            localVars[name] = val;
            setVariables(prev => ({ ...prev, [name]: val }));
            continue;
          }
        }

        if (trimmed.includes('System.log')) {
          const matches = trimmed.match(/System\.log\((.*)\)/);
          if (matches) {
            let content = matches[1].trim();
            // Resolve variable
            if (localVars[content] !== undefined) content = localVars[content];
            else content = content.replace(/['"]/g, '');

            await new Promise(r => setTimeout(r, 400));
            setLogs(prev => [...prev, `[Output] ${content}`]);
          }
        }

        if (trimmed.includes('System.network.connect')) {
          const matches = trimmed.match(/System\.network\.connect\((.*)\)/);
          if (matches) {
            const target = matches[1].split(',')[0].replace(/['"]/g, '').trim();
            await new Promise(r => setTimeout(r, 600));
            setLogs(prev => [...prev, `[Network] Connecting to ${target} via NTFS-P2P...`]);
            await new Promise(r => setTimeout(r, 1000));
            setLogs(prev => [...prev, `[Network] Connection established with ${target}.`]);
            setLogs(prev => [...prev, `[Network] Sending handshake...`]);
            await new Promise(r => setTimeout(r, 500));
            setLogs(prev => [...prev, `[Network] Received: ACK_READY`]);
          }
        }

        if (trimmed.includes('System.notify')) {
          const matches = trimmed.match(/System\.notify\((.*)\)/);
          if (matches) {
            await new Promise(r => setTimeout(r, 200));
            setLogs(prev => [...prev, `[System] Notification sent: ${matches[1].replace(/['"]/g, '')}`]);
          }
        }
      }
      
      await new Promise(r => setTimeout(r, 600));
      setLogs(prev => [...prev, '[System] Process finished with exit code 0.']);
      setIsDone(true);
    };

    run();
    return () => clearTimeout(timeout);
  }, [app]);

  return (
    <div className="p-6 font-mono text-sm bg-slate-950 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 text-blue-400 border-b border-blue-900/30 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={16} />
          <span className="font-bold uppercase tracking-widest">Runtime Output - {app.name}</span>
        </div>
        {isDone && <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">FINISHED</span>}
      </div>
      <div className="flex-1 overflow-auto space-y-2 custom-scrollbar">
        {logs.map((log, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={i} 
            className={
              log.startsWith('[Output]') ? 'text-emerald-400 font-bold' : 
              log.startsWith('[Network]') ? 'text-amber-400' :
              log.startsWith('[System]') ? 'text-blue-400' : 
              'text-slate-500'
            }
          >
            {log}
          </motion.div>
        ))}
      </div>
      {Object.keys(variables).length > 0 && (
        <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Local Variables</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(variables).map(([k, v]) => (
              <div key={k} className="text-[10px] flex justify-between">
                <span className="text-slate-400">{k}:</span>
                <span className="text-blue-400">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
