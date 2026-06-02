import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api/* → Express backend so we don't hit CORS in development.
    // The frontend calls /api/users, /api/cards, etc.
    // In production the frontend is served from a CDN and talks to the deployed API directly.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
