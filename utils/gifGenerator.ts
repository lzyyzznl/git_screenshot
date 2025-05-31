import GIF from "gif.js";

export async function generateGif(videoBlob: Blob): Promise<Blob> {
	console.log("开始生成 GIF，视频大小:", videoBlob.size);

	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d")!;

		video.src = URL.createObjectURL(videoBlob);
		video.muted = true;
		video.playsInline = true;
		video.preload = "metadata";

		const cleanup = () => {
			try {
				URL.revokeObjectURL(video.src);
				video.remove();
				canvas.remove();
			} catch (e) {
				console.warn("清理资源时出错:", e);
			}
		};

		// 修复超时处理
		let timeoutId: number | null = null;
		let isProcessing = false;
		let isFinished = false;

		const startTimeout = (duration = 30000) => {
			// 减少到30秒
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = window.setTimeout(() => {
				if (!isFinished) {
					console.error("GIF 生成超时 - 30秒限制");
					isFinished = true;
					cleanup();
					reject(new Error("GIF 生成超时 (30秒限制)"));
				}
			}, duration);
		};

		const clearTimeoutAndResolve = (blob: Blob) => {
			if (isFinished) return;
			isFinished = true;

			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			cleanup();
			resolve(blob);
		};

		const clearTimeoutAndReject = (error: Error) => {
			if (isFinished) return;
			isFinished = true;

			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			cleanup();
			reject(error);
		};

		video.onloadedmetadata = () => {
			if (isFinished) return;

			console.log("视频元数据加载完成:", {
				duration: video.duration,
				width: video.videoWidth,
				height: video.videoHeight,
			});

			if (!video.duration || video.duration === 0 || isNaN(video.duration)) {
				clearTimeoutAndReject(new Error("视频时长无效"));
				return;
			}

			if (isProcessing) {
				console.warn("GIF 生成已在进行中，跳过重复处理");
				return;
			}
			isProcessing = true;

			// 更保守的尺寸设置
			const maxWidth = 480; // 进一步减小
			const maxHeight = 320;
			let scale = Math.min(
				1,
				maxWidth / video.videoWidth,
				maxHeight / video.videoHeight
			);

			// 确保尺寸是偶数且不为0
			canvas.width = Math.max(
				2,
				Math.floor((video.videoWidth * scale) / 2) * 2
			);
			canvas.height = Math.max(
				2,
				Math.floor((video.videoHeight * scale) / 2) * 2
			);

			console.log(
				"Canvas 尺寸:",
				canvas.width,
				"x",
				canvas.height,
				"缩放比例:",
				scale
			);

			// 修复worker配置问题
			let workerScript: string | undefined;
			try {
				workerScript = chrome.runtime.getURL("assets/gif.worker.js");
			} catch (error) {
				console.warn("无法获取worker脚本，将使用主线程模式:", error);
				workerScript = undefined;
			}

			// 更保守的GIF编码器设置
			const gif = new GIF({
				workers: workerScript
					? Math.min(navigator.hardwareConcurrency || 1, 2)
					: 0, // 减少worker数量，如果没有script则用主线程
				quality: 20, // 进一步提高数值以减少处理复杂度
				width: canvas.width,
				height: canvas.height,
				workerScript: workerScript,
				debug: false,
				dither: false,
				background: "#ffffff",
				transparent: null, // 明确设置
			});

			// 更保守的帧处理参数
			const frameRate = 4; // 降低到4 FPS
			const frameInterval = 1 / frameRate;
			const maxDuration = 6; // 降低到6秒
			const duration = Math.min(video.duration, maxDuration);
			const maxFrames = Math.min(24, Math.floor(duration * frameRate)); // 最多24帧

			console.log("帧处理参数:", {
				frameRate,
				duration,
				maxFrames,
				estimatedSize: `${Math.round((canvas.width * canvas.height * maxFrames) / 1024)}KB`,
			});

			let currentTime = 0;
			let frameCount = 0;
			let processingFrames = false;
			let lastProgressTime = Date.now();
			let isCapturing = false; // 添加捕获状态标志

			const captureFrame = () => {
				if (processingFrames || isFinished || isCapturing) return;

				if (currentTime >= duration || frameCount >= maxFrames) {
					processingFrames = true;
					console.log("开始渲染 GIF, 总帧数:", frameCount);

					if (frameCount === 0) {
						clearTimeoutAndReject(new Error("没有捕获到任何帧"));
						return;
					}

					// 启动渲染超时计时器
					startTimeout(45000); // 渲染阶段给更多时间

					try {
						gif.render();
					} catch (error: unknown) {
						console.error("GIF渲染启动失败:", error);
						const errorMessage =
							error instanceof Error ? error.message : String(error);
						clearTimeoutAndReject(
							new Error(`GIF渲染启动失败: ${errorMessage}`)
						);
					}
					return;
				}

				// 设置捕获状态
				isCapturing = true;
				console.log(
					`准备捕获第 ${frameCount + 1} 帧，时间点: ${currentTime.toFixed(2)}s`
				);
				video.currentTime = currentTime;
			};

			// 优化视频seek处理
			let lastSeekTime = -1;
			let seekCount = 0;
			let maxSeekRetries = 3;
			let currentSeekRetries = 0;

			video.onseeked = (event: Event) => {
				if (isFinished || processingFrames) {
					isCapturing = false;
					return;
				}

				const actualTime = video.currentTime;
				const expectedTime = currentTime;

				// 更精确的重复seek检测
				if (Math.abs(actualTime - lastSeekTime) < 0.001) {
					console.warn(
						`跳过重复的seek事件: 实际=${actualTime.toFixed(3)}s, 上次=${lastSeekTime.toFixed(3)}s`
					);

					// 重复seek时，强制推进到下一帧避免卡死
					currentSeekRetries++;
					if (currentSeekRetries >= maxSeekRetries) {
						console.warn("达到最大重试次数，强制跳到下一帧");
						currentTime += frameInterval;
						frameCount++; // 虽然跳过了，但要计数避免无限循环
						currentSeekRetries = 0;
					}

					isCapturing = false;

					// 继续下一帧
					setTimeout(() => {
						if (!isFinished && !processingFrames) {
							captureFrame();
						}
					}, 100);
					return;
				}

				// 检查时间是否合理接近
				if (Math.abs(actualTime - expectedTime) > 0.5) {
					console.warn(
						`Seek时间偏差过大: 期望=${expectedTime.toFixed(3)}s, 实际=${actualTime.toFixed(3)}s`
					);
				}

				lastSeekTime = actualTime;
				seekCount++;
				currentSeekRetries = 0; // 重置重试计数

				try {
					// 检查视频是否真的准备好了
					if (video.readyState < 2) {
						console.warn("视频还未准备好，跳过此帧");
						isCapturing = false;

						// 重试当前时间点，但限制重试次数
						currentSeekRetries++;
						if (currentSeekRetries < maxSeekRetries) {
							setTimeout(() => {
								if (!isFinished && !processingFrames) {
									video.currentTime = currentTime;
								}
							}, 100);
						} else {
							// 重试次数过多，跳过此帧
							console.warn("视频准备重试次数过多，跳过此帧");
							currentTime += frameInterval;
							frameCount++;
							currentSeekRetries = 0;
							setTimeout(() => {
								if (!isFinished && !processingFrames) {
									captureFrame();
								}
							}, 50);
						}
						return;
					}

					// 清除画布并绘制当前帧
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

					// 验证画布内容
					const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const hasContent = imageData.data.some((pixel) => pixel > 0);

					if (!hasContent) {
						console.warn("画布为空，跳过此帧");
						currentTime += frameInterval;
						frameCount++; // 计数以避免无限循环
						isCapturing = false;

						setTimeout(() => {
							if (!isFinished && !processingFrames) {
								captureFrame();
							}
						}, 50);
						return;
					}

					// 添加帧到GIF
					gif.addFrame(canvas, {
						delay: Math.round(frameInterval * 1000),
						copy: true,
					});

					frameCount++;
					currentTime += frameInterval;

					// 显示进度
					const progress = Math.round((frameCount / maxFrames) * 100);
					console.log(
						`✅ 帧捕获成功: ${frameCount}/${maxFrames} (${progress}%) - 时间点: ${actualTime.toFixed(2)}s`
					);

					isCapturing = false;

					// 检查是否完成
					if (frameCount >= maxFrames || currentTime >= duration) {
						console.log("帧捕获完成，准备渲染GIF");
						setTimeout(() => {
							if (!isFinished && !processingFrames) {
								captureFrame(); // 触发渲染
							}
						}, 50);
					} else {
						// 继续下一帧
						setTimeout(() => {
							if (!isFinished && !processingFrames) {
								captureFrame();
							}
						}, 100); // 增加延迟避免过快seek
					}
				} catch (error: unknown) {
					console.error("帧捕获错误:", error);
					isCapturing = false;
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					clearTimeoutAndReject(new Error(`帧捕获失败: ${errorMessage}`));
				}
			};

			// 添加seek错误处理
			video.addEventListener("error", (e: Event) => {
				console.error("视频seek/播放错误:", e);
				isCapturing = false;
				clearTimeoutAndReject(new Error("视频处理失败"));
			});

			// 添加超时检测，如果长时间没有帧捕获进度，强制结束
			let lastFrameTime = Date.now();
			const frameProgressCheck = setInterval(() => {
				if (isFinished || processingFrames) {
					clearInterval(frameProgressCheck);
					return;
				}

				const now = Date.now();
				if (now - lastFrameTime > 5000) {
					// 5秒没有新帧
					console.warn("帧捕获停滞，强制结束");
					clearInterval(frameProgressCheck);
					if (frameCount > 0) {
						processingFrames = true;
						gif.render();
					} else {
						clearTimeoutAndReject(new Error("帧捕获停滞，没有有效帧"));
					}
				}
			}, 1000);

			// 更新lastFrameTime的逻辑
			const originalOnSeeked = video.onseeked;
			video.onseeked = (event: Event) => {
				lastFrameTime = Date.now();
				if (originalOnSeeked) {
					originalOnSeeked.call(video, event);
				}
			};

			// GIF事件处理
			gif.on("finished", (blob: Blob) => {
				console.log(
					"GIF 生成完成，大小:",
					blob.size,
					"字节",
					`(${Math.round(blob.size / 1024)}KB)`
				);
				clearTimeoutAndResolve(blob);
			});

			gif.on("error", (err: unknown) => {
				console.error("GIF 生成错误:", err);
				const errorMessage = err instanceof Error ? err.message : String(err);
				clearTimeoutAndReject(new Error(`GIF生成失败: ${errorMessage}`));
			});

			gif.on("progress", (progress: number) => {
				const percentage = Math.round(progress * 100);
				const now = Date.now();

				// 限制进度日志频率
				if (now - lastProgressTime > 1000) {
					console.log("GIF 渲染进度:", percentage + "%");
					lastProgressTime = now;
				}

				// 检查是否卡死（进度长时间不更新）
				if (percentage > 0 && percentage < 100) {
					// 重置超时，但给定一个进度检查
					if (timeoutId) {
						clearTimeout(timeoutId);
						startTimeout(20000); // 减少渲染阶段的超时时间
					}
				}
			});

			// 开始处理第一帧
			console.log("开始捕获帧...");
			startTimeout(15000); // 开始阶段的超时
			video.currentTime = 0;
		};

		video.onerror = (e) => {
			console.error("视频加载错误:", e);
			clearTimeoutAndReject(new Error("视频加载失败"));
		};

		// 视频加载超时
		setTimeout(() => {
			if (!isProcessing && !isFinished) {
				clearTimeoutAndReject(new Error("视频加载超时"));
			}
		}, 10000);
	});
}
