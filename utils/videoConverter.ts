export interface ConversionOptions {
	quality?: "high" | "medium" | "low";
	frameRate?: number;
	width?: number;
	height?: number;
	onProgress?: (progress: number) => void;
}

export interface GIFOptions extends ConversionOptions {
	colors?: number;
	delay?: number;
	repeat?: number;
}

export class VideoConversionError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = "VideoConversionError";
	}
}

export class VideoConverter {
	private mp4Worker?: Worker;
	private gifWorker?: Worker;

	/**
	 * 将WebM视频转换为MP4格式
	 */
	async convertToMP4(
		webmBlob: Blob,
		options: ConversionOptions = {}
	): Promise<Blob> {
		return new Promise((resolve, reject) => {
			try {
				// 验证输入
				if (!webmBlob || webmBlob.size === 0) {
					throw new VideoConversionError("Invalid video data", "INVALID_INPUT");
				}

				// 创建Web Worker
				this.mp4Worker = new Worker(
					new URL("../workers/conversionWorker.ts", import.meta.url),
					{ type: "module" }
				);

				const timeout = setTimeout(() => {
					this.mp4Worker?.terminate();
					reject(new VideoConversionError("Conversion timeout", "TIMEOUT"));
				}, 300000); // 5分钟超时

				this.mp4Worker.onmessage = (e) => {
					const { type, data } = e.data;

					switch (type) {
						case "progress":
							options.onProgress?.(data.progress);
							break;

						case "complete":
							clearTimeout(timeout);
							this.mp4Worker?.terminate();
							resolve(data.result);
							break;

						case "error":
							clearTimeout(timeout);
							this.mp4Worker?.terminate();
							reject(
								new VideoConversionError(
									data.message,
									data.code || "CONVERSION_ERROR"
								)
							);
							break;
					}
				};

				this.mp4Worker.onerror = (error) => {
					clearTimeout(timeout);
					this.mp4Worker?.terminate();
					reject(
						new VideoConversionError(
							"Worker error: " + error.message,
							"WORKER_ERROR"
						)
					);
				};

				// 开始转换
				this.mp4Worker.postMessage({
					type: "convertToMP4",
					blob: webmBlob,
					options: {
						quality: options.quality || "medium",
						width: options.width,
						height: options.height,
					},
				});
			} catch (error) {
				reject(
					error instanceof VideoConversionError
						? error
						: new VideoConversionError(
								"MP4 conversion failed: " + (error as Error).message,
								"CONVERSION_ERROR"
						  )
				);
			}
		});
	}

	/**
	 * 将视频转换为GIF格式
	 */
	async convertToGIF(videoBlob: Blob, options: GIFOptions = {}): Promise<Blob> {
		return new Promise((resolve, reject) => {
			try {
				// 验证输入
				if (!videoBlob || videoBlob.size === 0) {
					throw new VideoConversionError("Invalid video data", "INVALID_INPUT");
				}

				// 创建视频元素获取元数据
				const video = document.createElement("video");
				video.muted = true;
				video.autoplay = false;
				video.preload = "metadata";

				const cleanup = () => {
					if (video.src) {
						URL.revokeObjectURL(video.src);
					}
					this.gifWorker?.terminate();
				};

				video.onloadedmetadata = () => {
					try {
						// 获取视频信息
						const duration = video.duration;
						const videoWidth = video.videoWidth;
						const videoHeight = video.videoHeight;

						if (!duration || !videoWidth || !videoHeight) {
							throw new VideoConversionError(
								"Invalid video metadata",
								"INVALID_METADATA"
							);
						}

						// 计算输出尺寸
						let { width, height } = this.calculateGIFDimensions(
							videoWidth,
							videoHeight,
							options.width,
							options.height,
							options.quality
						);

						// 创建GIF转换Worker
						this.gifWorker = new Worker(
							new URL("../workers/gifWorker.ts", import.meta.url),
							{ type: "module" }
						);

						const timeout = setTimeout(() => {
							cleanup();
							reject(
								new VideoConversionError("GIF conversion timeout", "TIMEOUT")
							);
						}, 600000); // 10分钟超时

						this.gifWorker.onmessage = (e) => {
							const { type, data } = e.data;

							switch (type) {
								case "progress":
									options.onProgress?.(data.progress);
									break;

								case "complete":
									clearTimeout(timeout);
									cleanup();
									resolve(data.result);
									break;

								case "error":
									clearTimeout(timeout);
									cleanup();
									reject(
										new VideoConversionError(
											data.message,
											data.code || "GIF_CONVERSION_ERROR"
										)
									);
									break;
							}
						};

						this.gifWorker.onerror = (error) => {
							clearTimeout(timeout);
							cleanup();
							reject(
								new VideoConversionError(
									"GIF Worker error: " + error.message,
									"WORKER_ERROR"
								)
							);
						};

						// 开始GIF转换
						this.gifWorker.postMessage({
							type: "convertToGIF",
							blob: videoBlob,
							options: {
								frameRate: options.frameRate || 15,
								quality: options.quality || "medium",
								width,
								height,
								duration,
								colors: options.colors || 256,
								delay:
									options.delay || Math.floor(1000 / (options.frameRate || 15)),
								repeat: options.repeat || 0,
							},
						});
					} catch (error) {
						cleanup();
						reject(
							error instanceof VideoConversionError
								? error
								: new VideoConversionError(
										"GIF conversion setup failed: " + (error as Error).message,
										"SETUP_ERROR"
								  )
						);
					}
				};

				video.onerror = () => {
					cleanup();
					reject(
						new VideoConversionError(
							"Failed to load video for GIF conversion",
							"VIDEO_LOAD_ERROR"
						)
					);
				};

				video.src = URL.createObjectURL(videoBlob);
			} catch (error) {
				reject(
					error instanceof VideoConversionError
						? error
						: new VideoConversionError(
								"GIF conversion failed: " + (error as Error).message,
								"CONVERSION_ERROR"
						  )
				);
			}
		});
	}

