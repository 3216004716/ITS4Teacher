import {
  createFromIconfontCN,
  AimOutlined,
  UserOutlined,
  BulbOutlined,
  AreaChartOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ShareAltOutlined,
  SmileOutlined,
  WarningOutlined,
  CommentOutlined, FireOutlined, HeartOutlined, ReadOutlined,
} from '@ant-design/icons-vue';

export const CN_TOPIC_TAGS: string[] = [
  '问题连贯',
  '交互质量',
  '反馈情感',
]

export const EN_TOPIC_TAGS: string[] = [
  'Question Coherence',
  'Interaction Quality',
  'Feedback Affection',
]

export const EN_INTERCONNECT_STEPS: string[] = [
  'Identify significant features in class',
  'Investigate complex relations',
  'Case Study',
]

export const CN_INTERCONNECT_STEPS: string[] = [
  '识别关键特征',
  '发现关系',
  '案例研究',
] 

export const EN_EXPLAIN_STEPS: string[] = [
  'Pedagogical Expert',
  'Technical Expert',
  'Educational Researcher',
]

export const CN_EXPLAIN_STEPS: string[] = [
  '教学专家',
  '技术专家',
  '教育研究员',
] 

export const EN_DERIVE_STEPS: string[] = [
  'Hightlight important views',
  'Apply in new contexts',
  'Conclude the research',
]

export const CN_DERIVE_STEPS: string[] = [
  '划重点',
  '新情境应用',
  '总结研究',
] 

export const AIM_STEPS = 
{
  id: 1,
  name: "Aim",
  fullName: "Aim a research target",
  description: "Select a research aim, and generate a personalized learning plan.",
  icon: AimOutlined,
  topicTagsItems: EN_TOPIC_TAGS,
  color: "#CF1421",
}
export const EXPLAIN_STEPS = {
  id: 2,
  name: "Explain",
  fullName: "Explain class phenomenons",
  description: "Data-driven lesson analysis from the perspective of domain experts.",
  icon: AreaChartOutlined,
  topicTagsItems: EN_EXPLAIN_STEPS,
  color: "#3AA343",
}
export const INTERCONNECT_STEPS = {
  id: 3,
  name: "Interconnect",
  fullName: "Interconnect predominant features",
  description: "Probe into the relations of intricate but predominant features of the lesson.",
  icon: ShareAltOutlined,
  topicTagsItems: EN_INTERCONNECT_STEPS,
  color: "#3F7AAB",
}

export const DERIVE_STEPS = {
  id: 4,
  name: "Derive",
  fullName: "Derive practical knowledge",
  description: "Derive practical knowledge from the learning and researching process.",
  icon: BulbOutlined,
  topicTagsItems: EN_DERIVE_STEPS,
  color: "#FCB700",
}
export const AIM_STEPS_CN = 
{
  id: 1,
  name: "定位",
  fullName: "定位教研目标",
  description: "选择研究目标，生成个性化学习计划。",
  icon: AimOutlined,
  topicTagsItems: CN_TOPIC_TAGS,
  color: "#CF1421",
}
export const INTERPRET_STEPS_CN = {
  id: 2,
  name: "解读",
  fullName: "多视角解读课堂",
  description: "从专家视角，基于数据驱动对课例进行分析。",
  icon: AreaChartOutlined,
  topicTagsItems: CN_EXPLAIN_STEPS,
  color: "#3AA343",
}
export const EXPLORE_STEPS_CN = {
  id: 3,
  name: "探究",
  fullName: "关联课堂变量",
  description: "探究课例中主要特征之间的关系。",
  icon: ShareAltOutlined,
  topicTagsItems: CN_INTERCONNECT_STEPS,
  color: "#3F7AAB",
}
export const DERIVE_STEPS_CN = {
  id: 4,
  name: "萃取",
  fullName: "萃取实践性知识",
  description: "从学习与研究过程中推导实践知识。",
  icon: BulbOutlined,
  topicTagsItems: CN_DERIVE_STEPS,
  color: "#FCB700",
}

export const PROMPT_STEPS = [
  AIM_STEPS,
  INTERCONNECT_STEPS,
  EXPLAIN_STEPS,
  DERIVE_STEPS,
]

export const PROMPT_STEPS_CN = [
  AIM_STEPS_CN,
  INTERPRET_STEPS_CN,
  EXPLORE_STEPS_CN,
  DERIVE_STEPS_CN,
]


// export const TOPIC_TAGS_COLORS = [
//   "#C41E7F",
//   "#CF1421",
//   "#D4380D",
//   "#D36B08",
//   "#D48806",
//   "#7CB402",
//   "#389E0E",
//   "#0A979C",
//   "#0758D9",
//   "#1E39C3",
//   "#541DAB",
// ]

export const TOPIC_TAGS_COLORS = [
  "#CF1421",
  "#D48806",
  "#7CB402",
  "#389E0E",
  "#0A979C",
  "#0758D9",
  "#1E39C3",
  "#541DAB",
]
