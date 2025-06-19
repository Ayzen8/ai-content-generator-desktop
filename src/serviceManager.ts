import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';
import * as path from 'path';
import { EventEmitter } from 'events';

interface Service {
  name: string;
  command: string;
  args: string[];
  autostart: boolean;
  process?: ChildProcess;
  status: 'stopped' | 'running' | 'error';
  logs: string[];
  lastError?: string;
}

// Custom error type for service operations
class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

class ServiceManager extends EventEmitter {
  private store: Store;
  private services: Map<string, Service>;
  private readonly MAX_LOGS = 100;

  constructor() {
    super();
    this.store = new Store();
    this.services = new Map();
    this.loadServices();
  }

  private logServiceOutput(name: string, message: string, isError: boolean = false): void {
    const service = this.services.get(name);
    if (service) {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message.trim()}`;
      
      service.logs.push(logEntry);
      if (service.logs.length > this.MAX_LOGS) {
        service.logs = service.logs.slice(-this.MAX_LOGS);
      }

      this.emit('serviceLogs', name, logEntry, isError);
    }
  }

  private loadServices() {
    const savedServices = this.store.get('services', []) as Omit<Service, 'status' | 'logs'>[];
    savedServices.forEach(service => {
      this.services.set(service.name, {
        ...service,
        status: 'stopped',
        logs: []
      });
    });

    // Start autostart services
    setTimeout(() => {
      this.startAutoStartServices();
    }, 1000);
  }

  private async startAutoStartServices() {
    for (const service of this.services.values()) {
      if (service.autostart && service.status === 'stopped') {
        await this.startService(service.name);
      }
    }
  }

  public getServices(): Service[] {
    return Array.from(this.services.values());
  }

  public getService(name: string): Service | undefined {
    return this.services.get(name);
  }

  public async addService(nameOrData: string | { name: string; command: string; args?: string[]; autostart?: boolean }, command?: string, args: string[] = [], autostart: boolean = false): Promise<boolean> {
    let name: string, finalCommand: string, finalArgs: string[], finalAutostart: boolean;

    if (typeof nameOrData === 'string') {
      name = nameOrData;
      finalCommand = command || '';
      finalArgs = args;
      finalAutostart = autostart;
    } else {
      name = nameOrData.name;
      finalCommand = nameOrData.command;
      finalArgs = nameOrData.args || [];
      finalAutostart = nameOrData.autostart || false;
    }

    if (this.services.has(name)) {
      throw new Error(`Service "${name}" already exists`);
    }

    const newService: Service = {
      name,
      command: finalCommand,
      args: finalArgs,
      autostart: finalAutostart,
      status: 'stopped',
      logs: []
    };

    this.services.set(name, newService);
    this.saveServices();
    this.emit('serviceAdded', name);
    return true;
  }

  public async removeService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }

    if (service.status === 'running') {
      await this.stopService(name);
    }

    this.services.delete(name);
    this.saveServices();
    this.emit('serviceRemoved', name);
    return true;
  }

  public async updateService(name: string, updates: Partial<Omit<Service, 'status' | 'process' | 'logs'>>): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }

    const wasRunning = service.status === 'running';
    if (wasRunning) {
      await this.stopService(name);
    }

    Object.assign(service, updates);
    this.services.set(name, service);
    this.saveServices();

    if (wasRunning) {
      await this.startService(name);
    }

    this.emit('serviceUpdated', name);
    return true;
  }

  public async startService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }

    if (service.status === 'running') {
      return true;
    }

    try {
      const process = spawn(service.command, service.args, {
        shell: true,
        windowsHide: true
      });

      service.process = process;
      service.status = 'running';
      this.emit('serviceStarted', name);

      process.stdout?.on('data', (data) => {        this.logServiceOutput(name, data.toString());
      });

      process.stderr?.on('data', (data) => {
        this.logServiceOutput(name, data.toString(), true);
      });

      process.on('error', (error: Error) => {
        service.status = 'error';
        service.lastError = error.message;
        this.emit('serviceError', name, error);
      });

      process.on('exit', (code) => {
        service.status = 'stopped';
        if (code !== 0) {
          service.lastError = `Process exited with code ${code}`;
          this.emit('serviceError', name, new Error(service.lastError));
        }
        service.process = undefined;
        this.emit('serviceStopped', name);
      });

      return true;    } catch (error) {
      service.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      service.lastError = errorMessage;
      this.emit('serviceError', name, new Error(errorMessage));
      return false;
    }
  }

  public async stopService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service || !service.process) return false;

    try {
      service.process.kill();
      service.status = 'stopped';
      service.process = undefined;
      service.lastError = undefined;
      this.services.set(name, service);      this.emit('serviceStopped', name);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      service.lastError = errorMessage;
      this.logServiceOutput(name, `Failed to stop: ${errorMessage}`, true);
      this.emit('serviceError', name, new Error(errorMessage));
      return false;
    }
  }

  public async startAll(): Promise<void> {
    for (const service of this.services.values()) {
      if (service.status === 'stopped') {
        await this.startService(service.name);
      }
    }
  }

  public async stopAll(): Promise<void> {
    for (const service of this.services.values()) {
      if (service.status === 'running') {
        await this.stopService(service.name);
      }
    }
  }

  private addLog(name: string, message: string): void {
    const service = this.services.get(name);
    if (service) {
      service.logs.push(`[${new Date().toISOString()}] ${message}`);
      if (service.logs.length > this.MAX_LOGS) {
        service.logs.shift();
      }
      this.emit('service-log', { name, message });
    }
  }

  public getLogs(name: string): string[] {
    const service = this.services.get(name);
    return service?.logs || [];
  }

  private saveServices(): void {
    const servicesArray = Array.from(this.services.values()).map(({ process, status, logs, lastError, ...service }) => service);
    this.store.set('services', servicesArray);
  }
}

export const serviceManager = new ServiceManager();
export type { Service };
