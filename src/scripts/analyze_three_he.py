#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析问题的三何分类（由何、又何、然何）
"""

import json
import re
from typing import List, Dict

def classify_three_he(que
                      stion: str) -> str:
    """
    基于问题内容分析其属于哪种三何类型
    
    由何：以From...引导的问题，通常是把由何与其它四何问题进行融合设计，展示出相应的问题情境。
    又何：以What else/Moreover为引导，在原有信息基础上，追问其与外部的关联延伸。
    然何：以Then what为引导，指向问题回答的元反思，聚焦问题指向事物的深度挖掘。
    """
    
    # 由何的特征词
    youhe_patterns = [
        r'从.*?来看',
        r'基于',
        r'根据',
        r'依据',
        r'在.*?背景下',
        r'在.*?情况下',
        r'从.*?角度',
        r'结合.*?来',
        r'联系.*?来',
        r'通过.*?来'
    ]
    
    # 又何的特征词
    youhe2_patterns = [
        r'还有',
        r'除了.*?还',
        r'另外',
        r'其他',
        r'除此之外',
        r'.*?与.*?关系',
        r'.*?如何影响',
        r'.*?和.*?有什么',
        r'相比',
        r'对比',
        r'区别',
        r'联系',
        r'关联'
    ]
    
    # 然何的特征词
    ranhe_patterns = [
        r'那么',
        r'接下来',
        r'然后',
        r'进一步',
        r'深入',
        r'本质',
        r'特征',
        r'属性',
        r'具体',
        r'详细',
        r'为什么.*?这样',
        r'意味着什么',
        r'说明了什么'
    ]
    
    # 检查各类模式
    youhe_score = sum(1 for pattern in youhe_patterns if re.search(pattern, question))
    youhe2_score = sum(1 for pattern in youhe2_patterns if re.search(pattern, question))
    ranhe_score = sum(1 for pattern in ranhe_patterns if re.search(pattern, question))
    
    # 根据得分判断类型
    scores = {
        '由何': youhe_score,
        '又何': youhe2_score,
        '然何': ranhe_score
    }
    
    # 如果所有得分都为0，基于问题的深度特征判断
    if max(scores.values()) == 0:
        if '什么' in question and ('是' in question or '叫' in question):
            return '由何'  # 基础定义问题
        elif '怎么' in question or '如何' in question:
            return '然何'  # 方法探究问题
        elif '为什么' in question or '为何' in question:
            return '然何'  # 原因探究问题
        else:
            return '由何'  # 默认为由何
    
    # 返回得分最高的类型
    return max(scores, key=scores.get)

def process_questions(input_file: str, output_file: str):
    """处理问题文件并生成三何分类"""
    
    # 读取原始数据
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 处理每个问题
    result = []
    three_he_stats = {'由何': 0, '又何': 0, '然何': 0}
    mat_stats = {'是何': 0, '如何': 0, '为何': 0, '若何': 0}
    
    for item in data:
        question = item.get('question', '')
        mat_type = item.get('mat', '其他')
        
        # 分类三何
        three_type = classify_three_he(question)
        
        # 统计
        three_he_stats[three_type] += 1
        if mat_type in mat_stats:
            mat_stats[mat_type] += 1
        
        # 保存结果
        result.append({
            'question': question,
            'mat': mat_type,
            'three': three_type,
            'beginTime': item.get('beginTime', 0)
        })
    
    # 写入结果文件
    output_data = {
        'questions': result,
        'statistics': {
            'mat': mat_stats,
            'three_he': three_he_stats,
            'total': len(result)
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"处理完成！共分析 {len(result)} 个问题")
    print(f"四何统计: {mat_stats}")
    print(f"三何统计: {three_he_stats}")
    
    return output_data

if __name__ == '__main__':
    input_file = '/workspaces/ITS4Teacher/src/data/analyze_sentiment.json'
    output_file = '/workspaces/ITS4Teacher/src/data/question_classification.json'
    
    process_questions(input_file, output_file)