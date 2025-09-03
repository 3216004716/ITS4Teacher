<script setup lang="ts">
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick, watch, computed } from "vue";
import HeaderView from "./HeaderView.vue";
// import * as Plot from "@observablehq/plot";
import * as d3 from 'd3';
// import { legend } from "@d3/color-legend"
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
  DISPLAY_ROLE_LOCAL,
  DISPLAY_ROLE_AI,
  REQUEST_ROLE_USER,
  REQUEST_ROLE_ASSISTANT
} from '../utils/const'
import {
  CN_TOPIC_TAGS,
  EN_TOPIC_TAGS,
  PROMPT_STEPS,
  TOPIC_TAGS_COLORS
} from '../utils/topic';
import { hexToRgba } from '../utils/tools';

import { getLessonMinute, length } from '../utils/tools'
import { useStore } from 'vuex';
import { key } from '../store';
import {
  CHAT_VUEX_NAMESPACE,
  GET_CHAT_MESSAGES,
  GET_NEW_DIALOGUE_FLAG,
  GET_VISUALIZATION_DIALOGUES,
  ChatMessageItem,
} from '../store/modules/chat';
import OpenAI from "openai";

// 类型定义
interface LearningCard {
  id: number;
  title: string;
  type: string;
  importance: string;
  content: string;
}

const qMap2 = ref();
const qText = ref();
const qBloom = ref();
const qInteract = ref();
const qDistribution = ref(null);
const efficientA = 0.2
const store = useStore(key);

// 获取store中的数据
const chatMessages = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_CHAT_MESSAGES]);
const newDialogueFlag = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_NEW_DIALOGUE_FLAG]);
const visualizationDialogues = computed(() => store.getters[CHAT_VUEX_NAMESPACE + GET_VISUALIZATION_DIALOGUES]);

// deepseek大模型接口
const ds = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-e18179ecb5ba4eb9b9d07a287dff4edd',
  dangerouslyAllowBrowser: true
});

const state = reactive({
  cardTypes: ["陈述性知识", "程序性知识", "解释性知识", "条件性知识", "元认知知识"],
  // cardColors: ["#264653", "#277370","#2A9D92",  "#8AB17C", "#E7C56B", "#F3A263", "#E47051"],
  cardColors: ["#4E659D", "#8B8CC0", "#B7A8CF", "#E7BDC7", "#FECEA1", "#EFA484", "#B7766C"],
  topicTag: "", // 添加topicTag属性
  learningCards: [
    // {
    //   "id": 6,
    //   "title": "元认知提问、自主学习",
    //   "type": "概念",
    //   "importance": "高",
    //   "content": "元认知提问（如“你用什么方法解决这个问题？”）帮助学生觉察自身思维策略，培养自主学习能力。"
    // },
    // {
    //   "id": 5,
    //   "title": "非言语反馈、鼓励机制",
    //   "type": "实践",
    //   "importance": "中",
    //   "content": "提问后通过眼神接触、点头等非言语反馈传递鼓励，减少学生焦虑，尤其适用于高风险课堂环境（如公开课）。"
    // },
    // {
    //   "id": 4,
    //   "title": "面对错误回答、正面引导",
    //   "type": "实践",
    //   "importance": "高",
    //   "content": "面对学生的错误回答，教师需及时反馈，正面引导，通过追问“你是怎么想的？”暴露思维过程，引导全班共同反思和修正。"
    // },
    // {
    //   "id": 3,
    //   "title": "问题链设计、逻辑递进",
    //   "type": "方法论",
    //   "importance": "高",
    //   "content": "通过设计环环相扣的“问题链”（如“是什么-为什么-怎么做”），引导学生的思维从浅层向深层自然过渡，形成连贯的知识建构。"
    // },
    // {
    //   "id": 2,
    //   "title": "候答时间、学生参与",
    //   "type": "知识点",
    //   "importance": "高",
    //   "content": "教师提问后预留3-5秒“候答时间”，能显著提高学生回答质量和参与度，尤其有利于思维较慢或内向的学生。"
    // },
    {
      "id": 1,
      "title": "提问层次、认知发展",
      "type": "陈述性知识",
      "importance": "高",
      "content": "课堂教学提问可分为低阶（记忆/理解）和高阶（应用/分析/评价/创造）问题，低阶问题巩固基础，高阶问题促进学生深度思考和认知发展。"
    },
  ],

});
const methods = reactive({

});

