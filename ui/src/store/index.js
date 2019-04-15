import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
      device: null,
      tests: []
  },
  mutations: {
    SET_DEVICE(state, payload) {
      state.device = payload
    },
    SET_TESTS(state, payload) {
      state.tests = payload
    },
  },
  actions: {

  }
})
