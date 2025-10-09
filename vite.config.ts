import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // Electron渲染进程配置
  base: './',
  
  build: {
    outDir: 'dist-web',
    rollupOptions: {
      input: {
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
    hmr: {
      port: 3001
    }
  },
  
  // 针对Electron的优化
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})