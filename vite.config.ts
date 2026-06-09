import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // IMPORTANT: ignore the runtime data file the backend rewrites on every
      // swarm step — otherwise each db.save() triggers a full page reload that
      // remounts React and snaps the UI back to the home view mid-mission.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/nebula-data.json'] },
    },
  };
});