	/**
	 * 计算GIF输出尺寸
	 */
	private calculateGIFDimensions(
		videoWidth: number,
		videoHeight: number,
		targetWidth?: number,
		targetHeight?: number,
		quality?: "high" | "medium" | "low"
	): { width: number; height: number } {
		let width = targetWidth || videoWidth;
		let height = targetHeight || videoHeight;

		// 根据质量调整尺寸
		const qualityScale = {
			high: 1.0,
			medium: 0.75,
			low: 0.5,
		};

		const scale = qualityScale[quality || "medium"];

		if (!targetWidth && !targetHeight) {
			width = Math.floor(videoWidth * scale);
			height = Math.floor(videoHeight * scale);
		}

		// 确保尺寸为偶数（某些编码器要求）
		width = Math.floor(width / 2) * 2;
		height = Math.floor(height / 2) * 2;

		// 限制最大尺寸以避免内存问题
		const maxSize =
			quality === "high" ? 1920 : quality === "medium" ? 1280 : 720;

		if (width > maxSize || height > maxSize) {
			const aspectRatio = width / height;
			if (width > height) {
				width = maxSize;
				height = Math.floor(maxSize / aspectRatio / 2) * 2;
			} else {
				height = maxSize;
				width = Math.floor((maxSize * aspectRatio) / 2) * 2;
			}
		}

		return { width, height };
	}

	/**
	 * 获取视频信息
	 */
	async getVideoInfo(videoBlob: Blob): Promise<{
		duration: number;
		width: number;
		height: number;
		size: number;
		type: string;
	}> {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.muted = true;
			video.autoplay = false;
			video.preload = "metadata";

			video.onloadedmetadata = () => {
				const info = {
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight,
					size: videoBlob.size,
					type: videoBlob.type,
				};

				URL.revokeObjectURL(video.src);
				resolve(info);
			};

			video.onerror = () => {
				URL.revokeObjectURL(video.src);
				reject(
					new VideoConversionError(
						"Failed to load video metadata",
						"METADATA_ERROR"
					)
				);
			};

			video.src = URL.createObjectURL(videoBlob);
		});
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		this.mp4Worker?.terminate();
		this.gifWorker?.terminate();
		this.mp4Worker = undefined;
		this.gifWorker = undefined;
	}

	/**
	 * 检查浏览器支持
	 */
	static checkSupport(): {
		webm: boolean;
		mp4: boolean;
		gif: boolean;
		workers: boolean;
	} {
		const video = document.createElement("video");

		return {
			webm: video.canPlayType("video/webm") !== "",
			mp4: video.canPlayType("video/mp4") !== "",
			gif: true, // GIF support through canvas
			workers: typeof Worker !== "undefined",
		};
	}

	/**
	 * 估算转换时间
	 */
	static estimateConversionTime(
		videoDuration: number,
		videoSize: number,
		targetFormat: "mp4" | "gif",
		quality: "high" | "medium" | "low" = "medium"
	): number {
		// 基于经验的转换时间估算（秒）
		const baseTimePerSecond = {
			mp4: { high: 2, medium: 1.5, low: 1 },
			gif: { high: 4, medium: 3, low: 2 },
		};

		const sizeMultiplier = Math.min(videoSize / (1024 * 1024 * 10), 2); // 10MB基准
		const baseDuration =
			videoDuration * baseTimePerSecond[targetFormat][quality];

		return Math.ceil(baseDuration * (1 + sizeMultiplier));
	}
}
