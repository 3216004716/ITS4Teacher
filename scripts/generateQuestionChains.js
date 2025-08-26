/**
 * 生成问题链数据的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入原始数据
const rawDataPath = path.resolve(__dirname, '../src/data/analyze_sentiment.json');
const outputPath = path.resolve(__dirname, '../src/data/question_chains.json');

// 简化版的问题链处理逻辑（避免ES6模块导入问题）
const TIME_THRESHOLDS = {
  CHAIN_BREAK: 60,
  CHAIN_CONTINUE: 30,
};

const TOPIC_WEIGHTS = {
  "是何": 1, "如何": 2, "为何": 3, "若何": 4, "其他": 0
};

const BLOOM_WEIGHTS = {
  "记忆": 1, "理解": 2, "应用": 3, "分析": 4, "评价": 5, "创造": 6, "其他": 0
};

function processQuestionChains(questionsData) {
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
      if (currentChain) {
        chains.push(finalizeChain(currentChain));
      }
      
      currentChain = {
        id: chainId++,
        questions: [],
        startTime: question.beginTime,
        endTime: question.endTime || question.beginTime,
        primaryTopic: question.mat || "其他",
        primaryBloomLevel: question.blmType || "其他"
      };
    }
    
    currentChain.questions.push({
      ...question,
      chainIndex: currentChain.questions.length,
      relativeTime: question.beginTime - currentChain.startTime
    });
    
    currentChain.endTime = Math.max(currentChain.endTime, question.endTime || question.beginTime);
    updateChainCharacteristics(currentChain);
  });
  
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

function shouldCreateNewChain(currentQuestion, currentChain, previousQuestion) {
  if (!currentChain || !previousQuestion) {
    return true;
  }
  
  const timeDiff = currentQuestion.beginTime - previousQuestion.beginTime;
  const topicChanged = (currentQuestion.mat || "其他") !== currentChain.primaryTopic;
  
  if (timeDiff > TIME_THRESHOLDS.CHAIN_BREAK) {
    return true;
  }
  
  if (topicChanged && timeDiff > TIME_THRESHOLDS.CHAIN_CONTINUE) {
    return true;
  }
  
  const currentBloomWeight = BLOOM_WEIGHTS[currentQuestion.blmType] || 0;
  const chainBloomWeight = BLOOM_WEIGHTS[currentChain.primaryBloomLevel] || 0;
  
  if (chainBloomWeight >= 4 && currentBloomWeight <= 2 && timeDiff > 20) {
    return true;
  }
  
  return false;
}

function updateChainCharacteristics(chain) {
  const questions = chain.questions;
  
  const topicCounts = {};
  questions.forEach(q => {
    const topic = q.mat || "其他";
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  
  chain.primaryTopic = Object.keys(topicCounts).reduce((a, b) => 
    topicCounts[a] > topicCounts[b] ? a : b
  );
  
  const bloomLevels = questions.map(q => q.blmType || "其他");
  chain.primaryBloomLevel = bloomLevels.reduce((highest, current) => {
    return (BLOOM_WEIGHTS[current] || 0) > (BLOOM_WEIGHTS[highest] || 0) ? current : highest;
  });
}

function finalizeChain(chain) {
  const duration = chain.endTime - chain.startTime;
  const questionCount = chain.questions.length;
  
  const hasAnswers = chain.questions.some(q => q.answered);
  const hasFeedback = chain.questions.some(q => q.comment && q.feedbackType !== "无反馈");
  const avgSentiment = chain.questions.reduce((sum, q) => 
    sum + (q.question_sentiment?.score || 0), 0) / questionCount;
  
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
      intensity: questionCount / Math.max(duration / 60, 1)
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

function analyzeBloomProgression(questions) {
  const bloomSequence = questions.map(q => BLOOM_WEIGHTS[q.blmType] || 0);
  
  let ascending = 0;
  let descending = 0; 
  let stable = 0;
  
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

// 执行数据处理
try {
  console.log('开始处理问题链数据...');
  
  // 读取原始数据
  const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  console.log(`读取了 ${rawData.length} 个问题记录`);
  
  // 处理问题链
  const processedData = processQuestionChains(rawData);
  console.log(`生成了 ${processedData.chains.length} 个问题链`);
  
  // 输出统计信息
  console.log('\n问题链统计:');
  processedData.chains.forEach(chain => {
    console.log(`链 ${chain.id}: ${chain.questionCount}个问题, 时长${chain.duration}秒, 主题: ${chain.primaryTopic}, 层级: ${chain.primaryBloomLevel}`);
  });
  
  // 保存处理后的数据
  fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2), 'utf-8');
  console.log(`\n问题链数据已保存到: ${outputPath}`);
  
} catch (error) {
  console.error('处理失败:', error);
}