const recommendedTags = ref([
  "提问设计优化",
  "理答反馈",
  "深度追问策略",
  "提问语言表达优化",
  "提问过程的师生互动",
]);

// 学习路径卡片数据
const learningCards = ref<LearningCard[]>([]);
// 计算正确的ID计数器，基于现有卡片的最大ID
let cardIdCounter = Math.max(...state.learningCards.map(card => card.id), 0) + 1;

// 动画状态
const isAddingCard = ref(false);

// 从可视化对话中提取知识点
const extractVisualizationLearningPoints = async (dialogName: string, messages: ChatMessageItem[]) => {
  try {
    if (!messages || messages.length < 2) {
      console.log(`${dialogName}对话消息不足，跳过知识点提取`);
      return;
    }

    // 获取最后两条消息（用户问题和AI回答）
    const lastUserMsg = messages.slice().reverse().find((msg: ChatMessageItem) => msg.status === DISPLAY_ROLE_LOCAL);
    const lastAiMsg = messages.slice().reverse().find((msg: ChatMessageItem) => msg.status === DISPLAY_ROLE_AI);

    if (!lastUserMsg || !lastAiMsg) {
      console.log(`${dialogName}未找到完整的用户-AI对话对，跳过知识点提取`);
      return;
    }

    console.log(`正在从${dialogName}提取知识点...`, { userMsg: lastUserMsg.content, aiMsg: lastAiMsg.content });

    // 使用AI提取知识点，并包含可视化背景信息
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: REQUEST_ROLE_USER,
          content: `请分析以下关于"${dialogName}"的教师和AI的对话，提取一个关键教学知识点，并按照以下JSON格式组织（不要输出任何其他内容，只返回JSON）:
          {
            "title": "知识点简短标题（20字以内）",
            "type": "从以下类型中选择一个最贴合的：陈述性知识、程序性知识、解释性知识、条件性知识、元认知知识",
            "importance": "高、中或低",
            "content": "提取的关键知识（80字以内，语言精简），来源：${dialogName}分析对话"
          }
          
          对话背景：${dialogName}
          教师问题: ${lastUserMsg.content}
          AI回复: ${lastAiMsg.content}`
        }
      ]
    });

    const jsonStr = completion.choices[0].message.content || '';
    console.log(`${dialogName} AI回复的JSON:`, jsonStr);

    try {
      // 尝试解析JSON
      const startPos = jsonStr.indexOf('{');
      const endPos = jsonStr.lastIndexOf('}') + 1;
      const cleanJson = jsonStr.substring(startPos, endPos);

      const knowledgePoint = JSON.parse(cleanJson) as LearningCard;

      // 添加唯一ID
      knowledgePoint.id = cardIdCounter;

      // 检查是否已存在相似知识点（更严格的去重逻辑）
      const exists = state.learningCards.some(card => {
        const titleSimilarity = card.title.trim() === knowledgePoint.title.trim();
        const contentSimilarity = card.content.trim() === knowledgePoint.content.trim();
        
        // 检查标题前缀相似度（超过10字符时）
        const titlePrefixSimilarity = card.title.length > 10 && knowledgePoint.title.length > 10 && 
          card.title.substring(0, 10) === knowledgePoint.title.substring(0, 10);
        
        // 检查内容相似度（前30个字符）
        const contentPrefixSimilarity = card.content.length > 30 && knowledgePoint.content.length > 30 &&
          card.content.substring(0, 30) === knowledgePoint.content.substring(0, 30);
        
        return titleSimilarity || contentSimilarity || titlePrefixSimilarity || contentPrefixSimilarity;
      });

      if (!exists) {
        // 添加动画效果
        isAddingCard.value = true;

        // 延迟添加卡片以触发过渡动画
        setTimeout(() => {
          state.learningCards.unshift(knowledgePoint); // 添加到开头
          cardIdCounter++; // 添加成功后更新计数器
          console.log(`从${dialogName}添加新知识点`, knowledgePoint);

          // 同时生成新的推荐主题
          generateNewRecommendedTopic(knowledgePoint);

          setTimeout(() => {
            isAddingCard.value = false;
          }, 300);
        }, 100);
      }
    } catch (err) {
      console.error(`${dialogName}解析知识点失败`, err, jsonStr);
    }
  } catch (error) {
    console.error(`${dialogName}提取知识点错误`, error);
  }
};

