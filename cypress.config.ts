import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
		supportFile: "cypress/support/e2e.ts",
		videosFolder: "cypress/videos",
		screenshotsFolder: "cypress/screenshots",
		downloadsFolder: "cypress/downloads",

		setupNodeEvents(on, config) {
			// 扩展测试相关的事件处理
			on("before:browser:launch", (browser, launchOptions) => {
				if (browser.name === "chrome" && browser.isHeadless) {
					launchOptions.args.push("--disable-web-security");
					launchOptions.args.push("--disable-features=VizDisplayCompositor");
				}

				if (browser.name === "chrome") {
					// 加载未打包的扩展
					launchOptions.args.push("--load-extension=build/chrome-mv3-dev");
					launchOptions.args.push("--allow-running-insecure-content");
					launchOptions.args.push("--disable-web-security");
					launchOptions.args.push("--allow-file-access-from-files");
					launchOptions.args.push(
						"--disable-extensions-except=build/chrome-mv3-dev"
					);
					launchOptions.args.push("--disable-extensions-file-access-check");
				}

				return launchOptions;
			});

			// 每个spec测试前清理
			on("before:spec", (spec) => {
				// 清理浏览器缓存和本地存储
				console.log(`🧹 开始清理测试环境: ${spec.name}`);
			});

			return config;
		},

		env: {
			// 测试环境变量
			extensionId: "test-extension-id",
			testTimeout: 30000,
			recordingTimeout: 10000,
		},
	},

	component: {
		devServer: {
			framework: "react",
			bundler: "webpack",
		},
		specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
		supportFile: "cypress/support/component.ts",
		indexHtmlFile: "cypress/support/component-index.html",
	},

	viewportWidth: 1280,
	viewportHeight: 720,
	video: true,
	screenshotOnRunFailure: true,

	// 超时配置
	defaultCommandTimeout: 10000,
	requestTimeout: 15000,
	responseTimeout: 15000,
	pageLoadTimeout: 30000,

	// 重试配置
	retries: {
		runMode: 2,
		openMode: 0,
	},
});
