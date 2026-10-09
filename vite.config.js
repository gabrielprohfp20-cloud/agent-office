import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  // Testes automáticos (npm test): correm num navegador simulado (jsdom)
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
