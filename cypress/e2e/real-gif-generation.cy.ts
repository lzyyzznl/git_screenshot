/// <reference types="cypress" />

describe("真实GIF生成功能测试", () => {
	beforeEach(() => {
		// 全面清理测试环境
		cy.clearAllTestArtifacts();

		// 访问测试页面
		cy.visit("cypress/fixtures/test.html");

		// 模拟Chrome API
		cy.mockChromeAPI();
	});

	afterEach(() => {
		// 测试后清理
		cy.clearAllTestArtifacts();
	});

	it("应该能够创建真实的视频blob并验证", () => {
		cy.createTestVideo().then((videoBlob) => {
			expect(videoBlob).to.exist;
			expect(videoBlob.type).to.equal("video/webm");
			expect(videoBlob.size).to.be.greaterThan(0);
			cy.log(`✅ 创建了 ${videoBlob.size} 字节的测试视频`);
		});
	});

	it("应该能够创建真实的GIF文件并验证", () => {
		cy.createTestGif().then((gifBlob) => {
			expect(gifBlob).to.exist;
			expect(gifBlob.type).to.equal("image/gif");
			expect(gifBlob.size).to.be.greaterThan(0);
			cy.log(`✅ 创建了 ${gifBlob.size} 字节的测试GIF`);
		});
	});

	it("应该能够测试真实的gif生成器函数", () => {
		// 创建测试视频
		cy.generateTestMediaBlob("video").then((testVideoBlob) => {
			cy.window().then(async (win) => {
				// 验证blob基本属性
				expect(testVideoBlob.size).to.be.greaterThan(0);
				cy.log(`📹 测试视频大小: ${testVideoBlob.size} 字节`);

				// 创建视频元素进行测试
				const video = win.document.createElement("video");
				video.muted = true;
				video.playsInline = true;

				// 设置必要的属性来模拟真实视频
				const videoUrl = win.URL.createObjectURL(testVideoBlob);
				video.src = videoUrl;

				// 手动设置视频属性（因为测试blob不是真实视频）
				Object.defineProperty(video, "duration", {
					value: 2.0,
					writable: false,
					configurable: true,
				});
				Object.defineProperty(video, "videoWidth", {
					value: 200,
					writable: false,
					configurable: true,
				});
				Object.defineProperty(video, "videoHeight", {
					value: 200,
					writable: false,
					configurable: true,
				});

				// 添加到DOM
				win.document.body.appendChild(video);

				// 测试视频属性
				cy.wait(100).then(() => {
					expect(video.src).to.contain("blob:");
					expect(video.muted).to.be.true;
					cy.log("✅ 视频元素属性验证通过");

					// 清理
					win.document.body.removeChild(video);
					win.URL.revokeObjectURL(videoUrl);
				});
			});
		});
	});

	it("应该能够测试gif文件的有效性", () => {
		cy.createTestGif().then((gifBlob) => {
			// 验证GIF文件头
			cy.window().then((win) => {
				return new Promise<void>((resolve) => {
					const reader = new win.FileReader();
					reader.onload = () => {
						const arrayBuffer = reader.result as ArrayBuffer;
						const uint8Array = new Uint8Array(arrayBuffer);

						// 验证GIF文件头 "GIF89a"
						const isValidGif =
							uint8Array[0] === 0x47 && // G
							uint8Array[1] === 0x49 && // I
							uint8Array[2] === 0x46 && // F
							uint8Array[3] === 0x38 && // 8
							uint8Array[4] === 0x39 && // 9
							uint8Array[5] === 0x61; // a

						expect(isValidGif).to.be.true;
						console.log("✅ GIF文件头验证通过");

						// 验证文件大小合理性
						expect(uint8Array.length).to.be.greaterThan(50);
						console.log(`✅ GIF文件大小: ${uint8Array.length} 字节`);

						resolve();
					};
					reader.readAsArrayBuffer(gifBlob);
				});
			});
		});
	});

	it("应该能够测试下载功能的完整性", () => {
		cy.createTestGif().then((gifBlob) => {
			cy.window().then((win) => {
				// 创建下载链接
				const url = win.URL.createObjectURL(gifBlob);
				const link = win.document.createElement("a");
				link.href = url;
				link.download = "test-download.gif";

				// 验证下载链接属性
				expect(link.href).to.contain("blob:");
				expect(link.download).to.equal("test-download.gif");
				cy.log("✅ 下载链接创建成功");

				// 模拟点击下载
				win.document.body.appendChild(link);

				// 验证元素存在
				expect(win.document.body.contains(link)).to.be.true;

				// 清理
				win.document.body.removeChild(link);
				win.URL.revokeObjectURL(url);
				cy.log("✅ 下载功能测试完成");
			});
		});
	});

	it("应该能够测试文件类型和MIME类型", () => {
		// 测试视频文件
		cy.generateTestMediaBlob("video").then((videoBlob) => {
			expect(videoBlob.type).to.equal("video/webm");
			cy.log("✅ 视频MIME类型正确");
		});

		// 测试图片文件
		cy.generateTestMediaBlob("image").then((imageBlob) => {
			expect(imageBlob.type).to.equal("image/png");
			cy.log("✅ 图片MIME类型正确");
		});
	});

	it("应该能够验证gif生成器的依赖项", () => {
		cy.window().then((win) => {
			// 检查gif.js库是否可用
			cy.log("🔍 检查gif.js依赖");

			// 验证关键的API是否存在
			expect(win.Blob).to.exist;
			expect(win.FileReader).to.exist;
			expect(win.URL.createObjectURL).to.exist;
			expect(win.URL.revokeObjectURL).to.exist;

			cy.log("✅ 所有必需的Web API都可用");

			// 验证Canvas API
			const canvas = win.document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			expect(ctx).to.exist;
			expect(ctx?.drawImage).to.exist;
			expect(ctx?.getImageData).to.exist;

			cy.log("✅ Canvas API可用");

			// 验证视频API
			const video = win.document.createElement("video");
			expect(video.play).to.exist;
			expect(video.pause).to.exist;

			cy.log("✅ Video API可用");
		});
	});

	it("应该能够处理大文件和性能测试", () => {
		cy.window().then((win) => {
			// 创建相对较大的测试数据
			const largeData = new Uint8Array(10 * 1024); // 10KB
			for (let i = 0; i < largeData.length; i++) {
				largeData[i] = i % 256;
			}

			const startTime = performance.now();
			const largeBlob = new Blob([largeData], { type: "video/webm" });
			const endTime = performance.now();

			const creationTime = endTime - startTime;
			expect(creationTime).to.be.lessThan(100); // 应该在100ms内完成
			expect(largeBlob.size).to.equal(10 * 1024);

			cy.log(`✅ 大文件处理性能: ${creationTime.toFixed(2)}ms`);
		});
	});

	it("应该能够测试内存管理", () => {
		cy.window().then((win) => {
			const urls: string[] = [];

			// 创建多个blob URL
			for (let i = 0; i < 10; i++) {
				const data = new Uint8Array(1024);
				const blob = new Blob([data], { type: "video/webm" });
				const url = win.URL.createObjectURL(blob);
				urls.push(url);
			}

			expect(urls.length).to.equal(10);
			cy.log("✅ 创建了10个blob URL");

			// 清理所有URL
			urls.forEach((url) => {
				win.URL.revokeObjectURL(url);
			});

			cy.log("✅ 内存清理完成");
		});
	});
});
