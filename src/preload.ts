import { contextBridge } from 'electron';
import { serviceManager, Service } from './serviceManager';

// Expose protected electron APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  on: (channel: string, callback: (...args: any[]) => void) => {
    serviceManager.on(channel, (...args) => callback(...args));
  },
  invoke: async (channel: string, ...args: any[]) => {
    switch (channel) {
      case 'getServices':
        return serviceManager.getServices();
      case 'startService':
        return serviceManager.startService(args[0]);
      case 'stopService':
        return serviceManager.stopService(args[0]);
      case 'addService':
        return serviceManager.addService(
          args[0].name,
          args[0].command,
          args[0].args,
          args[0].autostart
        );
      case 'removeService':
        return serviceManager.removeService(args[0]);
      case 'updateService':
        return serviceManager.updateService(args[0], args[1]);
      case 'getLogs':
        return serviceManager.getLogs(args[0]);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
});
