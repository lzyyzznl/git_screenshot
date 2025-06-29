export interface PerformanceMetrics {
	memoryUsage: number;
	heapLimit: number;
	frameRate: number;
	chunkCount: number;
	totalSize: number;
	recordingDuration: number;
}

export interface PerformanceConfig {
	memoryThreshold: number; // MB
	chunkSizeLimit: number; // MB
	checkInterval: number; // ms
	maxChunks: number;
	enableDynamicQuality: boolean;
	autoCleanup: boolean;
}

export type QualityLevel = "high" | "medium" | "low";

export interface QualitySettings {
	videoBitsPerSecond: number;
	audioBitsPerSecond: number;
	frameRate: number;
	width?: number;
	height?: number;
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private config: PerformanceConfig;
	private currentQuality: QualityLevel = "high";
	private recordedChunks: Blob[] = [];
	private totalSize = 0;
	private chunkCount = 0;
	private lastPerformanceCheck = 0;
	private frameTimestamps: number[] = [];
	private performanceTimer?: number;
	private metricsHistory: PerformanceMetrics[] = [];
	private isRecording = false;
	private onQualityChange?: (
		quality: QualityLevel,
		settings: QualitySettings
	) => void;
	private onMemoryWarning?: (usage: number, limit: number) => void;
	private onChunkReady?: (chunk: Blob, index: number) => void;

	// 质量设置映射
	private qualitySettings: Record<QualityLevel, QualitySettings> = {
		high: {
			videoBitsPerSecond: 8000000, // 8 Mbps
			audioBitsPerSecond: 128000, // 128 kbps
			frameRate: 30,
		},
		medium: {
			videoBitsPerSecond: 4000000, // 4 Mbps
			audioBitsPerSecond: 96000, // 96 kbps
			frameRate: 24,
		},
		low: {
			videoBitsPerSecond: 2000000, // 2 Mbps
			audioBitsPerSecond: 64000, // 64 kbps
			frameRate: 15,
		},
	};

	constructor(config?: Partial<PerformanceConfig>) {
		this.config = {
			memoryThreshold: 100, // 100MB
			chunkSizeLimit: 50, // 50MB per chunk
			checkInterval: 2000, // 2 seconds
			maxChunks: 20, // Max chunks in memory
			enableDynamicQuality: true,
			autoCleanup: true,
			...config,
		};
	}

