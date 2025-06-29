import type { RecordingSettings } from "../types/recording";
import {
	performanceMonitor,
	QualityLevel,
	QualitySettings,
} from "./performanceManager";

// MediaRecorder 状态类型
export type MediaRecorderState = "inactive" | "recording" | "paused";

export interface RecordingOptions {
	mimeType?: string;
	videoBitsPerSecond?: number;
	audioBitsPerSecond?: number;
	frameRate?: number;
	chunkInterval?: number; // 分片间隔（毫秒）
}

export interface RecordingChunk {
	id: string;
	data: Blob;
	timestamp: number;
	size: number;
}

export class RecordingService {
	private mediaRecorder: MediaRecorder | null = null;
	private recordedChunks: RecordingChunk[] = [];
	private stream: MediaStream | null = null;
	private startTime: number = 0;
	private pausedDuration: number = 0;
	private pauseStartTime: number = 0;
	private chunkCounter: number = 0;
	private options: RecordingOptions = {};

	// 事件回调
	private onChunkAvailable?: (chunk: RecordingChunk) => void;
	private onRecordingStateChange?: (state: MediaRecorderState) => void;
	private onError?: (error: Error) => void;
	private onQualityChange?: (
		quality: QualityLevel,
		settings: QualitySettings
	) => void;

	/**
	 * 开始录制
	 */
	async startRecording(
		stream: MediaStream,
		settings: RecordingSettings,
		options: RecordingOptions = {}
	): Promise<MediaRecorder> {
		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			throw new Error("录制已在进行中");
		}

		this.stream = stream;
		this.recordedChunks = [];
		this.chunkCounter = 0;
		this.startTime = Date.now();
		this.pausedDuration = 0;
		this.options = { ...this.getDefaultOptions(), ...options };

		// 应用帧率约束
		if (this.options.frameRate) {
			this.applyFrameRateConstraints(stream, this.options.frameRate);
		}

		// 创建MediaRecorder
		const mediaRecorderOptions = this.buildMediaRecorderOptions(settings);

