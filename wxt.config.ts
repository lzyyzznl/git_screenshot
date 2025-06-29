import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
	webExt: {
		// 启动配置
		startUrls: ["https://www.bing.com/search?q=wxt", "https://www.bing.com"], // 可选：启动时打开的页面
	},
	manifest: {
		name: "浏览器录屏助手",
		description: "功能强大的浏览器录屏工具，支持屏幕注释、视频转换和多格式导出",
		version: "1.0.0",
		permissions: [
			"activeTab",
			"desktopCapture",
			"storage",
			"scripting",
			"unlimitedStorage",
		],
		host_permissions: ["<all_urls>"],
		icons: {
			"16": "icon/16.png",
			"48": "icon/48.png",
			"128": "icon/128.png",
		},
		action: {
			default_popup: "popup/index.html",
			default_icon: {
				"16": "icon/16.png",
				"48": "icon/48.png",
				"128": "icon/128.png",
			},
			default_title: "录屏助手",
		},
		// background 和 content_scripts 由 WXT 根据 entrypoints 目录自动生成
		web_accessible_resources: [
			{
				resources: ["assets/*", "workers/*", "result/*"],
				matches: ["<all_urls>"],
			},
		],
		commands: {
			"stop-recording": {
				suggested_key: {
					default: "Ctrl+Shift+R",
					mac: "Command+Shift+R",
				},
				description: "停止录制",
			},
			"pause-recording": {
				suggested_key: {
					default: "Ctrl+Shift+P",
					mac: "Command+Shift+P",
				},
				description: "暂停/恢复录制",
			},
			"toggle-toolbar": {
				suggested_key: {
					default: "Ctrl+Shift+H",
					mac: "Command+Shift+H",
				},
				description: "显示/隐藏工具栏",
			},
		},
	},
	vite: (env) => ({
		define: {
			__DEV__: env.mode === "development",
		},
		build: {
			minify: env.mode === "production",
			sourcemap: env.mode === "development",
			// 移除 manualChunks 配置，因为它与 WXT 的 inlineDynamicImports 冲突
			// 浏览器扩展通常不需要手动分割代码块
		},
	}),
});
