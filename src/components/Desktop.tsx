import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Monitor, AppWindow, LayoutGrid, Package, Code, Folder, Settings, 
  Server, Globe, User, ShieldAlert, ShieldCheck, Download, Upload, 
  Trash2, Cpu, Database, HardDrive, Activity, Terminal as TerminalIcon, 
  Power, Moon, RefreshCw, Maximize2, Minimize2, Square, Search, 
  ChevronRight, AlertCircle, Info, HelpCircle
} from 'lucide-react';
import { 
  WindowState, FocusTarget, NodeRole, Node, FileSystemItem, 
  CPUState, RAMState, DiskState, Process, PowerState, Dialog, SystemSettings 
} from '../types';

// --- INITIAL FILE SYSTEM ---
const INITIAL_FS: FileSystemItem[] = [
  { id: 'root', name: 'C:', type: 'folder', parentId: null, status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'users', name: 'Users', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'system32', name: 'System32', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'apps', name: 'Apps', type: 'folder', parentId: 'root', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'deactivated', name: 'Deactivated', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'active', name: 'Active', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
  { id: 'shared', name: 'Shared', type: 'folder', parentId: 'apps', status: 'active', size: 0, authorId: 'system', createdAt: Date.now() },
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
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
}> = ({ window, onClose, onFocus, onMinimize, onMaximize, onDragEnd, children }) => {
  if (window.isMinimized) return null;

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
        opacity: 1,
        scale: 1,
        boxShadow: window.isFocused ? '0 25px 50px -12px rgb(0 0 0 / 0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.2)',
        borderColor: window.isFocused ? '#3b82f6' : '#334155'
      }}
      className={`absolute bg-slate-900 border-2 overflow-hidden flex flex-col pointer-events-auto shadow-2xl ${window.isMaximized ? '' : 'rounded-lg'}`}
      onClick={() => onFocus(window.id)}
    >
      <div 
        onPointerDown={(e) => {
          // Custom drag logic or just use dragHandleClassName
        }}
        className={`window-header p-2 flex items-center justify-between cursor-default select-none ${window.isFocused ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
      >
        <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-auto bg-slate-950 text-slate-300">
        {children}
      </div>
    </motion.div>
  );
};

const DialogBox: React.FC<{ dialog: Dialog, onClose: () => void }> = ({ dialog, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-96 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-3 bg-slate-800 flex items-center gap-2 border-b border-slate-700">
          {dialog.type === 'error' && <AlertCircle size={16} className="text-red-500" />}
          {dialog.type === 'info' && <Info size={16} className="text-blue-500" />}
          {dialog.type === 'warning' && <AlertCircle size={16} className="text-amber-500" />}
          {dialog.type === 'confirm' && <HelpCircle size={16} className="text-emerald-500" />}
          <span className="text-xs font-bold text-white uppercase tracking-widest">{dialog.title}</span>
        </div>
        <div className="p-6 text-slate-300 text-sm leading-relaxed">
          {dialog.message}
        </div>
        <div className="p-3 bg-slate-800/50 flex justify-end gap-2">
          {dialog.type === 'confirm' && (
            <button 
              onClick={() => { dialog.onCancel?.(); onClose(); }}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors"
            >
              Abbrechen
            </button>
          )}
          <button 
            onClick={() => { dialog.onConfirm?.(); onClose(); }}
            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
          >
            OK
          </button>
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
      hostname: 'NTFS-NODE'
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
  
  // Dialog System
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [clipboard, setClipboard] = useState<{ itemId: string | null, action: 'copy' | 'cut' | null }>({ itemId: null, action: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);

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

  if (powerState === 'on' && !isLoggedIn) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Blur Circles */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 flex flex-col items-center gap-8"
        >
          <div className="w-24 h-24 bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center text-slate-500 shadow-2xl">
            <User size={48} />
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-1">{role} Node</h2>
            <p className="text-slate-500 text-xs uppercase tracking-tighter">{location}</p>
          </div>

          <div className="w-64 space-y-4">
            <input 
              type="password" 
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setIsLoggedIn(true)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/40"
            >
              Anmelden
            </button>
          </div>
        </motion.div>

        <div className="absolute bottom-8 right-8 flex items-center gap-6 text-slate-500">
          <button onClick={shutdown} className="hover:text-red-500 transition-colors"><Power size={20} /></button>
          <button onClick={sleep} className="hover:text-amber-500 transition-colors"><Moon size={20} /></button>
        </div>
      </div>
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
        onComplete={(r, l, u, h) => {
          setRole(r);
          setLocation(l);
          setSettings(prev => ({ ...prev, username: u, hostname: h }));
          setIsSetup(true);
        }} 
      />
    );
  }

  return (
    <div 
      className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={() => {
        setWindows(prev => prev.map(w => ({ ...w, isFocused: false })));
        setFocusTarget('desktop');
        setIsStartMenuOpen(false);
        setContextMenu(null);
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-5">
        <Monitor size={400} className="text-white" />
        <h1 className="text-9xl font-black text-white uppercase tracking-tighter">NTFS</h1>
      </div>

      {/* Desktop Icons */}
      <div className="absolute top-8 left-8 grid grid-cols-1 gap-6 pointer-events-auto">
        <DesktopIcon icon={<Package size={32} />} label="Store" color="bg-blue-600" onClick={() => openWindow('Paketmanager', 'system')} />
        <DesktopIcon icon={<Code size={32} />} label="IDE" color="bg-emerald-600" onClick={() => openWindow('Programmer Editor', 'system')} />
        <DesktopIcon icon={<HardDrive size={32} />} label="C: Drive" color="bg-amber-600" onClick={() => openWindow('NTFS Explorer', 'system')} />
        <DesktopIcon icon={<Activity size={32} />} label="Tasks" color="bg-red-600" onClick={() => openWindow('Task Manager', 'system')} />
        <DesktopIcon icon={<TerminalIcon size={32} />} label="Terminal" color="bg-slate-700" onClick={() => openWindow('Terminal', 'system')} />
        <DesktopIcon icon={<Settings size={32} />} label="Settings" color="bg-slate-600" onClick={() => openWindow('System Settings', 'system')} />
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-[2000] w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem label="Neu laden" icon={<RefreshCw size={14} />} onClick={() => window.location.reload()} />
            <div className="h-px bg-slate-800 my-1" />
            <ContextMenuItem label="Anpassen" icon={<Settings size={14} />} onClick={() => showDialog('System', 'Anpassungs-Optionen werden in v1.1 verfügbar sein.', 'info')} />
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
          />
        )}
      </AnimatePresence>

      {/* Windows Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {windows.map(w => (
            <Window 
              key={w.id} 
              window={w} 
              onClose={closeWindow} 
              onFocus={focusWindow}
              onMinimize={toggleMinimize}
              onMaximize={toggleMaximize}
              onDragEnd={handleDragEnd}
            >
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
                <TaskManager cpu={cpu} ram={ram} processes={processes} />
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
          <DialogBox key={d.id} dialog={d} onClose={() => setDialogs(prev => prev.filter(x => x.id !== d.id))} />
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
              <StartMenuItem icon={<Package size={16} />} label="App Store" onClick={() => openWindow('Paketmanager', 'system')} />
              <StartMenuItem icon={<HardDrive size={16} />} label="NTFS Explorer" onClick={() => openWindow('NTFS Explorer', 'system')} />
              <StartMenuItem icon={<Code size={16} />} label="IDE Editor" onClick={() => openWindow('Programmer Editor', 'system')} />
              <StartMenuItem icon={<Activity size={16} />} label="Task Manager" onClick={() => openWindow('Task Manager', 'system')} />
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

const SetupWizard: React.FC<{ onComplete: (role: NodeRole, loc: string, user: string, host: string) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<NodeRole>('client');
  const [loc, setLoc] = useState('Berlin, DE');
  const [user, setUser] = useState('User');
  const [host, setHost] = useState('NTFS-NODE');

  const steps = [
    { title: 'Sprache & Region', icon: <Globe size={32} /> },
    { title: 'Netzwerk-Rolle', icon: <Server size={32} /> },
    { title: 'Benutzerkonto', icon: <User size={32} /> },
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
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">USER:</span><span className="text-blue-400">{user}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">HOST:</span><span className="text-blue-400">{host}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ROLE:</span><span className="text-blue-400 uppercase">{role}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">LOC:</span><span className="text-blue-400">{loc}</span></div>
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
              if (step === steps.length - 1) onComplete(role, loc, user, host);
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
  onRun: (item: FileSystemItem) => void
}> = ({ x, y, item, onClose, onCopy, onCut, onDelete, onActivate, onShare, onRun }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[3000] w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {item.type === 'file' && item.status === 'active' && (
        <ContextMenuItem label="Ausführen" icon={<AppWindow size={14} />} onClick={() => { onRun(item); onClose(); }} />
      )}
      {item.type === 'file' && item.status === 'deactivated' && (
        <ContextMenuItem label="Aktivieren" icon={<ShieldCheck size={14} />} onClick={() => { onActivate(item.id); onClose(); }} />
      )}
      <div className="h-px bg-slate-800 my-1" />
      <ContextMenuItem label="Kopieren" icon={<LayoutGrid size={14} />} onClick={() => { onCopy(item.id); onClose(); }} />
      <ContextMenuItem label="Ausschneiden" icon={<LayoutGrid size={14} />} onClick={() => { onCut(item.id); onClose(); }} />
      <div className="h-px bg-slate-800 my-1" />
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
    return getPathString(item.parentId) + ' > ' + item.name;
  };

  return (
    <div 
      className="flex flex-col h-full"
      onContextMenu={(e) => {
        e.preventDefault();
        // Global folder context menu could go here
      }}
      onClick={() => onContextMenu(null as any, '')} // Close context menu on click
    >
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-4">
        <button 
          disabled={currentPath === 'root'}
          onClick={() => currentFolder?.parentId && onNavigate(currentFolder.parentId)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 disabled:opacity-20"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-500 truncate">
          {getPathString(currentPath)}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onPaste(currentPath)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"
            title="Einfügen"
          >
            <Download size={14} />
          </button>
          <Search size={14} className="text-slate-600" />
          <input type="text" placeholder="Suchen..." className="bg-transparent text-[10px] focus:outline-none w-32" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 content-start">
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
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-blue-600/10 group transition-all border border-transparent hover:border-blue-600/20"
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-lg transition-transform group-active:scale-95 ${item.type === 'folder' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-600/20 text-blue-500'}`}>
              {item.type === 'folder' ? <Folder size={24} /> : <AppWindow size={24} />}
            </div>
            <span className="text-[10px] font-bold text-slate-300 text-center truncate w-full px-1">{item.name}{item.extension ? `.${item.extension}` : ''}</span>
          </button>
        ))}
      </div>

      <div className="p-2 bg-slate-900 border-t border-slate-800 flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest">
        <span>{items.length} Elemente</span>
        <span>NTFS v1.0 File System</span>
      </div>
    </div>
  );
};

