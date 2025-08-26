<script setup>
import { defineComponent, reactive, onMounted, ref, toRefs, effect, nextTick } from "vue";
// import HeaderView from "./HeaderView.vue";
// import * as Plot from "@observablehq/plot";
import * as d3 from 'd3';
// import { legend } from "@d3/color-legend"
import {
  MIDDLE_COLUMN_WIDTH_COEFFICIENT, BLOOM_CLASS, BLOOM_DICT,
  BLOOM_REMEMBER, BLOOM_UNDERSTAND, BLOOM_APPLY, BLOOM_ANALYZE, BLOOM_EVALUATE, BLOOM_CREATE, BLOOM_OTHERS,
} from '../../utils/const'
import { getLessonMinute, length } from '../../utils/tools'

const classStructure = ref();
const efficientA = 0.2

const state = reactive({
  id: 0,
});
const methods = reactive({

});

const treeSvg = ref();

// 示例树形结构数据（可替换为props或接口数据）
const treeData = {
  content: "课程结构",
  child: [
    {
      content: "一、回顾与引入新课",
      beginTime: 0,
      child: [
        { content: "教师首先带领学生回顾一般三角形的性质，并引出本节课的学习内容——直角三角形。" }
      ]
    },
    {
      content: "二、直角三角形性质探究",
      beginTime: 89,
      child: [
        {
          content: "1.直角三角形边角关系总结",
          beginTime: 89,
          child: [
            { content: "教师要求学生完成课本上的探究，通过提问的方式引导学生总结直角三角形的性质：" },
            // { content: "（1）直角三角形的内角和为180度；两锐角互余。" },
            // { content: "（2）直角三角形斜边的平方等于两直角边平方的和。" },
            // { content: "（3）作图时，可以将一般图形通过割或补的方法转化为特殊的、可求解面积的图形。" }
          ]
        },
        {
          content: "2.勾股定理证明",
          beginTime: 627,
          child: [
            { content: "教师要求学生用严格的推理证明来验证上述猜想的正确性。" },
            { content: "提示学生先将文字命题转化为符号语言和几何语言，然后从数的角度和形的角度分别进行思考。" },
            { content: "教师请学生展示自己的证明方法并进行讲解。" },
            // { content: "（1）学生展示证明方法：第一种是利用等积法，将图形补充为一个大正方形减去四个小三角形，得到a^2 + b^2 = c^2；第二种是利用赵爽弦图，将图形割补为一个正方形和一个梯形，再结合直角三角形的性质进行计算，最终得出a^2 + b^2 = c^2。" },
            // { content: "（2）教师总结上述证明方法后，说明该猜想称为勾股定理，并介绍其其他名称：毕达哥拉斯定理或达格拉斯定理。" }
          ]
        }
      ]
    },
    {
      content: "三、勾股定理应用练习",
      beginTime: 1482,
      child: [
        { content: "1.教师带领学生运用勾股定理解决实际问题，强调在具体做题过程中要注意前提条件是直角三角形，要明确直角以确定斜边。" },
        { content: "2.教师要求学生根据已知条件，利用勾股定理规范书写例题答案。" },
        { content: "3.教师指导学生完成课后练习，提醒学生在没有图的情况下要讨论再分类。" }
      ]
    },
    {
      content: "四、课堂知识回顾与总结",
      beginTime: 2721,
      child: [
        { content: "教师通过师生互动的方式带领学生回顾本节课的内容。" },
        // { content: "（1）直角三角形除了具备一般三角形的性质之外，还在边和角方面具有一些新的性质：它的两个锐角互余，且任意两直角边的平方和等于斜边的平方。" },
        // { content: "（2）在证明勾股定理时，可以从数和形两个角度进行分析。" },
        // { content: "（3）在探究问题时，可以先从特殊的直角三角形入手，再过渡到一般的直角三角形；学会将实际问题转化为数学问题，再用数学知识解决问题。" }
      ]
    }
  ]
};

