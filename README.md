# GifShot - 屏幕录制 GIF 插件

![GifShot Logo](public/icons/icon48.png)

## 简介

GifShot 是一款基于 **WXT 框架** 开发的 Chrome 浏览器插件，支持一键录制当前标签页、桌面或应用窗口的屏幕内容，并将其保存为 GIF 动图，便于分享和传播。

## 功能特性

### 🎯 核心功能
- **屏幕录制** - 支持录制当前标签页、整个桌面或指定应用窗口
- **GIF 生成** - 实时或录制结束后将视频内容转码为 GIF 动图
- **本地保存** - 支持将生成的 GIF 文件保存到本地
- **录制时长控制** - 用户可自定义录制时长或手动停止录制

### 🛠️ 高级功能
- **录制区域选择** - 支持选择录制区域（如全屏、窗口、标签页、指定区域）
- **简单编辑** - 支持裁剪、调整帧率、添加文字等简单编辑功能
- **弹窗模式** - 提供简洁的弹窗界面和完整的应用界面

## 技术架构

### 技术栈
- **框架**: WXT (Next-gen Web Extension Framework)
- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite (通过 WXT 集成)
- **依赖管理**: Yarn
- **GIF 处理**: gif.js

### 项目结构
```
git_screenshot/
├── src/                          # 源码目录
│   ├── entrypoints/             # WXT 入口点
│   │   ├── background.ts        # 后台脚本
│   │   ├── popup/               # 弹窗页面
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   └── style.css
│   │   └── app/                 # 完整版应用
│   │       ├── index.html
│   │       ├── main.ts
│   │       ├── App.vue
│   │       └── style.css
│   ├── components/              # Vue组件 (已迁移)
│   ├── utils/                   # 工具函数
│   │   └── gifGenerator.ts      # GIF生成器
│   ├── styles/                  # 样式文件 (已迁移)
│   ├── types/                   # 类型定义
│   └── public/                  # 静态资源 (已迁移)
├── public/                      # WXT 公共资源
│   └── gif.worker.js           # GIF Worker 脚本
├── extension/                   # 构建输出目录
├── wxt.config.ts               # WXT 配置文件
├── package.json
├── tsconfig.json
└── README.md
```

## 开发指南

### 环境要求
- Node.js >= 16
- Yarn >= 1.22
- WXT >= 0.20.0

### 安装依赖
```bash
yarn install
```

### 开发模式
```bash
# Chrome 开发模式
yarn dev

# Firefox 开发模式
yarn dev:firefox
```

### 构建项目
```bash
# 构建 Chrome 版本
yarn build

# 构建 Firefox 版本
yarn build:firefox
```

### 打包发布
```bash
# 打包 Chrome 版本
yarn zip

# 打包 Firefox 版本
yarn zip:firefox
```

### 安装插件
1. 构建项目后，在 Chrome 浏览器中打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录下的 `extension/chrome-mv3` 文件夹

## 使用说明

### 基本操作
1. 点击浏览器工具栏中的 GifShot 图标
2. 选择录制类型（当前标签页/整个桌面/应用窗口）
3. 设置录制时长（1-60秒）
4. 点击"开始录制"
5. 录制完成后，预览生成的 GIF
6. 点击"保存 GIF"下载到本地

### 录制类型说明
- **当前标签页**: 只录制当前浏览器标签页内容
- **整个桌面**: 录制整个屏幕内容
- **应用窗口**: 选择特定应用窗口进行录制

### 界面模式
- **弹窗模式**: 简洁的快速录制界面
- **完整版**: 功能完整的应用界面，支持更多设置选项

## WXT 框架优势

### 🚀 现代化开发体验
- **自动类型生成**: 自动生成 TypeScript 类型定义
- **热重载**: 开发时自动重载插件
- **多浏览器支持**: 一套代码支持 Chrome、Firefox、Safari 等

### 🛠️ 强大的构建系统
- **Vite 集成**: 享受 Vite 的快速构建和热更新
- **自动优化**: 自动处理 manifest 版本兼容性
- **模块化架构**: 支持 Vue、React、Svelte 等前端框架

### 📦 简化的项目结构
- **入口点系统**: 清晰的文件组织结构
- **自动发现**: 自动识别和配置入口点
- **零配置**: 开箱即用的最佳实践配置

## 主要流程

1. 用户点击插件图标，弹出操作界面
2. 选择录制类型并设置参数
3. 通过 `getDisplayMedia` API 获取屏幕流
4. 使用 `MediaRecorder` 录制视频
5. 录制结束后，使用 gif.js 将视频转换为 GIF
6. 提供预览和下载功能

## 浏览器兼容性

- Chrome 88+
- Edge 88+
- Firefox 109+ (需要单独构建)
- 其他基于 Chromium 的浏览器

## 迁移说明

本项目已从传统的 Vite + Vue 架构迁移到 **WXT 框架**：

### 迁移内容
- ✅ 项目结构重构为 WXT 标准
- ✅ 入口点迁移到 `src/entrypoints/`
- ✅ 配置文件更新为 `wxt.config.ts`
- ✅ 构建脚本更新为 WXT 命令
- ✅ Vue 3 + TypeScript 完全兼容
- ✅ 所有功能保持一致

### 迁移优势
- 🚀 更快的开发构建速度
- 🔧 更好的开发者体验
- 📱 更简单的多浏览器支持
- 🛠️ 更现代的工具链

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (WXT 重构版)
- 🎉 迁移到 WXT 框架
- ✨ 保持所有原有功能
- 🚀 提升开发体验和构建性能
- 📦 优化项目结构和配置
- 🔧 支持多浏览器构建 