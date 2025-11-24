<template>
  <div class="role-selector">
    <!-- <div class="role-selector-title">请选择您希望对话的专家角色</div> -->
    <div class="role-cards">
      <div
        v-for="role in roles"
        :key="role.id"
        class="role-card"
        :class="{ 'role-card-selected': selectedRole?.id === role.id }"
        @click="selectRole(role)"
      >
        <div class="role-avatar" :title="role.title">
          <!-- 使用本地SVG图标 -->
          <img :src="getIconUrl(role.iconType)" :alt="role.title" class="role-icon" />
        </div>
        <div class="role-info">
          <div class="role-title">{{ role.title }}</div>
          <div class="role-description">{{ role.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AGENT_ROLES, type AgentRole } from '../../utils/agent-roles';

// 导入本地SVG图标
import jiaoyuxuezheIcon from '../../assets/jiaoyuxuezhe.svg';
import jiaoxuefazhuanjiaIcon from '../../assets/jiaoxuefazhuanjia.svg';
import quyujiaoyanyuanIcon from '../../assets/quyujiaoyanyuan.svg';
import xueketongchaiIcon from '../../assets/xueketongchai.svg';
import jishuzhuanjiaIcon from '../../assets/jishuzhuanjia.svg';

const emit = defineEmits<{
  select: [role: AgentRole]
}>();

const roles = ref(AGENT_ROLES);
const selectedRole = ref<AgentRole | null>(null);

// 图标映射
const iconMap: Record<string, string> = {
  'icon-jiaoyuxuezhe': jiaoyuxuezheIcon,
  'icon-jiaoxuefazhuanjia': jiaoxuefazhuanjiaIcon,
  'icon-quyujiaoyanyuan': quyujiaoyanyuanIcon,
  'icon-xueketongchai': xueketongchaiIcon,
  'icon-jishuzhuanjia': jishuzhuanjiaIcon,
};

const getIconUrl = (iconType: string) => {
  return iconMap[iconType] || '';
};

const selectRole = (role: AgentRole) => {
  selectedRole.value = role;
  emit('select', role);
};
</script>

<style scoped>
.role-selector {
  width: 100%;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.role-selector-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 20px;
  text-align: center;
}

.role-cards {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
}

.role-card {
  flex: 1;
  min-width: 0;
  max-width: 180px;
  padding: 16px 12px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.role-card:hover {
  border-color: #1890ff;
  background: #f0f8ff;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.role-card-selected {
  border-color: #1890ff;
  background: #e6f4ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

.role-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #667eea;
  background: white;
}

.role-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  /* filter: brightness(0) invert(1); 将SVG转为白色 */
}

.role-info {
  text-align: center;
  width: 100%;
}

.role-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.role-description {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 768px) {
  .role-cards {
    gap: 12px;
  }

  .role-card {
    width: 120px;
    padding: 12px 8px;
  }

  .role-avatar {
    width: 56px;
    height: 56px;
  }

  .role-icon {
    width: 32px;
    height: 32px;
  }
}
</style>
