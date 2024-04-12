import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

export default defineConfig((mode) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      VueI18nPlugin({
        include: fileURLToPath(new URL('./src/locales/**', import.meta.url)),
        fullInstall: false,
        compositionOnly: true,
      })
    ],
    server: {
      port: env.VITE_APP_PORT,
      hot: true
    },
    resolve: {
      alias: {
        '~bootstrap': fileURLToPath(new URL('./node_modules/bootstrap', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url))
      }
    }
  }
});