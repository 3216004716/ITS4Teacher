// 文献证据服务 - 管理教研相关文献数据的获取和分析

// 文献数据结构接口
export interface LiteraturePaper {
  key: string;
  header: string;
  evidence: {
    [key: string]: string;
  };
  paper_info: {
    作者: string;
    期刊: string;
    出版时间: string;
  };
  theoretical_basis: {
    [key: string]: string;
  };
  frontier_views: {
    [key: string]: string;
  };
  experimental_steps: {
    [key: string]: string;
  };
  experimental_conclusions: {
    [key: string]: string;
  };
}

// 预设文献数据（从PortraitView中提取）
const LITERATURE_DATABASE: LiteraturePaper[] = [
  {
    key: '1',
    header: '小学数学教学中深度问题的研究——基于专家教师课堂提问的案例分析',
    evidence: {
      "证据来源": "CSSCI期刊论文",
      "证据参考价值": "该证据经过实证检验，且论文经过同行评议，参考价值较大"
    },
    paper_info: {
      "作者": "陈薇, 沈书生",
      "期刊": "课程·教材·教学法",
      "出版时间": "2019年10月"
    },
    theoretical_basis: {
      "问题引导教学": "问题是数学事件中的关键要素，引领课堂教学进程，促进教育教学发生的基础",
      "苏格拉底式追问": "通过教师不断追问，让学生从回答过程中体会问题本质",
      "四能目标培养": "强调在小学生数学学习中要培养学生提出问题的能力",
      "高阶思维触发": "深度问题是可能触发学生高阶思维的问题，促进深刻理解"
    },
    frontier_views: {
      "深度问题分类": "深度问题分为比较式、头脑风暴式和总结式三种类型",
      "问题组结构": "深度问题以问题组形式出现，由主体深度问题和若干追问配合",
      "迭代式教学": "采用多轮比较性问题逐层深入，构成迭代式教学结构",
      "锚基理论应用": "深度问题是教学对话的锚基，引导学习活动围绕中心展开"
    },
    experimental_steps: {
      "专家教师选取": "选择四位小学数学专家教师，以互逆关系为教学主题",
      "课堂录制转录": "录制16节随堂课并完整转录师生对话及有意义动作",
      "双重编码分析": "采用双重校对编码制度，筛选深度问题教学片段",
      "参数统计整理": "对深度问题类型、出现时机、教学目的等参数进行统计"
    },
    experimental_conclusions: {
      "问题类型分布规律": "不同教学环节倾向使用不同类型深度问题，体现教学序列性",
      "支持结构要素": "视觉表征是最常用支持要素，信息技术和手势姿态辅助理解",
      "问题链迭代特征": "深度问题组之间存在迭代关系，构成逻辑支撑结构",
      "间接提问效果": "追加问题是否直接指向知识并非促进理解的关键指标"
    }
  },
  {
    key: '2',
    header: '基于深度学习的教师课堂提问分析方法研究',
    evidence: {
      "证据来源": "CSSCI期刊论文",
      "证据参考价值": "该证据关注提问内容和类型的分类，参考价值中等"
    },
    paper_info: {
      "作者": "马玉慧,夏雪莹,张文慧",
      "期刊": "电化教育研究",
      "出版时间": "2021年9月"
    },
    theoretical_basis: {
      "课堂提问重要性": "课堂提问是教师课堂教学行为的关键组成部分，是师生进行课堂交互的主要方式",
      "深度学习原理": "深度学习通过多层神经元之间的信息传递，实现不同特征的提取，形成数据分层特征表示",
      "文本分类基础": "文本分类是深度学习在自然语言理解领域的主要应用场景之一"
    },
    frontier_views: {
      "提问内容分类": "将提问内容分为知识点类、题目信息类和管理类三类",
      "提问类型分类": "按认知层级分为识记型、提示型、分析型、应用型和评价型五类",
      "自动分析方法": "基于深度学习的文本分类方法可替代传统视频分析法，实现大规模应用",
      "多维度分析": "从提问内容和提问类型两个维度对教师课堂提问进行综合分析"
    },
    experimental_steps: {
      "数据收集": "收集80节初中数学课堂实录，共9090条课堂提问语料",
      "语料标注": "以句子为单位进行标注，按提问内容和类型分别标注类别",
      "数据预处理": "去除过长过短语句、打乱语料顺序，采用混合采样方式平衡数据",
      "模型训练": "采用CNN和LSTM模型进行训练，设置epochs为100轮，batch_size为64",
      "分类预测": "将待分析提问句子输入训练好的模型中进行自动分类"
    },
    experimental_conclusions: {
      "CNN模型优势": "CNN模型在提问内容和类型分类上的准确率分别达到85.17%和87.84%",
      "分类效果验证": "基于深度学习的文本分类方法可替代传统视频分析方法",
      "大规模应用可行性": "该方法能够实现教师课堂提问分析的大规模应用",
      "教育智能化推进": "深度学习技术为教育领域的智能化分析提供了有效工具"
    }
  }
];

