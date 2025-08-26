/**
 * 问题链处理器 - 将原始问题数据分组为逻辑问题链
 */

// 时间阈值配置
const TIME_THRESHOLDS = {
  CHAIN_BREAK: 60, // 超过60秒视为链的断点
  CHAIN_CONTINUE: 30, // 30秒内视为连续问题
};

// 话题权重映射 - 用于判断话题连贯性
const TOPIC_WEIGHTS = {
  "是何": 1,
  "如何": 2, 
  "为何": 3,
  "若何": 4,
  "其他": 0
};

// 布鲁姆认知层级权重 - 用于判断认知递进
const BLOOM_WEIGHTS = {
  "记忆": 1,
  "理解": 2,
  "应用": 3,
  "分析": 4,
  "评价": 5,
  "创造": 6,
  "其他": 0
};

/**
 * 处理问题链分组
 * @param {Array} questionsData - 原始问题数据
 * @returns {Object} 处理后的问题链数据
 */
export function processQuestionChains(questionsData) {
  // 按时间排序
  const sortedQuestions = questionsData
    .filter(q => q.question && q.beginTime !== undefined)
    .sort((a, b) => a.beginTime - b.beginTime);
  
  console.log(`处理 ${sortedQuestions.length} 个问题`);
  
  const chains = [];
  let currentChain = null;
  let chainId = 1;
  
  sortedQuestions.forEach((question, index) => {
    const shouldStartNewChain = shouldCreateNewChain(
      question, 
      currentChain, 
      sortedQuestions[index - 1]
    );
    
    if (shouldStartNewChain || !currentChain) {
      // 开始新的问题链
      if (currentChain) {
        chains.push(finalizeChain(currentChain));
      }
      
      currentChain = {
        id: chainId++,
        questions: [],
        startTime: question.beginTime,
        endTime: question.endTime,
        primaryTopic: question.mat || "其他",
        primaryBloomLevel: question.blmType || "其他"
      };
    }
    
    // 添加问题到当前链
    currentChain.questions.push({
      ...question,
      chainIndex: currentChain.questions.length,
      relativeTime: question.beginTime - currentChain.startTime
    });
    
    // 更新链的结束时间和主要特征
    currentChain.endTime = Math.max(currentChain.endTime, question.endTime || question.beginTime);
    updateChainCharacteristics(currentChain, question);
  });
  
  // 处理最后一个链
  if (currentChain) {
    chains.push(finalizeChain(currentChain));
  }
  
  return {
    metadata: {
      totalQuestions: sortedQuestions.length,
      totalChains: chains.length,
      timeRange: {
        start: Math.min(...sortedQuestions.map(q => q.beginTime)),
        end: Math.max(...sortedQuestions.map(q => q.endTime || q.beginTime))
      },
      processedAt: new Date().toISOString()
    },
    chains: chains
  };
}

/**
 * 判断是否应该创建新的问题链
 */
function shouldCreateNewChain(currentQuestion, currentChain, previousQuestion) {
  if (!currentChain || !previousQuestion) {
    return true;
  }
  
  const timeDiff = currentQuestion.beginTime - previousQuestion.beginTime;
  const topicChanged = (currentQuestion.mat || "其他") !== currentChain.primaryTopic;
  
  // 时间间隔过长，创建新链
  if (timeDiff > TIME_THRESHOLDS.CHAIN_BREAK) {
    return true;
  }
  
  // 话题发生重大转变且时间间隔不算很短
  if (topicChanged && timeDiff > TIME_THRESHOLDS.CHAIN_CONTINUE) {
    return true;
  }
  
  // 认知层级出现大幅跳跃（如从高级思维跳回记忆层级）
  const currentBloomWeight = BLOOM_WEIGHTS[currentQuestion.blmType] || 0;
  const chainBloomWeight = BLOOM_WEIGHTS[currentChain.primaryBloomLevel] || 0;
  
  if (chainBloomWeight >= 4 && currentBloomWeight <= 2 && timeDiff > 20) {
    return true; // 从分析/评价/创造跳回记忆/理解
  }
  
  return false;
}

/**
 * 更新问题链的主要特征
 */
