# LLM-Chat
基于 Vue3 + Vite + Element Plus + Typescript 的现代化 AI 聊天应用，支持多种大语言模型，提供流畅的对话体验。

## 特性

- 支持多种大语言模型 (DeepSeek R1/V3、Qwen系列、Flux文生图 等)
- 流式响应，实时显示 AI 回复
- 深色/浅色主题切换，UI界面圆角化
- 完整的 Markdown 支持，包括代码高亮
- 消息编辑、重新生成、复制等功能
- 侧边栏新建话题，每个话题支持token分别统计
- 全局对话搜索框（Ctrl+K），既可以搜索历史，也能快捷对话
- 支持图片和文件上传
- 自动保存对话历史
- 丰富的模型参数配置

## 快速开始

### 推荐 IDE 配置
[VSCode](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (禁用 Vetur) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

### 环境要求

- Node.js 16.0+
- npm 7.0+

### 安装

```bash
# 克隆项目
git clone https://github.com/STEVENTAN100/LLM-Chat.git

# 进入项目目录
cd LLM-Chat

# 安装nrm
npm install -g nrm

# 使用淘宝源
nrm use taobao

# 安装依赖
npm install

# 启动开发服务器
npm run dev

```

### 获取API密钥：[siliconflow网址](https://siliconflow.cn/zh-cn/)

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 现代前端构建工具
- Element Plus - Vue 3 组件库
- Pinia - Vue 状态管理
- Markdown-it - Markdown 渲染
- Highlight.js - 代码语法高亮

## 项目结构

```
src/
├── assets/         # 静态资源
│   └── styles/     # 样式文件
├── components/     # 组件
│   ├── ChatMessage.vue    # 消息组件
│   ├── ChatInput.vue      # 输入组件
│   |── SearchBar.vue      # 搜索组件
│   |── SettingsPanel.vue  # 设置面板
│   └── SideBar.vue      # 侧边栏组件
├── stores/         # 状态管理
│   ├── chat.ts     # 聊天状态
│   └── settings.ts # 设置状态
├── utils/          # 工具函数
│   ├── api.ts      # API 请求
│   ├── markdown.ts # Markdown 处理
│   └── messageHandler.ts # 消息处理
├── views/          # 页面视图
│   └── ChatView.vue # 聊天视图
└── App.vue         # 根组件
```

## 配置说明

在设置面板中可以配置以下参数：

- API 密钥 - 用于访问 AI 接口
- 模型选择 - 支持多种 AI 模型
- Temperature - 控制回答的随机性 (0-1)
- Top P - 控制词汇采样范围
- Top K - 控制词汇选择数量
- Frequency Penalty - 重复文字惩罚
- 最大 Token - 限制回答长度
- 流式响应 - 开启/关闭打字机效果

## CICD
项目部署网站为：https://139.155.143.204/ 、 https://200success.online （电脑访问可以）

## 鸣谢

感谢 [AIchat](https://github.com/wjc7jx/AIchat) 提供的代码参考。
