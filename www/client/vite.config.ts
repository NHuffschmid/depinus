import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import electron from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron()
  ],
  base: '/',
  server: {
    open: false
  }
})
