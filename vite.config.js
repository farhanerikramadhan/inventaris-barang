import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            },
            {
              name: 'html5-qrcode',
              test: /[\\/]node_modules[\\/]html5-qrcode[\\/]/,
            },
          ],
        },
      },
    },
  },
})