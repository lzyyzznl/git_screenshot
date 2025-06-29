export interface CanvasOptimizationConfig {
	enableOffscreenCanvas: boolean;
	useBatchRendering: boolean;
	maxHistorySize: number;
	debounceInterval: number; // ms
	enableImageSmoothing: boolean;
	pixelRatio?: number;
}

export interface RenderCommand {
	type: "stroke" | "clear" | "image";
	data: any;
	timestamp: number;
}

export class CanvasOptimizer {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private offscreenCanvas?: OffscreenCanvas;
	private offscreenContext?: OffscreenCanvasRenderingContext2D;
	private config: CanvasOptimizationConfig;
	private renderQueue: RenderCommand[] = [];
	private lastRenderTime = 0;
	private animationFrameId?: number;
	private renderHistory: ImageData[] = [];
	private dirtyRegions: Set<string> = new Set();

	constructor(
		canvas: HTMLCanvasElement,
		config?: Partial<CanvasOptimizationConfig>
	) {
		this.canvas = canvas;
		this.context = canvas.getContext("2d")!;

		this.config = {
			enableOffscreenCanvas: true,
			useBatchRendering: true,
			maxHistorySize: 50,
			debounceInterval: 16, // ~60fps
			enableImageSmoothing: true,
			pixelRatio: window.devicePixelRatio || 1,
			...config,
		};

		this.setupCanvas();
		this.setupOffscreenCanvas();
	}

	/**
	 * 设置Canvas配置
	 */
	private setupCanvas(): void {
		const { pixelRatio } = this.config;

		// 设置高DPI支持
		if (pixelRatio && pixelRatio > 1) {
			const rect = this.canvas.getBoundingClientRect();
			this.canvas.width = rect.width * pixelRatio;
			this.canvas.height = rect.height * pixelRatio;
			this.canvas.style.width = rect.width + "px";
			this.canvas.style.height = rect.height + "px";
			this.context.scale(pixelRatio, pixelRatio);
		}

		// 优化渲染设置
		this.context.imageSmoothingEnabled = this.config.enableImageSmoothing;
		this.context.lineCap = "round";
		this.context.lineJoin = "round";
	}

	/**
	 * 强制渲染所有队列中的命令
	 */
	flush(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = undefined;
		}

		this.performBatchRender();
	}

	/**
	 * 执行批量渲染
	 */
	private performBatchRender(): void {
		if (this.renderQueue.length === 0) return;

		this.lastRenderTime = Date.now();

		// 批量执行渲染命令
		for (const command of this.renderQueue) {
			this.executeRenderCommand(command);
		}

		// 清空渲染队列
		this.renderQueue = [];
	}

	/**
	 * 执行单个渲染命令
	 */
	private executeRenderCommand(command: RenderCommand): void {
		switch (command.type) {
			case "clear":
				this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				break;
		}
	}

	/**
	 * 设置离屏Canvas
	 */
	private setupOffscreenCanvas(): void {
		// 简化实现
		console.log("Canvas optimizer initialized");
	}

	/**
	 * 清理资源
	 */
	dispose(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}

		this.renderQueue = [];
		this.renderHistory = [];
		this.dirtyRegions.clear();
	}
}

// 工厂函数
export function createCanvasOptimizer(
	canvas: HTMLCanvasElement,
	config?: Partial<CanvasOptimizationConfig>
): CanvasOptimizer {
	return new CanvasOptimizer(canvas, config);
}
