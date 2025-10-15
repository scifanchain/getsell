import 'reflect-metadata';

// 设置测试环境
process.env.NODE_ENV = 'test';

// Mock Electron 模块
const mockElectron = {
  app: {
    whenReady: () => Promise.resolve(),
    on: () => {},
    getPath: () => '/tmp',
    quit: () => {}
  },
  BrowserWindow: function() {
    return {
      loadFile: () => {},
      loadURL: () => {},
      on: () => {},
      once: () => {},
      show: () => {},
      setTitle: () => {},
      minimize: () => {},
      maximize: () => {},
      unmaximize: () => {},
      isMaximized: () => false,
      close: () => {},
      webContents: {
        openDevTools: () => {}
      }
    };
  },
  ipcMain: {
    handle: () => {},
    on: () => {}
  },
  ipcRenderer: {
    invoke: () => Promise.resolve(),
    on: () => {},
    send: () => {}
  }
};

// Mock CR-SQLite
const mockCRSQLiteManager = () => ({
  initialize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  execute: () => Promise.resolve(),
  query: () => Promise.resolve([]),
  transaction: () => Promise.resolve()
});

// Mock modules
jest.doMock('electron', () => mockElectron);
jest.doMock('../src/core/crsqlite-manager', () => ({
  CRSQLiteManager: mockCRSQLiteManager
}));

// 全局测试配置
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // 在测试中静音某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
};