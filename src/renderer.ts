import { Service } from './serviceManager';

const electron = (window as any).electron;

// Listen for messages from the main process
electron.on('serviceUpdate', (service: Service) => {
  updateServiceUI(service);
});

electron.on('serviceRemoved', (name: string) => {
  const element = document.querySelector(`[data-service-name="${name}"]`);
  if (element) {
    element.remove();
  }
});

electron.on('serviceLogs', (name: string, log: string) => {
  const element = document.querySelector(`[data-service-name="${name}"] .service-logs`);
  if (element) {
    element.textContent += log + '\n';
    element.scrollTop = element.scrollHeight;
  }
});

// Initialize the UI
document.addEventListener('DOMContentLoaded', async () => {
  // Get all services
  const services = await electron.invoke('getServices') as Service[];
  services.forEach(service => {
    addServiceToUI(service);
  });

  // Handle form submission
  const form = document.getElementById('addServiceForm') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('serviceName') as HTMLInputElement;
    const commandInput = document.getElementById('serviceCommand') as HTMLInputElement;
    const argsInput = document.getElementById('serviceArgs') as HTMLInputElement;
    const autostartInput = document.getElementById('serviceAutostart') as HTMLInputElement;

    try {
      await electron.invoke('addService', {
        name: nameInput.value,
        command: commandInput.value,
        args: argsInput.value.split(',').map(arg => arg.trim()).filter(arg => arg),
        autostart: autostartInput.checked
      });

      form.reset();
    } catch (error) {
      console.error('Failed to add service:', error);
      alert(error instanceof Error ? error.message : 'Failed to add service');
    }
  });
});

function addServiceToUI(service: Service) {
  const template = document.getElementById('serviceTemplate') as HTMLTemplateElement;
  const serviceList = document.getElementById('serviceList');

  const clone = document.importNode(template.content, true);
  const serviceItem = clone.querySelector('.service-item');

  serviceItem?.setAttribute('data-service-name', service.name);
  
  const nameElement = clone.querySelector('.service-name');
  if (nameElement) nameElement.textContent = service.name;

  const commandElement = clone.querySelector('.service-command');
  if (commandElement) commandElement.textContent = service.command;

  const argsElement = clone.querySelector('.service-args');
  if (argsElement) argsElement.textContent = service.args.join(', ');

  const autostartElement = clone.querySelector('.service-autostart');
  if (autostartElement) autostartElement.textContent = service.autostart ? 'Yes' : 'No';

  const statusDot = clone.querySelector('.status-dot');
  if (statusDot) {
    statusDot.className = `status-dot status-${service.status}`;
  }

  // Setup buttons
  const startButton = clone.querySelector('.start-button');
  if (startButton) {
    startButton.addEventListener('click', () => {
      electron.invoke('startService', service.name);
    });
  }

  const stopButton = clone.querySelector('.stop-button');
  if (stopButton) {
    stopButton.addEventListener('click', () => {
      electron.invoke('stopService', service.name);
    });
  }

  const removeButton = clone.querySelector('.remove-button');
  if (removeButton) {
    removeButton.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove ${service.name}?`)) {
        try {
          await electron.invoke('removeService', service.name);
        } catch (error) {
          console.error('Failed to remove service:', error);
          alert(error instanceof Error ? error.message : 'Failed to remove service');
        }
      }
    });
  }

  serviceList?.appendChild(clone);
}

function updateServiceUI(service: Service) {
  const element = document.querySelector(`[data-service-name="${service.name}"]`);
  if (!element) {
    addServiceToUI(service);
    return;
  }

  const statusDot = element.querySelector('.status-dot');
  if (statusDot) {
    statusDot.className = `status-dot status-${service.status}`;
  }

  const commandElement = element.querySelector('.service-command');
  if (commandElement) commandElement.textContent = service.command;

  const argsElement = element.querySelector('.service-args');
  if (argsElement) argsElement.textContent = service.args.join(', ');

  const autostartElement = element.querySelector('.service-autostart');
  if (autostartElement) autostartElement.textContent = service.autostart ? 'Yes' : 'No';
}