		try {
			this.mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
			this.setupEventHandlers();

			// 启动性能监控
			this.setupPerformanceMonitoring();

			// 开始录制，使用分片间隔
			this.mediaRecorder.start(this.options.chunkInterval);
			this.notifyStateChange("recording");

			return this.mediaRecorder;
		} catch (error) {
			const recordingError = new Error(
				`MediaRecorder 创建失败: ${
					error instanceof Error ? error.message : "未知错误"
				}`
			);
			this.notifyError(recordingError);
			throw recordingError;
		}
	}

	/**
	 * 暂停录制
	 */
	pauseRecording(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			this.mediaRecorder.pause();
			this.pauseStartTime = Date.now();
			this.notifyStateChange("paused");
		}
	}

	/**
	 * 恢复录制
	 */
	resumeRecording(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
			this.mediaRecorder.resume();
			if (this.pauseStartTime > 0) {
				this.pausedDuration += Date.now() - this.pauseStartTime;
				this.pauseStartTime = 0;
			}
			this.notifyStateChange("recording");
		}
	}

	/**
	 * 停止录制
	 */
	stopRecording(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				resolve(new Blob());
				return;
			}

			this.mediaRecorder.onstop = () => {
				try {
					// 停止性能监控
					performanceMonitor.stopMonitoring();

					const finalBlob = this.createFinalBlob();
					this.cleanup();
					this.notifyStateChange("inactive");
					resolve(finalBlob);
				} catch (error) {
					const recordingError = new Error(
						`录制停止时出错: ${
							error instanceof Error ? error.message : "未知错误"
						}`
					);
					this.notifyError(recordingError);
					reject(recordingError);
				}
			};

			this.mediaRecorder.stop();
		});
	}

	/**
	 * 获取录制时长（毫秒）
	 */
	getRecordingDuration(): number {
		if (this.startTime === 0) return 0;

		const currentTime = Date.now();
		const totalTime = currentTime - this.startTime;

		// 减去暂停时间
		let adjustedPausedDuration = this.pausedDuration;
		if (this.pauseStartTime > 0) {
			adjustedPausedDuration += currentTime - this.pauseStartTime;
		}

		return Math.max(0, totalTime - adjustedPausedDuration);
	}

	/**
	 * 获取录制数据大小（字节）
	 */
	getRecordingSize(): number {
		return this.recordedChunks.reduce((total, chunk) => total + chunk.size, 0);
	}

	/**
	 * 获取当前录制状态
	 */
	getRecordingState(): MediaRecorderState {
		if (!this.mediaRecorder) return "inactive";
		return this.mediaRecorder.state as MediaRecorderState;
	}

	/**
	 * 设置事件监听器
	 */
	setEventListeners(callbacks: {
		onChunkAvailable?: (chunk: RecordingChunk) => void;
		onRecordingStateChange?: (state: MediaRecorderState) => void;
		onError?: (error: Error) => void;
		onQualityChange?: (
			quality: QualityLevel,
			settings: QualitySettings
		) => void;
	}): void {
		this.onChunkAvailable = callbacks.onChunkAvailable;
		this.onRecordingStateChange = callbacks.onRecordingStateChange;
		this.onError = callbacks.onError;
		this.onQualityChange = callbacks.onQualityChange;
	}

	/**
	 * 设置性能监控
	 */
	private setupPerformanceMonitoring(): void {
		// 设置性能监控事件监听器
		performanceMonitor.setEventListeners({
			onQualityChange: (quality: QualityLevel, settings: QualitySettings) => {
				console.log(`Quality changed to ${quality}:`, settings);
				this.onQualityChange?.(quality, settings);

				// 如果正在录制，重新创建MediaRecorder
				if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
					this.adjustRecordingQuality(settings);
				}
			},
			onMemoryWarning: (usage: number, limit: number) => {
				console.warn(
					`Memory warning: ${usage.toFixed(2)}MB / ${limit.toFixed(2)}MB`
				);
				// 可以触发紧急内存清理
				this.performEmergencyCleanup();
			},
			onChunkReady: (chunk: Blob, index: number) => {
				// 添加到性能监控器进行内存管理
				performanceMonitor.addChunk(chunk);
			},
		});

		// 启动性能监控
		performanceMonitor.startMonitoring();
	}

	/**
	 * 调整录制质量（动态质量调整）
	 */
	private adjustRecordingQuality(settings: QualitySettings): void {
		// 注意：MediaRecorder API不支持运行时更改设置
		// 这里只是记录新设置，在下次录制时生效
		this.options.videoBitsPerSecond = settings.videoBitsPerSecond;
		this.options.audioBitsPerSecond = settings.audioBitsPerSecond;
		this.options.frameRate = settings.frameRate;

		console.log(
			"Recording quality settings updated for next recording:",
			settings
		);
	}

	/**
	 * 紧急内存清理
	 */
	private performEmergencyCleanup(): void {
		// 清理旧的chunks
		if (this.recordedChunks.length > 10) {
			const keepCount = Math.floor(this.recordedChunks.length / 2);
			this.recordedChunks = this.recordedChunks.slice(-keepCount);
			console.log(`Emergency cleanup: kept ${keepCount} chunks`);
		}

		// 强制垃圾回收（如果支持）
		if (typeof window !== "undefined" && (window as any).gc) {
			(window as any).gc();
		}
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}

		// 清理性能监控数据
		performanceMonitor.clearAllData();

		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.startTime = 0;
		this.pausedDuration = 0;
		this.pauseStartTime = 0;
		this.chunkCounter = 0;
	}

	/**
	 * 获取支持的MIME类型
	 */
	static getSupportedMimeTypes(): string[] {
		const types = [
			"video/webm;codecs=vp9",
			"video/webm;codecs=vp8",
			"video/webm;codecs=h264",
			"video/webm",
			"video/mp4;codecs=h264",
			"video/mp4",
		];

		return types.filter((type) => MediaRecorder.isTypeSupported(type));
	}

	/**
	 * 获取最佳MIME类型
	 */
	static getBestSupportedMimeType(): string {
		const supportedTypes = RecordingService.getSupportedMimeTypes();

		// 优先顺序：VP9 > VP8 > H264
		const preferredOrder = [
			"video/webm;codecs=vp9",
			"video/webm;codecs=vp8",
			"video/webm;codecs=h264",
			"video/webm",
			"video/mp4;codecs=h264",
			"video/mp4",
		];

		for (const type of preferredOrder) {
			if (supportedTypes.includes(type)) {
				return type;
			}
		}

		return supportedTypes[0] || "video/webm";
	}

	// ========== 私有方法 ==========

	/**
	 * 获取默认选项
	 */
	private getDefaultOptions(): RecordingOptions {
		return {
			mimeType: RecordingService.getBestSupportedMimeType(),
			videoBitsPerSecond: 2500000, // 2.5 Mbps
			audioBitsPerSecond: 128000, // 128 kbps
			frameRate: 30,
			chunkInterval: 1000, // 1秒分片
		};
	}

	/**
	 * 应用帧率约束
	 */
	private applyFrameRateConstraints(
		stream: MediaStream,
		frameRate: number
	): void {
		stream.getVideoTracks().forEach((track) => {
			track
				.applyConstraints({
					frameRate: { ideal: frameRate, max: frameRate },
				})
				.catch((error) => {
					console.warn("应用帧率约束失败:", error);
				});
		});
	}

	/**
	 * 构建MediaRecorder选项
	 */
	private buildMediaRecorderOptions(
		settings: RecordingSettings
	): MediaRecorderOptions {
		const options: MediaRecorderOptions = {};

		if (this.options.mimeType) {
			options.mimeType = this.options.mimeType;
		}

		// 根据分辨率设置计算比特率
		const bitrateMultiplier = this.getBitrateMultiplier(settings.resolution);

		if (this.options.videoBitsPerSecond) {
			options.videoBitsPerSecond = Math.round(
				this.options.videoBitsPerSecond * bitrateMultiplier
			);
		}

		if (this.options.audioBitsPerSecond && settings.audio) {
			options.audioBitsPerSecond = this.options.audioBitsPerSecond;
		}

		return options;
	}

	/**
	 * 根据分辨率设置获取比特率倍数
	 */
	private getBitrateMultiplier(resolution: string): number {
		switch (resolution) {
			case "1080p":
				return 1.5;
			case "720p":
				return 1.0;
			case "480p":
				return 0.6;
			default:
				return 1.0;
		}
	}

	/**
	 * 设置事件处理器
	 */
	private setupEventHandlers(): void {
		if (!this.mediaRecorder) return;

		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				const chunk: RecordingChunk = {
					id: `chunk_${this.chunkCounter++}`,
					data: event.data,
					timestamp: Date.now(),
					size: event.data.size,
				};

				this.recordedChunks.push(chunk);
				this.onChunkAvailable?.(chunk);

				// 内存管理：如果分片太多，触发临时存储
				if (this.recordedChunks.length > 20) {
					this.manageMemory();
				}
			}
		};

		this.mediaRecorder.onerror = (event) => {
			const error = new Error(
				`MediaRecorder 错误: ${event.error?.message || "未知错误"}`
			);
			this.notifyError(error);
		};

		this.mediaRecorder.onstart = () => {
			this.notifyStateChange("recording");
		};

		this.mediaRecorder.onpause = () => {
			this.notifyStateChange("paused");
		};

		this.mediaRecorder.onresume = () => {
			this.notifyStateChange("recording");
		};
	}

	/**
	 * 内存管理
	 */
	private manageMemory(): void {
		// 这里可以实现将早期分片保存到IndexedDB
		// 当前简化实现：仅在控制台警告
		if (this.recordedChunks.length > 50) {
			console.warn(
				`录制分片数量较多 (${this.recordedChunks.length})，建议优化内存使用`
			);
		}
	}

	/**
	 * 创建最终的Blob
	 */
	private createFinalBlob(): Blob {
		const chunks = this.recordedChunks.map((chunk) => chunk.data);
		const mimeType = this.options.mimeType || "video/webm";
		return new Blob(chunks, { type: mimeType });
	}

	/**
	 * 通知状态改变
	 */
	private notifyStateChange(state: MediaRecorderState): void {
		this.onRecordingStateChange?.(state);
	}

	/**
	 * 通知错误
	 */
	private notifyError(error: Error): void {
		this.onError?.(error);
	}
}

/**
 * 录制服务工厂函数
 */
export function createRecordingService(): RecordingService {
	return new RecordingService();
}

/**
 * 单例录制服务
 */
let recordingServiceInstance: RecordingService | null = null;

export function getRecordingService(): RecordingService {
	if (!recordingServiceInstance) {
		recordingServiceInstance = createRecordingService();
	}
	return recordingServiceInstance;
}
