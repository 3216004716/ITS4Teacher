import { message } from 'ant-design-vue';
// import axios from 'axios'
// import moment from 'moment'
// import { PRACTICE, INPUT_INFO, SAVE_GAZE_DATA, CLICK_NODE, EXPERIMENT } from '../../const'
import { Module } from 'vuex';

export const CHAT_VUEX_NAMESPACE = "chat/";

/** MUTATION CONST */
// export const SET_PARTICIPANT_INFO = "SET_PARTICIPANT_INFO";
export const SET_CHAT_STEP = "SET_CHAT_STEP";
export const SET_TOPIC_TAG = "SET_TOPIC_TAG";
export const ADD_CHAT_MESSAGE = "ADD_CHAT_MESSAGE";
export const NOTIFY_NEW_DIALOGUE = "NOTIFY_NEW_DIALOGUE"; // 新增：通知有新对话
export const ADD_VISUALIZATION_CHAT_MESSAGE = "ADD_VISUALIZATION_CHAT_MESSAGE";
export const SET_CURRENT_VISUALIZATION_DIALOG = "SET_CURRENT_VISUALIZATION_DIALOG";
export const INIT_VISUALIZATION_DIALOG = "INIT_VISUALIZATION_DIALOG";
// export const INIT_WEBSOCKET = 'INIT_WEBSOCKET'
// export const SEND_WEBSOCKET = 'SEND_WEBSOCKET'
// export const SEND_SAVE_DATA = 'SEND_SAVE_DATA'
// export const SEND_CLICK_PATH = 'SEND_CLICK_PATH'

/** ACTION CONST */

/** GETTER CONST */
export const GET_CHAT_STEP = "GET_CHAT_STEP";
export const GET_TOPIC_TAG = "GET_TOPIC_TAG";
export const GET_CHAT_MESSAGES = "GET_CHAT_MESSAGES";
export const GET_NEW_DIALOGUE_FLAG = "GET_NEW_DIALOGUE_FLAG"; // 新增：获取新对话标志
export const GET_VISUALIZATION_DIALOGUES = "GET_VISUALIZATION_DIALOGUES";
export const GET_CURRENT_VISUALIZATION_DIALOG = "GET_CURRENT_VISUALIZATION_DIALOG";
export const GET_VISUALIZATION_DIALOG_MESSAGES = "GET_VISUALIZATION_DIALOG_MESSAGES";
/** WEBSOCKET CONST */
// export const EYE_TRACKER_READY = 'EYE_TRACKER_READY'

export interface VisualizationDialog {
  id: string;
  name: string;
  messages: ChatMessageItem[];
  createdAt: Date;
  lastActiveAt: Date;
}

export interface ChatState {
  chatIndex: number;
  step: number;
  topicTag: string | null;
  chatMessagesList: any[];
  newDialogueFlag: boolean; // 新增：新对话标志
  visualizationDialogues: { [key: string]: VisualizationDialog };
  currentVisualizationDialog: string | null;
}

export interface ChatMessageItem {
  id: string;
  content: string;
  status: string;
  // role?: string;
}

const chat: Module<ChatState, any> = {
  namespaced: true,
  state() {
    return {
      chatIndex: 0,
      step: 1,
      topicTag: null,
      chatMessagesList: [
        // {
        //   id: "1",
        //   content: "你好呀",
        //   status: "local"
        // },
        // {
        //   id: "2",
        //   content: "你好！😊 很高兴见到你～有什么我可以帮你的吗？",
        //   status: "ai"
        // },
      ] as ChatMessageItem[],
      chatInput: '',
      newDialogueFlag: false, // 新增：新对话标志初始值
      visualizationDialogues: {},
      currentVisualizationDialog: null,
    }
  },
  mutations: {
    [SET_CHAT_STEP](state, step: number) {
      state.step = step;
    },
    [SET_TOPIC_TAG](state, topicTag: string) {
      state.topicTag = topicTag;
    },
    [ADD_CHAT_MESSAGE](state: ChatState, payload: { message: string; status: string }) {
      let temp = {
        id: String(state.chatIndex++),
        content: payload.message,
        status: payload.status
      }
      state.chatMessagesList.push(temp);
    },
    [NOTIFY_NEW_DIALOGUE](state: ChatState) {
      // 翻转标志，触发watcher
      state.newDialogueFlag = !state.newDialogueFlag;
    },
    [INIT_VISUALIZATION_DIALOG](state: ChatState, dialogName: string) {
      if (!state.visualizationDialogues[dialogName]) {
        state.visualizationDialogues[dialogName] = {
          id: dialogName + '_' + Date.now(),
          name: dialogName,
          messages: [],
          createdAt: new Date(),
          lastActiveAt: new Date()
        };
      }
      state.currentVisualizationDialog = dialogName;
    },
    [SET_CURRENT_VISUALIZATION_DIALOG](state: ChatState, dialogName: string) {
      state.currentVisualizationDialog = dialogName;
      if (state.visualizationDialogues[dialogName]) {
        state.visualizationDialogues[dialogName].lastActiveAt = new Date();
      }
    },
    [ADD_VISUALIZATION_CHAT_MESSAGE](state: ChatState, payload: { dialogName: string; message: string; status: string }) {
      if (!state.visualizationDialogues[payload.dialogName]) {
        // 如果对话不存在，先创建
        state.visualizationDialogues[payload.dialogName] = {
          id: payload.dialogName + '_' + Date.now(),
          name: payload.dialogName,
          messages: [],
          createdAt: new Date(),
          lastActiveAt: new Date()
        };
      }
      
      const dialog = state.visualizationDialogues[payload.dialogName];
      dialog.messages.push({
        id: String(dialog.messages.length),
        content: payload.message,
        status: payload.status
      });
      dialog.lastActiveAt = new Date();
    }
  },
  actions: {

  },
  getters: {
    [GET_CHAT_STEP]: state => state.step,
    [GET_TOPIC_TAG]: state => state.topicTag,
    [GET_CHAT_MESSAGES]: state => state.chatMessagesList,
    [GET_NEW_DIALOGUE_FLAG]: state => state.newDialogueFlag,
    [GET_VISUALIZATION_DIALOGUES]: state => state.visualizationDialogues,
    [GET_CURRENT_VISUALIZATION_DIALOG]: state => state.currentVisualizationDialog,
    [GET_VISUALIZATION_DIALOG_MESSAGES]: (state) => (dialogName: string) => {
      return state.visualizationDialogues[dialogName]?.messages || [];
    }
  }
};

export default chat;