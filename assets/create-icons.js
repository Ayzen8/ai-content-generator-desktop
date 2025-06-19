const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function createTrayIcon(color) {
  const size = 16;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  
  // Add border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas.toBuffer();
}

// Create icons for different states
const icons = {
  'tray.png': '#808080',        // Gray - Idle
  'tray-running.png': '#28a745', // Green - Running
  'tray-error.png': '#dc3545'    // Red - Error
};

// Save icons
Object.entries(icons).forEach(([filename, color]) => {
  const buffer = createTrayIcon(color);
  fs.writeFileSync(path.join(__dirname, filename), buffer);
});
