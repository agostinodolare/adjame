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
    build: {
      rolldownOptions: {
        output: {
          // Découpe les bibliothèques lourdes en chunks séparés : elles sont
          // mises en cache indépendamment du code métier et ne gonflent plus
          // le chunk de chaque page.
          codeSplitting: {
            groups: [
              { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
              { name: "tanstack", test: /node_modules[\\/]@tanstack[\\/]/ },
              { name: "radix", test: /node_modules[\\/]@radix-ui[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
    },
  };
});
