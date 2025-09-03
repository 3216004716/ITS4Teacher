#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用DeepSeek API分析问题的三何分类（由何、又何、然何）
"""

import json
import os
import time
from typing import List, Dict
from openai import OpenAI

# DeepSeek API配置
# 注意：请在环境变量中设置 DEEPSEEK_API_KEY
API_KEY = os.getenv('DEEPSEEK_API_KEY', 'sk-e18179ecb5ba4eb9b9d07a287dff4edd')

# 初始化DeepSeek客户端
client = OpenAI(api_key=API_KEY, base_url="https://api.deepseek.com")

def classify_three_he_with_deepseek(question: str) -> str:
    """
    使用DeepSeek API分析问题属于哪种三何类型
    
    由何：以From...引导的问题，通常是把由何与其它四何问题进行融合设计，展示出相应的问题情境。
    又何：以What else/Moreover为引导，在原有信息基础上，追问其与外部的关联延伸。
    然何：以Then what为引导，指向问题回答的元反思，聚焦问题指向事物的深度挖掘。
    """
    
    prompt = f"""请分析以下教学问题属于哪种类型，只需回答"由何"、"又何"、"然何"或"无"其中之一。

分类定义：
- 由何：以情境为引导的问题，把问题与具体情境融合设计，展示相应的问题情境，帮助学生理解问题背景。
- 又何：在原有信息基础上，追问其与外部的关联延伸，如"还有什么"、"与其他事物的关系"等。
- 然何：指向问题回答的元反思，聚焦问题指向事物的深度挖掘，如探究本质、特征、属性等。
- 无：如果问题不属于以上任何一种类型，则回答"无"。

问题：{question}

请直接回答类型（由何/又何/然何/无）："""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个教育专家，擅长分析教学问题的类型。请根据给定的分类标准，准确判断问题类型。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # 降低温度以获得更稳定的分类结果
            max_tokens=10,    # 只需要简短的回答
            stream=False
        )
        
        result = response.choices[0].message.content.strip()
        
        # 确保返回的是有效的分类
        if "由何" in result:
            return "由何"
        elif "又何" in result:
            return "又何"
        elif "然何" in result:
            return "然何"
        elif "无" in result:
            return "无"
        else:
            # 如果API返回不明确，使用简单规则作为后备
            return classify_three_he_fallback(question)
            
    except Exception as e:
        print(f"DeepSeek API调用失败: {e}")
        # 如果API调用失败，使用后备方法
        return classify_three_he_fallback(question)

def classify_three_he_fallback(question: str) -> str:
    """
    后备的三何分类方法（基于规则）
    """
    # 检查关键词
    if any(word in question for word in ['还有', '除了', '其他', '另外', '相比', '区别', '关系']):
        return '又何'
    elif any(word in question for word in ['那么', '接下来', '然后', '本质', '特征', '属性', '为什么']):
        return '然何'
    else:
        return '由何'

def process_questions_with_deepseek(input_file: str, output_file: str, use_api: bool = True):
    """
    处理问题文件并使用DeepSeek进行三何分类
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径
        use_api: 是否使用DeepSeek API（False则使用规则方法）
    """
    
    # 读取原始数据
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 处理每个问题
    result = []
    three_he_stats = {'由何': 0, '又何': 0, '然何': 0, '无': 0}
    mat_stats = {'是何': 0, '如何': 0, '为何': 0, '若何': 0}
    
    total = len(data)
    for i, item in enumerate(data):
        question = item.get('question', '')
        mat_type = item.get('mat', '其他')
        
        # 分类三何
        if use_api:
            print(f"处理进度: {i+1}/{total} - 正在分析: {question[:30]}...")
            three_type = classify_three_he_with_deepseek(question)
            # 添加延迟以避免API限制
            if i < total - 1:
                time.sleep(0.5)  # 每个请求间隔0.5秒
        else:
            three_type = classify_three_he_fallback(question)
        
        # 统计三何分类
        three_he_stats[three_type] += 1
        
        # 只保存非"无"类型的问题
        if three_type != '无':
            if mat_type in mat_stats:
                mat_stats[mat_type] += 1
            
            # 保存结果
            result.append({
                'question': question,
                'mat': mat_type,
                'three': three_type,
                'beginTime': item.get('beginTime', 0)
            })
        
        # 每处理10个问题保存一次（防止中断丢失数据）
        if (i + 1) % 10 == 0:
            save_intermediate_result(output_file, result, mat_stats, three_he_stats)
            print(f"已保存中间结果: {i+1}/{total}")
    
    # 写入最终结果
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
    
    print(f"\n处理完成！共分析 {len(result)} 个问题")
    print(f"四何统计: {mat_stats}")
    print(f"三何统计: {three_he_stats}")
    
    return output_data

def save_intermediate_result(output_file: str, questions: List[Dict], mat_stats: Dict, three_he_stats: Dict):
    """
    保存中间结果
    """
    output_data = {
        'questions': questions,
        'statistics': {
            'mat': mat_stats,
            'three_he': three_he_stats,
            'total': len(questions)
        }
    }
    
    temp_file = output_file.replace('.json', '_temp.json')
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

def main():
    """主函数"""
    input_file = '/workspaces/ITS4Teacher/src/data/analyze_sentiment.json'
    output_file = '/workspaces/ITS4Teacher/src/data/question_classification_deepseek.json'
    
    # 检查API密钥
    if API_KEY == 'your-api-key-here':
        print("警告：未设置DeepSeek API密钥，将使用基于规则的分类方法")
        print("如需使用DeepSeek API，请设置环境变量: export DEEPSEEK_API_KEY='your-actual-key'")
        use_api = False
    else:
        print(f"使用DeepSeek API进行分类...")
        use_api = True
    
    # 处理问题
    process_questions_with_deepseek(input_file, output_file, use_api=use_api)

if __name__ == '__main__':
    main()