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

// 使用 require 而不是 ES6 import 来 mock
const mockPrismaClient = () => ({
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: () => {},
  author: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0)
  },
  work: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0)
  },
  chapter: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0)
  },
  content: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
    aggregate: () => Promise.resolve({})
  }
});

// Mock modules
jest.doMock('electron', () => mockElectron);
jest.doMock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient
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