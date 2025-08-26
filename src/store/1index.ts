import { createStore } from 'vuex'
import type { CustomMessageStatus } from '../types'
import chat from './modules/chat'

interface RootState {
  chat: {
    step: number;
  };
  topic: string;
  userInput: string;
  messages: Array<{
    id: string;
    message: string;
    status: CustomMessageStatus;
  }>;
  questionProgress: {
    current: number;
    total: number;
    isCompleted: boolean;
    percent: number;
  };
}

export default createStore({
  modules: {
    chat
  },
  state: {
    topic: '',
    userInput: '',
    messages: [],
    questionProgress: {
      current: 0,
      total: 3,
      isCompleted: false,
      percent: 0
    }
  },
  mutations: {
    SET_TOPIC(state, topic: string) {
      state.topic = topic
    },
    SET_USER_INPUT(state, input: string) {
      state.userInput = input
    },
    ADD_MESSAGE(state, message: { id: string; message: string; status: CustomMessageStatus }) {
      // state.messages.push(message)
    },
    UPDATE_QUESTION_PROGRESS(state, progress: { current: number; total: number; isCompleted: boolean; percent: number }) {
      state.questionProgress = progress
    }
  },
  actions: {
    updateTopic({ commit }, topic: string) {
      commit('SET_TOPIC', topic)
    },
    updateUserInput({ commit }, input: string) {
      commit('SET_USER_INPUT', input)
    },
    addMessage({ commit }, message: { id: string; message: string; status: CustomMessageStatus }) {
      commit('ADD_MESSAGE', message)
    },
    updateQuestionProgress({ commit }, progress: { current: number; total: number; isCompleted: boolean; percent: number }) {
      commit('UPDATE_QUESTION_PROGRESS', progress)
    }
  },
  getters: {
    currentTopic: state => state.topic,
    currentUserInput: state => state.userInput,
    allMessages: state => state.messages,
    questionProgress: state => state.questionProgress
  }
}) 