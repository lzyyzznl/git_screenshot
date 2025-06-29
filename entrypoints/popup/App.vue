<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
	ElRadioGroup,
	ElRadioButton,
	ElSelect,
	ElOption,
	ElSwitch,
	ElButton,
} from "element-plus";
import { keyboardShortcuts } from "../../utils/keyboardShortcuts";

// 录制配置
const recordMode = ref("screen");
const resolution = ref("1080p");
const frameRate = ref("30");
const audioEnabled = ref(true);
const isRecording = ref(false);

// 从存储加载用户偏好
const loadPreferences = async () => {
	try {
		const result = await browser.storage.local.get([
			"recordMode",
			"resolution",
			"frameRate",
			"audioEnabled",
		]);

		if (result.recordMode) recordMode.value = result.recordMode;
		if (result.resolution) resolution.value = result.resolution;
		if (result.frameRate) frameRate.value = result.frameRate;
		if (result.audioEnabled !== undefined)
			audioEnabled.value = result.audioEnabled;
	} catch (error) {
		console.error("加载用户偏好失败:", error);
	}
};

// 保存用户偏好到存储
const savePreferences = async () => {
	try {
		await browser.storage.local.set({
			recordMode: recordMode.value,
			resolution: resolution.value,
			frameRate: frameRate.value,
			audioEnabled: audioEnabled.value,
		});
	} catch (error) {
		console.error("保存用户偏好失败:", error);
	}
};

// 监听配置变化并保存
watch([recordMode, resolution, frameRate, audioEnabled], savePreferences);

// 开始录制功能
const startRecording = async () => {
	isRecording.value = true;

	try {
		// 保存当前配置
		await savePreferences();

		console.log("开始录制:", {
			mode: recordMode.value,
			resolution: resolution.value,
			frameRate: frameRate.value,
			audio: audioEnabled.value,
		});

		// 向后台脚本发送录制开始消息
		const response = await browser.runtime.sendMessage({
			action: "startRecording",
			config: {
				mode: recordMode.value,
				resolution: resolution.value,
				frameRate: frameRate.value,
				audio: audioEnabled.value,
			},
		});

		// 检查响应
		if (response && response.success) {
			console.log("录制启动成功");
			// 关闭 popup
			window.close();
		} else {
			throw new Error(response?.error || "录制启动失败");
		}
	} catch (error) {
		console.error("录制启动失败:", error);
		isRecording.value = false;

		// 显示错误信息给用户
		// TODO: 添加更好的错误提示 UI
		const errorMessage = error instanceof Error ? error.message : String(error);
		alert(`录制启动失败: ${errorMessage}`);
	}
};

// 显示键盘快捷键帮助
const showKeyboardHelp = () => {
	keyboardShortcuts.toggleHelp();
};

// 组件挂载时加载偏好
onMounted(() => {
	loadPreferences();
});
</script>

<template>
	<div class="w-380px h-580px p-4 bg-gray-50 flex flex-col text-gray-800">
		<!-- 标题栏 -->
		<header class="flex items-center justify-center gap-2 mb-4">
			<div class="i-mdi-record text-red-500 text-2xl"></div>
			<h1 class="text-lg font-bold">录屏助手</h1>
		</header>

		<!-- 录制模式选择区 -->
		<section class="mb-4">
			<h2 class="text-sm font-medium text-gray-600 mb-2">录制模式</h2>
			<el-radio-group v-model="recordMode" size="large" class="w-full flex">
				<el-radio-button label="screen" class="flex-1">
					<div class="flex items-center justify-center gap-2">
						<div class="i-mdi-monitor"></div>
						<span>屏幕</span>
					</div>
				</el-radio-button>
				<el-radio-button label="tab" class="flex-1">
					<div class="flex items-center justify-center gap-2">
						<div class="i-mdi-tab"></div>
						<span>标签页</span>
					</div>
				</el-radio-button>
				<el-radio-button label="area" class="flex-1">
					<div class="flex items-center justify-center gap-2">
						<div class="i-mdi-crop-free"></div>
						<span>区域</span>
					</div>
				</el-radio-button>
			</el-radio-group>
		</section>

		<!-- 录制参数配置区 -->
		<section class="bg-white p-4 rounded-lg shadow-sm mb-4">
			<h2 class="text-sm font-medium text-gray-600 mb-3">录制参数</h2>

			<!-- 分辨率选择 -->
			<div class="flex items-center justify-between mb-3">
				<label class="text-sm text-gray-700 flex items-center gap-2">
					<div class="i-mdi-aspect-ratio"></div>
					分辨率
				</label>
				<el-select
					v-model="resolution"
					placeholder="选择分辨率"
					class="w-48"
					size="small"
				>
					<el-option label="1080p (FHD)" value="1080p" />
					<el-option label="720p (HD)" value="720p" />
					<el-option label="480p (SD)" value="480p" />
				</el-select>
			</div>

			<!-- 帧率选择 -->
			<div class="flex items-center justify-between mb-3">
				<label class="text-sm text-gray-700 flex items-center gap-2">
					<div class="i-mdi-speedometer"></div>
					帧率
				</label>
				<el-select
					v-model="frameRate"
					placeholder="选择帧率"
					class="w-48"
					size="small"
				>
					<el-option label="30 fps" value="30" />
					<el-option label="24 fps" value="24" />
					<el-option label="20 fps" value="20" />
				</el-select>
			</div>

			<!-- 音频开关 -->
			<div class="flex items-center justify-between">
				<label class="text-sm text-gray-700 flex items-center gap-2">
					<div class="i-mdi-microphone"></div>
					音频录制
				</label>
				<el-switch v-model="audioEnabled" />
			</div>
		</section>

		<!-- 开始录制按钮 -->
		<el-button
			type="primary"
			size="large"
			class="w-full !h-12 !text-base !font-medium !rounded-lg"
			:loading="isRecording"
			:disabled="isRecording"
			@click="startRecording"
		>
			<template v-if="!isRecording">
				<div class="flex items-center justify-center gap-2">
					<div class="i-mdi-record-circle text-white"></div>
					开始录制
				</div>
			</template>
			<template v-else>
				<span class="animate-pulse">准备录制中...</span>
			</template>
		</el-button>

		<!-- 底部 -->
		<footer class="mt-auto pt-2">
			<!-- 快捷键提示和帮助 -->
			<div
				class="text-xs text-gray-500 text-center bg-gray-100 p-2 rounded-md mb-2"
			>
				<p class="flex items-center justify-center gap-1">
					<span class="i-mdi-keyboard"></span>
					<span>结束录制快捷键：Ctrl+Shift+R</span>
				</p>
			</div>

			<!-- 快捷键帮助按钮 -->
			<el-button
				type="info"
				text
				size="small"
				class="w-full !text-xs"
				@click="showKeyboardHelp"
			>
				<div class="flex items-center justify-center gap-1">
					<div class="i-mdi-help-circle-outline"></div>
					查看所有快捷键 (F1)
				</div>
			</el-button>
		</footer>
	</div>
</template>
