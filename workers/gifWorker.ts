interface GIFWorkerMessage {
	type: "convertToGIF";
	blob: Blob;
	options: {
		frameRate: number;
		quality: "high" | "medium" | "low";
		width: number;
		height: number;
		duration: number;
		colors: number;
		delay: number;
		repeat: number;
	};
}

interface GIFWorkerResponse {
	type: "progress" | "complete" | "error";
	data: {
		progress?: number;
		result?: Blob;
		message?: string;
		code?: string;
	};
}

// 简化的GIF编码器实现
class SimpleGIFEncoder {
	private width: number;
	private height: number;
	private delay: number;
	private repeat: number;
	private frames: ImageData[] = [];

	constructor(width: number, height: number, delay: number, repeat: number) {
		this.width = width;
		this.height = height;
		this.delay = delay;
		this.repeat = repeat;
	}

	addFrame(imageData: ImageData): void {
		this.frames.push(imageData);
	}

	encode(): Uint8Array {
		// 这是一个简化的GIF编码实现
		// 实际项目中建议使用gif.js或其他专业的GIF编码库

		const header = this.createGIFHeader();
		const frames = this.encodeFrames();
		const trailer = new Uint8Array([0x3b]); // GIF终止符

		const totalLength = header.length + frames.length + trailer.length;
		const result = new Uint8Array(totalLength);

		let offset = 0;
		result.set(header, offset);
		offset += header.length;
		result.set(frames, offset);
		offset += frames.length;
		result.set(trailer, offset);

		return result;
	}

	private createGIFHeader(): Uint8Array {
		const header = new Uint8Array(13);

		// GIF签名
		header.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // "GIF89a"

		// 逻辑屏幕描述符
		header[6] = this.width & 0xff;
		header[7] = (this.width >> 8) & 0xff;
		header[8] = this.height & 0xff;
		header[9] = (this.height >> 8) & 0xff;
		header[10] = 0xf7; // 全局颜色表标志 + 颜色分辨率 + 排序标志 + 全局颜色表大小
		header[11] = 0x00; // 背景颜色索引
		header[12] = 0x00; // 像素宽高比

		return header;
	}

	private encodeFrames(): Uint8Array {
		// 创建应用程序扩展（用于循环控制）
		const appExt = new Uint8Array([
			0x21,
			0xff,
			0x0b, // 应用程序扩展标识符
			0x4e,
			0x45,
			0x54,
			0x53,
			0x43,
			0x41,
			0x50,
			0x45, // "NETSCAPE"
			0x32,
			0x2e,
			0x30, // "2.0"
			0x03,
			0x01,
			this.repeat & 0xff,
			(this.repeat >> 8) & 0xff, // 重复次数
			0x00, // 块终止符
		]);

		let framesData = new Uint8Array(0);

		// 添加应用程序扩展
		const temp1 = new Uint8Array(framesData.length + appExt.length);
		temp1.set(framesData);
		temp1.set(appExt, framesData.length);
		framesData = temp1;

		// 编码每一帧
		for (let i = 0; i < this.frames.length; i++) {
			const frameData = this.encodeFrame(this.frames[i], i === 0);
			const temp2 = new Uint8Array(framesData.length + frameData.length);
			temp2.set(framesData);
			temp2.set(frameData, framesData.length);
			framesData = temp2;
		}

		return framesData;
	}

	private encodeFrame(imageData: ImageData, isFirst: boolean): Uint8Array {
		// 图形控制扩展
		const gce = new Uint8Array([
			0x21,
			0xf9,
			0x04, // 图形控制扩展标识符
			0x08, // 处置方法 + 用户输入标志 + 透明色标志
			this.delay & 0xff,
			(this.delay >> 8) & 0xff, // 延迟时间（1/100秒）
			0x00, // 透明色索引
			0x00, // 块终止符
		]);

		// 图像描述符
		const imageDesc = new Uint8Array([
			0x2c, // 图像分隔符
			0x00,
			0x00,
			0x00,
			0x00, // 左、上位置
			this.width & 0xff,
			(this.width >> 8) & 0xff, // 宽度
			this.height & 0xff,
			(this.height >> 8) & 0xff, // 高度
			0x00, // 局部颜色表标志
		]);

		// 简化的LZW压缩图像数据
		const imageDataCompressed = this.compressImageData(imageData);

		const frameLength =
			gce.length + imageDesc.length + imageDataCompressed.length;
		const frame = new Uint8Array(frameLength);

		let offset = 0;
		frame.set(gce, offset);
		offset += gce.length;
		frame.set(imageDesc, offset);
		offset += imageDesc.length;
		frame.set(imageDataCompressed, offset);

		return frame;
	}

