// 课程背景信息抽取服务 - 确保AI回复与实际课程数据相符

import triangle1Data from '../data/triangle1.json';

// 课程信息接口
export interface LessonContextInfo {
  subject: string;           // 学科
  topic: string;            // 主题  
  gradeLevel: string;       // 年级
  duration: number;         // 时长(秒)
  keyContent: string[];     // 关键内容
  teachingFocus: string[];  // 教学重点
  questionContext: string;  // 提问背景
}

// 从triangle1.json抽取课程基本信息
export const extractLessonContext = (): LessonContextInfo => {
  try {
    const data = triangle1Data;
    const duration = data.videoDuration || 0;
    const durationMinutes = Math.round(duration / 60);
    
    // 抽取关键教学内容
    const keyPhrases = [
      '三角形', '直角三角形', '性质', '边角关系', 
      '内角和180度', '两锐角互余', '勾股定理'
    ];
    
    // 从对话内容中识别教学重点
    const teachingContent = data.fullText
      .filter((item: any) => item.role === '1' && item.sentenceContent.length > 10)
      .map((item: any) => item.sentenceContent)
      .slice(0, 20); // 取前20句主要教学内容

    const teachingFocus = [
      '三角形基本性质回顾',
      '直角三角形的特殊性质',
      '角的关系：两锐角互余',
      '边的关系：勾股定理',
      '性质的理解与应用'
    ];

    // 生成提问背景描述
    const questionContext = `本节课是小学数学课，主要教学内容是直角三角形的性质。
课堂时长${durationMinutes}分钟，教师通过复习一般三角形性质，引导学生探索直角三角形的特殊性质，
包括两锐角互余和勾股定理等重要知识点。教学过程注重启发引导，通过问答互动帮助学生理解概念。`;

    return {
      subject: '数学',
      topic: '直角三角形的性质',
      gradeLevel: '小学高年级',
      duration: duration,
      keyContent: keyPhrases,
      teachingFocus: teachingFocus,
      questionContext: questionContext
    };
  } catch (error) {
    console.error('抽取课程背景信息失败:', error);
    // 返回默认信息
    return {
      subject: '数学',
      topic: '直角三角形的性质',
      gradeLevel: '小学',
      duration: 2822,
      keyContent: ['三角形', '直角三角形', '性质'],
      teachingFocus: ['三角形性质', '直角三角形特点'],
      questionContext: '本节课是小学数学课，内容涉及直角三角形的性质学习。'
    };
  }
};

// 生成课程背景的系统提示词
export const generateLessonContextPrompt = (): string => {
  const context = extractLessonContext();
  
  return `

**【课程背景信息】**
- 学科：${context.subject}
- 主题：${context.topic}  
- 年级：${context.gradeLevel}
- 时长：${Math.round(context.duration / 60)}分钟
- 教学重点：${context.teachingFocus.join('、')}

**【分析背景】**
${context.questionContext}

**【重要提醒】**
在分析课堂提问时，必须结合以上课程背景，确保所有分析、建议、案例都与【${context.subject}学科的${context.topic}】主题相关。
不要提及其他学科或无关的教学内容，保持分析的针对性和准确性。`;
};

// 获取与课程相关的提问示例
export const getLessonSpecificQuestions = (): string[] => {
  const context = extractLessonContext();
  
  return [
    `在${context.topic}教学中，如何设计启发性问题？`,
    `这节${context.subject}课的提问策略如何优化？`,
    `${context.subject}学科的提问有什么特殊性？`,
    `如何在${context.topic}教学中提高学生参与度？`,
    `这种${context.gradeLevel}的提问难度是否合适？`
  ];
};

// 检查AI回复是否与课程背景相符
export const validateResponseRelevance = (aiResponse: string): boolean => {
  const context = extractLessonContext();
  
  // 检查是否包含课程相关关键词
  const hasSubjectKeywords = aiResponse.includes(context.subject) || 
                            context.keyContent.some(keyword => aiResponse.includes(keyword));
  
  // 检查是否包含不相关的学科关键词
  const irrelevantSubjects = ['语文', '英语', '历史', '地理', '生物', '化学', '物理', '阅读', '写作'];
  const hasIrrelevantKeywords = irrelevantSubjects.some(subject => 
    aiResponse.includes(subject) && subject !== context.subject
  );
  
  return hasSubjectKeywords && !hasIrrelevantKeywords;
};