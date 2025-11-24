#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 triangle2.json 中提取教师提问并进行情感分析
生成与 analyze_sentiment.json 格式一致的文件
"""

import json
import re
from typing import List, Dict

def calculate_sentiment_score(text: str) -> Dict[str, any]:
    """
    简单的情感分析算法
    基于关键词和语气词进行评分
    """
    # 积极词汇
    positive_words = [
        '好', '很好', '非常好', '优秀', '棒', '正确', '对', '是的',
        '不错', '厉害', '聪明', '太棒了', '很棒', '继续', '加油'
    ]

    # 消极词汇
    negative_words = [
        '错', '不对', '不是', '错误', '不行', '不好', '差', '不会',
        '不能', '不要', '别', '没有', '不太', '不够'
    ]

    # 中性疑问词（提问本身比较中性）
    neutral_words = [
        '什么', '怎么', '如何', '为什么', '哪个', '哪些', '多少',
        '是否', '能否', '可以', '有没有', '呢', '吗', '么'
    ]

    # 计算积极分数
    positive_count = sum(1 for word in positive_words if word in text)

    # 计算消极分数
    negative_count = sum(1 for word in negative_words if word in text)

    # 计算中性分数
    neutral_count = sum(1 for word in neutral_words if word in text)

    # 基础分数计算（0-1之间）
    # 疑问句本身倾向于中性，基础分设为0.4
    base_score = 0.4

    # 根据词汇调整分数
    if positive_count > 0:
        base_score += positive_count * 0.15
    if negative_count > 0:
        base_score -= negative_count * 0.15
    if neutral_count > 0:
        base_score += neutral_count * 0.02

    # 限制在0-1之间
    score = max(0, min(1, base_score))

    # 分类
    if score >= 0.6:
        classification = "积极"
    elif score <= 0.3:
        classification = "消极"
    else:
        classification = "中性"

    return {
        "score": score,
        "classification": classification
    }

def classify_mat_type(question: str) -> str:
    """
    分类问题类型（四何）
    """
    # 是何：是什么、叫什么等
    if re.search(r'(是什么|叫什么|什么是|哪.*?是|定义)', question):
        return "是何"

    # 如何：怎么做、如何做等
    if re.search(r'(如何|怎么|怎样|怎样才能)', question):
        return "如何"

    # 为何：为什么、原因等
    if re.search(r'(为什么|为何|原因|为啥)', question):
        return "为何"

    # 若何：假如、如果等
    if re.search(r'(假如|如果|若|假设|设)', question):
        return "若何"

    # 默认为"是何"（基础问题）
    return "是何"

def classify_bloom_type(question: str, mat_type: str) -> str:
    """
    分类布鲁姆认知层级
    """
    # 创造：设计、创作、改进等
    if re.search(r'(设计|创作|改进|创新|构建|建立新)', question):
        return "创造"

    # 评价：评价、判断、选择等
    if re.search(r'(评价|判断|评估|比较.*?优劣|哪个更好)', question):
        return "评价"

    # 分析：分析、区分、推导等
    if re.search(r'(分析|区分|推导|证明|为什么)', question):
        return "分析"

    # 应用：应用、运用、计算等
    if re.search(r'(应用|运用|计算|解决|如何|怎么)', question):
        return "应用"

    # 理解：解释、说明、概括等
    if re.search(r'(解释|说明|概括|理解|意思|含义)', question):
        return "理解"

    # 记忆：回忆、列举、定义等
    if re.search(r'(是什么|叫什么|定义|列举|回忆|有哪些)', question):
        return "记忆"

    # 默认根据mat类型判断
    if mat_type == "为何":
        return "分析"
    elif mat_type == "如何":
        return "应用"
    else:
        return "记忆"

def classify_feedback_type(text: str) -> str:
    """
    分类反馈类型（简化版，因为没有后续对话信息）
    """
    return "无反馈"

def extract_teacher_questions(data: Dict) -> List[Dict]:
    """
    从 triangle2.json 中提取教师的提问
    """
    questions = []
    full_text = data.get('fullText', [])

    # 遍历所有句子
    for i, sentence in enumerate(full_text):
        # 只提取老师的提问（role=1且以问号结尾）
        if sentence.get('role') == '1' and sentence.get('sentenceContent', '').endswith('？'):
            question_text = sentence['sentenceContent']
            begin_time = sentence.get('beginTime', 0)
            end_time = sentence.get('endTime', 0)

            # 检查下一句是否是学生的回答
            answered = False
            answer = ""
            if i + 1 < len(full_text):
                next_sentence = full_text[i + 1]
                # 如果下一句是学生说的，且时间紧接着，认为是回答
                if next_sentence.get('role') in ['2', '3'] and next_sentence.get('beginTime', 999999) - end_time < 10:
                    answered = True
                    answer = next_sentence.get('sentenceContent', '')

            # 分类问题类型
            mat_type = classify_mat_type(question_text)
            bloom_type = classify_bloom_type(question_text, mat_type)
            feedback_type = classify_feedback_type(question_text)

            # 情感分析
            sentiment = calculate_sentiment_score(question_text)

            # 构建问题对象
            question_obj = {
                "question": question_text,
                "answer": answer,
                "comment": "",
                "blmType": bloom_type,
                "mat": mat_type,
                "feedbackType": feedback_type,
                "answered": answered,
                "beginTime": begin_time,
                "endTime": end_time,
                "question_sentiment": sentiment
            }

            questions.append(question_obj)

    return questions

def main():
    """主函数"""
    input_file = '/workspaces/ITS4Teacher/src/data/triangle2.json'
    output_file = '/workspaces/ITS4Teacher/src/data/analyze_sentiment2.json'

    print(f"读取文件: {input_file}")

    # 读取 triangle2.json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"视频时长: {data.get('videoDuration', 0)}秒")
    print(f"总句子数: {len(data.get('fullText', []))}")

    # 提取教师提问
    questions = extract_teacher_questions(data)

    print(f"\n提取到 {len(questions)} 个教师提问")

    # 统计信息
    mat_stats = {}
    bloom_stats = {}
    sentiment_stats = {"积极": 0, "中性": 0, "消极": 0}

    for q in questions:
        mat_type = q['mat']
        bloom_type = q['blmType']
        sentiment_class = q['question_sentiment']['classification']

        mat_stats[mat_type] = mat_stats.get(mat_type, 0) + 1
        bloom_stats[bloom_type] = bloom_stats.get(bloom_type, 0) + 1
        sentiment_stats[sentiment_class] = sentiment_stats.get(sentiment_class, 0) + 1

    print(f"\n四何分类统计: {mat_stats}")
    print(f"布鲁姆层级统计: {bloom_stats}")
    print(f"情感分类统计: {sentiment_stats}")
    print(f"有学生回答的问题: {sum(1 for q in questions if q['answered'])} 个")

    # 保存为 JSON 数组格式（与 analyze_sentiment.json 一致）
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\n成功生成文件: {output_file}")

    # 显示前3个示例
    print("\n前3个问题示例:")
    for i, q in enumerate(questions[:3]):
        print(f"\n问题 {i+1}:")
        print(f"  内容: {q['question']}")
        print(f"  时间: {q['beginTime']}s - {q['endTime']}s")
        print(f"  类型: {q['mat']} / {q['blmType']}")
        print(f"  情感: {q['question_sentiment']['classification']} (得分: {q['question_sentiment']['score']:.3f})")
        print(f"  有回答: {q['answered']}")

if __name__ == '__main__':
    main()
