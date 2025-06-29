<template>
	<teleport to="body">
		<div
			v-if="isVisible && isRecording"
			class="recording-overlay fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]"
			@mousedown.stop
			@click.stop
		>
			<!-- 主工具栏 -->
			<div
				class="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex items-center gap-4 min-w-max"
			>
				<!-- 录制状态指示器 -->
				<div class="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg">
					<div class="relative">
						<div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
						<div
							class="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping"
						></div>
					</div>
					<div class="text-sm font-medium text-red-700">
						<span>{{ formattedDuration }}</span>
						<span class="ml-2 text-gray-500">{{ formattedFileSize }}</span>
					</div>
				</div>

				<!-- 分隔线 -->
				<div class="w-px h-6 bg-gray-200"></div>

				<!-- 绘图工具 -->
				<div class="flex items-center gap-1">
					<div class="text-xs text-gray-500 mb-1 absolute -top-5 left-0">
						绘图工具
					</div>
					<el-button-group size="small">
						<el-button
							:type="currentTool === 'pen' ? 'primary' : 'default'"
							@click="setTool('pen')"
							:class="{ 'bg-blue-500 text-white': currentTool === 'pen' }"
						>
							<i class="i-carbon-pen text-base"></i>
						</el-button>
						<el-button
							:type="currentTool === 'highlighter' ? 'primary' : 'default'"
							@click="setTool('highlighter')"
							:class="{
								'bg-yellow-500 text-white': currentTool === 'highlighter',
							}"
						>
							<i class="i-carbon-highlight text-base"></i>
						</el-button>
						<el-button
							:type="currentTool === 'arrow' ? 'primary' : 'default'"
							@click="setTool('arrow')"
							:class="{ 'bg-green-500 text-white': currentTool === 'arrow' }"
						>
							<i class="i-carbon-arrow-up-right text-base"></i>
						</el-button>
						<el-button
							:type="currentTool === 'eraser' ? 'primary' : 'default'"
							@click="setTool('eraser')"
							:class="{ 'bg-gray-500 text-white': currentTool === 'eraser' }"
						>
							<i class="i-carbon-erase text-base"></i>
						</el-button>
					</el-button-group>
				</div>

				<!-- 颜色选择器 -->
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-500">颜色</span>
					<el-color-picker
						v-model="currentColor"
						size="small"
						:disabled="currentTool === 'eraser'"
						:predefine="predefineColors"
					/>
				</div>

				<!-- 画笔大小 -->
				<div class="flex items-center gap-2 min-w-24">
					<span class="text-xs text-gray-500">大小</span>
					<el-slider
						v-model="brushSize"
						:min="1"
						:max="20"
						:step="1"
						:disabled="currentTool === 'eraser'"
						size="small"
						style="width: 60px"
					/>
				</div>

				<!-- 分隔线 -->
				<div class="w-px h-6 bg-gray-200"></div>

				<!-- 操作按钮 -->
				<div class="flex items-center gap-1">
					<el-button
						size="small"
						:disabled="!canUndo"
						@click="undo"
						title="撤销"
					>
						<i class="i-carbon-undo text-base"></i>
					</el-button>
					<el-button
						size="small"
						:disabled="!canRedo"
						@click="redo"
						title="重做"
					>
						<i class="i-carbon-redo text-base"></i>
					</el-button>
					<el-button size="small" @click="clearCanvas" title="清除所有标注">
						<i class="i-carbon-clean text-base"></i>
					</el-button>
				</div>

				<!-- 分隔线 -->
				<div class="w-px h-6 bg-gray-200"></div>

				<!-- 录制控制 -->
				<div class="flex items-center gap-2">
					<el-button
						v-if="!isPaused"
						size="small"
						type="warning"
						@click="pauseRecording"
						title="暂停录制"
					>
						<i class="i-carbon-pause text-base"></i>
					</el-button>
					<el-button
						v-else
						size="small"
						type="success"
						@click="resumeRecording"
						title="继续录制"
					>
						<i class="i-carbon-play text-base"></i>
					</el-button>

					<el-button
						size="small"
						type="danger"
						@click="stopRecording"
						title="停止录制"
					>
						<i class="i-carbon-stop text-base mr-1"></i>
						停止
					</el-button>
				</div>

				<!-- 最小化按钮 -->
				<div class="flex items-center">
					<el-button size="small" @click="toggleMinimized" title="最小化工具栏">
						<i
							class="i-carbon-chevron-up text-base"
							:class="{ 'transform rotate-180': isMinimized }"
						></i>
					</el-button>
				</div>
			</div>

			<!-- 最小化状态 -->
			<div
				v-if="isMinimized"
				class="bg-white rounded-full shadow-lg border border-gray-200 p-2 flex items-center gap-2 cursor-pointer"
				@click="toggleMinimized"
			>
				<div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
				<span class="text-xs font-medium text-gray-700">{{
					formattedDuration
				}}</span>
				<i class="i-carbon-chevron-down text-sm text-gray-500"></i>
			</div>
		</div>

		<!-- 绘图画布覆盖层 -->
		<div
			v-if="isVisible && isRecording && currentTool !== 'none'"
			class="drawing-canvas-overlay fixed inset-0 z-[9998] pointer-events-auto"
			@mousedown="startDrawing"
			@mousemove="draw"
			@mouseup="stopDrawing"
			@mouseleave="stopDrawing"
		>
			<canvas
				ref="drawingCanvas"
				class="absolute inset-0 w-full h-full cursor-crosshair"
				:class="{
					'cursor-crosshair': currentTool === 'pen',
					'cursor-cell': currentTool === 'highlighter',
					'cursor-pointer': currentTool === 'arrow',
					'cursor-none': currentTool === 'eraser',
				}"
			></canvas>
		</div>
	</teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { keyboardShortcuts } from "../utils/keyboardShortcuts";