// 对话知识点提取函数
const extractLearningPoints = async () => {
  try {
    if (!chatMessages.value || chatMessages.value.length < 2) {
      console.log("对话消息不足，跳过知识点提取");
      return;
    }

    // 获取最后两条消息（用户问题和AI回答）
    const messages = chatMessages.value;
    if (messages.length < 2) return;

    const lastUserMsg = messages.slice().reverse().find((msg: ChatMessageItem) => msg.status === DISPLAY_ROLE_LOCAL);
    const lastAiMsg = messages.slice().reverse().find((msg: ChatMessageItem) => msg.status === DISPLAY_ROLE_AI);

    if (!lastUserMsg || !lastAiMsg) {
      console.log("未找到完整的用户-AI对话对，跳过知识点提取");
      return;
    }

    console.log("正在提取知识点...", { userMsg: lastUserMsg.content, aiMsg: lastAiMsg.content });

    // 使用AI提取知识点
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: REQUEST_ROLE_USER,
          content: `请分析以下教师和AI的对话，提取一个关键教学知识点，并按照以下JSON格式组织（不要输出任何其他内容，只返回JSON）:
          {
            "title": "知识点简短标题（20字以内）",
            "type": "从以下类型中选择一个最贴合的：陈述性知识、程序性知识、解释性知识、条件性知识、元认知知识",
            "importance": "高、中或低",
            "content": "提取的关键知识（80字以内，语言精简）"
          }
          
          教师: ${lastUserMsg.content}
          AI回复: ${lastAiMsg.content}`
        }
      ]
    });

    const jsonStr = completion.choices[0].message.content || '';
    console.log("AI回复的JSON:", jsonStr);

    try {
      // 尝试解析JSON
      const startPos = jsonStr.indexOf('{');
      const endPos = jsonStr.lastIndexOf('}') + 1;
      const cleanJson = jsonStr.substring(startPos, endPos);

      const knowledgePoint = JSON.parse(cleanJson) as LearningCard;

      // 添加唯一ID
      knowledgePoint.id = cardIdCounter;

      // 检查是否已存在相似知识点（更严格的去重逻辑）
      const exists = state.learningCards.some(card => {
        const titleSimilarity = card.title.trim() === knowledgePoint.title.trim();
        const contentSimilarity = card.content.trim() === knowledgePoint.content.trim();
        
        // 检查标题前缀相似度（超过10字符时）
        const titlePrefixSimilarity = card.title.length > 10 && knowledgePoint.title.length > 10 && 
          card.title.substring(0, 10) === knowledgePoint.title.substring(0, 10);
        
        // 检查内容相似度（前30个字符）
        const contentPrefixSimilarity = card.content.length > 30 && knowledgePoint.content.length > 30 &&
          card.content.substring(0, 30) === knowledgePoint.content.substring(0, 30);
        
        return titleSimilarity || contentSimilarity || titlePrefixSimilarity || contentPrefixSimilarity;
      });

      if (!exists) {
        // 添加动画效果
        isAddingCard.value = true;

        // 延迟添加卡片以触发过渡动画
        setTimeout(() => {
          state.learningCards.unshift(knowledgePoint); // 添加到开头
          cardIdCounter++; // 添加成功后更新计数器
          console.log("添加新知识点", knowledgePoint);

          // 同时生成新的推荐主题
          generateNewRecommendedTopic(knowledgePoint);

          setTimeout(() => {
            isAddingCard.value = false;
          }, 300);
        }, 100);
      }
    } catch (err) {
      console.error("解析知识点失败", err, jsonStr);
    }
  } catch (error) {
    console.error("提取知识点错误", error);
  }
};

