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
  
  // 优化配置，减少内存占用
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['electron']
  },
  
  // 减少文件监听器的资源占用
  esbuild: {
    target: 'es2020'
  },
  
  build: {
    outDir: mode === 'development' ? '../../dist/renderer' : 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 指定入口 HTML 文件
        main: resolve(__dirname, 'src/ui/index.html')
      }
    },
    // 减少构建时的内存占用
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development' ? true : false,
    // 确保资源路径正确
    assetsDir: 'assets'
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
      port: 3001,
      overlay: false // 减少错误覆盖层，避免阻塞
    },
    // 减少文件监听和缓存，避免过多资源占用
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**']
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