// Props接口定义
interface Props {
	isRecording?: boolean;
	duration?: number;
	fileSize?: number;
	isPaused?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isRecording: false,
	duration: 0,
	fileSize: 0,
	isPaused: false,
});

// Emits定义
const emit = defineEmits<{
	stopRecording: [];
	pauseRecording: [];
	resumeRecording: [];
	toolChange: [tool: string];
	colorChange: [color: string];
	brushSizeChange: [size: number];
}>();

// 响应式状态
const isVisible = ref(true);
const isMinimized = ref(false);
const drawingCanvas = ref<HTMLCanvasElement>();
const canvasContext = ref<CanvasRenderingContext2D | null>(null);

// 绘图工具状态
const currentTool = ref<string>("none");
const currentColor = ref("#ff0000");
const brushSize = ref(3);
const isDrawing = ref(false);

// 撤销重做状态
const canUndo = ref(false);
const canRedo = ref(false);
const drawingHistory = ref<ImageData[]>([]);
const historyIndex = ref(-1);

// 预定义颜色
const predefineColors = [
	"#ff0000",
	"#00ff00",
	"#0000ff",
	"#ffff00",
	"#ff00ff",
	"#00ffff",
	"#ffffff",
	"#000000",
	"#ffa500",
	"#800080",
	"#008000",
	"#000080",
];