const DesktopIcon: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex flex-col items-center gap-1 group w-16"
  >
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all active:scale-95`}>
      {icon}
    </div>
    <span className="text-white text-[8px] font-bold uppercase tracking-tighter text-center drop-shadow-lg">{label}</span>
  </button>
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
    <div className="p-8 h-full bg-slate-950 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="flex items-center gap-6 border-b border-slate-800 pb-8">
          <div className="p-4 bg-slate-800 rounded-2xl text-blue-500 shadow-xl">
            <Settings size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white uppercase tracking-widest">Systemsteuerung</h2>
            <p className="text-slate-500 text-xs uppercase tracking-tighter">Konfiguration & Personalisierung</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Personalisierung</h3>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Hostname</label>
                <input 
                  type="text" 
                  value={settings.hostname} 
                  onChange={e => onUpdate({ ...settings, hostname: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">System-Info</h3>
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">OS:</span><span className="text-blue-400">NTFS-OS v1.0</span></div>
              <div className="flex justify-between"><span className="text-slate-500">KERNEL:</span><span className="text-blue-400">NTFS_CORE_X64</span></div>
              <div className="flex justify-between"><span className="text-slate-500">BUILD:</span><span className="text-blue-400">2026.04.06</span></div>
              <div className="flex justify-between"><span className="text-slate-500">UPTIME:</span><span className="text-blue-400">SIMULATED</span></div>
            </div>
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

const AppRunner: React.FC<{ app: FileSystemItem }> = ({ app }) => {
  const [logs, setLogs] = useState<string[]>(['[System] Initializing execution environment...', `[System] Loading ${app.name}...`]);
  const [isDone, setIsDone] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const run = async () => {
      await new Promise(r => setTimeout(r, 800));
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
