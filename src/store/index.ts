// import { createStore } from 'vuex'
import chat from './modules/chat'

// // Vue.use(Vuex)
// export default createStore({
//   modules: {
//     chat
//   }
// })

// store.ts
import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'

// 为 store state 声明类型
export interface State {
  count: number
}

// 定义 injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    count: 0
  },
  modules: {
    chat
  }
})