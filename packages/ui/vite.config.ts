import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactRefresh from '@vitejs/plugin-react-refresh';
import tsConfigPath from 'vite-tsconfig-paths';
import Unocss from 'unocss/vite';
import { presetUno, presetAttributify } from 'unocss';
import presetIcons from '@unocss/preset-icons';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    (process.env.USE_REFRESH === 'true') ? reactRefresh() : react(),
    tsConfigPath(),
    Unocss({
      presets: [
        presetAttributify({ /* preset options */}),
        presetUno(),
        presetIcons({
          // options
          prefix: 'i-',
          extraProperties: {
            display: 'inline-block',
            'vertical-align': 'middle',
          }
        }),
      ],
      inspector: true,
    })
  ],
});
