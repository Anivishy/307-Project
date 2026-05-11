import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/profile': 'http://localhost:3000',
      '/ingredients': 'http://localhost:3000',
      '/generation': 'http://localhost:3000',
    },
  },
})