// 根据知识缺失类型获取相关文献证据
export const getLiteratureByWeaknessType = (weaknessType: string): string[] => {
  const evidenceMap = {
    '陈述性知识': [
      '问题引导教学：问题是数学事件中的关键要素，引领课堂教学进程，促进教育教学发生的基础',
      '深度问题分类：深度问题分为比较式、头脑风暴式和总结式三种类型',
      '提问类型分类：按认知层级分为识记型、提示型、分析型、应用型和评价型五类',
      '课堂提问重要性：课堂提问是教师课堂教学行为的关键组成部分，是师生进行课堂交互的主要方式'
    ],
    '程序性知识': [
      '问题组结构：深度问题以问题组形式出现，由主体深度问题和若干追问配合',
      '苏格拉底式追问：通过教师不断追问，让学生从回答过程中体会问题本质',
      '迭代式教学：采用多轮比较性问题逐层深入，构成迭代式教学结构',
      '专家教师选取：选择四位小学数学专家教师，以互逆关系为教学主题进行实证研究'
    ],
    '解释性知识': [
      '高阶思维触发：深度问题是可能触发学生高阶思维的问题，促进深刻理解',
      '锚基理论应用：深度问题是教学对话的锚基，引导学习活动围绕中心展开',
      '问题链迭代特征：深度问题组之间存在迭代关系，构成逻辑支撑结构',
      '间接提问效果：追加问题是否直接指向知识并非促进理解的关键指标'
    ],
    '条件性知识': [
      '问题类型分布规律：不同教学环节倾向使用不同类型深度问题，体现教学序列性',
      '支持结构要素：视觉表征是最常用支持要素，信息技术和手势姿态辅助理解',
      '多维度分析：从提问内容和提问类型两个维度对教师课堂提问进行综合分析',
      '自动分析方法：基于深度学习的文本分类方法可替代传统视频分析法，实现大规模应用'
    ],
    '元认知知识': [
      '四能目标培养：强调在小学生数学学习中要培养学生提出问题的能力',
      'CNN模型优势：CNN模型在提问内容和类型分类上的准确率分别达到85.17%和87.84%',
      '大规模应用可行性：该方法能够实现教师课堂提问分析的大规模应用',
      '教育智能化推进：深度学习技术为教育领域的智能化分析提供了有效工具'
    ]
  };

  return evidenceMap[weaknessType] || evidenceMap['程序性知识'];
};

// 获取所有理论基础
export const getAllTheoreticalBasis = (): string[] => {
  const allBasis: string[] = [];
  
  LITERATURE_DATABASE.forEach(paper => {
    Object.entries(paper.theoretical_basis).forEach(([key, value]) => {
      allBasis.push(`${key}：${value}`);
    });
  });
  
  return allBasis;
};

// 获取所有前沿观点
export const getAllFrontierViews = (): string[] => {
  const allViews: string[] = [];
  
  LITERATURE_DATABASE.forEach(paper => {
    Object.entries(paper.frontier_views).forEach(([key, value]) => {
      allViews.push(`${key}：${value}`);
    });
  });
  
  return allViews;
};

// 获取所有实验结论
export const getAllExperimentalConclusions = (): string[] => {
  const allConclusions: string[] = [];
  
  LITERATURE_DATABASE.forEach(paper => {
    Object.entries(paper.experimental_conclusions).forEach(([key, value]) => {
      allConclusions.push(`${key}：${value}`);
    });
  });
  
  return allConclusions;
};

// 根据关键词搜索相关文献证据
export const searchLiteratureByKeywords = (keywords: string[]): string[] => {
  const results: string[] = [];
  
  LITERATURE_DATABASE.forEach(paper => {
    // 搜索理论基础
    Object.entries(paper.theoretical_basis).forEach(([key, value]) => {
      if (keywords.some(keyword => key.includes(keyword) || value.includes(keyword))) {
        results.push(`【理论基础】${key}：${value}`);
      }
    });
    
    // 搜索前沿观点
    Object.entries(paper.frontier_views).forEach(([key, value]) => {
      if (keywords.some(keyword => key.includes(keyword) || value.includes(keyword))) {
        results.push(`【前沿观点】${key}：${value}`);
      }
    });
    
    // 搜索实验结论
    Object.entries(paper.experimental_conclusions).forEach(([key, value]) => {
      if (keywords.some(keyword => key.includes(keyword) || value.includes(keyword))) {
        results.push(`【实验结论】${key}：${value}`);
      }
    });
  });
  
  return results.slice(0, 6); // 限制返回数量
};

// 获取文献引用信息
export const getLiteratureCitations = (): string[] => {
  return LITERATURE_DATABASE.map(paper => 
    `${paper.paper_info.作者}. ${paper.header}[J]. ${paper.paper_info.期刊}, ${paper.paper_info.出版时间}.`
  );
};

// 生成针对特定问题类型的文献综述
export const generateLiteratureReview = (weaknessType: string): string => {
  const evidence = getLiteratureByWeaknessType(weaknessType);
  const citations = getLiteratureCitations();
  
  const intro = {
    '陈述性知识': '关于课堂提问的理论基础和分类体系，相关研究提供了以下重要观点：',
    '程序性知识': '关于课堂提问的具体操作方法和实施步骤，研究文献揭示了以下关键发现：',
    '解释性知识': '关于课堂提问背后的原理和机制，教育研究提出了以下重要理论：',
    '条件性知识': '关于不同情境下的提问策略选择，实证研究发现了以下规律：',
    '元认知知识': '关于教师提问能力的自我认知和反思，相关研究强调了以下要点：'
  };

  return `${intro[weaknessType] || intro['程序性知识']}\n\n${evidence.join('\n\n')}\n\n参考文献：\n${citations.join('\n')}`;
};