// 计算属性
const formattedDuration = computed(() => {
	const totalSeconds = Math.floor(props.duration / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${seconds
		.toString()
		.padStart(2, "0")}`;
});

const formattedFileSize = computed(() => {
	const mb = props.fileSize / (1024 * 1024);
	return mb > 0 ? `${mb.toFixed(1)}MB` : "0MB";
});

// 生命周期钩子
onMounted(async () => {
	await nextTick();
	initCanvas();
	document.addEventListener("keydown", handleKeydown);

	// 初始化键盘快捷键
	keyboardShortcuts.enable();
	keyboardShortcuts.updateContext({
		recording: props.isRecording,
		drawing: true,
		overlay: true,
	});

	// 监听快捷键事件
	window.addEventListener("shortcut-action", handleShortcutAction);
});

onUnmounted(() => {
	document.removeEventListener("keydown", handleKeydown);
	window.removeEventListener("shortcut-action", handleShortcutAction);
	keyboardShortcuts.disable();
});

// 监听录制状态变化
watch(
	() => props.isRecording,
	(newValue: boolean) => {
		if (newValue) {
			initCanvas();
		} else {
			clearCanvas();
		}

		// 更新快捷键上下文
		keyboardShortcuts.updateContext({
			recording: newValue,
			drawing: true,
			overlay: isVisible.value,
		});
	}
);

// 监听覆盖层可见性变化
watch(
	() => isVisible.value,
	(newValue: boolean) => {
		keyboardShortcuts.updateContext({
			recording: props.isRecording,
			drawing: true,
			overlay: newValue,
		});
	}
);

// 方法定义
const initCanvas = async () => {
	await nextTick();
	if (!drawingCanvas.value) return;

	const canvas = drawingCanvas.value;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	canvasContext.value = canvas.getContext("2d");
	if (canvasContext.value) {
		canvasContext.value.lineCap = "round";
		canvasContext.value.lineJoin = "round";
		canvasContext.value.imageSmoothingEnabled = true;
	}

	// 保存初始状态
	saveState();
};

const setTool = (tool: string) => {
	currentTool.value = tool;
	emit("toolChange", tool);

	if (tool === "eraser") {
		currentColor.value = "#ffffff"; // 橡皮擦使用白色
	}
};

const startDrawing = (event: MouseEvent) => {
	if (!canvasContext.value || currentTool.value === "none") return;

	event.preventDefault();
	isDrawing.value = true;

	const x = event.clientX;
	const y = event.clientY;

	canvasContext.value.beginPath();
	canvasContext.value.moveTo(x, y);

	// 根据工具类型设置样式
	setupDrawingStyle();
};

const draw = (event: MouseEvent) => {
	if (!isDrawing.value || !canvasContext.value) return;

	event.preventDefault();
	const x = event.clientX;
	const y = event.clientY;

	canvasContext.value.lineTo(x, y);
	canvasContext.value.stroke();
};

const stopDrawing = () => {
	if (!isDrawing.value || !canvasContext.value) return;

	isDrawing.value = false;
	canvasContext.value.beginPath();
	saveState();
};

const setupDrawingStyle = () => {
	if (!canvasContext.value) return;

	switch (currentTool.value) {
		case "pen":
			canvasContext.value.globalCompositeOperation = "source-over";
			canvasContext.value.strokeStyle = currentColor.value;
			canvasContext.value.lineWidth = brushSize.value;
			canvasContext.value.globalAlpha = 1;
			break;

		case "highlighter":
			canvasContext.value.globalCompositeOperation = "source-over";
			canvasContext.value.strokeStyle = currentColor.value;
			canvasContext.value.lineWidth = brushSize.value * 2;
			canvasContext.value.globalAlpha = 0.3;
			break;

		case "arrow":
			canvasContext.value.globalCompositeOperation = "source-over";
			canvasContext.value.strokeStyle = currentColor.value;
			canvasContext.value.lineWidth = 2;
			canvasContext.value.globalAlpha = 1;
			break;

		case "eraser":
			canvasContext.value.globalCompositeOperation = "destination-out";
			canvasContext.value.lineWidth = brushSize.value * 3;
			canvasContext.value.globalAlpha = 1;
			break;
	}
};

const saveState = () => {
	if (!canvasContext.value || !drawingCanvas.value) return;

	const imageData = canvasContext.value.getImageData(
		0,
		0,
		drawingCanvas.value.width,
		drawingCanvas.value.height
	);

	// 删除当前位置之后的历史记录
	drawingHistory.value = drawingHistory.value.slice(0, historyIndex.value + 1);

	// 添加新状态
	drawingHistory.value.push(imageData);
	historyIndex.value = drawingHistory.value.length - 1;

	// 限制历史记录数量
	if (drawingHistory.value.length > 20) {
		drawingHistory.value.shift();
		historyIndex.value--;
	}

	updateUndoRedoState();
};

const undo = () => {
	if (!canUndo.value || !canvasContext.value) return;

	historyIndex.value--;
	const imageData = drawingHistory.value[historyIndex.value];
	canvasContext.value.putImageData(imageData, 0, 0);
	updateUndoRedoState();
};

const redo = () => {
	if (!canRedo.value || !canvasContext.value) return;

	historyIndex.value++;
	const imageData = drawingHistory.value[historyIndex.value];
	canvasContext.value.putImageData(imageData, 0, 0);
	updateUndoRedoState();
};

const updateUndoRedoState = () => {
	canUndo.value = historyIndex.value > 0;
	canRedo.value = historyIndex.value < drawingHistory.value.length - 1;
};

const clearCanvas = () => {
	if (!canvasContext.value || !drawingCanvas.value) return;

	canvasContext.value.clearRect(
		0,
		0,
		drawingCanvas.value.width,
		drawingCanvas.value.height
	);
	drawingHistory.value = [];
	historyIndex.value = -1;
	updateUndoRedoState();
	saveState();
};

const toggleMinimized = () => {
	isMinimized.value = !isMinimized.value;
};

const stopRecording = () => {
	emit("stopRecording");
};

const pauseRecording = () => {
	emit("pauseRecording");
};

const resumeRecording = () => {
	emit("resumeRecording");
};

const handleKeydown = (event: KeyboardEvent) => {
	// 快捷键处理
	if (event.ctrlKey || event.metaKey) {
		switch (event.key) {
			case "z":
				event.preventDefault();
				if (event.shiftKey) {
					redo();
				} else {
					undo();
				}
				break;
			case "y":
				event.preventDefault();
				redo();
				break;
		}
	}

	// ESC键关闭工具
	if (event.key === "Escape") {
		currentTool.value = "none";
	}
};

// 处理快捷键动作
const handleShortcutAction = (event: CustomEvent) => {
	const { action } = event.detail;

	// 颜色映射
	const colorMap: { [key: string]: string } = {
		"color-red": "#ff0000",
		"color-blue": "#0000ff",
		"color-green": "#00ff00",
		"color-yellow": "#ffff00",
		"color-orange": "#ffa500",
		"color-purple": "#800080",
		"color-pink": "#ff00ff",
		"color-black": "#000000",
		"color-white": "#ffffff",
	};

	switch (action) {
		// 录制控制
		case "stop-recording":
			stopRecording();
			break;
		case "pause-resume":
			if (props.isPaused) {
				resumeRecording();
			} else {
				pauseRecording();
			}
			break;
		case "toggle-overlay":
			isVisible.value = !isVisible.value;
			break;

		// 绘图工具切换
		case "tool-pen":
			setTool("pen");
			break;
		case "tool-highlighter":
			setTool("highlighter");
			break;
		case "tool-arrow":
			setTool("arrow");
			break;
		case "tool-eraser":
			setTool("eraser");
			break;

		// 绘图操作
		case "undo":
			undo();
			break;
		case "redo":
			redo();
			break;
		case "clear-canvas":
			clearCanvas();
			break;

		// 颜色选择
		case "color-red":
		case "color-blue":
		case "color-green":
		case "color-yellow":
		case "color-orange":
		case "color-purple":
		case "color-pink":
		case "color-black":
		case "color-white":
			const color = colorMap[action];
			if (color) {
				currentColor.value = color;
			}
			break;

		// 画笔大小调整
		case "brush-smaller":
			if (brushSize.value > 1) {
				brushSize.value = Math.max(1, brushSize.value - 1);
			}
			break;
		case "brush-larger":
			if (brushSize.value < 20) {
				brushSize.value = Math.min(20, brushSize.value + 1);
			}
			break;

		// 通用功能
		case "escape":
			currentTool.value = "none";
			break;
	}
};

// 监听属性变化
watch(currentColor, (newColor: string) => {
	emit("colorChange", newColor);
});

watch(brushSize, (newSize: number) => {
	emit("brushSizeChange", newSize);
});

// 窗口大小变化时重新初始化画布
window.addEventListener("resize", () => {
	if (drawingCanvas.value) {
		initCanvas();
	}
});
</script>

<style scoped>
.recording-overlay {
	user-select: none;
	font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.drawing-canvas-overlay {
	user-select: none;
	touch-action: none;
}

/* 确保工具栏在所有内容之上 */
.recording-overlay {
	pointer-events: auto;
}

/* 动画效果 */
.recording-overlay > div {
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.recording-overlay > div:hover {
	transform: translateY(-1px);
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
		0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* 自定义按钮样式 */
:deep(.el-button-group .el-button) {
	border-radius: 6px;
	margin: 0 1px;
}

:deep(.el-color-picker) {
	vertical-align: middle;
}

:deep(.el-slider) {
	margin: 0;
}
</style>
