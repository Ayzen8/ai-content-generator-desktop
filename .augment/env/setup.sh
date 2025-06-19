#!/bin/bash
set -e

# Update package lists
sudo apt-get update

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials for native modules (sqlite3, etc.)
sudo apt-get install -y build-essential python3 python3-pip

# Install additional dependencies for Electron
sudo apt-get install -y libnss3-dev libatk-bridge2.0-dev libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2-dev

# Verify Node.js and npm installation
node --version
npm --version

# Navigate to workspace
cd /mnt/persist/workspace

# Install project dependencies
npm install

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "GEMINI_API_KEY=test_key_for_setup" >> .env
fi

# Create data directory for SQLite database
mkdir -p data

# Build TypeScript files
npm run build:ts

# Build React frontend
npm run build:react

# Add npm global bin to PATH
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> $HOME/.profile
echo 'export PATH="/usr/bin:$PATH"' >> $HOME/.profile

# Source the profile to make changes available
source $HOME/.profile

echo "Setup completed successfully!"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Project dependencies installed"
echo "TypeScript and React builds completed"