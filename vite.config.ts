import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  
  // Electron渲染进程配置
  base: './',
  
  // 开发模式的根目录
  root: mode === 'development' ? 'src/ui' : '.',
  
  build: {
    outDir: mode === 'development' ? '../../dist/renderer' : 'dist/renderer',
    rollupOptions: {
      input: {
        // 生产环境使用安全的HTML模板
        main: resolve(__dirname, 'src/ui/index.html')
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3001
    },
    // 开发环境使用允许unsafe-eval的CSP，用于HMR
    headers: mode === 'development' ? {
      'Content-Security-Policy': `
        default-src 'self' 'unsafe-inline';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob:;
        font-src 'self' data:;
        connect-src 'self' ws: wss: http://localhost:3000 http://localhost:3001;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim()
    } : {}
  },
  
  // 针对Electron的优化
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
}))