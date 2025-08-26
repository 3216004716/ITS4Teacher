<script setup>
import ChatView from './components/ChatView.vue'
import DataVisualView from './components/DataVisualView.vue'
import LearningPathView from './components/LearningPathView.vue'
import PortraitView from './components/PortraitView.vue'
</script>

<template>
  <div id="myApp">
    <div id="appTitle">
      <span id="mainTitle">问课：大模型驱动的人机协同教研系统</span>
      <span id="explainTitle"> Help Teachers Advance In-Class Questioning Skills</span>
    </div>
    <!-- 左右两栏布局 -->
    <div id="columnContainer">
      <!-- 左侧：上下结构 -->
      <div class='columns' id="leftColumn">
        <!-- 上方：数据可视化区和证据卡片区的左右布局 -->
        <div class="left-top-section">
          <!-- 数据可视化区 -->
          <div class="left-top-item" id="dataVisualSection">
            <DataVisualView />
          </div>
          <!-- 证据卡片区 -->
          <div class="left-top-item" id="evidenceCardSection">
            <PortraitView />
          </div>
        </div>
        <!-- 下方：教学研讨路径区 -->
        <div class="left-bottom-section" id="learningPathSection">
          <LearningPathView />
        </div>
      </div>
      
      <!-- 右侧：人机对话区 -->
      <div class='columns' id="rightColumn">
        <ChatView />
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
#myApp {
  height: 100vh;
  padding: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overflow-y: hidden;
}

#appTitle {
  padding: 4px 8px;
  background-color: #FBAB7E;
  background-image: linear-gradient(62deg, #FBAB7E 0%, #F7CE68 100%);

  #mainTitle {
    font-weight: 550;
    font-size: large;
    color: #3b3b3b;
  }

  #explainTitle {
    color: #505050;
    margin-left: 10px;
    font-style: italic;
    font-size: small;
  }
}

#columnContainer {
  display: flex;
  flex: 1;
  padding: 4px 0;
  box-sizing: border-box;
  overflow: hidden;
}

.columns {
  height: calc(100vh - 36px);
  margin-right: 4px;
  overflow-y: auto;
}

#leftColumn {
  width: 70%;
  display: flex;
  flex-direction: column;
}

/* 上方区域：左右布局 */
.left-top-section {
  display: flex;
  height: 75%; /* 上方占左侧区域的75% */
  margin-bottom: 4px;
}

/* 上方左右两个区域 */
.left-top-item {
  // border: 1px solid #f0f0f0;
  overflow-y: auto;
  height: 100%;
}

#dataVisualSection {
  width: 70%; /* 数据可视化区占上方区域的60% */
  margin-right: 4px;
}

#evidenceCardSection {
  width: 30%; /* 证据卡片区占上方区域的40% */
}

/* 下方区域 */
.left-bottom-section {
  height: 25%; /* 下方占左侧区域的25% */
  // border: 1px solid #f0f0f0;
  overflow-y: auto;
  // margin-bottom: 0;
}

#rightColumn {
  // height: calc(100vh - 36px);
  width: 30%;
  margin-right: 0px;
}
</style>
