// 教研数据服务 - 统一管理从各个可视化组件获取数据的逻辑

import questionClassification from '../data/question_classification.json';

// 数据分析结果接口
export interface ResearchDataAnalysis {
  questionTypes: {
    fourMat: { [key: string]: number };
    threeMat: { [key: string]: number };
    total: number;
  };
  questionChains: {
    totalCount: number;
    averageInterval: number;
    maxInterval: number;
    minInterval: number;
  };
  classStructure: {
    totalDuration: number;
    questionNodes: number;
    distributionPattern: string;
  };
  contextualLevel: {
    contextualizedCount: number;
    contextualizedRate: number;
    nonContextualizedCount: number;
  };
}

// 从question_classification.json获取问题类型分析
export const getQuestionTypeAnalysis = (): ResearchDataAnalysis['questionTypes'] => {
  const fourMatStats: { [key: string]: number } = {};
  const threeMatStats: { [key: string]: number } = { '由何': 0, '又何': 0, '然何': 0, '无': 0 };
  let totalQuestions = 0;

  questionClassification.questions.forEach(q => {
    // 统计四何问题
    if (q.mat) {
      fourMatStats[q.mat] = (fourMatStats[q.mat] || 0) + 1;
      totalQuestions++;
    }
    // 统计三何问题
    if (q.three) {
      threeMatStats[q.three] = (threeMatStats[q.three] || 0) + 1;
    }
  });

  return {
    fourMat: fourMatStats,
    threeMat: threeMatStats,
    total: totalQuestions
  };
};

// 获取问题链分析
export const getQuestionChainAnalysis = (): ResearchDataAnalysis['questionChains'] => {
  const questions = questionClassification.questions;
  const timePoints = questions.map(q => q.beginTime || 0).sort((a, b) => a - b);
  
  let totalInterval = 0;
  const intervals: number[] = [];
  
  for (let i = 1; i < timePoints.length; i++) {
    const interval = timePoints[i] - timePoints[i - 1];
    intervals.push(interval);
    totalInterval += interval;
  }

  return {
    totalCount: questions.length,
    averageInterval: intervals.length > 0 ? Math.round(totalInterval / intervals.length) : 0,
    maxInterval: intervals.length > 0 ? Math.max(...intervals) : 0,
    minInterval: intervals.length > 0 ? Math.min(...intervals) : 0
  };
};

// 获取课堂结构分析
export const getClassStructureAnalysis = (): ResearchDataAnalysis['classStructure'] => {
  const questions = questionClassification.questions;
  const timePoints = questions.map(q => q.beginTime || 0);
  const totalDuration = timePoints.length > 0 ? Math.max(...timePoints) : 0;
  
  // 分析分布模式
  let distributionPattern = '均匀分布';
  if (timePoints.length > 0) {
    const firstHalf = timePoints.filter(t => t <= totalDuration / 2).length;
    const secondHalf = timePoints.filter(t => t > totalDuration / 2).length;
    
    if (firstHalf > secondHalf * 1.5) {
      distributionPattern = '前半段集中';
    } else if (secondHalf > firstHalf * 1.5) {
      distributionPattern = '后半段集中';
    } else {
      distributionPattern = '均匀分布';
    }
  }

  return {
    totalDuration: Math.round(totalDuration / 60), // 转换为分钟
    questionNodes: questions.length,
    distributionPattern
  };
};

// 获取情境化水平分析
export const getContextualAnalysis = (): ResearchDataAnalysis['contextualLevel'] => {
  const questions = questionClassification.questions;
  const contextualizedCount = questions.filter(q => q.three && q.three !== '无').length;
  const nonContextualizedCount = questions.length - contextualizedCount;
  const contextualizedRate = questions.length > 0 
    ? Math.round((contextualizedCount / questions.length) * 100) 
    : 0;

  return {
    contextualizedCount,
    contextualizedRate,
    nonContextualizedCount
  };
};

// 获取完整的数据分析结果
export const getCompleteDataAnalysis = (): ResearchDataAnalysis => {
  return {
    questionTypes: getQuestionTypeAnalysis(),
    questionChains: getQuestionChainAnalysis(),
    classStructure: getClassStructureAnalysis(),
    contextualLevel: getContextualAnalysis()
  };
};

