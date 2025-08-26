<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick } from "vue";
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
  _4MAT_CLASS, _4MAT_WHAT, _4MAT_HOW, _4MAT_WHY, _4MAT_WHATIF, _4MAT_OTHERS
} from '../../utils/const'
import { getLessonMinute, length } from '../../utils/tools'

import analyzeData from '../../data/analyze_sentiment.json'
import classStructure from '../../data/class_structure.json'

const qMap2 = ref(null);
const state = reactive({
  id: 0,
  interactionData: null,
  classStructure: null,
});

// MAT类型到名称的映射
const matTypeToName = {
  "是何": "是何",
  "如何": "如何",
  "为何": "为何",
  "若何": "若何",
  "其他": "其他"
};

// 反馈类型到名称的映射
const feedbackTypeToName = {
  "无反馈": "无反馈",
  "鼓励性": "鼓励性",
  "评价性": "评价性",
  "指导性": "指导性",
  "其他": "其他"
};

// 更现代化且协调的颜色方案
const matColors = {
  "是何": "#FFAA64",  // 清新薄荷绿
  "如何": "#FF6B6B",  // 柔和珊瑚红
  "为何": "#45B7D1",  // 天空蓝
  "若何": "#FFBE0B",  // 温暖琥珀黄
  "其他": "#A882DD"   // 淡紫色
};

// 反馈类型颜色
const feedbackColors = {
  "鼓励性": "#FFC857",  // 明亮黄色
  "评价性": "#3A86FF",  // 亮蓝色
  "指导性": "#9381FF",  // 淡紫色
  "其他": "#FF5C8D"     // 粉红色
};

// 学生回答和教师反馈的颜色
const nodeColors = {
  "mat": "#4ECDC4",    // 与是何颜色一致
  "answer": "#62D3A2", // 淡蓝色
  "feedback": "#FFC857" // 与鼓励性一致
};

const fontSize = 10;

