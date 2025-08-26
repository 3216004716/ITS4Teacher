export const LEFT_COLUMN_WIDTH_COEFFICIENT = 0.26
export const MIDDLE_COLUMN_WIDTH_COEFFICIENT = 0.60
// export const MIDDLE_COLUMN_WIDTH_COEFFICIENT = 0.75
export const RIGHT_COLUMN_WIDTH_COEFFICIENT = 0.21

export const CHAT_STEP_AIM = 0
export const CHAT_STEP_INTERCONNECT = 1
export const CHAT_STEP_EXPLAIN = 2
export const CHAT_STEP_DERIVE = 3

export const REQUEST_ROLE_USER = 'user'
export const REQUEST_ROLE_ASSISTANT = 'assistant'
export const REQUEST_ROLE_SYSTEM = 'system'

export const DISPLAY_ROLE_LOCAL = 'local'
export const DISPLAY_ROLE_AI = 'ai'

// 布鲁姆分类
export const BLOOM_CLASS = ["其他", "记忆", "理解", "应用", "分析", "评价", "创造"]

export const BLOOM_OTHERS = 0
export const BLOOM_REMEMBER = 1
export const BLOOM_UNDERSTAND = 2
export const BLOOM_APPLY = 3
export const BLOOM_ANALYZE = 4
export const BLOOM_EVALUATE = 5
export const BLOOM_CREATE = 6

export const BLOOM_DICT = {
    "记忆": BLOOM_REMEMBER,
    "理解": BLOOM_UNDERSTAND,
    "应用": BLOOM_APPLY,
    "分析": BLOOM_ANALYZE,
    "评价": BLOOM_EVALUATE,
    "创造": BLOOM_CREATE,
    "其他": BLOOM_OTHERS
}

// 四何分类
export const _4MAT_CLASS = ["是何", "如何", "为何", "若何", "其他"]

export const _4MAT_WHAT = 0
export const _4MAT_HOW = 1
export const _4MAT_WHY = 2
export const _4MAT_WHATIF = 3
export const _4MAT_OTHERS = 4

