// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { copyFileSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, resolve } from "path";
var __vite_injected_original_dirname = "/home/project";
function safeCopyPublicDir() {
  return {
    name: "safe-copy-public-dir",
    closeBundle() {
      const publicDir = resolve(__vite_injected_original_dirname, "public");
      const outDir = resolve(__vite_injected_original_dirname, "dist");
      function copyDir(src, dest) {
        try {
          mkdirSync(dest, { recursive: true });
        } catch {
        }
        let entries = [];
        try {
          entries = readdirSync(src);
        } catch {
          return;
        }
        for (const entry of entries) {
          const srcPath = join(src, entry);
          const destPath = join(dest, entry);
          try {
            const stat = statSync(srcPath);
            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          } catch {
          }
        }
      }
      copyDir(publicDir, outDir);
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), safeCopyPublicDir()],
  build: {
    copyPublicDir: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-sentry": ["@sentry/react"]
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBjb3B5RmlsZVN5bmMsIHJlYWRkaXJTeW5jLCBta2RpclN5bmMsIHN0YXRTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuXG5mdW5jdGlvbiBzYWZlQ29weVB1YmxpY0RpcigpOiBpbXBvcnQoJ3ZpdGUnKS5QbHVnaW4ge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdzYWZlLWNvcHktcHVibGljLWRpcicsXG4gICAgY2xvc2VCdW5kbGUoKSB7XG4gICAgICBjb25zdCBwdWJsaWNEaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYycpO1xuICAgICAgY29uc3Qgb3V0RGlyID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdkaXN0Jyk7XG4gICAgICBmdW5jdGlvbiBjb3B5RGlyKHNyYzogc3RyaW5nLCBkZXN0OiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHsgbWtkaXJTeW5jKGRlc3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pOyB9IGNhdGNoIHt9XG4gICAgICAgIGxldCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICB0cnkgeyBlbnRyaWVzID0gcmVhZGRpclN5bmMoc3JjKTsgfSBjYXRjaCB7IHJldHVybjsgfVxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgICBjb25zdCBzcmNQYXRoID0gam9pbihzcmMsIGVudHJ5KTtcbiAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IGpvaW4oZGVzdCwgZW50cnkpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gc3RhdFN5bmMoc3JjUGF0aCk7XG4gICAgICAgICAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGNvcHlEaXIoc3JjUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29weUZpbGVTeW5jKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIHNraXAgaW5hY2Nlc3NpYmxlIGZpbGVzXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb3B5RGlyKHB1YmxpY0Rpciwgb3V0RGlyKTtcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgc2FmZUNvcHlQdWJsaWNEaXIoKV0sXG4gIGJ1aWxkOiB7XG4gICAgY29weVB1YmxpY0RpcjogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgJ3ZlbmRvci1zdXBhYmFzZSc6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgJ3ZlbmRvci1xdWVyeSc6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXG4gICAgICAgICAgJ3ZlbmRvci1zZW50cnknOiBbJ0BzZW50cnkvcmVhY3QnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxjQUFjLGFBQWEsV0FBVyxnQkFBZ0I7QUFDL0QsU0FBUyxNQUFNLGVBQWU7QUFIOUIsSUFBTSxtQ0FBbUM7QUFLekMsU0FBUyxvQkFBMkM7QUFDbEQsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sY0FBYztBQUNaLFlBQU0sWUFBWSxRQUFRLGtDQUFXLFFBQVE7QUFDN0MsWUFBTSxTQUFTLFFBQVEsa0NBQVcsTUFBTTtBQUN4QyxlQUFTLFFBQVEsS0FBYSxNQUFjO0FBQzFDLFlBQUk7QUFBRSxvQkFBVSxNQUFNLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxRQUFHLFFBQVE7QUFBQSxRQUFDO0FBQ3JELFlBQUksVUFBb0IsQ0FBQztBQUN6QixZQUFJO0FBQUUsb0JBQVUsWUFBWSxHQUFHO0FBQUEsUUFBRyxRQUFRO0FBQUU7QUFBQSxRQUFRO0FBQ3BELG1CQUFXLFNBQVMsU0FBUztBQUMzQixnQkFBTSxVQUFVLEtBQUssS0FBSyxLQUFLO0FBQy9CLGdCQUFNLFdBQVcsS0FBSyxNQUFNLEtBQUs7QUFDakMsY0FBSTtBQUNGLGtCQUFNLE9BQU8sU0FBUyxPQUFPO0FBQzdCLGdCQUFJLEtBQUssWUFBWSxHQUFHO0FBQ3RCLHNCQUFRLFNBQVMsUUFBUTtBQUFBLFlBQzNCLE9BQU87QUFDTCwyQkFBYSxTQUFTLFFBQVE7QUFBQSxZQUNoQztBQUFBLFVBQ0YsUUFBUTtBQUFBLFVBRVI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUNBLGNBQVEsV0FBVyxNQUFNO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLGtCQUFrQixDQUFDO0FBQUEsRUFDdEMsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLElBQ2YsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ3pELG1CQUFtQixDQUFDLHVCQUF1QjtBQUFBLFVBQzNDLGdCQUFnQixDQUFDLHVCQUF1QjtBQUFBLFVBQ3hDLGlCQUFpQixDQUFDLGVBQWU7QUFBQSxRQUNuQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