const drawIndentedTree = (data, svgElement) => {
  let nodeId = 0;
  let nodes = [];
  function traverse(node, depth, parent, groupParent) {
    const thisNode = {
      id: nodeId++,
      data: node,
      content: node.content,
      depth,
      parent,
      groupParent,
      isGroup: !!node.child,
      children: node.child || [],
      collapsed: false,
      raw: node
    };
    nodes.push(thisNode);
    if (node.child && node.child.length > 0) {
      node.child.forEach(child => {
        traverse(child, depth + 1, thisNode, thisNode);
      });
    }
  }
  traverse(data, 0, null, null);

  const dx = 14; // 增加垂直间距
  const indent = 22; // 增加缩进
  const hLine = 20;
  const lineWidth = 1.5;
  const circleRadius = 3;
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }; // 减小边距
  const maxTextLen = 20; // 增加显示的文本长度
  const fontSize = 10;

  // tooltip
  d3.selectAll('.d3-tooltip').remove();
  const tooltip = d3.select("body").append("div")
    .attr("class", "d3-tooltip")
    .style("position", "absolute")
    .style("z-index", 1000)
    .style("background", "#fff")
    .style("border", "1px solid #bbb")
    .style("border-radius", "4px")
    .style("padding", "6px 10px")
    .style("font-size", fontSize)
    .style("color", "#222")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
    .style("pointer-events", "none")
    .style("display", "none");

  // 获取可见节点
  function getVisibleNodes() {
    const result = [];
    function helper(node) {
      result.push(node);
      if (!node.collapsed && node.children && node.children.length > 0) {
        node.children.forEach(child => {
          const realChild = nodes.find(n => n.parent === node && n.content === child.content);
          if (realChild) helper(realChild);
        });
      }
    }
    const root = nodes[0];
    helper(root);
    return result;
  }

  // 画图主函数
  function render() {
    const visibleNodes = getVisibleNodes();
    visibleNodes.forEach((d, i) => {
      d.x = i * dx + margin.top;
      d.y = d.depth * indent + margin.left;
    });

    // 计算实际需要的高度和宽度
    const height = Math.max(visibleNodes.length * dx + margin.top + margin.bottom, 100);
    const width = Math.max(d3.max(visibleNodes, d => d.y) + 220, 100);

    // 获取容器的实际尺寸
    const containerWidth = svgElement.parentNode.clientWidth || 400;
    const containerHeight = svgElement.parentNode.clientHeight || 300;

    // 计算缩放比例，确保图表能完全显示并填满容器
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const scale = Math.min(scaleX, scaleY) * 0.92; // 留一点边距

    const svg = d3.select(svgElement)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll('*').remove();

    // 创建一个缩放的容器
    const g = svg.append("g")
      .attr("transform", `scale(${scale}) translate(${0}, ${margin.top})`);

    // 横线
    g.append("g")
      .selectAll("line.hline")
      .data(visibleNodes.filter(d => d.depth > 0), d => d.id)
      .join(
        enter => enter.append("line")
          .attr("class", "hline")
          .attr("x1", d => d.y - indent + hLine)
          .attr("x2", d => d.y)
          .attr("y1", d => d.x)
          .attr("y2", d => d.x)
          .attr("stroke", "#bbb")
          .attr("stroke-width", lineWidth)
          .attr("opacity", 0)
          .transition().duration(300)
          .attr("opacity", 1),
        update => update.transition().duration(300)
          .attr("x1", d => d.y - indent + hLine)
          .attr("x2", d => d.y)
          .attr("y1", d => d.x)
          .attr("y2", d => d.x),
        exit => exit.transition().duration(300)
          .attr("opacity", 0)
          .remove()
      );

    // 父子直角折线
    g.append("g")
      .selectAll("path.parentlink")
      .data(visibleNodes.filter(d => d.depth > 0 && d.parent), d => d.id)
      .join(
        enter => enter.append("path")
          .attr("class", "parentlink")
          .attr("d", d => {
            const x0 = d.parent.y;
            const y0 = d.parent.x;
            const x1 = d.y - indent + hLine;
            const y1 = d.x;
            return `M${x0},${y0}V${y1}H${x1}`;
          })
          .attr("fill", "none")
          .attr("stroke", "#bbb")
          .attr("stroke-width", lineWidth)
          .attr("opacity", 0)
          .transition().duration(300)
          .attr("opacity", 1),
        update => update.transition().duration(300)
          .attr("d", d => {
            const x0 = d.parent.y;
            const y0 = d.parent.x;
            const x1 = d.y - indent + hLine;
            const y1 = d.x;
            return `M${x0},${y0}V${y1}H${x1}`;
          }),
        exit => exit.transition().duration(300)
          .attr("opacity", 0)
          .remove()
      );

    // 圆点
    g.append("g")
      .selectAll("circle")
      .data(visibleNodes, d => d.id)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => d.y)
          .attr("cy", d => d.x)
          .attr("r", circleRadius)
          .attr("fill", d => d.children && d.children.length > 0 ? "#555" : "#999")
          .attr("opacity", 0)
          .transition().duration(300)
          .attr("opacity", 1),
        update => update.transition().duration(300)
          .attr("cx", d => d.y)
          .attr("cy", d => d.x),
        exit => exit.transition().duration(300)
          .attr("opacity", 0)
          .remove()
      );

    // 文本
    g.append("g")
      .selectAll("text.tree-label")
      .data(visibleNodes, d => d.id)
      .join(
        enter => enter.append("text")
          .attr("class", "tree-label")
          .attr("x", d => d.y + fontSize)
          .attr("y", d => d.x)
          .attr("dy", "0.32em")
          .text(d => d.content.length > maxTextLen ? d.content.slice(0, maxTextLen) + '...' : d.content)
          .attr("font-size", fontSize)
          .attr("fill", "#222")
          .attr("font-family", "sans-serif")
          .style("cursor", d => d.children && d.children.length > 0 ? "pointer" : "default")
          .on("click", function (event, d) {
            if (d.children && d.children.length > 0) {
              d.collapsed = !d.collapsed;
              render();
            }
          })
          .on("mouseover", function (event, d) {
            if (d.content.length > maxTextLen) {
              tooltip.style("display", "block").html(d.content);
            }
          })
          .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY + 8) + "px");
          })
          .on("mouseout", function () {
            tooltip.style("display", "none");
          })
          .attr("opacity", 0)
          .transition().duration(300)
          .attr("opacity", 1),
        update => update.transition().duration(300)
          .attr("x", d => d.y + 12)
          .attr("y", d => d.x),
        exit => exit.transition().duration(300)
          .attr("opacity", 0)
          .remove()
      );
  }

  render();
};

onMounted(() => {
  // methods.visTeachingProcedures();
  // 绘制树图
  nextTick(() => {
    drawIndentedTree(treeData, treeSvg.value);

    window.addEventListener('resize', () => {
      drawIndentedTree(treeData, treeSvg.value);
    });
  });
});


</script>

<template>
  <div class="item" ref="qMap2">
    <svg ref="treeSvg" id="treeSvg"></svg>
  </div>
</template>

<style scoped>
.item {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 0;
}

#treeSvg {
  width: 100%;
  height: 100%;
  flex: 1;
}

#bloom {
  border: #888 1px solid;
}

#qText {
  width: 100%;
  height: 8vh;
  margin: 8px;
  background: #f7f7f7;
  border: #888 1px solid;
  border-radius: 4px;
  padding: 8px;
}

.d3-tooltip {
  pointer-events: none;
  user-select: text;
}
</style>
