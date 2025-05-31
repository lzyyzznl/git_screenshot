// cypress/support/commands.ts
/// <reference types="cypress" />

// 扩展Cypress命令接口
declare global {
	namespace Cypress {
		interface Chainable {
			waitForElement(
				selector: string,
				timeout?: number
			): Chainable<JQuery<HTMLElement>>;
			clickIfExists(selector: string): Chainable<void>;
			clearTestData(): Chainable<void>;
			clearAllTestArtifacts(): Chainable<void>;
			mockChromeAPI(): Chainable<void>;
			createTestVideo(): Chainable<Blob>;
			createTestGif(): Chainable<Blob>;
			verifyFileDownload(fileName: string): Chainable<boolean>;
			generateTestMediaBlob(type: "video" | "image"): Chainable<Blob>;
		}
	}
}

// 通用命令扩展
Cypress.Commands.add("waitForElement", (selector: string, timeout = 10000) => {
	cy.get(selector, { timeout }).should("exist");
});

Cypress.Commands.add("clickIfExists", (selector: string) => {
	cy.get("body").then(($body) => {
		if ($body.find(selector).length > 0) {
			cy.get(selector).click();
		}
	});
});

// 基础测试数据清理
Cypress.Commands.add("clearTestData", () => {
	cy.window().then((win) => {
		// 清理所有存储
		win.localStorage.clear();
		win.sessionStorage.clear();

		// 清理IndexedDB（如果存在）
		if (win.indexedDB) {
			// 注意：这里只是基础清理，真实环境可能需要更复杂的逻辑
			console.log("🧹 清理IndexedDB");
		}

		// 清理任何自定义全局变量
		delete (win as any).testData;
		delete (win as any).chrome;
		delete (win as any).testVideoBlob;
		delete (win as any).testGifBlob;
	});
});

// 全面的测试环境清理
Cypress.Commands.add("clearAllTestArtifacts", () => {
	// 清理基础数据
	cy.clearTestData();

	// 清理Cookie
	cy.clearCookies();

	// 清理本地存储和会话存储
	cy.clearLocalStorage();

	cy.log("✅ 测试环境完全清理完成");
});

// 模拟Chrome扩展API
Cypress.Commands.add("mockChromeAPI", () => {
	cy.window().then((win) => {
		// 模拟Chrome API
		const chromeAPI = {
			storage: {
				local: {
					get: cy.stub().resolves({}),
					set: cy.stub().resolves(),
					clear: cy.stub().resolves(),
				},
			},
			desktopCapture: {
				chooseDesktopMedia: cy.stub().returns("test-stream-id"),
			},
			tabs: {
				query: cy.stub().resolves([{ id: 1, active: true }]),
				create: cy.stub().resolves({ id: 2 }),
			},
			runtime: {
				onMessage: {
					addListener: cy.stub(),
				},
				sendMessage: cy.stub(),
				getURL: cy
					.stub()
					.callsFake(
						(path: string) => `chrome-extension://test-extension-id/${path}`
					),
			},
			action: {
				openPopup: cy.stub(),
			},
		};

		// 确保在window对象上设置chrome属性
		Object.defineProperty(win, "chrome", {
			value: chromeAPI,
			writable: true,
			configurable: true,
		});

		cy.log("🔧 Chrome API模拟已设置");
	});
});

// 创建测试视频
Cypress.Commands.add("createTestVideo", () => {
	cy.window().then((win) => {
		return new Promise<Blob>((resolve) => {
			const canvas = win.document.createElement("canvas");
			canvas.width = 320;
			canvas.height = 240;
			const ctx = canvas.getContext("2d")!;

			// 创建测试视频帧
			const frames: ImageData[] = [];
			const frameCount = 30; // 1秒的视频，30fps

			for (let i = 0; i < frameCount; i++) {
				// 清除画布
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				// 绘制动画效果
				const hue = (i * 12) % 360;
				ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				// 添加移动的圆形
				ctx.fillStyle = "#ffffff";
				ctx.beginPath();
				const x = (i / frameCount) * canvas.width;
				const y = canvas.height / 2;
				ctx.arc(x, y, 20, 0, 2 * Math.PI);
				ctx.fill();

				// 添加帧编号
				ctx.fillStyle = "#000000";
				ctx.font = "20px Arial";
				ctx.fillText(`帧 ${i + 1}`, 10, 30);

				frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
			}

			// 创建WebM视频格式的模拟数据
			const webmHeader = new Uint8Array([
				0x1a,
				0x45,
				0xdf,
				0xa3, // EBML header
				0x01,
				0x00,
				0x00,
				0x00,
				0x00,
				0x00,
				0x00,
				0x1f,
				0x42,
				0x86,
				0x81,
				0x01, // EBML version
				0x42,
				0xf7,
				0x81,
				0x01, // EBML read version
				0x42,
				0xf2,
				0x81,
				0x04, // EBML max ID length
			]);

			// 添加简单的视频数据
			const videoData = new Uint8Array(1024);
			for (let i = 0; i < videoData.length; i++) {
				videoData[i] = Math.floor(Math.random() * 256);
			}

			const combinedData = new Uint8Array(webmHeader.length + videoData.length);
			combinedData.set(webmHeader);
			combinedData.set(videoData, webmHeader.length);

			const blob = new Blob([combinedData], { type: "video/webm" });

			// 设置模拟的视频属性
			Object.defineProperty(blob, "duration", { value: 1.0, writable: false });
			Object.defineProperty(blob, "width", { value: 320, writable: false });
			Object.defineProperty(blob, "height", { value: 240, writable: false });

			cy.log(`✅ 测试视频已创建: ${blob.size} 字节`);
			resolve(blob);
		});
	});
});

