// vuex-shim.d.ts

import { ComponentCustomProperties } from 'vue'
import { Store } from 'vuex'

declare module 'vue' {
  // 声明自己的 store state
  interface State {
    count: number
  }

  interface ComponentCustomProperties {
    $store: Store<State>
  }
}