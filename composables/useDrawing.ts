// Note: Vue types need to be available in the project
import { ref, computed, onMounted, onUnmounted } from "vue";

// 绘图工具类型
export type DrawingTool = "pencil" | "highlighter" | "arrow" | "eraser";

// 绘图状态接口
export interface DrawingState {
	currentTool: DrawingTool;
	currentColor: string;
	brushSize: number;
	isDrawing: boolean;
	canUndo: boolean;
	canRedo: boolean;
}

// 绘图历史记录
export interface DrawingAction {
	type: "draw" | "erase" | "clear";
	data: ImageData | null;
	timestamp: number;
}

export interface UseDrawingReturn {
	// 状态
	currentTool: any; // ref<DrawingTool>
	currentColor: any; // ref<string>
	brushSize: any; // ref<number>
	isDrawing: any; // ref<boolean>
	canUndo: any; // ref<boolean>
	canRedo: any; // ref<boolean>

	// 计算属性
	toolConfig: any; // computed<object>

	// 方法
	setTool: (tool: DrawingTool) => void;
	setColor: (color: string) => void;
	setBrushSize: (size: number) => void;
	startDrawing: (x: number, y: number) => void;
	draw: (x: number, y: number) => void;
	stopDrawing: () => void;
	undo: () => boolean;
	redo: () => boolean;
	clear: () => void;
	saveState: () => void;
	initCanvas: (canvas: HTMLCanvasElement) => void;
}

