import GIF from "gif.js";

interface GifOptions {
	fps?: number;
	quality?: number;
	maxWidth?: number;
	maxDuration?: number;
}

export async function generateGif(
	videoBlob: Blob,
	options: GifOptions = {}
): Promise<Blob> {
	const { fps = 8, quality = 10, maxWidth = 800, maxDuration = 10 } = options;

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
			URL.revokeObjectURL(video.src);
			video.remove();
			canvas.remove();
		};

		video.onloadedmetadata = () => {
			console.log("视频元数据加载完成:", {
				duration: video.duration,
				width: video.videoWidth,
				height: video.videoHeight,
			});

			if (!video.duration || video.duration === 0) {
				cleanup();
				reject(new Error("视频时长无效"));
				return;
			}

			// 设置合理的尺寸
			const scale = Math.min(1, maxWidth / video.videoWidth);
			canvas.width = Math.floor(video.videoWidth * scale);
			canvas.height = Math.floor(video.videoHeight * scale);

			console.log("Canvas 尺寸:", canvas.width, "x", canvas.height);

			const gif = new GIF({
				workers: 2,
				quality,
				width: canvas.width,
				height: canvas.height,
				workerScript: browser.runtime.getURL("gif.worker.js"),
				debug: true,
			});

			let currentTime = 0;
			const frameInterval = 1 / fps;
			const duration = Math.min(video.duration, maxDuration);
			let frameCount = 0;
			const maxFrames = Math.floor(duration * fps);

			console.log("准备捕获帧:", {
				fps,
				duration,
				maxFrames,
			});

			const captureFrame = () => {
				if (currentTime >= duration || frameCount >= maxFrames) {
					console.log("开始渲染 GIF, 总帧数:", frameCount);
					gif.render();
					return;
				}

				video.currentTime = currentTime;
			};

			video.onseeked = () => {
				try {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

					gif.addFrame(canvas, {
						delay: frameInterval * 1000,
						copy: true,
					});

					frameCount++;
					currentTime += frameInterval;

					// 使用 requestAnimationFrame 代替 setTimeout
					requestAnimationFrame(captureFrame);
				} catch (error) {
					console.error("帧捕获错误:", error);
					cleanup();
					reject(error);
				}
			};

			gif.on("finished", (blob: Blob) => {
				console.log("GIF 生成完成，大小:", blob.size);
				cleanup();
				resolve(blob);
			});

			gif.on("error", (err: Error) => {
				console.error("GIF 生成错误:", err);
				cleanup();
				reject(err);
			});

			gif.on("progress", (progress: number) => {
				console.log("GIF 生成进度:", Math.round(progress * 100) + "%");
			});

			// 开始处理
			video.currentTime = 0;
		};

		video.onerror = (e) => {
			console.error("视频加载错误:", e);
			cleanup();
			reject(new Error("视频加载失败"));
		};

		// 设置超时
		setTimeout(() => {
			cleanup();
			reject(new Error("GIF 生成超时"));
		}, 30000); // 30 秒超时
	});
}
