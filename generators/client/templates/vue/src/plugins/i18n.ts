import { createI18n } from 'vue-i18n'
import { App } from 'vue'
import messages from '@intlify/unplugin-vue-i18n/messages'
export default (app: App) => {
  const i18n = createI18n({
    locale: 'en-EN',
    messages,
  })
  app.use(i18n)
}