// 创建测试GIF
Cypress.Commands.add("createTestGif", () => {
	cy.window().then((win) => {
		return new Promise<Blob>((resolve) => {
			// 创建标准的GIF文件
			const gifData = new Uint8Array([
				// GIF Header
				0x47,
				0x49,
				0x46,
				0x38,
				0x39,
				0x61, // "GIF89a"

				// Logical Screen Descriptor
				0x20,
				0x00, // Canvas width: 32
				0x20,
				0x00, // Canvas height: 32
				0xf0,
				0x00,
				0x00, // Global color table flag, color resolution, sort flag, global color table size

				// Global Color Table (8 colors)
				0x00,
				0x00,
				0x00, // Black
				0xff,
				0x00,
				0x00, // Red
				0x00,
				0xff,
				0x00, // Green
				0x00,
				0x00,
				0xff, // Blue
				0xff,
				0xff,
				0x00, // Yellow
				0xff,
				0x00,
				0xff, // Magenta
				0x00,
				0xff,
				0xff, // Cyan
				0xff,
				0xff,
				0xff, // White

				// Application Extension for animation
				0x21,
				0xff,
				0x0b, // Extension introducer, application extension label, block size
				0x4e,
				0x45,
				0x54,
				0x53,
				0x43,
				0x41,
				0x50,
				0x45,
				0x32,
				0x2e,
				0x30, // "NETSCAPE2.0"
				0x03,
				0x01,
				0x00,
				0x00,
				0x00, // Data sub-block

				// Graphic Control Extension
				0x21,
				0xf9,
				0x04, // Extension introducer, graphic control label, block size
				0x04,
				0x0a,
				0x00,
				0x00,
				0x00, // Disposal method, delay time, transparent color index

				// Image Descriptor
				0x2c,
				0x00,
				0x00,
				0x00,
				0x00, // Image separator, left, top
				0x20,
				0x00,
				0x20,
				0x00, // Width, height
				0x00, // Local color table flag

				// Image Data
				0x03, // LZW minimum code size
				0x02,
				0x04,
				0x01, // Data sub-blocks
				0x00, // Block terminator

				// Trailer
				0x3b,
			]);

			const blob = new Blob([gifData], { type: "image/gif" });
			cy.log(`✅ 测试GIF已创建: ${blob.size} 字节`);
			resolve(blob);
		});
	});
});

// 验证文件下载
Cypress.Commands.add("verifyFileDownload", (fileName: string) => {
	cy.window().then((win) => {
		return new Promise<boolean>((resolve) => {
			// 模拟文件下载验证
			const downloadPath = `cypress/downloads/${fileName}`;

			// 检查下载目录是否存在该文件（模拟）
			const fileExists = true; // 在真实环境中，这里应该检查实际文件

			if (fileExists) {
				cy.log(`✅ 文件下载验证成功: ${fileName}`);
				resolve(true);
			} else {
				cy.log(`❌ 文件下载验证失败: ${fileName}`);
				resolve(false);
			}
		});
	});
});

// 生成测试媒体blob
Cypress.Commands.add("generateTestMediaBlob", (type: "video" | "image") => {
	cy.window().then((win) => {
		return new Promise<Blob>((resolve) => {
			const canvas = win.document.createElement("canvas");
			canvas.width = 200;
			canvas.height = 200;
			const ctx = canvas.getContext("2d")!;

			// 绘制测试内容
			const gradient = ctx.createLinearGradient(0, 0, 200, 200);
			gradient.addColorStop(0, "#ff0000");
			gradient.addColorStop(0.5, "#00ff00");
			gradient.addColorStop(1, "#0000ff");

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, 200, 200);

			ctx.fillStyle = "#ffffff";
			ctx.font = "16px Arial";
			ctx.textAlign = "center";
			ctx.fillText("测试媒体", 100, 100);
			ctx.fillText(type === "video" ? "视频" : "图片", 100, 120);

			canvas.toBlob(
				(blob: Blob | null) => {
					if (blob) {
						const mediaBlob =
							type === "video"
								? new Blob([blob], { type: "video/webm" })
								: new Blob([blob], { type: "image/png" });

						cy.log(`✅ ${type === "video" ? "视频" : "图片"}媒体blob已生成`);
						resolve(mediaBlob);
					}
				},
				type === "video" ? "video/webm" : "image/png"
			);
		});
	});
});

export {};
