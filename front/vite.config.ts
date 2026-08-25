import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O site é servido na raiz do domínio, então a base é '/' em qualquer modo.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { host: true, port: 5273 },
})