// 生成新的推荐主题
const generateNewRecommendedTopic = async (knowledgePoint: LearningCard) => {
  try {
    const completion = await ds.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: REQUEST_ROLE_USER,
          content: `基于以下教学知识点，生成一个简洁的下一布推荐讨论的话题（10字以内），需要引发教师对于这个教学知识点的深度思考，直接输出主题文本，不需要其他内容：
          知识点：${knowledgePoint.title}
          内容：${knowledgePoint.content}`
        }
      ]
    });

    const newTopic = completion.choices[0].message.content?.trim() || '';
    if (newTopic && !recommendedTags.value.includes(newTopic)) {
      // 添加到推荐主题开头
      recommendedTags.value.unshift(newTopic);

      // 限制推荐主题数量
      if (recommendedTags.value.length > 8) {
        recommendedTags.value = recommendedTags.value.slice(0, 8);
      }

      console.log("添加新推荐主题:", newTopic);
    }
  } catch (error) {
    console.error("生成推荐主题失败", error);
  }
};


const handleTopicChange = (tag: any) => {
  state.topicTag = state.topicTag === tag ? "" : tag;
};

const getTypeStyle = (type: any) => {
  const idx = state.cardTypes.indexOf(type);
  const color = state.cardColors[idx % state.cardColors.length] || '#ccc';
  return {
    color: color,
    border: `1px solid ${hexToRgba(color, 0.3)}`,
    background: 'transparent'
  };
};

onMounted(() => {
  console.log("LearningPathView mounted, 监听新对话通知");
});

// 添加一个Set来跟踪已处理的对话，避免重复提取
const processedDialogues = new Set<string>();

// 监听新对话标志变化
watch(newDialogueFlag, (newValue) => {
  console.log("检测到新对话标志变化:", newValue);
  
  // 当标志变化时，提取主对话的知识点
  extractLearningPoints();
  
  // 延迟检查可视化对话，确保store更新完成
  nextTick(() => {
    Object.entries(visualizationDialogues.value).forEach(([dialogName, dialog]: [string, any]) => {
      if (dialog.messages && dialog.messages.length >= 2) {
        const lastMsg = dialog.messages[dialog.messages.length - 1];
        const secondLastMsg = dialog.messages[dialog.messages.length - 2];
        
        // 创建唯一标识，避免重复处理同一个对话
        const dialogKey = `${dialogName}_${lastMsg.content.substring(0, 20)}_${dialog.messages.length}`;
        
        if (secondLastMsg.status === DISPLAY_ROLE_LOCAL && 
            lastMsg.status === DISPLAY_ROLE_AI && 
            !processedDialogues.has(dialogKey)) {
          
          console.log(`检测到${dialogName}的新对话，准备提取知识点`);
          processedDialogues.add(dialogKey);
          extractVisualizationLearningPoints(dialogName, dialog.messages);
        }
      }
    });
  });
}, { immediate: false });


</script>

<template>
  <HeaderView pageTitle="教学研讨路径" />
  <div class="topic" ref="qMap2">
    <div class="discussed-tags">
      <span class="topic-tag-title">研讨主题</span>
      <div class="learning-cards-container">
        <transition-group name="card-list" tag="div" class="card-transition-group">
          <div v-for="(card, index) in state.learningCards" :key="card.id" class="learning-card" :style="{
            '--card-color': state.cardColors[state.cardTypes.indexOf(card.type) % state.cardColors.length]
          }">
            <div class="card-header">
              <div class="card-id">{{ card.id }}</div>
              <div class="card-title">{{ card.title }}</div>
              <span class="card-type" :style="getTypeStyle(card.type)">{{ card.type }}</span>
            </div>
            <div class="card-content">
              <p>{{ card.content }}</p>
            </div>
          </div>
        </transition-group>
      </div>
    </div>

    <div class="recommended-tags">
      <span class="topic-tag-title">推荐话题</span>
      <transition-group name="tag-list" tag="div" class="tag-transition-group">
        <span v-for="tag in recommendedTags" :key="tag" class="topic-tag" :class="{ active: state.topicTag === tag }"
          :style="{
            color: state.topicTag === tag ? '#ffffff' : '#333',
            borderColor: state.topicTag === tag ? '#1677FF' : '#ccc',
            background: state.topicTag === tag ? '#1677FF' : '#fff',
            borderRadius: '5px'
          }" @click="handleTopicChange(tag)">
          {{ tag }}
        </span>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