function updateChainCharacteristics(chain, newQuestion) {
  const questions = chain.questions;
  
  // 更新主要话题（选择最频繁的话题）
  const topicCounts = {};
  questions.forEach(q => {
    const topic = q.mat || "其他";
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  
  chain.primaryTopic = Object.keys(topicCounts).reduce((a, b) => 
    topicCounts[a] > topicCounts[b] ? a : b
  );
  
  // 更新主要布鲁姆层级（选择权重最高的）
  const bloomLevels = questions.map(q => q.blmType || "其他");
  chain.primaryBloomLevel = bloomLevels.reduce((highest, current) => {
    return (BLOOM_WEIGHTS[current] || 0) > (BLOOM_WEIGHTS[highest] || 0) ? current : highest;
  });
}

/**
 * 完善问题链信息
 */
function finalizeChain(chain) {
  const duration = chain.endTime - chain.startTime;
  const questionCount = chain.questions.length;
  
  // 计算链的特征
  const hasAnswers = chain.questions.some(q => q.answered);
  const hasFeedback = chain.questions.some(q => q.comment && q.feedbackType !== "无反馈");
  const avgSentiment = chain.questions.reduce((sum, q) => 
    sum + (q.question_sentiment?.score || 0), 0) / questionCount;
  
  // 分析认知递进模式
  const bloomProgression = analyzeBloomProgression(chain.questions);
  
  return {
    ...chain,
    duration: duration,
    questionCount: questionCount,
    characteristics: {
      hasAnswers: hasAnswers,
      hasFeedback: hasFeedback,
      avgSentiment: avgSentiment,
      sentimentClassification: avgSentiment > 0.6 ? "积极" : avgSentiment < 0.3 ? "消极" : "中性",
      bloomProgression: bloomProgression,
      intensity: questionCount / Math.max(duration / 60, 1) // 问题密度（问题数/分钟）
    },
    timeline: {
      start: chain.startTime,
      end: chain.endTime,
      startMinute: Math.floor(chain.startTime / 60),
      endMinute: Math.floor(chain.endTime / 60),
      duration: duration
    }
  };
}

/**
 * 分析布鲁姆认知层级的递进模式
 */
function analyzeBloomProgression(questions) {
  const bloomSequence = questions.map(q => BLOOM_WEIGHTS[q.blmType] || 0);
  
  let ascending = 0; // 递进次数
  let descending = 0; // 回退次数
  let stable = 0; // 稳定次数
  
  for (let i = 1; i < bloomSequence.length; i++) {
    if (bloomSequence[i] > bloomSequence[i-1]) {
      ascending++;
    } else if (bloomSequence[i] < bloomSequence[i-1]) {
      descending++;
    } else {
      stable++;
    }
  }
  
  const total = ascending + descending + stable;
  
  return {
    pattern: ascending > descending ? "递进为主" : 
             descending > ascending ? "回退为主" : "稳定为主",
    ascending: ascending,
    descending: descending,
    stable: stable,
    progressionRatio: total > 0 ? ascending / total : 0
  };
}

/**
 * 获取问题链的颜色主题
 */
export function getChainColorTheme(chain) {
  const topicColors = {
    "是何": "#FFAA64",
    "如何": "#FF6B6B", 
    "为何": "#45B7D1",
    "若何": "#FFBE0B",
    "其他": "#A882DD"
  };
  
  const baseColor = topicColors[chain.primaryTopic] || topicColors["其他"];
  
  // 根据情感倾向调整颜色饱和度
  const sentiment = chain.characteristics.avgSentiment;
  let opacity = 0.7;
  
  if (sentiment > 0.7) {
    opacity = 1.0; // 积极情感，高饱和度
  } else if (sentiment < 0.3) {
    opacity = 0.5; // 消极情感，低饱和度
  }
  
  return {
    primary: baseColor,
    withOpacity: baseColor + Math.floor(opacity * 255).toString(16).padStart(2, '0'),
    light: baseColor + '40',
    dark: adjustBrightness(baseColor, -20)
  };
}

/**
 * 调整颜色亮度
 */
function adjustBrightness(hex, amount) {
  const usePound = hex[0] === "#";
  const col = hex.slice(usePound ? 1 : 0);
  const num = parseInt(col, 16);
  
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}