const methods = reactive({
  visTeachingProcedures() {
    state.interactionData = analyzeData;
    state.classStructure = classStructure;

    if (!state.interactionData) {
      console.log('等待数据加载...');
      return;
    }
    
    console.log('开始绘制互动流程图，数据条目数:', state.interactionData.length);
    
    try {
      // 检查容器是否已经渲染并设置默认尺寸
      if (!qMap2.value) {
        console.error('容器元素不存在');
        return;
      }
      
      // 清空容器
      d3.select(qMap2.value).selectAll('*').remove();
      
      // 获取容器尺寸，确保至少有最小宽度
      const containerWidth = qMap2.value.clientWidth || 600;
      const containerHeight = qMap2.value.clientHeight || 300;
      
      // 设置图表尺寸和边距 - 进一步缩小高度
      const margin = { top: 30, right: 30, bottom: 10, left: 30 };
      const width = Math.max(300, containerWidth - margin.left - margin.right);
      const height = Math.max(150, containerHeight - margin.top - margin.bottom - 10); // 额外留出空间
      
      console.log('容器尺寸:', containerWidth, containerHeight);
      console.log('图表尺寸:', width, height);
      
      // 创建SVG容器 - 居中显示
      const svgContainer = d3.select(qMap2.value)
        .append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('overflow', 'hidden'); // 确保不出现滚动条
        
      const svg = svgContainer
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet') // 确保保持比例并居中
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
      // 添加标题
      // svg.append('text')
      //   .attr('x', width / 2)
      //   .attr('y', -8)
      //   .attr('text-anchor', 'middle')
      //   .attr('font-size', '10px')
      //   .attr('font-weight', 'bold')
      //   .text('教师-学生互动流程');
      
      // 过滤有效数据 - 排除无反馈的数据
      const filteredData = state.interactionData.filter(item => {
        // 必须有问题
        if (!item.question) return false;
        
        // 如果有回答，则包含
        if (item.answer && item.answer.trim() !== '') return true;
        
        // 如果有评论且反馈类型不是"无反馈"，则包含
        if (item.comment && item.comment.trim() !== '' && 
            item.feedbackType && item.feedbackType !== "无反馈") {
          return true;
        }
        
        // 其他情况不包含
        return false;
      });
      
      console.log('过滤后的数据条目数:', filteredData.length);
      
      if (filteredData.length === 0) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .text('没有足够的数据来显示互动流程');
        return;
      }
      
      // 处理桑基图数据
      const sankeyData = this.prepareSankeyData(filteredData);
      
      // 创建桑基图布局
      const sankeyGenerator = sankey()
        .nodeId(d => d.id)
        .nodeWidth(5) // 进一步减小节点宽度
        .nodePadding(3) // 进一步减小节点间距
        .extent([[0, 0], [width - margin.right, height - 10]]); // 留出额外空间
      
      // 计算布局
      const { nodes, links } = sankeyGenerator(sankeyData);
      
      // 创建连接线的路径
      const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.4) // 减小透明度，更精致
        .selectAll("g")
        .data(links)
        .join("g")
        .style("mix-blend-mode", "multiply");
      
      // 添加渐变定义
      const defs = svg.append("defs");
      
      // 为每个链接创建渐变
      links.forEach((link, i) => {
        const gradientId = `gradient-${i}`;
        const gradient = defs.append("linearGradient")
          .attr("id", gradientId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", link.source.x1)
          .attr("x2", link.target.x0);
        
        let sourceColor, targetColor;
        
        if (link.source.type === "mat") {
          sourceColor = matColors[link.source.name] || "#4ECDC4";
        } else if (link.source.type === "answer") {
          sourceColor = nodeColors["answer"];
        } else if (link.source.type === "feedback") {
          sourceColor = feedbackColors[link.source.name] || "#FFC857";
        } else {
          sourceColor = "#aaa";
        }
        
        if (link.target.type === "mat") {
          targetColor = matColors[link.target.name] || "#4ECDC4";
        } else if (link.target.type === "answer") {
          targetColor = nodeColors["answer"];
        } else if (link.target.type === "feedback") {
          targetColor = feedbackColors[link.target.name] || "#FFC857";
        } else {
          targetColor = "#aaa";
        }
        
        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", sourceColor);
          
        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", targetColor);
      });
      
      // 绘制带有渐变色的连接线
      link.append("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", (d, i) => `url(#gradient-${i})`)
        .attr("stroke-width", d => Math.max(1, d.width)) // 确保线宽至少为1
        .append("title")
        .text(d => `${d.source.name} → ${d.target.name}: ${d.value}`);
      
      // 绘制节点
      const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g");
      
      // 绘制节点矩形
      node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => Math.max(1, d.y1 - d.y0)) // 确保高度至少为1
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
          if (d.type === "mat") {
            return matColors[d.name] || "#4ECDC4";
          } else if (d.type === "answer") {
            return nodeColors["answer"];
          } else if (d.type === "feedback") {
            return feedbackColors[d.name] || "#FFC857";
          }
          return "#FFD166"; // 默认黄色
        })
        .attr("stroke", "#fff") // 白色边框更现代
        .attr("stroke-width", 0.5) // 减小边框宽度
        .attr("rx", 2) // 添加圆角
        .attr("ry", 2) // 添加圆角
        .append("title")
        .text(d => `${d.name}: ${d.value}`);
      
      // 添加节点文字 - 缩小字体
      node.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 3 : d.x0 - 3) // 调整文字位置
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .attr("font-size", fontSize) // 减小字体
        .text(d => {
          if (d.type === "mat") {
            // 截断过长的文本，确保不超出边界
            const name = d.name.length > 4 ? d.name.substring(0, 4) + ".." : d.name;
            return `${name} (${d.value})`;
          } else if (d.type === "answer") {
            return `回答 (${d.value})`;
          } else {
            const name = d.name.length > 4 ? d.name.substring(0, 4) + ".." : d.name;
            return `${name} (${d.value})`;
          }
        })
        .attr("fill", "#333"); // 深灰色文字
      
      // 添加图例 - 缩小和调整位置
      const legendData = [
        { name: "是何", color: matColors["是何"] },
        { name: "如何", color: matColors["如何"] },
        { name: "为何", color: matColors["为何"] },
        { name: "若何", color: matColors["若何"] },
        { name: "回答", color: nodeColors["answer"] },
        { name: "鼓励", color: feedbackColors["鼓励性"] }
      ];
      
      // 计算图例的总宽度，以便居中
      const legendsPerRow = 3;
      const legendWidth = legendsPerRow * fontSize * 4; // 每个图例项的宽度
      
      const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - legendWidth/1.6}, ${-30})`); // 水平居中

      // 两行显示图例
      legendData.forEach((d, i) => {
        const row = Math.floor(i / legendsPerRow);
        const col = i % legendsPerRow;
        
        const g = legend.append("g")
          .attr("transform", `translate(${col * fontSize * 4}, ${row * fontSize * 1.5})`);
        
        g.append("rect")
          .attr("width", 12) // 进一步减小图例方块
          .attr("height", 12)
          .attr("rx", 3) // 圆角
          .attr("ry", 3) // 圆角
          .attr("fill", d.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.3);
        
        g.append("text")
          .attr("x", 14)
          .attr("y", 9)
          .attr("font-size", fontSize) // 进一步减小图例文字
          .text(d.name);
      });
      
    } catch (error) {
      console.error('绘制互动流程图时出错:', error);
      
      // 显示错误信息
      d3.select(qMap2.value)
        .append('div')
        .style('color', 'red')
        .style('padding', '20px')
        .style('font-size', '14px')
        .text(`绘制互动流程图时出错: ${error.message}`);
    }
  },
  
  prepareSankeyData(data) {
    // 按MAT类型分组问题
    const matGroups = {};
    const answerGroups = { "回答": 0 };
    const feedbackGroups = {};
    
    // 初始化反馈类型组
    ["鼓励性", "评价性", "指导性", "其他"].forEach(type => {
      feedbackGroups[type] = 0;
    });
    
    // 统计每个mat类型的问题数量
    data.forEach(item => {
      const matType = item.mat || "其他";
      if (!matGroups[matType]) {
        matGroups[matType] = 0;
      }
      matGroups[matType]++;
      
      // 统计回答
      if (item.answer && item.answer.trim() !== '') {
        answerGroups["回答"]++;
      }
      
      // 统计反馈类型，排除"无反馈"
      if (item.comment && item.comment.trim() !== '') {
        // 只有当feedbackType存在且不是"无反馈"时才统计
        const feedbackType = (item.feedbackType && item.feedbackType !== "无反馈") 
          ? item.feedbackType 
          : "其他";
        
        if (!feedbackGroups[feedbackType]) {
          feedbackGroups[feedbackType] = 0;
        }
        feedbackGroups[feedbackType]++;
      }
    });
    
    console.log('MAT类型统计:', matGroups);
    console.log('反馈类型统计:', feedbackGroups);
    
    // 创建节点
    const nodes = [];
    
    // 添加MAT类型节点
    let nodeId = 0;
    const matNodeIds = {};
    Object.entries(matGroups).forEach(([matType, count]) => {
      matNodeIds[matType] = nodeId;
      nodes.push({
        id: nodeId++,
        name: matType,
        type: "mat",
        value: count
      });
    });
    
    // 添加回答节点
    const answerNodeId = nodeId++;
    nodes.push({
      id: answerNodeId,
      name: "回答",
      type: "answer",
      value: answerGroups["回答"]
    });
    
    // 添加反馈类型节点
    const feedbackNodeIds = {};
    Object.entries(feedbackGroups).forEach(([feedbackType, count]) => {
      if (count > 0) {
        feedbackNodeIds[feedbackType] = nodeId;
        nodes.push({
          id: nodeId++,
          name: feedbackType,
          type: "feedback",
          value: count
        });
      }
    });
    
    // 创建连接
    const links = [];
    
    // 从MAT类型到回答的连接
    Object.entries(matGroups).forEach(([matType, count]) => {
      // 统计该mat类型有多少回答
      let answersCount = 0;
      data.forEach(item => {
        if ((item.mat || "其他") === matType && item.answer && item.answer.trim() !== '') {
          answersCount++;
        }
      });
      
      if (answersCount > 0) {
        links.push({
          source: matNodeIds[matType],
          target: answerNodeId,
          value: answersCount
        });
      }
    });
    
    // 从回答到各种反馈类型的连接
    Object.keys(feedbackGroups).forEach(feedbackType => {
      if (feedbackNodeIds[feedbackType] === undefined) return;
      
      // 统计有多少回答后有该类型的反馈
      const answersWithFeedback = data.filter(item => 
        item.answer && item.answer.trim() !== '' && 
        item.comment && item.comment.trim() !== '' && 
        ((item.feedbackType === feedbackType) || 
         (feedbackType === "其他" && (!item.feedbackType || item.feedbackType === "其他")))
      ).length;
      
      if (answersWithFeedback > 0) {
        links.push({
          source: answerNodeId,
          target: feedbackNodeIds[feedbackType],
          value: answersWithFeedback
        });
      }
    });
    
    // 从MAT类型直接到反馈类型的连接（没有回答的问题）
    Object.entries(matGroups).forEach(([matType, count]) => {
      Object.keys(feedbackGroups).forEach(feedbackType => {
        if (feedbackNodeIds[feedbackType] === undefined) return;
        
        // 统计该mat类型有多少没有回答但有该类型反馈的问题
        const directFeedbackCount = data.filter(item => 
          (item.mat || "其他") === matType && 
          (!item.answer || item.answer.trim() === '') && 
          item.comment && item.comment.trim() !== '' && 
          ((item.feedbackType === feedbackType) || 
           (feedbackType === "其他" && (!item.feedbackType || item.feedbackType === "其他")))
        ).length;
        
        if (directFeedbackCount > 0) {
          links.push({
            source: matNodeIds[matType],
            target: feedbackNodeIds[feedbackType],
            value: directFeedbackCount
          });
        }
      });
    });
    
    return { nodes, links };
  },
  
  // 确保DOM元素渲染后再获取尺寸
  ensureRendered() {
    if (qMap2.value && qMap2.value.clientWidth) {
      this.visTeachingProcedures();
    } else {
      // 如果DOM还没有完全渲染，延迟执行
      setTimeout(this.ensureRendered, 100);
    }
  }
});

onMounted(() => {
  // 确保DOM渲染完成后再绘制
  nextTick(() => {
    methods.ensureRendered();
  });
  
  // 窗口大小变化时重新绘制
  window.addEventListener('resize', () => {
    methods.visTeachingProcedures();
  });
});
</script>

<template>
  <div class="item" ref="qMap2">
  </div>
</template>

<style scoped>
.item {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

svg {
  max-width: 100%;
  max-height: 100%;
}

#bloom {
  border: #888 1px solid;
}
</style>
