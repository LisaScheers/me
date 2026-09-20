import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://bylisa.dev",
  output: "static",
  build: { assets: "personal-site", inlineStylesheets: "never" },
  devToolbar: { enabled: false },
  vite: {
    server: { proxy: { "/api/views": "http://127.0.0.1:8790" } },
    preview: { proxy: { "/api/views": "http://127.0.0.1:8790" } },
  },
});
