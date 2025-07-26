import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 13011,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: 'http://localhost:13010',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true, // Keep this for dependency warnings
        sassOptions: {
          // Suppress all Sass warnings, including deprecation warnings
          // quiet: true,
          // Alternatively, you can target specific deprecation warnings (more precise)
          quiet: false,
          silenceDeprecations: ['import'], // Suppress only @import deprecation warnings
        },
      },
    },
  },
})
