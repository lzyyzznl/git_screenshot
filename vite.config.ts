import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { fileURLToPath, URL } from "node:url";
import fs from "fs";

const customPlugin = () => ({
	name: "custom-plugin-copy-and-generate",
	buildStart() {
		console.log("🚀 buildStart: 开始构建流程");
		const extensionDir = "extension";
		const iconsDir = `${extensionDir}/icons`;

		if (!fs.existsSync(extensionDir)) {
			fs.mkdirSync(extensionDir, { recursive: true });
			console.log(`✓ 创建目录: ${extensionDir}`);
		}
		if (!fs.existsSync(iconsDir)) {
			fs.mkdirSync(iconsDir, { recursive: true });
			console.log(`✓ 创建目录: ${iconsDir}`);
		}
	},
	writeBundle() {
		console.log("📝 writeBundle: 开始复制文件");
		const extensionDir = "extension";
		const iconsDir = `${extensionDir}/icons`;

		// 确保目录存在
		if (!fs.existsSync(extensionDir)) {
			fs.mkdirSync(extensionDir, { recursive: true });
		}
		if (!fs.existsSync(iconsDir)) {
			fs.mkdirSync(iconsDir, { recursive: true });
		}

		// 复制 manifest.json
		try {
			fs.copyFileSync("src/manifest.json", `${extensionDir}/manifest.json`);
			console.log("✓ 已复制 manifest.json");
		} catch (error) {
			console.error("❌ 复制 manifest.json 失败:", error);
		}

		// 复制 gif.worker.js
		try {
			fs.copyFileSync(
				"src/public/gif.worker.js",
				`${extensionDir}/gif.worker.js`
			);
			console.log("✓ 已复制 gif.worker.js");
		} catch (error) {
			console.error("❌ 复制 gif.worker.js 失败:", error);
		}

		// 复制 popup.html
		try {
			fs.copyFileSync("src/popup.html", `${extensionDir}/popup.html`);
			console.log("✓ 已复制 popup.html");
		} catch (error) {
			console.error("❌ 复制 popup.html 失败:", error);
		}

		// 复制 app.html
		try {
			fs.copyFileSync("src/app.html", `${extensionDir}/app.html`);
			console.log("✓ 已复制 app.html");
		} catch (error) {
			console.error("❌ 复制 app.html 失败:", error);
		}

		// 复制 popup-simple.html
		try {
			fs.copyFileSync(
				"src/popup-simple.html",
				`${extensionDir}/popup-simple.html`
			);
			console.log("✓ 已复制 popup-simple.html");
		} catch (error) {
			console.error("❌ 复制 popup-simple.html 失败:", error);
		}

		// 生成图标文件
		try {
			const icon16base64 =
				"iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVQ4T2NkYGD4DwQYjIiNDKPGDBpDWAwaQ1hMGDFm0BjCYsKoMQAANYABEKJ1WwkAAAAASUVORK5CYII=";
			const icon48base64 =
				"iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAARElEQVRoQ+2UQQqAMAxE3zHe/8g9mBChSlpr0lkILGzY/f+STJIYKaUkhBAyxthk7bV2ZkZmnhBCiOM4Ouecmfm11tqstX4AA5gP4DHBpWYAAAAASUVORK5CYII=";

			fs.writeFileSync(
				`${iconsDir}/icon16.png`,
				Buffer.from(icon16base64, "base64")
			);
			fs.writeFileSync(
				`${iconsDir}/icon48.png`,
				Buffer.from(icon48base64, "base64")
			);
			fs.writeFileSync(
				`${iconsDir}/icon128.png`,
				Buffer.from(icon48base64, "base64")
			);
			console.log("✓ 已生成所有图标文件");
		} catch (error) {
			console.error("❌ 生成图标失败:", error);
		}

		// 删除多余的 src 目录
		try {
			const srcPath = `${extensionDir}/src`;
			if (fs.existsSync(srcPath)) {
				fs.rmSync(srcPath, { recursive: true, force: true });
				console.log("✓ 已删除多余的 src 目录");
			}
		} catch (error) {
			console.error("❌ 删除 src 目录失败:", error);
		}
	},
});

export default defineConfig({
	plugins: [vue(), customPlugin()],
	build: {
		outDir: "extension",
		rollupOptions: {
			input: {
				popup: resolve(__dirname, "src/popup.ts"),
				background: resolve(__dirname, "src/background.ts"),
				app: resolve(__dirname, "src/app.ts"),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
		},
		copyPublicDir: false,
		minify: false,
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	publicDir: false,
});
