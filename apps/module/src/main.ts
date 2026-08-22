import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { supportQueryClient } from './application'
import App from './App.vue'
// Phase 3: host↔module protocol + lifecycle. Keep this call; implementation stays in src/bridge.
import { initBridge } from './bridge'
import { i18n } from './i18n'
import { router } from './router'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient: supportQueryClient })
initBridge()
app.mount('#app')
