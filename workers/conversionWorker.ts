interface ConversionWorkerMessage {
	type: "convertToMP4";
	blob: Blob;
	options: {
		quality: "high" | "medium" | "low";
		width?: number;
		height?: number;
	};
}

interface ConversionWorkerResponse {
	type: "progress" | "complete" | "error";
	data: {
		progress?: number;
		result?: Blob;
		message?: string;
		code?: string;
	};
}

// 由于Web Workers中无法直接使用动态import，我们使用Canvas API进行简单的格式转换
// 实际项目中可以集成FFmpeg.wasm来实现真正的MP4转换

self.onmessage = async (e: MessageEvent<ConversionWorkerMessage>) => {
	const { type, blob, options } = e.data;

	if (type === "convertToMP4") {
		try {
			await convertToMP4(blob, options);
		} catch (error) {
			self.postMessage({
				type: "error",
				data: {
					message: (error as Error).message,
					code: "CONVERSION_FAILED",
				},
			} as ConversionWorkerResponse);
		}
	}
};

async function convertToMP4(
	webmBlob: Blob,
	options: {
		quality: "high" | "medium" | "low";
		width?: number;
		height?: number;
	}
): Promise<void> {
	try {
		// 发送开始进度
		self.postMessage({
			type: "progress",
			data: { progress: 0 },
		} as ConversionWorkerResponse);

		// 创建视频元素
		const video = document.createElement("video");
		video.muted = true;
		video.autoplay = false;

		// 等待视频加载
		await new Promise((resolve, reject) => {
			video.onloadedmetadata = resolve;
			video.onerror = reject;
			video.src = URL.createObjectURL(webmBlob);
		});

		self.postMessage({
			type: "progress",
			data: { progress: 20 },
		} as ConversionWorkerResponse);

		// 获取视频尺寸
		const videoWidth = options.width || video.videoWidth;
		const videoHeight = options.height || video.videoHeight;
		const duration = video.duration;

		// 创建canvas进行转换（在Worker中使用普通Canvas）
		const canvas = document.createElement("canvas");
		canvas.width = videoWidth;
		canvas.height = videoHeight;
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed to get canvas context");
		}

		self.postMessage({
			type: "progress",
			data: { progress: 40 },
		} as ConversionWorkerResponse);

		// 质量设置
		const qualityMap = {
			high: 0.95,
			medium: 0.8,
			low: 0.6,
		};

		const quality = qualityMap[options.quality];

		// 由于浏览器限制，我们使用MediaRecorder重新录制为MP4
		// 这不是真正的格式转换，而是重新编码
		const stream = (canvas as any).captureStream(30);
		const recorder = new MediaRecorder(stream, {
			mimeType: "video/mp4; codecs=avc1.42E01E",
			videoBitsPerSecond: quality * 2500000, // 基于质量调整比特率
		});

		const chunks: Blob[] = [];

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				chunks.push(event.data);
			}
		};

		recorder.onstop = () => {
			const mp4Blob = new Blob(chunks, { type: "video/mp4" });

			self.postMessage({
				type: "complete",
				data: { result: mp4Blob },
			} as ConversionWorkerResponse);

			// 清理资源
			URL.revokeObjectURL(video.src);
		};

		// 开始录制
		recorder.start();

		self.postMessage({
			type: "progress",
			data: { progress: 60 },
		} as ConversionWorkerResponse);

		// 播放视频并绘制到canvas
		let currentTime = 0;
		const frameRate = 30;
		const frameInterval = 1 / frameRate;

		const drawFrame = () => {
			if (currentTime >= duration) {
				recorder.stop();
				return;
			}

			video.currentTime = currentTime;

			video.onseeked = () => {
				ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

				currentTime += frameInterval;
				const progress = 60 + (currentTime / duration) * 35;

				self.postMessage({
					type: "progress",
					data: { progress: Math.min(progress, 95) },
				} as ConversionWorkerResponse);

				// 继续下一帧
				requestAnimationFrame(() => {
					setTimeout(drawFrame, 1000 / frameRate);
				});
			};
		};

		// 开始处理
		drawFrame();
	} catch (error) {
		throw new Error(`MP4 conversion failed: ${(error as Error).message}`);
	}
}

// 导出类型供TypeScript使用
export type { ConversionWorkerMessage, ConversionWorkerResponse };
