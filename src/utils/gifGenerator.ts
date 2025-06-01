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

			// 设置合理的尺寸（最大 800px 宽度）
			const maxWidth = 800;
			const scale = Math.min(1, maxWidth / video.videoWidth);
			canvas.width = Math.floor(video.videoWidth * scale);
			canvas.height = Math.floor(video.videoHeight * scale);

			console.log("Canvas 尺寸:", canvas.width, "x", canvas.height);

			const gif = new GIF({
				workers: 2,
				quality: 10,
				width: canvas.width,
				height: canvas.height,
				workerScript: chrome.runtime.getURL("gif.worker.js"),
				debug: true,
			});

			let currentTime = 0;
			const frameRate = 8; // 降低帧率以减少文件大小
			const frameInterval = 1 / frameRate;
			const duration = Math.min(video.duration, 10); // 最大 10 秒
			let frameCount = 0;
			const maxFrames = Math.floor(duration * frameRate);

			console.log("准备捕获帧:", {
				frameRate,
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
