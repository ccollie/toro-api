import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactRefresh from '@vitejs/plugin-react-refresh';
import tsConfigPath from 'vite-tsconfig-paths';
import Unocss from 'unocss/vite';
import transformerDirective from '@unocss/transformer-directives';
import { presetUno, presetAttributify, presetMini } from 'unocss';
import presetIcons from '@unocss/preset-icons';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    (process.env.USE_REFRESH === 'true') ? reactRefresh() : react(),
    tsConfigPath(),
    Unocss({
      transformers: [
        transformerDirective(),
      ],
      presets: [
        presetAttributify({ /* preset options */}),
        presetUno(),
        presetIcons({
          // options
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