export function useDrawing(): UseDrawingReturn {
	// 状态管理
	const currentTool = ref<DrawingTool>("pencil");
	const currentColor = ref("#FF0000");
	const brushSize = ref(3);
	const isDrawing = ref(false);
	const canUndo = ref(false);
	const canRedo = ref(false);

	// 画布相关
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let lastX = 0;
	let lastY = 0;

	// 历史记录
	const undoStack: ImageData[] = [];
	const redoStack: ImageData[] = [];
	const maxHistorySize = 50;

	// 计算属性 - 工具配置
	const toolConfig = computed(() => {
		const configs = {
			pencil: {
				globalCompositeOperation: "source-over" as GlobalCompositeOperation,
				lineCap: "round" as CanvasLineCap,
				lineJoin: "round" as CanvasLineJoin,
				strokeStyle: currentColor.value,
				lineWidth: brushSize.value,
				globalAlpha: 1,
			},
			highlighter: {
				globalCompositeOperation: "source-over" as GlobalCompositeOperation,
				lineCap: "round" as CanvasLineCap,
				lineJoin: "round" as CanvasLineJoin,
				strokeStyle: currentColor.value,
				lineWidth: brushSize.value * 3,
				globalAlpha: 0.3,
			},
			arrow: {
				globalCompositeOperation: "source-over" as GlobalCompositeOperation,
				lineCap: "round" as CanvasLineCap,
				lineJoin: "round" as CanvasLineJoin,
				strokeStyle: currentColor.value,
				lineWidth: brushSize.value,
				globalAlpha: 1,
			},
			eraser: {
				globalCompositeOperation: "destination-out" as GlobalCompositeOperation,
				lineCap: "round" as CanvasLineCap,
				lineJoin: "round" as CanvasLineJoin,
				lineWidth: brushSize.value * 2,
				globalAlpha: 1,
			},
		};

		return configs[currentTool.value];
	});

	// 初始化画布
	function initCanvas(canvasElement: HTMLCanvasElement): void {
		canvas = canvasElement;
		ctx = canvas.getContext("2d");

		if (ctx) {
			// 设置画布大小为全屏
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;

			// 初始化画布样式
			canvas.style.position = "fixed";
			canvas.style.top = "0";
			canvas.style.left = "0";
			canvas.style.zIndex = "9999";
			canvas.style.pointerEvents = "auto";
			canvas.style.cursor = "crosshair";

			// 保存初始状态
			saveState();

			// 绑定事件
			setupCanvasEvents();
		}
	}

	// 设置工具
	function setTool(tool: DrawingTool): void {
		currentTool.value = tool;
		updateCanvasCursor();
	}

	// 设置颜色
	function setColor(color: string): void {
		currentColor.value = color;
	}

	// 设置画笔大小
	function setBrushSize(size: number): void {
		brushSize.value = Math.max(1, Math.min(20, size));
	}

	// 开始绘制
	function startDrawing(x: number, y: number): void {
		if (!ctx) return;

		isDrawing.value = true;
		lastX = x;
		lastY = y;

		// 清空重做栈
		redoStack.length = 0;
		canRedo.value = false;

		// 应用工具配置
		applyToolConfig();

		// 开始路径
		ctx.beginPath();
		ctx.moveTo(x, y);
	}

	// 绘制
	function draw(x: number, y: number): void {
		if (!ctx || !isDrawing.value) return;

		if (currentTool.value === "arrow") {
			// 箭头工具需要特殊处理
			drawArrow(lastX, lastY, x, y);
		} else {
			// 普通绘制
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(x, y);
			ctx.stroke();
		}

		lastX = x;
		lastY = y;
	}

	// 停止绘制
	function stopDrawing(): void {
		if (!isDrawing.value) return;

		isDrawing.value = false;

		// 保存状态到历史记录
		saveState();
	}

	// 绘制箭头
	function drawArrow(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number
	): void {
		if (!ctx) return;

		const angle = Math.atan2(toY - fromY, toX - fromX);
		const headLength = 20;

		// 绘制线条
		ctx.beginPath();
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		ctx.stroke();

		// 绘制箭头头部
		ctx.beginPath();
		ctx.moveTo(toX, toY);
		ctx.lineTo(
			toX - headLength * Math.cos(angle - Math.PI / 6),
			toY - headLength * Math.sin(angle - Math.PI / 6)
		);
		ctx.moveTo(toX, toY);
		ctx.lineTo(
			toX - headLength * Math.cos(angle + Math.PI / 6),
			toY - headLength * Math.sin(angle + Math.PI / 6)
		);
		ctx.stroke();
	}

	// 撤销
	function undo(): boolean {
		if (undoStack.length <= 1) return false;

		// 保存当前状态到重做栈
		const currentState = getCurrentCanvasState();
		if (currentState) {
			redoStack.push(currentState);
			canRedo.value = true;
		}

		// 移除当前状态
		undoStack.pop();

		// 恢复上一个状态
		const previousState = undoStack[undoStack.length - 1];
		if (previousState && ctx) {
			ctx.putImageData(previousState, 0, 0);
		}

		canUndo.value = undoStack.length > 1;
		return true;
	}

	// 重做
	function redo(): boolean {
		if (redoStack.length === 0) return false;

		const redoState = redoStack.pop();
		if (redoState && ctx) {
			// 保存当前状态到撤销栈
			saveState();

			// 应用重做状态
			ctx.putImageData(redoState, 0, 0);

			canRedo.value = redoStack.length > 0;
			return true;
		}

		return false;
	}

	// 清除画布
	function clear(): void {
		if (!ctx || !canvas) return;

		// 保存状态
		saveState();

		// 清除画布
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 清空重做栈
		redoStack.length = 0;
		canRedo.value = false;
	}

	// 保存状态
	function saveState(): void {
		const state = getCurrentCanvasState();
		if (state) {
			undoStack.push(state);

			// 限制历史记录大小
			if (undoStack.length > maxHistorySize) {
				undoStack.shift();
			}

			canUndo.value = undoStack.length > 1;
		}
	}

	// 获取当前画布状态
	function getCurrentCanvasState(): ImageData | null {
		if (!ctx || !canvas) return null;
		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	// 应用工具配置
	function applyToolConfig(): void {
		if (!ctx) return;

		const config = toolConfig.value;
		Object.assign(ctx, config);
	}

	// 更新画布光标
	function updateCanvasCursor(): void {
		if (!canvas) return;

		const cursors = {
			pencil: "crosshair",
			highlighter: "crosshair",
			arrow: "crosshair",
			eraser: "grab",
		};

		canvas.style.cursor = cursors[currentTool.value];
	}

	// 设置画布事件
	function setupCanvasEvents(): void {
		if (!canvas) return;

		// 鼠标事件
		canvas.addEventListener("mousedown", handleMouseDown);
		canvas.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("mouseup", handleMouseUp);
		canvas.addEventListener("mouseout", handleMouseUp);

		// 触摸事件（移动设备）
		canvas.addEventListener("touchstart", handleTouchStart);
		canvas.addEventListener("touchmove", handleTouchMove);
		canvas.addEventListener("touchend", handleTouchEnd);

		// 防止上下文菜单
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	}

	// 鼠标事件处理
	function handleMouseDown(e: MouseEvent): void {
		const rect = canvas?.getBoundingClientRect();
		if (rect) {
			startDrawing(e.clientX - rect.left, e.clientY - rect.top);
		}
	}

	function handleMouseMove(e: MouseEvent): void {
		const rect = canvas?.getBoundingClientRect();
		if (rect) {
			draw(e.clientX - rect.left, e.clientY - rect.top);
		}
	}

	function handleMouseUp(): void {
		stopDrawing();
	}

	// 触摸事件处理
	function handleTouchStart(e: TouchEvent): void {
		e.preventDefault();
		const rect = canvas?.getBoundingClientRect();
		if (rect && e.touches[0]) {
			const touch = e.touches[0];
			startDrawing(touch.clientX - rect.left, touch.clientY - rect.top);
		}
	}

	function handleTouchMove(e: TouchEvent): void {
		e.preventDefault();
		const rect = canvas?.getBoundingClientRect();
		if (rect && e.touches[0]) {
			const touch = e.touches[0];
			draw(touch.clientX - rect.left, touch.clientY - rect.top);
		}
	}

	function handleTouchEnd(e: TouchEvent): void {
		e.preventDefault();
		stopDrawing();
	}

	// 清理事件监听器
	function cleanup(): void {
		if (!canvas) return;

		canvas.removeEventListener("mousedown", handleMouseDown);
		canvas.removeEventListener("mousemove", handleMouseMove);
		canvas.removeEventListener("mouseup", handleMouseUp);
		canvas.removeEventListener("mouseout", handleMouseUp);
		canvas.removeEventListener("touchstart", handleTouchStart);
		canvas.removeEventListener("touchmove", handleTouchMove);
		canvas.removeEventListener("touchend", handleTouchEnd);
	}

	// 组件卸载时清理
	onUnmounted(() => {
		cleanup();
	});

	return {
		// 状态
		currentTool,
		currentColor,
		brushSize,
		isDrawing,
		canUndo,
		canRedo,

		// 计算属性
		toolConfig,

		// 方法
		setTool,
		setColor,
		setBrushSize,
		startDrawing,
		draw,
		stopDrawing,
		undo,
		redo,
		clear,
		saveState,
		initCanvas,
	};
}
