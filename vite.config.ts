import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    plugins: [
      tanstackStart({
        server: { entry: "server" },
      }),
      viteReact(),
      tailwindcss(),
      ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
    ],
    define: envDefine,
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
      tsconfigPaths: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
  };
});