/* 卡片列表过渡动画 */
.card-transition-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: scroll;
  scrollbar-width: thin;
  scrollbar-color: #ececec transparent;
  padding-bottom: 0;
  background: #fff;
  justify-content: flex-start;
  position: relative;
  height: fit-content;
}

.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.5s ease;
}

.card-list-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.8);
}

.card-list-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.8);
}

.card-list-move {
  transition: transform 0.5s ease;
}

/* 标签列表过渡动画 */
.tag-transition-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-list-enter-active,
.tag-list-leave-active {
  transition: all 0.4s ease;
}

.tag-list-enter-from {
  opacity: 0;
  transform: translateY(-15px) scale(0.7);
}

.tag-list-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.7);
}

.tag-list-move {
  transition: transform 0.4s ease;
}

.topic {
  height: calc(100% - 32px);
  /* height: 100%; */
  border-left: #d3d3d3 1px solid;
  border-bottom: #d3d3d3 1px solid;
  border-right: #d3d3d3 1px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 8px 0 8px;
  overflow-y: auto;
}

.recommended-tags,
.discussed-tags {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: nowrap;
  font-size: 14px;
  margin-bottom: 10px;
  width: 100%;
  /* padding: 0 20px; */
  /* overflow: auto; */
}

/* 使卡片容器在 discussed-tags 行内占剩余宽度并可滚动 */
.discussed-tags .learning-cards-container {
  flex: 1;
  min-width: 0;
  /* 允许收缩 */
}

.topic-tag-title {
  font-weight: bold;
  padding: 4px 0;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
}

.topic-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  background: #fff;
}

.learning-cards-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  /* margin: 8px 0; */
  overflow-x: scroll;
  scrollbar-width: thin;
  scrollbar-color: #ececec transparent;
  /* Firefox 默认隐藏 */
  padding-bottom: 0;
  background: #fff;
  /* 从左边开始排列（flex 默认已经 flex-start，但显式指定） */
  justify-content: flex-start;
  position: relative;
  /* 为绝对定位滚动条提供参考 */
  height: fit-content;
  /* 高度适应内容 */
}

/* 确保卡片有足够底部间距容纳滚动条 */
.learning-card {
  position: relative;
  min-width: 240px;
  max-width: 300px;
  background: #ffffff;
  border-radius: 12px;
  border: none;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 10px;
  flex: 0 0 auto;
  /* 宽度随内容自适应 */
  margin-bottom: 6px;
  /* 为滚动条预留空间 */
}

.learning-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--card-color);
  border-radius: 12px 0 0 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  font-weight: bold;
  font-size: 10px;
  overflow: hidden;
  /* 防止元素溢出导致布局错乱 */
}

.card-title {
  flex-grow: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  white-space: nowrap;
}

.card-id {
  width: 20px;
  height: 20px;
  background: var(--card-color);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.card-importance {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.9;
  text-align: right;
}

.card-content {
  padding: 0 12px 12px 12px;
  font-size: 10px;
  overflow-y: hidden;

}

.card-content p {
  /* margin: 5px 0; */
  font-size: 10px;
}

.card-content strong {
  font-weight: bold;
  font-size: 10px;
}


.card-type {
  display: inline-block;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  /* 拟态内嵌阴影 */
  box-shadow: inset -1px -1px 2px rgba(255, 255, 255, 0.6), inset 1px 1px 2px rgba(0, 0, 0, 0.05);
  margin-left: auto;
}

.card-type::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}
</style>
