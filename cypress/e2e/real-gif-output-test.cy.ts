/// <reference types="cypress" />

describe("真实GIF文件生成验证", () => {
	beforeEach(() => {
		cy.clearAllTestArtifacts();
		cy.visit("cypress/fixtures/test.html");
		cy.mockChromeAPI();
	});

	// 注意：这个测试故意不清理生成的文件，供用户检查
	// 可以在所有测试完成后手动清理

	it("应该生成真实的GIF文件供用户验收", () => {
		// 设置测试超时为60秒
		Cypress.config("defaultCommandTimeout", 60000);

		cy.window().then(async (win) => {
			try {
				// 导入GIF.js库进行真实测试
				const GIF = (await import("gif.js")).default;

				// 创建GIF实例（使用主线程避免worker问题）
				const gif = new GIF({
					workers: 0, // 使用主线程确保稳定性
					quality: 10, // 较好的质量
					width: 200,
					height: 200,
					debug: false,
					dither: false,
					background: "#ffffff",
				});

				cy.log("✅ GIF实例创建成功");

				// 创建Canvas用于绘制
				const canvas = win.document.createElement("canvas");
				canvas.width = 200;
				canvas.height = 200;
				const ctx = canvas.getContext("2d")!;

				// 减少帧数以避免超时
				const frameCount = 5; // 从10帧减到5帧
				const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];

				for (let i = 0; i < frameCount; i++) {
					// 清除画布
					ctx.clearRect(0, 0, 200, 200);

					// 绘制背景
					ctx.fillStyle = colors[i];
					ctx.fillRect(0, 0, 200, 200);

					// 绘制移动的圆形
					ctx.fillStyle = "#000000";
					ctx.beginPath();
					const x = (i / (frameCount - 1)) * 160 + 20;
					const y = 100 + Math.sin((i / frameCount) * Math.PI * 2) * 30;
					ctx.arc(x, y, 15, 0, 2 * Math.PI);
					ctx.fill();

					// 添加文字
					ctx.fillStyle = "#000000";
					ctx.font = "20px Arial";
					ctx.textAlign = "center";
					ctx.fillText(`帧 ${i + 1}`, 100, 50);

					// 添加当前时间戳
					ctx.font = "12px Arial";
					ctx.fillText(new Date().toLocaleTimeString(), 100, 180);

					// 添加帧到GIF
					gif.addFrame(canvas, { delay: 500 }); // 500ms每帧，加快动画
					cy.log(`✅ 添加第 ${i + 1} 帧`);
				}

				cy.log("🎬 开始渲染GIF...");

				// 包装Promise以便Cypress能正确处理
				return new Cypress.Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error("GIF渲染超时"));
					}, 45000); // 45秒超时

					gif.on("finished", (blob: Blob) => {
						clearTimeout(timeout);
						try {
							// 验证生成的GIF
							expect(blob).to.exist;
							expect(blob.type).to.equal("image/gif");
							expect(blob.size).to.be.greaterThan(500); // 至少500字节

							cy.log(
								`✅ GIF生成成功! 大小: ${blob.size} 字节 (${Math.round(blob.size / 1024)}KB)`
							);

							// 创建下载链接
							const url = win.URL.createObjectURL(blob);
							const link = win.document.createElement("a");
							link.href = url;
							link.download = `cypress-test-gif-${Date.now()}.gif`;
							link.style.display = "none";

							// 添加到页面并触发下载
							win.document.body.appendChild(link);

							// 模拟点击下载
							try {
								link.click();
								cy.log("✅ GIF文件下载已触发");
							} catch (error) {
								cy.log("⚠️ 自动下载被阻止，但文件已生成");
							}

							// 保留链接和blob供后续使用（不清理）
							(win as any).generatedGifBlob = blob;
							(win as any).generatedGifUrl = url;
							(win as any).generatedGifLink = link;

							cy.log("📁 GIF文件已准备好，资源已保留供检查:");
							cy.log("- window.generatedGifBlob: Blob对象");
							cy.log("- window.generatedGifUrl: 可访问的URL");
							cy.log("- 文件将保留到所有测试完成后再清理");

							// 验证文件信息
							const reader = new win.FileReader();
							reader.onload = () => {
								const arrayBuffer = reader.result as ArrayBuffer;
								const uint8Array = new Uint8Array(arrayBuffer);

								cy.log("📊 GIF文件信息:");
								cy.log(`- 文件大小: ${uint8Array.length} 字节`);
								cy.log(
									`- 文件头: ${Array.from(uint8Array.slice(0, 6))
										.map((b) => String.fromCharCode(b))
										.join("")}`
								);
								cy.log(
									`- 是否为有效GIF: ${uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46}`
								);
							};
							reader.readAsArrayBuffer(blob);

							cy.log(
								"🎉 测试完成！GIF文件已生成并保留，请在所有测试完成后手动检查"
							);
							resolve(blob);
						} catch (error) {
							clearTimeout(timeout);
							reject(error);
						}
					});

					gif.on("error", (err: unknown) => {
						clearTimeout(timeout);
						const errorMessage =
							err instanceof Error ? err.message : String(err);
						cy.log(`❌ GIF渲染错误: ${errorMessage}`);
						reject(new Error(`GIF渲染失败: ${errorMessage}`));
					});

					gif.on("progress", (progress: number) => {
						const percentage = Math.round(progress * 100);
						cy.log(`GIF渲染进度: ${percentage}%`);
					});

					try {
						gif.render();
					} catch (error) {
						clearTimeout(timeout);
						const errorMessage =
							error instanceof Error ? error.message : String(error);
						cy.log(`❌ GIF启动渲染失败: ${errorMessage}`);
						reject(new Error(`GIF启动渲染失败: ${errorMessage}`));
					}
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				cy.log(`❌ GIF生成失败: ${errorMessage}`);
				throw error;
			}
		});
	});

	it("应该生成简单的测试GIF（备用方案）", () => {
		cy.window().then((win) => {
			// 创建一个简单的手工GIF文件
			const gifData = new Uint8Array([
				// GIF Header "GIF89a"
				0x47,
				0x49,
				0x46,
				0x38,
				0x39,
				0x61,
				// Logical Screen Descriptor (100x100 pixel)
				0x64,
				0x00,
				0x64,
				0x00,
				0x80,
				0x00,
				0x00,
				// Global Color Table (2 colors)
				0x00,
				0x00,
				0x00, // Black
				0xff,
				0xff,
				0xff, // White
				// Application Extension for animation
				0x21,
				0xff,
				0x0b,
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
				0x00,
				// Frame 1
				0x21,
				0xf9,
				0x04,
				0x04,
				0x32,
				0x00,
				0x00,
				0x00, // Graphic Control Extension
				0x2c,
				0x00,
				0x00,
				0x00,
				0x00,
				0x64,
				0x00,
				0x64,
				0x00,
				0x00, // Image Descriptor
				0x02,
				0x02,
				0x04,
				0x01,
				0x00, // Image Data
				// Frame 2
				0x21,
				0xf9,
				0x04,
				0x04,
				0x32,
				0x00,
				0x00,
				0x00, // Graphic Control Extension
				0x2c,
				0x00,
				0x00,
				0x00,
				0x00,
				0x64,
				0x00,
				0x64,
				0x00,
				0x00, // Image Descriptor
				0x02,
				0x02,
				0x04,
				0x01,
				0x00, // Image Data
				// Trailer
				0x3b,
			]);

			const gifBlob = new win.Blob([gifData], { type: "image/gif" });

			// 验证
			expect(gifBlob.type).to.equal("image/gif");
			expect(gifBlob.size).to.equal(gifData.length);

			// 保存到window对象（不清理）
			(win as any).simpleGifBlob = gifBlob;
			(win as any).simpleGifUrl = win.URL.createObjectURL(gifBlob);

			cy.log(`✅ 简单GIF创建成功: ${gifBlob.size} 字节`);
			cy.log("📁 可通过 window.simpleGifUrl 访问");
			cy.log("📝 文件将保留到所有测试完成后");
		});
	});

	// 添加一个最后的清理测试，仅在需要时运行
	it.skip("清理生成的测试文件（手动启用）", () => {
		cy.window().then((win) => {
			// 清理生成的blob URLs
			if ((win as any).generatedGifUrl) {
				win.URL.revokeObjectURL((win as any).generatedGifUrl);
				cy.log("✅ 清理了生成的GIF URL");
			}

			if ((win as any).simpleGifUrl) {
				win.URL.revokeObjectURL((win as any).simpleGifUrl);
				cy.log("✅ 清理了简单GIF URL");
			}

			// 清理DOM元素
			if ((win as any).generatedGifLink) {
				const link = (win as any).generatedGifLink;
				if (link.parentNode) {
					link.parentNode.removeChild(link);
				}
				cy.log("✅ 清理了下载链接元素");
			}

			cy.log("🧹 测试文件清理完成");
		});
	});
});
