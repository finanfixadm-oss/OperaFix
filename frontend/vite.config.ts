import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    host: true,
    port: 5173
  },
  preview: {
    allowedHosts: true,
    host: true,
    port: Number(process.env.PORT) || 5173
  }
})
