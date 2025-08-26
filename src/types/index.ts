// 学习计划类型
export interface LearningPlan {
  id: string;
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

// 教师偏好类型
export interface TeacherPreference {
  favoriteQuestions: string[];
  learningStyle: string;
  expertRoles: string[];
}

// 消息类型
export interface ChatMessage {
  id: string;
  message: string;
  status: 'loading' | 'local' | 'response';
}

// Agent 配置类型
export interface AgentConfig {
  apiKey: string;
  lessonTheme: string;
}

// 问题进度类型
export interface QuestionProgress {
  current: number;
  total: number;
  isCompleted: boolean;
  percent: number;
}

export type CustomMessageStatus = 'local' | 'response' | 'error' | 'loading';

export interface XAgentMessage {
  message: string;
  status: CustomMessageStatus;
} 