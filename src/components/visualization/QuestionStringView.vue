<script setup>
import { reactive, onMounted, ref, nextTick } from "vue";
import * as d3 from 'd3';

import questionChainsData from '../../data/structured_question_chains.json'

const qMap2 = ref(null);

const state = reactive({
  id: 0,
  questionChains: null,
  selectedChain: null,
  hoveredQuestion: null,
});

// 话题颜色映射
const TOPIC_COLORS = {
  "是何": "#FFAA64",  // 橙色
  "如何": "#FF6B6B",  // 红色
  "为何": "#45B7D1",  // 蓝色
  "若何": "#FFBE0B",  // 黄色
  "其他": "#A882DD"   // 紫色
};

const methods = reactive({
  visQuestionChains() {
    state.questionChains = questionChainsData;
    
    if (!state.questionChains || !state.questionChains.chains) {
      console.log('等待问题链数据加载...');
      return;
    }
    
    console.log('开始绘制问题链时间轴，共有', state.questionChains.chains.length, '个问题链');
    
    try {
      if (!qMap2.value) {
        console.error('容器元素不存在');
        return;
      }
      
      // 清空容器
      d3.select(qMap2.value).selectAll('*').remove();
      
      // 获取容器尺寸
      const containerWidth = qMap2.value.clientWidth || 1200;
      const containerHeight = qMap2.value.clientHeight || 700;
      
      // 设置图表尺寸和边距
      const margin = { top: 20, right: 20, bottom: 0, left: 20 };
      const width = containerWidth - margin.left - margin.right;
      const height = containerHeight - margin.top - margin.bottom;
      
      console.log('容器尺寸:', containerWidth, containerHeight);
      console.log('图表尺寸:', width, height);
      
      // 创建主SVG
      const svg = d3.select(qMap2.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .style('background', '#ffffff');
      
      // 创建主绘图区域
      const mainGroup = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // 获取时间范围和问题链
      const timeRange = state.questionChains.metadata.timeRange;
      const chains = state.questionChains.chains;
      
      // 创建时间比例尺（横轴）
      const xScale = d3.scaleLinear()
        .domain([timeRange.start, timeRange.end])
        .range([0, width]);
      
      // 绘制主时间轴（渐变横线）
      this.drawMainTimeline(mainGroup, xScale, width, height);
      
      // 绘制问题链
      this.drawQuestionChains(mainGroup, chains, xScale, height);
      
    } catch (error) {
      console.error('绘制问题链时间轴时出错:', error);
    }
  },
  
  // 绘制主时间轴
  drawMainTimeline(container, xScale, width, height) {
    // 创建渐变定义
    const defs = container.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'timelineGradient')
      .attr('x1', '0%')
      .attr('x2', '100%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4CAF50'); // 绿色开始
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#2196F3'); // 蓝色结束
    
    // 绘制主时间轴
    const timelineY = height * 0.15; // 时间轴位置
    
    // 添加标题
    // container.append('text')
    //   .attr('x', width / 2)
    //   .attr('y', 20)
    //   .attr('text-anchor', 'middle')
    //   .attr('font-size', '16px')
    //   .attr('font-weight', 'bold')
    //   .attr('fill', '#333')
    //   .text('课堂时间推进');
    
    container.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', timelineY)
      .attr('y2', timelineY)
      .attr('stroke', 'url(#timelineGradient)')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round');
    
    // 添加箭头
    const arrowGroup = container.append('g')
      .attr('transform', `translate(${width}, ${timelineY})`);
    
    arrowGroup.append('path')
      .attr('d', 'M -15,-8 L 5,0 L -15,8 Z')
      .attr('fill', '#2196F3')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 2);
    
    // 添加时间刻度
    const timePoints = xScale.ticks(10);
    timePoints.forEach(time => {
      const x = xScale(time);
      
      // 时间刻度点
      // container.append('circle')
      //   .attr('cx', x)
      //   .attr('cy', timelineY)
      //   .attr('r', 4)
      //   .attr('fill', '#E91E63')
      //   .attr('stroke', '#fff')
      //   .attr('stroke-width', 2);
      
      // 添加垂直网格线
      container.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', timelineY + 10)
        .attr('y2', height - 20)
        .attr('stroke', '#E0E0E0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    });
  },
  
  // 绘制问题链
  drawQuestionChains(container, chains, xScale, height) {
    const timelineY = height * 0.15;
    const chainStartY = timelineY + 60;
    const maxChainHeight = height - chainStartY - 40; // 留出底部边距
    const questionSpacing = 25;
    
    // 按开始时间排序并计算位置
    const sortedChains = [...chains].sort((a, b) => a.timeline.start - b.timeline.start);
    const chainPositions = this.calculateChainPositions(sortedChains, chainStartY, questionSpacing, maxChainHeight);
    
    // 为每个问题链创建组
    const chainGroups = container.selectAll('.chain-group')
      .data(sortedChains)
      .enter()
      .append('g')
      .attr('class', 'chain-group');
    
    // 绘制每个问题链
    chainGroups.each((chainData, chainIndex) => {
      const chainGroup = d3.select(chainGroups.nodes()[chainIndex]);
      const chainX = xScale(chainData.timeline.start);
      const chainY = chainPositions[chainData.id];
      
      // 根据时间位置获取渐变颜色
      const timeRange = state.questionChains.metadata.timeRange;
      const timeRatio = (chainData.timeline.start - timeRange.start) / (timeRange.end - timeRange.start);
      const chainColor = d3.interpolate('#4CAF50', '#2196F3')(timeRatio);
      
      // 计算这个问题链的最大高度
      const availableHeight = height - chainY - 40;
      const maxQuestions = Math.floor(availableHeight / questionSpacing);
      const displayQuestions = chainData.questions.slice(0, maxQuestions);
      
      // 绘制问题链的垂直线
      const chainHeight = (displayQuestions.length - 1) * questionSpacing;
      chainGroup.append('line')
        .attr('x1', chainX)
        .attr('x2', chainX)
        .attr('y1', timelineY)
        .attr('y2', chainY + chainHeight)
        .attr('stroke', chainColor)
        .attr('stroke-width', 4)
        .attr('opacity', 0.8);
      
      // 绘制每个问题链
      displayQuestions.forEach((question, qIndex) => {
        const nodeY = chainY + qIndex * questionSpacing;
        
        // 问题节点
        chainGroup.append('circle')
          .attr('class', 'question-node') // 添加CSS类
          .attr('cx', chainX)
          .attr('cy', nodeY)
          .attr('r', 8) // 稍微增大节点
          .attr('fill', chainColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => methods.handleNodeHover(event, question, chainData))
          .on('mouseout', () => methods.handleNodeOut())
          .on('click', () => methods.handleNodeClick(question, chainData));
        
        // 问题文本 - 显示价值分数
        if (qIndex < 5) { // 显示前5个问题的价值分数
          chainGroup.append('text')
            .attr('x', chainX + 15)
            .attr('y', nodeY + 4)
            .attr('font-size', '10px')
            .attr('fill', '#666')
            .text(`Q${qIndex + 1}(${question.valueScore})`)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => methods.handleNodeHover(event, question, chainData))
            .on('mouseout', () => methods.handleNodeOut());
        }
      });
      
      // 如果有更多问题没有显示，添加省略号指示器
      if (chainData.questions.length > displayQuestions.length) {
        const lastY = chainY + (displayQuestions.length - 1) * questionSpacing;
        chainGroup.append('text')
          .attr('x', chainX + 15)
          .attr('y', lastY + questionSpacing)
          .attr('font-size', '12px')
          .attr('fill', '#999')
          .text(`+${chainData.questions.length - displayQuestions.length} more`)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            // 显示完整问题链信息的tooltip
            this.showChainTooltip(event, chainData);
          })
          .on('mouseout', () => this.hideChainTooltip());
      }
      
      // 添加教学环节标签
      chainGroup.append('rect')
        .attr('x', chainX - 80)
        .attr('y', timelineY - 45)
        .attr('width', 160)
        .attr('height', 20)
        .attr('rx', 10)
        .attr('fill', chainColor)
        .attr('opacity', 0.8);
      
      chainGroup.append('text')
        .attr('x', chainX)
        .attr('y', timelineY - 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#fff')
        .attr('font-weight', 'bold')
        .text(`教学环节 ${chainData.id}`)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          this.showTeachingPhaseTooltip(event, chainData);
        })
        .on('mouseout', () => this.hideTeachingPhaseTooltip());
      
      // 添加认知层级变化指示器
      this.addCognitiveIndicator(chainGroup, chainX, timelineY - 15, chainData);
    });
  },
  
  // 计算问题链的垂直位置（避免重叠）
  calculateChainPositions(chains, startY, questionSpacing, maxHeight) {
    const positions = {};
    const lanes = []; // 存储每个车道的结束时间和Y位置
    
    chains.forEach(chain => {
      const chainEnd = chain.timeline.end;
      // 计算这个问题链在可视区域内能显示的问题数量
      const maxQuestions = Math.floor(maxHeight / questionSpacing);
      const displayQuestions = Math.min(chain.questions.length, maxQuestions);
      const chainHeight = (displayQuestions - 1) * questionSpacing + 40; // 问题链占用高度
      
      // 找到一个空闲的车道
      let laneIndex = 0;
      while (laneIndex < lanes.length && 
             lanes[laneIndex].endTime > chain.timeline.start && 
             lanes[laneIndex].endY + chainHeight > startY) {
        laneIndex++;
      }
      
      // 如果没有空闲车道，创建新车道
      if (laneIndex >= lanes.length) {
        lanes.push({ endTime: 0, endY: startY });
      }
      
      // 更新车道信息，确保不超出可视范围
      const yPosition = Math.max(lanes[laneIndex].endY + 30, startY);
      const maxAllowedY = startY + maxHeight - chainHeight;
      const finalY = Math.min(yPosition, maxAllowedY);
      
      lanes[laneIndex] = {
        endTime: chainEnd + 30, // 添加30秒缓冲
        endY: finalY + chainHeight
      };
      
      positions[chain.id] = finalY;
    });
    
    return positions;
  },
  
  // 添加认知层级变化指示器
  addCognitiveIndicator(container, x, y, chainData) {
    const progression = chainData.characteristics.bloomProgression;
    let iconType = 'stable';
    let iconColor = '#FFA726'; // 橙色为默认
    
    // 根据认知递进模式选择图标
    if (progression.progressionRatio > 0.6) {
      iconType = 'ascending';
      iconColor = '#4CAF50'; // 绿色表示递进
    } else if (progression.progressionRatio < 0.3 && progression.descending > progression.ascending) {
      iconType = 'descending';
      iconColor = '#F44336'; // 红色表示下降
    }
    
    // 绘制指示器背景
    container.append('rect')
      .attr('x', x - 12)
      .attr('y', y - 12)
      .attr('width', 24)
      .attr('height', 24)
      .attr('rx', 12)
      .attr('fill', iconColor)
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // 绘制箭头指示器
    let arrowPath;
    if (iconType === 'ascending') {
      arrowPath = 'M 0,-6 L -4,2 L -2,2 L -2,6 L 2,6 L 2,2 L 4,2 Z';
    } else if (iconType === 'descending') {
      arrowPath = 'M 0,6 L -4,-2 L -2,-2 L -2,-6 L 2,-6 L 2,-2 L 4,-2 Z';
    } else {
      arrowPath = 'M -6,0 L 6,0 M 3,-3 L 6,0 L 3,3';
    }
    
    container.append('path')
      .attr('d', arrowPath)
      .attr('transform', `translate(${x}, ${y})`)
      .attr('fill', iconType === 'stable' ? 'none' : '#fff')
      .attr('stroke', '#fff')
      .attr('stroke-width', iconType === 'stable' ? 2 : 0)
      .attr('stroke-linecap', 'round');
    
    // 添加工具提示
    container.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 12)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseover', (event) => methods.showCognitiveTooltip(event, chainData, iconType))
      .on('mouseout', () => methods.hideCognitiveTooltip());
  },
  
  // 处理节点悬停
  handleNodeHover(event, questionData, chainData) {
    state.hoveredQuestion = questionData;
    this.showQuestionTooltip(event, questionData, chainData);
    
    // 高亮当前节点
    d3.select(event.currentTarget)
      .transition()
      .duration(150)
      .attr('r', 12)
      .attr('stroke-width', 4);
  },
  
  // 处理节点移出
  handleNodeOut() {
    state.hoveredQuestion = null;
    this.hideQuestionTooltip();
    
    // 只恢复当前组件内的问题节点大小
    d3.select(qMap2.value).selectAll('.question-node')
      .transition()
      .duration(150)
      .attr('r', 8)
      .attr('stroke-width', 3);
  },
  
  // 处理节点点击
  handleNodeClick(questionData, chainData) {
    state.selectedChain = chainData.id;
    console.log('选中问题:', questionData.question);
    console.log('所属问题链:', chainData.id);
  },
  
  // 显示问题工具提示
  showQuestionTooltip(event, questionData, chainData) {
    const tooltip = d3.select('body')
      .selectAll('#question-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'question-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('max-width', '300px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 8px; color: ${TOPIC_COLORS[chainData.primaryTopic]};">
        问题 ${questionData.chainIndex + 1} - ${questionData.blmType} (${questionData.mat})
      </div>
      <div style="margin-bottom: 6px;">
        <strong>问题:</strong> ${questionData.question}
      </div>
      ${questionData.answer ? `
      <div style="margin-bottom: 6px;">
        <strong>回答:</strong> ${questionData.answer}
      </div>` : ''}
      <div style="font-size: 10px; color: #ccc;">
        时间: ${Math.floor(questionData.beginTime / 60)}:${String(questionData.beginTime % 60).padStart(2, '0')}
        ${questionData.question_sentiment ? ` | 情感: ${questionData.question_sentiment.classification}` : ''}
      </div>
    `);
    
    // 定位tooltip
    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },
  
  // 隐藏问题工具提示
  hideQuestionTooltip() {
    d3.select('#question-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  },
  
  // 显示认知指示器工具提示
  showCognitiveTooltip(event, chainData, iconType) {
    const progression = chainData.characteristics.bloomProgression;
    const tooltip = d3.select('body')
      .selectAll('#cognitive-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'cognitive-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '6px')
      .style('font-size', '11px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');
    
    const typeText = {
      ascending: '认知递进',
      stable: '认知平行',
      descending: '认知下降'
    };
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${typeText[iconType]}
      </div>
      <div style="font-size: 10px;">
        递进: ${progression.ascending} | 平行: ${progression.stable} | 下降: ${progression.descending}
      </div>
    `);
    
    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 30) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },
  
  // 隐藏认知指示器工具提示
  hideCognitiveTooltip() {
    d3.select('#cognitive-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  },
  
  // 显示教学环节工具提示
  showTeachingPhaseTooltip(event, chainData) {
    const tooltip = d3.select('body')
      .selectAll('#teaching-phase-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'teaching-phase-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('max-width', '400px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
        ${chainData.teachingPhase}
      </div>
      <div style="margin-bottom: 6px;">
        <strong>核心问题:</strong> ${chainData.coreQuestion}
      </div>
      <div style="margin-bottom: 6px;">
        <strong>问题数量:</strong> ${chainData.questionCount}个 (显示${Math.min(chainData.questionCount, 5)}个)
      </div>
      <div style="margin-bottom: 6px;">
        <strong>时间范围:</strong> ${Math.floor(chainData.timeline.start / 60)}:${String(chainData.timeline.start % 60).padStart(2, '0')} - ${Math.floor(chainData.timeline.end / 60)}:${String(chainData.timeline.end % 60).padStart(2, '0')}
      </div>
      <div style="margin-bottom: 6px;">
        <strong>主要话题:</strong> ${chainData.primaryTopic}
      </div>
      <div style="margin-bottom: 6px;">
        <strong>认知层级:</strong> ${chainData.primaryBloomLevel}
      </div>
      <div style="margin-bottom: 6px;">
        <strong>平均价值分:</strong> ${chainData.characteristics.avgValueScore.toFixed(2)}
      </div>
      <div style="font-size: 10px; color: #ccc;">
        ${chainData.characteristics.bloomProgression.pattern} | 问题密度: ${chainData.characteristics.intensity.toFixed(1)}/分钟
      </div>
    `);
    
    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },
  
  // 隐藏教学环节工具提示
  hideTeachingPhaseTooltip() {
    d3.select('#teaching-phase-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  },
  
  // 显示问题链工具提示
  showChainTooltip(event, chainData) {
    const tooltip = d3.select('body')
      .selectAll('#chain-tooltip')
      .data([1])
      .join('div')
      .attr('id', 'chain-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('max-width', '400px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');
    
    const allQuestions = chainData.questions.map((q, i) => 
      `${i + 1}. ${q.question.substring(0, 60)}${q.question.length > 60 ? '...' : ''} (价值分: ${q.valueScore})`
    ).join('<br/>');
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
        教学环节: ${chainData.teachingPhase.substring(0, 30)}...
      </div>
      <div style="margin-bottom: 6px;">
        <strong>核心问题:</strong> ${chainData.coreQuestion}
      </div>
      <div style="margin-bottom: 8px;">
        <strong>共${chainData.questions.length}个问题，平均价值分: ${chainData.characteristics.avgValueScore.toFixed(2)}</strong>
      </div>
      <div style="font-size: 10px; border-top: 1px solid #333; padding-top: 8px; max-height: 200px; overflow-y: auto;">
        ${allQuestions}
      </div>
    `);
    
    const [x, y] = d3.pointer(event, document.body);
    tooltip
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  },
  
  // 隐藏问题链工具提示
  hideChainTooltip() {
    d3.select('#chain-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }
});

onMounted(() => {
  nextTick(() => {
    methods.visQuestionChains();
  });
  
  // 窗口大小变化时重新绘制
  window.addEventListener('resize', () => {
    setTimeout(() => methods.visQuestionChains(), 100);
  });
});
</script>

<template>
  <div class="question-chains-container" ref="qMap2">
    <!-- 可视化将通过D3.js渲染到这里 -->
  </div>
</template>

<style scoped>
.question-chains-container {
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* D3.js 生成的SVG样式优化 */
:deep(.chain-group) {
  transition: opacity 0.3s ease;
}

:deep(.question-node circle:hover) {
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
}

:deep(.cognitive-indicator:hover) {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

/* 工具提示样式增强 */
:deep(#question-tooltip),
:deep(#cognitive-tooltip),
:deep(#chain-tooltip),
:deep(#teaching-phase-tooltip) {
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .question-chains-container {
    padding: 5px;
  }
}

/* 加载状态 */
.question-chains-container.loading::after {
  content: "正在加载问题链数据...";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #666;
  font-size: 16px;
}
</style>