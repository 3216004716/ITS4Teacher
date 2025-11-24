/**
 * 基于课堂结构生成问题链数据的脚本 (版本2)
 * 使用 class_structure2.json 和 analyze_sentiment2.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 文件路径
const classStructurePath = path.resolve(__dirname, '../src/data/class_structure2.json');
const analyzeSentimentPath = path.resolve(__dirname, '../src/data/analyze_sentiment2.json');
const outputPath = path.resolve(__dirname, '../src/data/structured_question_chains2.json');

// 布鲁姆认知层级权重
const BLOOM_WEIGHTS = {
  '记忆': 1,
  '理解': 2,
  '应用': 3,
  '分析': 4,
  '评价': 5,
  '创造': 6
};

// 问题价值评分算法
function calculateQuestionValue(question) {
  let score = 0;

  // 1. 认知层级得分（权重40%）
  const bloomWeight = BLOOM_WEIGHTS[question.blmType] || 0;
  score += bloomWeight * 0.4;

  // 2. 问题类型得分（权重30%）
  const matTypeScores = {
    '为何': 4, // 为什么问题最能引发思考
    '如何': 3, // 怎么做问题促进应用
    '若何': 3, // 假设问题促进创新
    '是何': 2, // 是什么问题相对基础
    '其他': 1
  };
  score += (matTypeScores[question.mat] || 1) * 0.3;

  // 3. 问题长度得分（权重20%）- 复杂问题通常更有价值
  const questionLength = question.question.length;
  const lengthScore = Math.min(questionLength / 20, 3); // 最高3分
  score += lengthScore * 0.2;

  // 4. 有答案的问题加分（权重10%）
  if (question.answered) {
    score += 1 * 0.1;
  }

  return Math.round(score * 100) / 100; // 保留两位小数
}

// 从教学环节描述中提取核心关键词
function extractCoreKeywords(sectionContent) {
  const keywords = [];

  // 直角三角形相关
  if (sectionContent.includes('直角三角形')) {
    keywords.push('直角三角形', '性质', '边角关系');
  }

  // 勾股定理相关
  if (sectionContent.includes('勾股定理')) {
    keywords.push('勾股定理', '证明', '推理');
  }

  // 应用练习相关
  if (sectionContent.includes('应用') || sectionContent.includes('练习')) {
    keywords.push('应用', '计算', '解题');
  }

  // 回顾总结相关
  if (sectionContent.includes('回顾') || sectionContent.includes('总结')) {
    keywords.push('总结', '归纳', '复习');
  }

  return keywords;
}

// 生成教学环节的核心问题
function generateCoreQuestion(section, questions) {
  const sectionName = section.content;

  // 根据教学环节生成核心问题
  const coreQuestions = {
    '一、回顾与引入新课': '什么是直角三角形，它有什么特殊性质？',
    '二、直角三角形性质探究': '直角三角形的边角关系有什么规律？',
    '1.直角三角形边角关系总结': '直角三角形三边之间有什么数量关系？',
    '2.勾股定理证明': '如何用严格的数学推理证明勾股定理？',
    '三、勾股定理应用练习': '如何运用勾股定理解决实际问题？',
    '四、课堂知识回顾与总结': '本节课学到了哪些重要的数学知识？'
  };

  return coreQuestions[sectionName] || `${sectionName}的核心问题是什么？`;
}

// 筛选高价值问题
function selectHighValueQuestions(questions, minCount = 3, maxCount = 8) {
  // 计算每个问题的价值分数
  const questionsWithScores = questions.map(q => ({
    ...q,
    valueScore: calculateQuestionValue(q)
  }));

  // 按价值分数降序排列
  questionsWithScores.sort((a, b) => b.valueScore - a.valueScore);

  // 确保包含不同认知层级的问题
  const selectedQuestions = [];
  const usedBloomTypes = new Set();
  const usedMatTypes = new Set();

  // 首先选择最高价值的问题
  for (const question of questionsWithScores) {
    if (selectedQuestions.length >= maxCount) break;

    const shouldInclude =
      selectedQuestions.length < minCount || // 必须满足最小数量
      !usedBloomTypes.has(question.blmType) || // 新的认知层级
      !usedMatTypes.has(question.mat) || // 新的问题类型
      question.valueScore > 3; // 或者分数很高

    if (shouldInclude) {
      selectedQuestions.push(question);
      usedBloomTypes.add(question.blmType);
      usedMatTypes.add(question.mat);
    }
  }

  // 如果数量不足，补充剩余的高分问题
  if (selectedQuestions.length < minCount) {
    for (const question of questionsWithScores) {
      if (selectedQuestions.length >= minCount) break;
      if (!selectedQuestions.find(q => q.beginTime === question.beginTime)) {
        selectedQuestions.push(question);
      }
    }
  }

  // 按时间顺序重新排列
  return selectedQuestions.sort((a, b) => a.beginTime - b.beginTime);
}

// 分析布鲁姆层级递进
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
  const progressionRatio = total > 0 ? ascending / total : 0;

  let pattern = '稳定为主';
  if (progressionRatio > 0.6) {
    pattern = '递进为主';
  } else if (descending > ascending && descending / total > 0.4) {
    pattern = '回退为主';
  }

  return {
    pattern,
    ascending,
    descending,
    stable,
    progressionRatio
  };
}

// 处理课堂结构化问题链
function processStructuredQuestionChains(classStructure, questions) {
  const chains = [];
  let chainId = 1;

  // 获取主要教学环节（一级和二级）
  function extractTeachingPhases(node) {
    const phases = [];

    if (node.child) {
      for (const child of node.child) {
        const beginTime = child.beginTime !== undefined ? child.beginTime : 0;

        // 检查是否有子节点且子节点有beginTime（说明是二级标题）
        if (child.child && child.child.length > 0) {
          // 检查子节点是否有带beginTime的（二级标题）
          const subPhasesWithTime = child.child.filter(subChild => subChild.beginTime !== undefined);

          if (subPhasesWithTime.length > 0) {
            // 如果有二级标题，使用二级标题
            subPhasesWithTime.forEach(subChild => {
              phases.push({
                content: subChild.content,
                beginTime: subChild.beginTime
              });
            });
          } else {
            // 如果没有二级标题，使用一级标题
            phases.push({
              content: child.content,
              beginTime: beginTime
            });
          }
        } else {
          // 没有子节点，是叶子节点，使用该节点
          phases.push({
            content: child.content,
            beginTime: beginTime
          });
        }
      }
    }

    return phases;
  }

  const teachingPhases = extractTeachingPhases(classStructure);

  // 为每个教学环节确定结束时间
  for (let i = 0; i < teachingPhases.length; i++) {
    const currentPhase = teachingPhases[i];
    const nextPhase = teachingPhases[i + 1];

    currentPhase.endTime = nextPhase ? nextPhase.beginTime : Math.max(...questions.map(q => q.endTime));
  }

  console.log('识别到的教学环节：');
  teachingPhases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.content} (${phase.beginTime}s - ${phase.endTime}s)`);
  });

  // 为每个教学环节创建问题链
  teachingPhases.forEach(phase => {
    // 筛选属于这个教学环节的问题
    const phaseQuestions = questions.filter(q =>
      q.beginTime >= phase.beginTime && q.beginTime < phase.endTime
    );

    if (phaseQuestions.length === 0) {
      console.log(`跳过教学环节 "${phase.content}"：没有找到相关问题`);
      return;
    }

    // 选择高价值问题
    const selectedQuestions = selectHighValueQuestions(phaseQuestions, 3, 8);

    if (selectedQuestions.length === 0) return;

    // 生成核心问题
    const coreQuestion = generateCoreQuestion(phase, selectedQuestions);

    // 计算统计信息
    const avgSentiment = selectedQuestions.reduce((sum, q) =>
      sum + (q.question_sentiment?.score || 0), 0) / selectedQuestions.length;

    const hasAnswers = selectedQuestions.some(q => q.answered);
    const hasFeedback = selectedQuestions.some(q => q.feedbackType !== '无反馈');

    // 获取主要认知层级
    const bloomCounts = {};
    selectedQuestions.forEach(q => {
      bloomCounts[q.blmType] = (bloomCounts[q.blmType] || 0) + 1;
    });
    const primaryBloomLevel = Object.keys(bloomCounts).reduce((a, b) =>
      bloomCounts[a] > bloomCounts[b] ? a : b);

    // 获取主要话题
    const matCounts = {};
    selectedQuestions.forEach(q => {
      matCounts[q.mat] = (matCounts[q.mat] || 0) + 1;
    });
    const primaryTopic = Object.keys(matCounts).reduce((a, b) =>
      matCounts[a] > matCounts[b] ? a : b);

    // 分析认知递进
    const bloomProgression = analyzeBloomProgression(selectedQuestions);

    // 创建问题链
    const chain = {
      id: chainId++,
      teachingPhase: phase.content,
      coreQuestion: coreQuestion,
      questions: selectedQuestions.map((q, index) => ({
        ...q,
        chainIndex: index,
        relativeTime: q.beginTime - phase.beginTime
      })),
      startTime: selectedQuestions[0].beginTime,
      endTime: selectedQuestions[selectedQuestions.length - 1].endTime,
      primaryTopic: primaryTopic,
      primaryBloomLevel: primaryBloomLevel,
      duration: selectedQuestions[selectedQuestions.length - 1].endTime - selectedQuestions[0].beginTime,
      questionCount: selectedQuestions.length,
      characteristics: {
        hasAnswers,
        hasFeedback,
        avgSentiment,
        sentimentClassification: avgSentiment > 0.6 ? "积极" : avgSentiment < 0.3 ? "消极" : "中性",
        bloomProgression,
        avgValueScore: selectedQuestions.reduce((sum, q) => sum + q.valueScore, 0) / selectedQuestions.length,
        intensity: selectedQuestions.length / ((selectedQuestions[selectedQuestions.length - 1].endTime - selectedQuestions[0].beginTime) / 60) // 每分钟问题数
      },
      timeline: {
        start: selectedQuestions[0].beginTime,
        end: selectedQuestions[selectedQuestions.length - 1].endTime,
        startMinute: Math.floor(selectedQuestions[0].beginTime / 60),
        endMinute: Math.floor(selectedQuestions[selectedQuestions.length - 1].endTime / 60),
        duration: selectedQuestions[selectedQuestions.length - 1].endTime - selectedQuestions[0].beginTime
      }
    };

    chains.push(chain);

    console.log(`教学环节 "${phase.content}": ${selectedQuestions.length}个高价值问题`);
    selectedQuestions.forEach(q => {
      console.log(`  - ${q.question.substring(0, 50)}... (价值分: ${q.valueScore})`);
    });
  });

  return chains;
}

// 主处理函数
try {
  console.log('开始基于课堂结构处理问题链 (版本2)...');

  // 读取数据
  const classStructure = JSON.parse(fs.readFileSync(classStructurePath, 'utf-8'));
  const questions = JSON.parse(fs.readFileSync(analyzeSentimentPath, 'utf-8'));

  console.log(`读取了课堂结构和${questions.length}个问题记录`);

  // 处理结构化问题链
  const chains = processStructuredQuestionChains(classStructure, questions);

  // 生成输出数据
  const result = {
    metadata: {
      totalQuestions: questions.length,
      totalChains: chains.length,
      timeRange: {
        start: Math.min(...questions.map(q => q.beginTime)),
        end: Math.max(...questions.map(q => q.endTime))
      },
      processedAt: new Date().toISOString(),
      processingMethod: 'structured_by_teaching_phases'
    },
    chains: chains
  };

  // 保存结果
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n成功生成${chains.length}个基于教学环节的问题链：`);
  chains.forEach(chain => {
    console.log(`链 ${chain.id}: ${chain.questionCount}个问题, 教学环节: ${chain.teachingPhase}`);
    console.log(`  核心问题: ${chain.coreQuestion}`);
    console.log(`  时长: ${chain.duration}秒, 主要话题: ${chain.primaryTopic}, 认知层级: ${chain.primaryBloomLevel}`);
    console.log(`  平均价值分: ${chain.characteristics.avgValueScore.toFixed(2)}, 认知递进: ${chain.characteristics.bloomProgression.pattern}`);
    console.log('');
  });

  console.log(`结构化问题链数据已保存到: ${outputPath}`);

} catch (error) {
  console.error('处理失败:', error);
}
