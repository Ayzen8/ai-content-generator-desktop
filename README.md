# AI Content Generator Desktop App

A powerful desktop application built with Electron and TypeScript that provides system tray integration for managing AI content generation services.

## Features

- **System Tray Integration** - Runs in the background with system tray controls
- **Service Management** - Start, stop, and monitor multiple services
- **Windows Startup Integration** - Automatically start with Windows
- **Real-time Status Updates** - Live monitoring of service health
- **Persistent Settings** - Configuration stored using electron-store
- **TypeScript Support** - Full TypeScript implementation for better development experience

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Build TypeScript files:**
```bash
npm run build
```

3. **Start development mode:**
```bash
npm run dev:watch
```

This will start the TypeScript compiler in watch mode, the static file server, and the Electron app.

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch TypeScript files for changes
- `npm run clean` - Remove dist folder
- `npm run rebuild` - Clean and build
- `npm run dev` - Start development mode (build once)
- `npm run dev:watch` - Start development with file watching
- `npm run electron` - Start Electron app
- `npm run electron:dev` - Start Electron in development mode
- `npm run dist` - Create production build and installer

## Building for Production

To create a production build and installer:

```bash
npm run dist
```

This will:
1. Compile TypeScript files
2. Create an Electron app bundle
3. Generate installers in the `release` folder

## Project Structure

```
├── src/                    # TypeScript source files
│   ├── main.ts            # Main Electron process
│   ├── serviceManager.ts  # Service management logic
│   ├── preload.ts         # Preload script
│   └── renderer.ts        # Renderer process
├── frontend/              # React frontend components
│   ├── components/        # React components
│   └── services/          # Frontend services
├── dist/                  # Compiled JavaScript files
├── assets/                # Application assets (icons, etc.)
├── config/                # Configuration files
└── release/               # Built installers
```

## Configuration

The app uses environment variables for configuration:
- `GEMINI_API_KEY` - API key for Gemini AI service

## Usage

1. **System Tray**: The app runs in the system tray. Right-click the tray icon to access controls.
2. **Service Management**: Add, start, stop, and remove services through the tray menu.
3. **Settings**: Access settings through the tray menu to configure services and preferences.
4. **Auto-start**: Enable "Start with Windows" to automatically launch the app on system startup.

## Technologies Used

- **Electron** - Desktop app framework
- **TypeScript** - Type-safe JavaScript
- **React** - Frontend UI framework
- **Node.js** - Backend runtime
- **SQLite** - Local database (planned)
- **Express** - Web server for static files
