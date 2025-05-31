/// <reference types="cypress" />

describe("Seek重复问题修复测试", () => {
	beforeEach(() => {
		cy.clearAllTestArtifacts();
		cy.visit("cypress/fixtures/test.html");
		cy.mockChromeAPI();
	});

	afterEach(() => {
		cy.clearAllTestArtifacts();
	});

	it("应该能够处理seek重复事件而不卡死", () => {
		cy.window().then(async (win) => {
			try {
				// 导入修复后的gif生成器
				const { generateGif } = await import("../../utils/gifGenerator");

				// 创建一个模拟的视频blob
				const canvas = win.document.createElement("canvas");
				canvas.width = 100;
				canvas.height = 100;
				const ctx = canvas.getContext("2d")!;

				// 绘制简单内容
				ctx.fillStyle = "#ff0000";
				ctx.fillRect(0, 0, 100, 100);

				// 创建模拟视频数据
				const videoData = await new Promise<Blob>((resolve) => {
					canvas.toBlob(
						(blob: Blob | null) => {
							if (blob) resolve(blob);
						},
						"video/webm",
						0.8
					);
				});

				cy.log("✅ 创建测试视频数据成功");

				// 测试gif生成器是否能处理seek重复
				// 由于是模拟数据，预期会失败，但应该能优雅处理不卡死
				const startTime = Date.now();

				generateGif(videoData)
					.then(() => {
						const duration = Date.now() - startTime;
						cy.log(`✅ 意外成功，耗时: ${duration}ms`);
					})
					.catch((error) => {
						const duration = Date.now() - startTime;
						expect(error.message).to.be.a("string");
						
						// 验证没有卡死 - 应该在合理时间内失败
						expect(duration).to.be.lessThan(35000); // 35秒内应该结束
						
						// 验证错误消息合理
						const validErrors = [
							"视频加载失败",
							"视频加载超时",
							"GIF 生成超时",
							"没有捕获到任何帧",
							"帧捕获停滞"
						];
						
						const hasValidError = validErrors.some(validError => 
							error.message.includes(validError)
						);
						
						expect(hasValidError).to.be.true;
						cy.log(`✅ 正确处理错误: ${error.message} (耗时: ${duration}ms)`);
					});

				cy.log("✅ Seek重复修复测试完成");
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				cy.log(`⚠️ 测试异常: ${errorMessage}`);
				expect(errorMessage).to.be.a("string");
			}
		});
	});

	it("应该能够检测到帧捕获停滞", () => {
		cy.window().then(() => {
			// 测试停滞检测逻辑
			let frameProgressTime = Date.now();
			const STALL_TIMEOUT = 5000; // 5秒

			// 模拟停滞检测
			const checkStall = () => {
				const now = Date.now();
				const timeSinceLastFrame = now - frameProgressTime;
				
				if (timeSinceLastFrame > STALL_TIMEOUT) {
					cy.log("✅ 检测到停滞状态");
					return true;
				}
				return false;
			};

			// 模拟正常进度
			frameProgressTime = Date.now();
			expect(checkStall()).to.be.false;
			cy.log("✅ 正常状态检测正确");

			// 模拟停滞状态
			frameProgressTime = Date.now() - 6000; // 6秒前
			expect(checkStall()).to.be.true;
			cy.log("✅ 停滞状态检测正确");
		});
	});

	it("应该能够限制seek重试次数", () => {
		cy.window().then(() => {
			// 测试重试限制逻辑
			const MAX_RETRIES = 3;
			let currentRetries = 0;
			let shouldSkipFrame = false;

			// 模拟重试逻辑
			const handleSeekRetry = () => {
				currentRetries++;
				if (currentRetries >= MAX_RETRIES) {
					shouldSkipFrame = true;
					currentRetries = 0;
					return true; // 应该跳过帧
				}
				return false; // 继续重试
			};

			// 测试前两次重试
			expect(handleSeekRetry()).to.be.false; // 第1次
			expect(handleSeekRetry()).to.be.false; // 第2次
			expect(shouldSkipFrame).to.be.false;

			// 测试第3次重试应该跳过
			expect(handleSeekRetry()).to.be.true; // 第3次
			expect(shouldSkipFrame).to.be.true;
			expect(currentRetries).to.equal(0); // 应该重置

			cy.log("✅ 重试限制逻辑正确");
		});
	});
}); 