	private compressImageData(imageData: ImageData): Uint8Array {
		// 这里使用简化的压缩算法，实际应该使用LZW
		const data = imageData.data;
		const compressed = new Uint8Array(data.length / 4 + 10);

		compressed[0] = 0x08; // LZW最小代码大小

		let compressedIndex = 1;
		let blockSize = 0;
		let blockStart = compressedIndex + 1;

		for (let i = 0; i < data.length; i += 4) {
			// 将RGBA转换为颜色索引（简化处理）
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];

			// 简单的颜色量化到256色
			const colorIndex = Math.floor((r + g + b) / 3 / 32) * 8;

			compressed[blockStart + blockSize] = colorIndex;
			blockSize++;

			// GIF块最大255字节
			if (blockSize >= 254) {
				compressed[compressedIndex] = blockSize;
				compressedIndex = blockStart + blockSize;
				blockSize = 0;
				blockStart = compressedIndex + 1;
			}
		}

		// 添加最后一个块
		if (blockSize > 0) {
			compressed[compressedIndex] = blockSize;
			compressedIndex = blockStart + blockSize;
		}

		// 添加块终止符
		compressed[compressedIndex] = 0x00;

		return compressed.slice(0, compressedIndex + 1);
	}
}

self.onmessage = async (e: MessageEvent<GIFWorkerMessage>) => {
	const { type, blob, options } = e.data;

	if (type === "convertToGIF") {
		try {
			await convertToGIF(blob, options);
		} catch (error) {
			self.postMessage({
				type: "error",
				data: {
					message: (error as Error).message,
					code: "GIF_CONVERSION_FAILED",
				},
			} as GIFWorkerResponse);
		}
	}
};

async function convertToGIF(
	videoBlob: Blob,
	options: {
		frameRate: number;
		quality: "high" | "medium" | "low";
		width: number;
		height: number;
		duration: number;
		colors: number;
		delay: number;
		repeat: number;
	}
): Promise<void> {
	try {
		// 发送开始进度
		self.postMessage({
			type: "progress",
			data: { progress: 0 },
		} as GIFWorkerResponse);

		// 创建视频元素
		const video = document.createElement("video");
		video.muted = true;
		video.autoplay = false;
		video.preload = "metadata";

		// 等待视频加载
		await new Promise((resolve, reject) => {
			video.onloadedmetadata = resolve;
			video.onerror = reject;
			video.src = URL.createObjectURL(videoBlob);
		});

		self.postMessage({
			type: "progress",
			data: { progress: 10 },
		} as GIFWorkerResponse);

		// 创建canvas
		const canvas = document.createElement("canvas");
		canvas.width = options.width;
		canvas.height = options.height;
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed to get canvas context");
		}

		// 创建GIF编码器
		const gifEncoder = new SimpleGIFEncoder(
			options.width,
			options.height,
			options.delay,
			options.repeat
		);

		self.postMessage({
			type: "progress",
			data: { progress: 20 },
		} as GIFWorkerResponse);

		// 计算帧数和间隔
		const frameInterval = 1 / options.frameRate;
		const totalFrames = Math.floor(options.duration * options.frameRate);
		let frameCount = 0;

		// 提取视频帧
		for (let time = 0; time < options.duration; time += frameInterval) {
			await new Promise((resolve) => {
				video.currentTime = time;
				video.onseeked = () => {
					// 绘制当前帧到canvas
					ctx.drawImage(video, 0, 0, options.width, options.height);

					// 获取图像数据
					const imageData = ctx.getImageData(
						0,
						0,
						options.width,
						options.height
					);

					// 添加到GIF编码器
					gifEncoder.addFrame(imageData);

					frameCount++;
					const progress = 20 + (frameCount / totalFrames) * 60;

					self.postMessage({
						type: "progress",
						data: { progress: Math.min(progress, 80) },
					} as GIFWorkerResponse);

					resolve(void 0);
				};
			});
		}

		self.postMessage({
			type: "progress",
			data: { progress: 85 },
		} as GIFWorkerResponse);

		// 编码GIF
		const gifData = gifEncoder.encode();

		self.postMessage({
			type: "progress",
			data: { progress: 95 },
		} as GIFWorkerResponse);

		// 创建Blob
		const gifBlob = new Blob([gifData], { type: "image/gif" });

		self.postMessage({
			type: "complete",
			data: { result: gifBlob },
		} as GIFWorkerResponse);

		// 清理资源
		URL.revokeObjectURL(video.src);
	} catch (error) {
		throw new Error(`GIF conversion failed: ${(error as Error).message}`);
	}
}

// 导出类型供TypeScript使用
export type { GIFWorkerMessage, GIFWorkerResponse };
