# GifShot - 屏幕录制 GIF 插件

![GifShot Logo](src/public/icons/icon48.png)

## 简介

GifShot 是一款 Chrome 浏览器插件，支持一键录制当前标签页、桌面或应用窗口的屏幕内容，并将其保存为 GIF 动图，便于分享和传播。

## 功能特性

### 🎯 核心功能
- **屏幕录制** - 支持录制当前标签页、整个桌面或指定应用窗口
- **GIF 生成** - 实时或录制结束后将视频内容转码为 GIF 动图
- **本地保存** - 支持将生成的 GIF 文件保存到本地
- **录制时长控制** - 用户可自定义录制时长或手动停止录制

### 🛠️ 高级功能（可选）
- **录制区域选择** - 支持选择录制区域（如全屏、窗口、标签页、指定区域）
- **简单编辑** - 支持裁剪、调整帧率、添加文字等简单编辑功能

## 技术架构

### 技术栈
- **前端框架**: Vue 3 + TypeScript
- **样式处理**: Less
- **构建工具**: Vite
- **依赖管理**: Yarn
- **GIF 处理**: gif.js

### 项目结构
```
gif_screenshot/
├── src/                    # 源码目录
│   ├── components/         # Vue组件
│   │   └── Popup.vue      # 弹窗主组件
│   ├── utils/             # 工具函数
│   │   └── gifGenerator.ts # GIF生成器
│   ├── styles/            # 样式文件
│   │   └── popup.less     # 弹窗样式
│   ├── types/             # 类型定义
│   │   └── gif.d.ts       # gif.js类型定义
│   ├── public/            # 静态资源
│   │   └── icons/         # 插件图标
│   ├── popup.html         # 弹窗页面
│   ├── popup.ts           # 弹窗入口
│   ├── background.ts      # 后台脚本
│   └── manifest.json      # 插件配置
├── extension/             # 构建输出目录
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 开发指南

### 环境要求
- Node.js >= 16
- Yarn >= 1.22

### 安装依赖
```bash
yarn install
```

### 开发模式
```bash
yarn dev
```

### 构建项目
```bash
yarn build
```

### 安装插件
1. 构建项目后，在 Chrome 浏览器中打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录下的 `extension` 文件夹

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
- 其他基于 Chromium 的浏览器

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的屏幕录制和 GIF 生成功能
- 支持多种录制模式
- 现代化的用户界面 