	/**
	 * 获取单例实例
	 */
	static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor(config);
		}
		return PerformanceMonitor.instance;
	}

	/**
	 * 开始性能监控
	 */
	startMonitoring(): void {
		if (this.performanceTimer) return;

		this.isRecording = true;
		this.frameTimestamps = [];
		this.metricsHistory = [];

		this.performanceTimer = window.setInterval(() => {
			this.checkPerformance();
		}, this.config.checkInterval);

		console.log("Performance monitoring started");
	}

	/**
	 * 停止性能监控
	 */
	stopMonitoring(): void {
		if (this.performanceTimer) {
			clearInterval(this.performanceTimer);
			this.performanceTimer = undefined;
		}

		this.isRecording = false;
		this.frameTimestamps = [];

		console.log("Performance monitoring stopped");
	}

	/**
	 * 检查性能指标
	 */
	private checkPerformance(): void {
		const now = Date.now();
		if (now - this.lastPerformanceCheck < this.config.checkInterval) return;

		this.lastPerformanceCheck = now;

		const metrics = this.collectMetrics();
		this.metricsHistory.push(metrics);

		// 保持历史记录不超过100条
		if (this.metricsHistory.length > 100) {
			this.metricsHistory.shift();
		}

		// 检查内存使用情况
		this.checkMemoryUsage(metrics);

		// 检查帧率性能
		this.checkFrameRate(metrics);

		// 自动清理
		if (this.config.autoCleanup) {
			this.performAutoCleanup();
		}

		console.log("Performance metrics:", metrics);
	}

	/**
	 * 收集性能指标
	 */
	private collectMetrics(): PerformanceMetrics {
		const memory = (performance as any).memory;

		return {
			memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0, // MB
			heapLimit: memory ? memory.jsHeapSizeLimit / (1024 * 1024) : 0, // MB
			frameRate: this.calculateFrameRate(),
			chunkCount: this.chunkCount,
			totalSize: this.totalSize / (1024 * 1024), // MB
			recordingDuration: this.isRecording
				? Date.now() - this.lastPerformanceCheck
				: 0,
		};
	}

	/**
	 * 检查内存使用情况
	 */
	private checkMemoryUsage(metrics: PerformanceMetrics): void {
		const memoryUsagePercent = metrics.memoryUsage / metrics.heapLimit;

		// 内存使用超过70%时降低质量
		if (this.config.enableDynamicQuality && memoryUsagePercent > 0.7) {
			if (this.currentQuality === "high") {
				this.adjustQuality("medium");
			} else if (
				this.currentQuality === "medium" &&
				memoryUsagePercent > 0.85
			) {
				this.adjustQuality("low");
			}
		}

		// 内存使用超过85%时发出警告
		if (memoryUsagePercent > 0.85) {
			this.onMemoryWarning?.(metrics.memoryUsage, metrics.heapLimit);
		}

		// 内存使用超过阈值时清理数据
		if (metrics.totalSize > this.config.memoryThreshold) {
			this.performChunkCleanup();
		}
	}

	/**
	 * 检查帧率性能
	 */
	private checkFrameRate(metrics: PerformanceMetrics): void {
		if (!this.config.enableDynamicQuality) return;

		const currentSettings = this.qualitySettings[this.currentQuality];
		const targetFrameRate = currentSettings.frameRate;

		// 如果实际帧率低于目标帧率的80%，降低质量
		if (metrics.frameRate < targetFrameRate * 0.8) {
			if (this.currentQuality === "high") {
				this.adjustQuality("medium");
			} else if (
				this.currentQuality === "medium" &&
				metrics.frameRate < targetFrameRate * 0.6
			) {
				this.adjustQuality("low");
			}
		}
	}

	/**
	 * 计算当前帧率
	 */
	private calculateFrameRate(): number {
		const now = Date.now();

		// 记录帧时间戳
		this.frameTimestamps.push(now);

		// 只保留最近1秒的时间戳
		const oneSecondAgo = now - 1000;
		this.frameTimestamps = this.frameTimestamps.filter(
			(timestamp) => timestamp > oneSecondAgo
		);

		return this.frameTimestamps.length;
	}

	/**
	 * 调整录制质量
	 */
	private adjustQuality(newQuality: QualityLevel): void {
		if (this.currentQuality === newQuality) return;

		console.log(
			`Adjusting quality from ${this.currentQuality} to ${newQuality}`
		);

		this.currentQuality = newQuality;
		const settings = this.qualitySettings[newQuality];

		this.onQualityChange?.(newQuality, settings);
	}

	/**
	 * 添加录制数据块
	 */
	addChunk(chunk: Blob): void {
		this.recordedChunks.push(chunk);
		this.totalSize += chunk.size;
		this.chunkCount++;

		console.log(
			`Added chunk ${this.chunkCount}, size: ${(
				chunk.size /
				1024 /
				1024
			).toFixed(2)}MB`
		);

		// 检查是否需要清理
		if (this.shouldPerformCleanup()) {
			this.performChunkCleanup();
		}

		// 通知有新chunk
		this.onChunkReady?.(chunk, this.chunkCount - 1);
	}

	/**
	 * 判断是否需要清理
	 */
	private shouldPerformCleanup(): boolean {
		const totalSizeMB = this.totalSize / (1024 * 1024);
		return (
			totalSizeMB > this.config.chunkSizeLimit ||
			this.chunkCount > this.config.maxChunks
		);
	}

	/**
	 * 执行chunk清理
	 */
	private performChunkCleanup(): void {
		if (this.recordedChunks.length === 0) return;

		// 保留最新的一半chunks，清理较旧的
		const keepCount = Math.floor(this.recordedChunks.length / 2);
		const chunksToRemove = this.recordedChunks.splice(
			0,
			this.recordedChunks.length - keepCount
		);

		// 计算清理的大小
		const removedSize = chunksToRemove.reduce(
			(total, chunk) => total + chunk.size,
			0
		);
		this.totalSize -= removedSize;

		console.log(
			`Cleaned up ${chunksToRemove.length} chunks, freed ${(
				removedSize /
				1024 /
				1024
			).toFixed(2)}MB`
		);
	}

	/**
	 * 自动清理
	 */
	private performAutoCleanup(): void {
		// 清理过期的性能指标历史
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
		this.metricsHistory = this.metricsHistory.filter(
			(metric) => metric.recordingDuration > fiveMinutesAgo
		);

		// 清理过期的帧时间戳
		const oneMinuteAgo = Date.now() - 60 * 1000;
		this.frameTimestamps = this.frameTimestamps.filter(
			(timestamp) => timestamp > oneMinuteAgo
		);
	}

	/**
	 * 获取所有录制的chunks
	 */
	getAllChunks(): Blob[] {
		return [...this.recordedChunks];
	}

	/**
	 * 清理所有数据
	 */
	clearAllData(): void {
		this.recordedChunks = [];
		this.totalSize = 0;
		this.chunkCount = 0;
		this.metricsHistory = [];
		this.frameTimestamps = [];

		console.log("All recording data cleared");
	}

	/**
	 * 获取当前性能指标
	 */
	getCurrentMetrics(): PerformanceMetrics {
		return this.collectMetrics();
	}

	/**
	 * 获取性能历史
	 */
	getMetricsHistory(): PerformanceMetrics[] {
		return [...this.metricsHistory];
	}

	/**
	 * 获取当前质量设置
	 */
	getCurrentQuality(): QualityLevel {
		return this.currentQuality;
	}

	/**
	 * 手动设置质量
	 */
	setQuality(quality: QualityLevel): void {
		this.adjustQuality(quality);
	}

	/**
	 * 获取质量设置
	 */
	getQualitySettings(quality?: QualityLevel): QualitySettings {
		return this.qualitySettings[quality || this.currentQuality];
	}

	/**
	 * 估算录制时间限制
	 */
	estimateRecordingTimeLimit(): number {
		const metrics = this.getCurrentMetrics();
		const availableMemory = metrics.heapLimit - metrics.memoryUsage;
		const avgChunkSize = this.totalSize / Math.max(this.chunkCount, 1);

		if (avgChunkSize === 0) return Infinity;

		const estimatedChunks = availableMemory / avgChunkSize;
		const estimatedSeconds =
			estimatedChunks * (this.config.checkInterval / 1000);

		return Math.max(0, estimatedSeconds);
	}

	/**
	 * 设置事件监听器
	 */
	setEventListeners(listeners: {
		onQualityChange?: (
			quality: QualityLevel,
			settings: QualitySettings
		) => void;
		onMemoryWarning?: (usage: number, limit: number) => void;
		onChunkReady?: (chunk: Blob, index: number) => void;
	}): void {
		this.onQualityChange = listeners.onQualityChange;
		this.onMemoryWarning = listeners.onMemoryWarning;
		this.onChunkReady = listeners.onChunkReady;
	}

	/**
	 * 生成性能报告
	 */
	generatePerformanceReport(): string {
		const metrics = this.getCurrentMetrics();
		const history = this.getMetricsHistory();

		const avgFrameRate =
			history.length > 0
				? history.reduce((sum, m) => sum + m.frameRate, 0) / history.length
				: 0;

		const maxMemoryUsage =
			history.length > 0
				? Math.max(...history.map((m) => m.memoryUsage))
				: metrics.memoryUsage;

		return `
Performance Report
==================
Current Quality: ${this.currentQuality}
Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB / ${metrics.heapLimit.toFixed(
			2
		)}MB (${((metrics.memoryUsage / metrics.heapLimit) * 100).toFixed(1)}%)
Max Memory Usage: ${maxMemoryUsage.toFixed(2)}MB
Current Frame Rate: ${metrics.frameRate} fps
Average Frame Rate: ${avgFrameRate.toFixed(1)} fps
Total Chunks: ${metrics.chunkCount}
Total Size: ${metrics.totalSize.toFixed(2)}MB
Recording Duration: ${(metrics.recordingDuration / 1000).toFixed(1)}s
Estimated Time Limit: ${this.estimateRecordingTimeLimit().toFixed(1)}s

Quality Settings (${this.currentQuality}):
- Video Bitrate: ${(
			this.qualitySettings[this.currentQuality].videoBitsPerSecond / 1000000
		).toFixed(1)} Mbps
- Audio Bitrate: ${(
			this.qualitySettings[this.currentQuality].audioBitsPerSecond / 1000
		).toFixed(0)} kbps
- Target Frame Rate: ${this.qualitySettings[this.currentQuality].frameRate} fps
    `.trim();
	}
}

// 默认导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
