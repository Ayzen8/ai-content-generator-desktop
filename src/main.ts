import { app, Tray, Menu, dialog, BrowserWindow, nativeImage, ipcMain, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { serviceManager, Service } from './serviceManager';

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
const store = new Store();

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
    });
  } catch (err) {
    console.log('electron-reload not available');
  }
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  if (process.env.NODE_ENV === 'development') {
    settingsWindow.webContents.openDevTools();
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const services = serviceManager.getServices();
  const serviceMenuItems = services.map(service => ({
    label: service.name,
    submenu: [
      {
        label: service.status === 'running' ? 'Stop' : 'Start',
        click: async () => {
          if (service.status === 'running') {
            await serviceManager.stopService(service.name);
          } else {
            await serviceManager.startService(service.name);
          }
          updateTrayMenu();
        }
      },
      {
        label: 'View Logs',
        click: () => {
          createSettingsWindow();
        }
      }
    ]
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Services',
      submenu: serviceMenuItems.length > 0 ? serviceMenuItems : [{ label: 'No services configured', enabled: false }]
    },
    { type: 'separator' },
    {
      label: 'Start All',
      click: async () => {
        await serviceManager.startAll();
        updateTrayMenu();
      }
    },
    {
      label: 'Stop All',
      click: async () => {
        await serviceManager.stopAll();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: createSettingsWindow
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: getAutoStart(),
      click: (menuItem) => {
        setAutoStart(menuItem.checked);
        showNotification('Startup Setting', 
          menuItem.checked ? 'App will start with Windows' : 'App will not start with Windows');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        await serviceManager.stopAll();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  updateTrayIcon();
}

function updateTrayIcon() {
  if (!tray) return;

  const services = serviceManager.getServices();
  const hasError = services.some(s => s.status === 'error');
  const hasRunning = services.some(s => s.status === 'running');

  let iconPath: string;
  if (hasError) {
    iconPath = path.join(__dirname, '..', 'assets', 'tray-error.png');
  } else if (hasRunning) {
    iconPath = path.join(__dirname, '..', 'assets', 'tray-running.png');
  } else {
    iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  }

  if (fs.existsSync(iconPath)) {
    tray.setImage(iconPath);
  }
}

// IPC handlers
ipcMain.handle('getServices', () => {
  return serviceManager.getServices();
});

ipcMain.handle('startService', (_event, name: string) => {
  return serviceManager.startService(name);
});

ipcMain.handle('stopService', (_event, name: string) => {
  return serviceManager.stopService(name);
});

ipcMain.handle('addService', (_event, data: { name: string; command: string; args: string[]; autostart: boolean }) => {
  return serviceManager.addService(data.name, data.command, data.args, data.autostart);
});

ipcMain.handle('removeService', (_event, name: string) => {
  return serviceManager.removeService(name);
});

ipcMain.handle('updateService', (_event, name: string, updates: any) => {
  return serviceManager.updateService(name, updates);
});

ipcMain.handle('getLogs', (_event, name: string) => {
  return serviceManager.getLogs(name);
});

// Forward service events to renderer
const forwardEvents = [
  'serviceStarted',
  'serviceStopped',
  'serviceError',
  'serviceAdded',
  'serviceRemoved',
  'serviceLogs'
];

forwardEvents.forEach(eventName => {
  serviceManager.on(eventName, (...args) => {
    if (settingsWindow) {
      settingsWindow.webContents.send(eventName, ...args);
    }
  });
});

// Monitor service changes to update the tray menu and show notifications
serviceManager.on('serviceStarted', (name) => {
  updateTrayMenu();
  showNotification('Service Started', `${name} is now running`, 'info');
});
serviceManager.on('serviceStopped', (name) => {
  updateTrayMenu();
  showNotification('Service Stopped', `${name} has been stopped`, 'warning');
});
serviceManager.on('serviceError', (name, error) => {
  updateTrayMenu();
  showNotification('Service Error', `${name}: ${error.message}`, 'error');
});
serviceManager.on('serviceAdded', (name) => {
  updateTrayMenu();
  showNotification('Service Added', `${name} has been added`, 'info');
});
serviceManager.on('serviceRemoved', (name) => {
  updateTrayMenu();
  showNotification('Service Removed', `${name} has been removed`, 'info');
});

app.whenReady().then(() => {
  // Create tray icon
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('AI Content Generator');
  
  // Initial menu setup
  updateTrayMenu();
});

app.on('window-all-closed', () => {
  // Keep app running when all windows are closed
  if (process.platform !== 'darwin') {
    // app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSettingsWindow();
  }
});

// Quit when all windows are closed and tray icon is clicked
app.on('before-quit', async () => {
  await serviceManager.stopAll();
});

// Windows startup integration
function setAutoStart(enable: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true
  });
}

function getAutoStart(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

// Notification system
function showNotification(title: string, body: string, type: 'info' | 'warning' | 'error' = 'info') {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, '..', 'tray.png')
    }).show();
  }
}