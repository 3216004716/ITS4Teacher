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
// 新增：课堂提问教研相关mutations
export const SET_RESEARCH_ROUND = "SET_RESEARCH_ROUND";
export const SET_IDENTIFIED_WEAKNESS = "SET_IDENTIFIED_WEAKNESS";
export const SET_KEY_INSIGHTS = "SET_KEY_INSIGHTS";
export const SET_FINAL_SOLUTION = "SET_FINAL_SOLUTION";
export const SET_DATA_ANALYSIS_RESULT = "SET_DATA_ANALYSIS_RESULT";
export const SET_LITERATURE_EVIDENCE = "SET_LITERATURE_EVIDENCE";
export const SET_STEP_SUMMARY = "SET_STEP_SUMMARY";
export const RESET_RESEARCH_STATE = "RESET_RESEARCH_STATE";
export const ADVANCE_RESEARCH_ROUND = "ADVANCE_RESEARCH_ROUND";
export const COMPLETE_RESEARCH_STEP = "COMPLETE_RESEARCH_STEP";
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
// 新增：课堂提问教研相关getters
export const GET_RESEARCH_STATE = "GET_RESEARCH_STATE";
export const GET_CURRENT_ROUND = "GET_CURRENT_ROUND";
export const GET_IDENTIFIED_WEAKNESS = "GET_IDENTIFIED_WEAKNESS";
export const GET_KEY_INSIGHTS = "GET_KEY_INSIGHTS";
export const GET_FINAL_SOLUTION = "GET_FINAL_SOLUTION";
export const GET_RESEARCH_GENERATED_CARDS = "GET_RESEARCH_GENERATED_CARDS";
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
  // 新增：课堂提问教研状态
  questioningResearch: {
    currentRound: number;           // 当前轮次 (1-3)
    maxRounds: number;              // 每步最大轮次
    roundsCompleted: number[];      // 各步骤完成轮次数 [0,0,0,0]
    identifiedWeakness: string;     // 诊断出的知识缺失类型
    keyInsights: string[];          // 关键洞察
    finalSolution: string;          // 最终解决方案
    dataAnalysisResult: any;        // 数据分析结果
    literatureEvidence: string[];   // 文献证据
    isAutoMode: boolean;            // 是否开启自动引导模式
    stepSummaries: string[];        // 各步骤总结
  };
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
      // 新增：课堂提问教研状态初始值
      questioningResearch: {
        currentRound: 1,
        maxRounds: 3,
        roundsCompleted: [0, 0, 0, 0],
        identifiedWeakness: '',
        keyInsights: [],
        finalSolution: '',
        dataAnalysisResult: null,
        literatureEvidence: [],
        isAutoMode: true,
        stepSummaries: ['', '', '', ''],
      },
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
    },
    // 新增：课堂提问教研相关mutations
    [SET_RESEARCH_ROUND](state: ChatState, round: number) {
      state.questioningResearch.currentRound = round;
    },
    [SET_IDENTIFIED_WEAKNESS](state: ChatState, weakness: string) {
      state.questioningResearch.identifiedWeakness = weakness;
    },
    [SET_KEY_INSIGHTS](state: ChatState, insights: string[]) {
      state.questioningResearch.keyInsights = insights;
    },
    [SET_FINAL_SOLUTION](state: ChatState, solution: string) {
      state.questioningResearch.finalSolution = solution;
    },
    [SET_DATA_ANALYSIS_RESULT](state: ChatState, result: any) {
      state.questioningResearch.dataAnalysisResult = result;
    },
    [SET_LITERATURE_EVIDENCE](state: ChatState, evidence: string[]) {
      state.questioningResearch.literatureEvidence = evidence;
    },
    [SET_STEP_SUMMARY](state: ChatState, payload: { step: number; summary: string }) {
      state.questioningResearch.stepSummaries[payload.step - 1] = payload.summary;
    },
    [ADVANCE_RESEARCH_ROUND](state: ChatState) {
      if (state.questioningResearch.currentRound < state.questioningResearch.maxRounds) {
        state.questioningResearch.currentRound++;
      }
    },
    [COMPLETE_RESEARCH_STEP](state: ChatState, step: number) {
      state.questioningResearch.roundsCompleted[step - 1] = state.questioningResearch.currentRound;
      state.questioningResearch.currentRound = 1; // 重置轮次
    },
    [RESET_RESEARCH_STATE](state: ChatState) {
      state.questioningResearch = {
        currentRound: 1,
        maxRounds: 3,
        roundsCompleted: [0, 0, 0, 0],
        identifiedWeakness: '',
        keyInsights: [],
        finalSolution: '',
        dataAnalysisResult: null,
        literatureEvidence: [],
        isAutoMode: true,
        stepSummaries: ['', '', '', ''],
      };
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
    },
    // 新增：课堂提问教研相关getters
    [GET_RESEARCH_STATE]: state => state.questioningResearch,
    [GET_CURRENT_ROUND]: state => state.questioningResearch.currentRound,
    [GET_IDENTIFIED_WEAKNESS]: state => state.questioningResearch.identifiedWeakness,
    [GET_KEY_INSIGHTS]: state => state.questioningResearch.keyInsights,
    [GET_FINAL_SOLUTION]: state => state.questioningResearch.finalSolution,
    [GET_RESEARCH_GENERATED_CARDS]: (state, getters, rootState) => () => {
      // 返回最近生成的学习卡片（从全局状态或localStorage获取）
      try {
        // 尝试从localStorage获取学习卡片数据（假设LearningPathView会存储）
        const storedCards = localStorage.getItem('research_learning_cards');
        if (storedCards) {
          const cards = JSON.parse(storedCards);
          return Array.isArray(cards) ? cards : [];
        }
        
        // 如果没有存储的卡片，返回示例卡片
        return [
          {
            id: 1,
            title: "提问层次、认知发展",
            type: "陈述性知识",
            importance: "高",
            content: "课堂教学提问可分为低阶（记忆/理解）和高阶（应用/分析/评价/创造）问题，低阶问题巩固基础，高阶问题促进学生深度思考和认知发展。"
          }
        ];
      } catch (error) {
        console.error('获取学习卡片失败:', error);
        return [];
      }
    }
  }
};

export default chat;