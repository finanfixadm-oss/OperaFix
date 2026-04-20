import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // Esto permitirá que crm.finanfix.cl entre sin problemas
    host: true,
    port: 5173
  }
})
