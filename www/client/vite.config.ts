import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import electron from 'vite-plugin-electron-renderer';
import midi2musicxmlPkg from './src/modules/midi2musicxml/package.json';

export default defineConfig({
  plugins: [
    react(),
    electron()
  ],
  base: '/',
  server: {
    open: false
  },
  define: {
    __MIDI2MUSICXML_VERSION__: JSON.stringify(midi2musicxmlPkg.version)
  },
  optimizeDeps: {
    include: ['@spotify/basic-pitch', '@tensorflow/tfjs', '@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl', '@tensorflow/tfjs-backend-cpu']
  }
})
