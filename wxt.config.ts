import { defineConfig } from "wxt";

export default defineConfig({
	// 使用 Vue 模块
	modules: ["@wxt-dev/module-vue"],

	// 源代码目录
	srcDir: "src",

	// 输出目录
	outDir: "extension",

	// 开发模式配置
	vite: () => ({
		build: {
			minify: false,
		},
		resolve: {
			alias: {
				"@": new URL("./src", import.meta.url).pathname,
			},
		},
	}),

	// Manifest 配置
	manifest: {
		name: "GifShot - 屏幕录制 GIF 插件",
		description: "一键录制屏幕并生成 GIF 动图",
		version: "1.0.0",
		permissions: [
			"activeTab",
			"desktopCapture",
			"storage",
			"downloads",
			"tabCapture",
			"tabs",
		],
		web_accessible_resources: [
			{
				resources: ["gif.worker.js"],
				matches: ["<all_urls>"],
			},
		],
	},
});
