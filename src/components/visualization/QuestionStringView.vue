<script setup>
import { reactive, onMounted, ref, nextTick } from "vue";
import * as d3 from 'd3';
import questionChainsData from '../../data/structured_question_chains.json';
import classStructure from '../../data/class_structure.json';

const qMap2 = ref(null);

const state = reactive({
  id: 0,
  questionChains: null,
  selectedChain: null,
  hoveredQuestion: null,
});

// 处理教学环节名称，去除序号前缀
function processPhaseNames(content) {
  // 匹配模式：一、二、三、四、等
  const pattern = /^[一二三四五六七八九十]+、(.+)/;
  const match = content.match(pattern);
  return match ? match[1] : content;
}

// 教学环节颜色映射
const PHASE_COLORS = [
  '#8FBC8F',  // 浅绿色
  '#FFB366',  // 橙色
  '#87CEEB',  // 天蓝色
  '#DDA0DD',  // 梅花紫
  '#F0E68C'   // 卡其色
];

// 认知模式类型
const COGNITIVE_PATTERNS = {
  'ascending': '递进型',
  'stable': '平行型',
  'descending': '下降型'
};

const methods = reactive({
  visQuestionChains() {
    state.questionChains = questionChainsData;
    
    if (!state.questionChains || !state.questionChains.chains) {
      console.log('等待问题链数据加载...');
      return;
    }
    
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
      
      // 设置图表尺寸和边距（增加左右边距以确保内容完全可见）
      const margin = { top: 40, right: 30, bottom: 10, left: 30 };
      const width = containerWidth - margin.left - margin.right;
      const height = containerHeight - margin.top - margin.bottom;
      
      // 创建主SVG
      const svg = d3.select(qMap2.value)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .style('background', '#ffffff');
      
      // 创建主绘图区域
      const mainGroup = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // 获取教学环节数据
      const phases = classStructure.child || [];
      const chains = state.questionChains.chains;
      const timeRange = state.questionChains.metadata.timeRange;
      
      // 创建时间比例尺
      const xScale = d3.scaleLinear()
        .domain([timeRange.start, timeRange.end])
        .range([0, width]);
      
      // 绘制教学环节条形图
      this.drawPhaseBars(mainGroup, phases, chains, xScale, width, height);
      
      // 处理并绘制问题链（基于第二级child）
      this.processAndDrawQuestionChains(mainGroup, phases, chains, xScale, width, height);
      
    } catch (error) {
      console.error('绘制问题链时间轴时出错:', error);
    }
  },
  
  // 绘制教学环节条形图
  drawPhaseBars(container, phases, chains, xScale, width, height) {
    const barHeight = 30;
    const barY = 20;
    
    // 先创建矩形组
    const rectGroup = container.append('g').attr('class', 'phase-rects');
    
    // 用于存储矩形和相关信息
    const phaseData = [];
    
    // 第一步：绘制所有矩形并收集信息
    phases.forEach((phase, index) => {
      const phaseName = processPhaseNames(phase.content);
      const phaseColor = PHASE_COLORS[index % PHASE_COLORS.length];
      
      // 计算环节的起始和结束时间
      const beginTime = phase.beginTime || 0;
      const endTime = phases[index + 1]?.beginTime || 2800;
      
      const startX = xScale(beginTime);
      const endX = xScale(endTime);
      const segmentWidth = endX - startX;
      
      // 绘制环节条形
      const rect = rectGroup.append('rect')
        .attr('x', startX)
        .attr('y', barY)
        .attr('width', segmentWidth)
        .attr('height', barHeight)
        .attr('fill', phaseColor)
        .attr('opacity', 0.8)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');
      
      // 创建临时文本元素来测量文本宽度
      const tempText = container.append('text')
        .style('visibility', 'hidden')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(phaseName);
      const textWidth = tempText.node().getComputedTextLength();
      tempText.remove();
      
      // 判断文本是否能完整显示在矩形中
      const canFitText = textWidth < segmentWidth - 10;
      
      // 保存数据供后续使用
      phaseData.push({
        rect,
        phaseName,
        startX,
        segmentWidth,
        canFitText
      });
    });
    
    // 第二步：创建文本组（在所有矩形之后）
    const textGroup = container.append('g').attr('class', 'phase-texts');
    const textElements = [];
    
    // 第三步：添加所有文本并设置交互
    phaseData.forEach((data, index) => {
      const { rect, phaseName, startX, segmentWidth, canFitText } = data;
      
      // 添加环节名称
      const phaseText = textGroup.append('text')
        .attr('x', startX + segmentWidth / 2)
        .attr('y', barY + barHeight / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .style('opacity', canFitText ? 1 : 0)
        .style('pointer-events', 'none')
        .text(phaseName);
      
      // 保存文本元素信息
      textElements.push({
        element: phaseText,
        canFit: canFitText
      });
      
      // 只为无法完整显示的文本添加交互效果
      if (!canFitText) {
        rect
          .on('mouseover', function(event) {
            // 隐藏其他所有环节名称
            textElements.forEach(item => {
              if (item.element !== phaseText) {
                item.element.style('opacity', 0);
              }
            });
            
            // 显示当前环节名称
            phaseText.style('opacity', 1);
            
            // 高亮当前矩形
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 1);
          })
          .on('mouseout', function() {
            // 恢复矩形透明度
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 0.8);
            
            // 恢复所有文本的初始显示状态
            textElements.forEach(item => {
              item.element.style('opacity', item.canFit ? 1 : 0);
            });
          });
      }
    });
  },
  
  // 处理并绘制问题链（基于第二级child）
  processAndDrawQuestionChains(container, phases, chains, xScale, width, height) {
    const barY = 20;
    const barHeight = 30;
    const questionStartY = barY + barHeight + 20;
    const availableHeight = height - questionStartY - 10;
    
    // 收集所有需要显示的问题链
    const chainsToDisplay = [];
    
    // 遍历每个一级教学环节
    phases.forEach((phase, phaseIndex) => {
      const beginTime = phase.beginTime || 0;
      const endTime = phases[phaseIndex + 1]?.beginTime || 2800;
      
      // 获取该环节内的所有问题链
      const phaseChains = chains.filter(chain => 
        chain.timeline.start >= beginTime && 
        chain.timeline.start < endTime
      );
      
      // 检查是否有第二级child
      if (phase.child && phase.child.length > 0) {
        // 第二级child的数量决定要显示的问题链数量
        const numChainsNeeded = phase.child.length;
        
        // 如果实际问题链数量不足，需要拆分现有问题链
        if (phaseChains.length < numChainsNeeded && phaseChains.length > 0) {
          // 取第一条问题链并拆分其问题
          const mainChain = phaseChains[0];
          const questionsPerChild = Math.ceil(mainChain.questions.length / numChainsNeeded);
          
          phase.child.forEach((subPhase, subIndex) => {
            // 计算子环节的时间范围
            const subDuration = (endTime - beginTime) / numChainsNeeded;
            const subBeginTime = beginTime + subDuration * subIndex;
            const subEndTime = beginTime + subDuration * (subIndex + 1);
            
            // 创建虚拟问题链，包含部分问题
            const startIdx = subIndex * questionsPerChild;
            const endIdx = Math.min(startIdx + questionsPerChild, mainChain.questions.length);
            const virtualChain = {
              ...mainChain,
              questions: mainChain.questions.slice(startIdx, endIdx),
              timeline: {
                ...mainChain.timeline,
                start: subBeginTime
              }
            };
            
            // 确保每个虚拟链至少有2个问题
            if (virtualChain.questions.length < 2) {
              // 如果原分段问题不足2个，从整个链中选取问题
              const minQuestions = Math.min(2, mainChain.questions.length);
              if (virtualChain.questions.length === 0) {
                // 如果没有问题，使用链的前几个问题
                virtualChain.questions = mainChain.questions.slice(0, minQuestions);
              } else if (virtualChain.questions.length === 1) {
                // 如果只有1个问题，补充一个邻近的问题
                const nextIdx = Math.min(endIdx, mainChain.questions.length - 1);
                if (nextIdx > startIdx) {
                  virtualChain.questions.push(mainChain.questions[nextIdx]);
                } else if (startIdx > 0) {
                  virtualChain.questions.unshift(mainChain.questions[startIdx - 1]);
                }
              }
            }
            
            chainsToDisplay.push({
              chain: virtualChain,
              subPhase: subPhase,
              timeRange: { start: subBeginTime, end: subEndTime }
            });
          });
        } else {
          // 有足够的问题链，按原逻辑处理
          const topChains = phaseChains
            .sort((a, b) => b.characteristics.avgValueScore - a.characteristics.avgValueScore)
            .slice(0, numChainsNeeded);
          
          phase.child.forEach((subPhase, subIndex) => {
            if (subIndex < topChains.length) {
              // 计算子环节的时间范围
              let subBeginTime = subPhase.beginTime || beginTime;
              let subEndTime;
              
              if (phase.child[subIndex + 1]) {
                subEndTime = phase.child[subIndex + 1].beginTime || endTime;
              } else {
                subEndTime = endTime;
              }
              
              const selectedChain = topChains[subIndex];
              
              chainsToDisplay.push({
                chain: selectedChain,
                subPhase: subPhase,
                timeRange: { start: subBeginTime, end: subEndTime }
              });
            }
          });
        }
      } else {
        // 如果没有第二级child，显示1条最高价值的问题链
        if (phaseChains.length > 0) {
          const bestChain = phaseChains.reduce((prev, curr) => 
            curr.characteristics.avgValueScore > prev.characteristics.avgValueScore ? curr : prev
          );
          
          chainsToDisplay.push({
            chain: bestChain,
            subPhase: phase,
            timeRange: { start: beginTime, end: endTime }
          });
        }
      }
    });
    
    // 绘制筛选出的问题链
    chainsToDisplay.forEach((item, index) => {
      const { chain, subPhase, timeRange } = item;
      
      // 根据时间范围决定显示的问题数
      const duration = (timeRange.end - timeRange.start) / 60; // 转换为分钟
      let maxQuestions = 3;
      if (duration >= 10) {
        maxQuestions = 6;
      } else if (duration >= 5) {
        maxQuestions = 5;
      } else if (duration >= 3) {
        maxQuestions = 4;
      }
      
      // 只显示在时间范围内的问题
      const filteredChain = {
        ...chain,
        questions: chain.questions.filter(q => 
          q.beginTime >= timeRange.start && q.beginTime <= timeRange.end
        )
      };
      
      // 如果没有符合时间的问题，使用原始链的问题
      if (filteredChain.questions.length === 0) {
        filteredChain.questions = chain.questions;
      }
      
      this.drawSingleChain(container, filteredChain, xScale, questionStartY, availableHeight, maxQuestions);
    });
  },
  
  // 绘制单个问题链
  drawSingleChain(container, chain, xScale, startY, availableHeight, maxQuestions) {
    const barY = 20;
    const barHeight = 30;
    
    // 筛选高价值问题
    let importantQuestions = chain.questions
      .filter(q => q.valueScore >= 2.0)
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, maxQuestions);
    
    // 确保至少有2个问题（如果链中有足够的问题）
    const minQuestionsRequired = Math.min(2, chain.questions.length);
    
    // 如果没有足够的高价值问题，选择最高分的几个
    if (importantQuestions.length < minQuestionsRequired) {
      importantQuestions = chain.questions
        .sort((a, b) => b.valueScore - a.valueScore)
        .slice(0, Math.max(minQuestionsRequired, Math.min(maxQuestions, chain.questions.length)));
    }
    
    // 按时间顺序排序
    importantQuestions.sort((a, b) => a.beginTime - b.beginTime);
    
    // 如果问题少于2个，不绘制这条链
    if (importantQuestions.length < 2) return;
    
    const chainX = xScale(chain.timeline.start);
    
    // 创建问题链组
    const chainGroup = container.append('g')
      .attr('class', `chain-group`);
    
    // 绘制起始节点（红点）
    chainGroup.append('circle')
      .attr('cx', chainX)
      .attr('cy', barY + barHeight)
      .attr('r', 4)
      .attr('fill', '#FF4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    
    // 在红点上方绘制认知模式标注
    if (chain.characteristics && chain.characteristics.bloomProgression) {
      const progression = chain.characteristics.bloomProgression;
      const total = progression.ascending + progression.stable + progression.descending;
      if (total > 0) {
        const patternType = this.determinePatternType({
          ascending: progression.ascending / total,
          stable: progression.stable / total,
          descending: progression.descending / total
        });
        this.drawCognitivePattern(chainGroup, chainX, barY - 5, patternType);
      }
    }
    
    // 计算问题节点位置（基于时间间隔）
    const timeRange = importantQuestions[importantQuestions.length - 1].beginTime - importantQuestions[0].beginTime;
    const maxSpacing = availableHeight / importantQuestions.length;
    const minSpacing = 15;
    
    let nodePositions = [];
    if (timeRange > 0 && importantQuestions.length > 1) {
      // 基于时间间隔计算位置
      importantQuestions.forEach((question, index) => {
        if (index === 0) {
          nodePositions.push(startY);
        } else {
          const timeDiff = question.beginTime - importantQuestions[index - 1].beginTime;
          const timeRatio = timeDiff / timeRange;
          const spacing = Math.min(Math.max(timeRatio * availableHeight * 0.4, minSpacing), maxSpacing);
          nodePositions.push(nodePositions[index - 1] + spacing);
        }
      });
    } else {
      // 均匀分布
      const spacing = Math.min(availableHeight / (importantQuestions.length + 1), 25);
      importantQuestions.forEach((question, index) => {
        nodePositions.push(startY + spacing * index);
      });
    }
    
    // 确保不超出可视范围
    const maxY = startY + availableHeight - 10;
    nodePositions = nodePositions.map(y => Math.min(y, maxY));
    
    // 绘制垂直连接线（终止于最后一个节点）
    if (nodePositions.length > 0) {
      const lastY = nodePositions[nodePositions.length - 1];
      chainGroup.append('line')
        .attr('x1', chainX)
        .attr('x2', chainX)
        .attr('y1', barY + barHeight)
        .attr('y2', lastY)
        .attr('stroke', '#999')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);
    }
    
    // 绘制问题节点
    importantQuestions.forEach((question, qIndex) => {
      const nodeY = nodePositions[qIndex];
      
      // 问题节点组
      const node = chainGroup.append('g')
        .attr('class', 'question-node')
        .style('cursor', 'pointer');
      
      // 节点圆形
      node.append('circle')
        .attr('cx', chainX)
        .attr('cy', nodeY)
        .attr('r', 5)
        .attr('fill', '#ddd')
        .attr('stroke', '#999')
        .attr('stroke-width', 1)
        .on('mouseover', (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', 7)
            .attr('fill', '#bbb');
          this.showQuestionTooltip(event, question, chain);
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', 5)
            .attr('fill', '#ddd');
          this.hideQuestionTooltip();
        });
      
      // 问题标签
      node.append('text')
        .attr('x', chainX +7)
        .attr('y', nodeY + 3)
        .attr('text-anchor', 'start')
        .attr('font-size', '9px')
        .attr('fill', '#666')
        .text(`Q${qIndex + 1}`);
    });
  },
  
  // 计算平均认知进程
  calculateAvgProgression(chains) {
    let totalAscending = 0;
    let totalStable = 0;
    let totalDescending = 0;
    
    chains.forEach(chain => {
      const prog = chain.characteristics.bloomProgression;
      totalAscending += prog.ascending || 0;
      totalStable += prog.stable || 0;
      totalDescending += prog.descending || 0;
    });
    
    const total = totalAscending + totalStable + totalDescending;
    return {
      ascending: total > 0 ? totalAscending / total : 0,
      stable: total > 0 ? totalStable / total : 0,
      descending: total > 0 ? totalDescending / total : 0
    };
  },
  
  // 确定认知模式类型
  determinePatternType(progression) {
    if (progression.ascending > 0.5) return 'ascending';
    if (progression.descending > 0.3) return 'descending';
    return 'stable';
  },
  
  // 绘制认知模式标注
  drawCognitivePattern(container, x, y, patternType) {
    const patternGroup = container.append('g')
      .attr('transform', `translate(${x}, ${y})`);
    
    // 绘制不同样式的图标
    let pathData;
    if (patternType === 'ascending') {
      // 阶梯向上形状
      pathData = 'M -10,2 L -10,0 L -6,0 L -6,-2 L -2,-2 L -2,-4 L 2,-4 L 2,-6 L 6,-6 L 6,-8 L 10,-8';
    } else if (patternType === 'descending') {
      // 阶梯向下形状
      pathData = 'M -10,-8 L -10,-6 L -6,-6 L -6,-4 L -2,-4 L -2,-2 L 2,-2 L 2,0 L 6,0 L 6,2 L 10,2';
    } else {
      // 平行线
      pathData = 'M -10,-3 L 10,-3';
    }
    
    patternGroup.append('path')
      .attr('d', pathData)
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');
    
    // 添加文字标注
    patternGroup.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .text(`(${COGNITIVE_PATTERNS[patternType]})`);
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
      .style('padding', '10px')
      .style('border-radius', '6px')
      .style('font-size', '11px')
      .style('max-width', '350px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 6px;">
        问题详情
      </div>
      <div style="margin-bottom: 4px;">
        <strong>问题:</strong> ${questionData.question}
      </div>
      ${questionData.answer ? `
      <div style="margin-bottom: 4px;">
        <strong>回答:</strong> ${questionData.answer}
      </div>` : ''}
      <div style="margin-bottom: 4px;">
        <strong>认知层级:</strong> ${questionData.blmType}
      </div>
      <div style="margin-bottom: 4px;">
        <strong>价值分数:</strong> ${questionData.valueScore}
      </div>
      <div style="font-size: 9px; color: #ccc;">
        时间: ${Math.floor(questionData.beginTime / 60)}:${String(questionData.beginTime % 60).padStart(2, '0')}
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
  
  // 隐藏问题工具提示
  hideQuestionTooltip() {
    d3.select('#question-tooltip')
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
  border-radius: 4px;
  /* box-shadow: 0 1px 4px rgba(0,0,0,0.1); */
  box-sizing: border-box;
}

/* 问题节点样式 */
:deep(.question-node circle) {
  transition: all 0.2s ease;
}

:deep(.question-node circle:hover) {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

/* 工具提示样式 */
:deep(#question-tooltip) {
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .question-chains-container {
    padding: 2px;
  }
}

/* 教学环节矩形样式 */
:deep(rect) {
  transition: opacity 0.2s ease;
}

/* 隐藏溢出内容 */
:deep(svg) {
  overflow: hidden;
}
</style>