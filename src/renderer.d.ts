import { Service } from './serviceManager';

interface ElectronAPI {
  on(channel: string, callback: (...args: any[]) => void): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