// 生成文本化的分析报告
export const generateDataAnalysisReport = (analysis?: ResearchDataAnalysis): string => {
  const data = analysis || getCompleteDataAnalysis();
  
  const fourMatDesc = Object.entries(data.questionTypes.fourMat)
    .map(([type, count]) => `${type}${count}个`)
    .join('、');
    
  const contextualDesc = `情境化问题${data.contextualLevel.contextualizedCount}个，占比${data.contextualLevel.contextualizedRate}%`;
  
  const chainDesc = `平均提问间隔${data.questionChains.averageInterval}秒`;
  
  const structureDesc = `课堂时长${data.classStructure.totalDuration}分钟，提问节点${data.classStructure.questionNodes}个，呈${data.classStructure.distributionPattern}`;

  return `四何问题分布：${fourMatDesc}；${contextualDesc}；${chainDesc}；${structureDesc}`;
};

// 基于知识缺失类型获取针对性数据分析
export const getTargetedDataAnalysis = (weaknessType: string): string => {
  const data = getCompleteDataAnalysis();
  
  switch (weaknessType) {
    case '陈述性知识':
      return `您的提问类型分析显示：四何问题中${Object.entries(data.questionTypes.fourMat).map(([k, v]) => `${k}${v}个`).join('、')}，总计${data.questionTypes.total}个问题。这反映了您对不同认知层次问题的理论认知情况。`;
    
    case '程序性知识':
      return `从问题链分析看：您的${data.questionChains.totalCount}个问题平均间隔${data.questionChains.averageInterval}秒，最长间隔${data.questionChains.maxInterval}秒，最短${data.questionChains.minInterval}秒。这体现了您在提问操作流程上的特点。`;
    
    case '解释性知识':
      return `课堂结构显示：${data.classStructure.totalDuration}分钟内${data.questionChains.totalCount}个提问节点呈${data.classStructure.distributionPattern}，这背后反映了您对提问时机选择的理解程度。`;
    
    case '条件性知识':
      return `情境化分析表明：${data.contextualLevel.contextualizedCount}个情境化问题（占${data.contextualLevel.contextualizedRate}%），${data.contextualLevel.nonContextualizedCount}个非情境化问题。这显示了您在不同教学情境下的提问选择能力。`;
    
    case '元认知知识':
      return `综合数据显示：您的提问涵盖${Object.keys(data.questionTypes.fourMat).length}种类型，分布模式为${data.classStructure.distributionPattern}，情境化率${data.contextualLevel.contextualizedRate}%。这反映了您对自身提问能力的整体认知水平。`;
    
    default:
      return generateDataAnalysisReport(data);
  }
};

// 为特定步骤生成数据洞察
export const generateStepInsights = (step: number, weaknessType: string): string[] => {
  const data = getCompleteDataAnalysis();
  
  if (step === 2) {
    // 第二步：基于数据分析生成洞察
    const insights: string[] = [];
    
    // 基于四何问题分布的洞察
    const fourMatEntries = Object.entries(data.questionTypes.fourMat);
    const dominantType = fourMatEntries.reduce((prev, current) => 
      (current[1] > prev[1]) ? current : prev
    );
    insights.push(`您的提问以"${dominantType[0]}"为主（${dominantType[1]}个），占比较高`);
    
    // 基于情境化程度的洞察
    if (data.contextualLevel.contextualizedRate < 30) {
      insights.push(`情境化问题比例偏低（${data.contextualLevel.contextualizedRate}%），可能影响学生理解`);
    } else if (data.contextualLevel.contextualizedRate > 70) {
      insights.push(`情境化问题比例很高（${data.contextualLevel.contextualizedRate}%），有利于学生理解`);
    }
    
    // 基于提问节奏的洞察
    if (data.questionChains.averageInterval > 60) {
      insights.push(`提问间隔较长（平均${data.questionChains.averageInterval}秒），节奏相对舒缓`);
    } else if (data.questionChains.averageInterval < 20) {
      insights.push(`提问节奏较快（平均${data.questionChains.averageInterval}秒），可能需要给学生更多思考时间`);
    }
    
    return insights.slice(0, 3); // 返回最多3个洞察
  }
  
  return [];
};