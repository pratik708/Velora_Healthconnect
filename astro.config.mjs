// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://pratik708.github.io",
  base: "/Velora_Healthconnect",
  compressHTML: true,
  build: {
    assets: "assets",
  },
  integrations: [react({ experimentalReactChildren: true }), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: "lightningcss",
      rollupOptions: {
        output: {
          entryFileNames(chunk) {
            const name = chunk.name
              .replace(/\.astro_astro_type_script_index_\d+_lang$/, "")
              .replace(/\.astro$/, "");
            return `assets/${name}.[hash].js`;
          },
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash][extname]",
        },
      },
    },
  },
  image: {
    layout: "constrained",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  experimental: {
    svgo: true,
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Outfit",
        cssVariable: "--font-outfit",
      },
      {
        provider: fontProviders.google(),
        name: "DM Sans",
        cssVariable: "--font-dm-sans",
      },
    ],
  },
});
