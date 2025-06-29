<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
	ElRadioGroup,
	ElRadioButton,
	ElSelect,
	ElOption,
	ElSwitch,
	ElButton,
	ElTag,
	ElDivider,
	ElAlert,
} from "element-plus";
import { keyboardShortcuts } from "../../utils/keyboardShortcuts";

const recordModes = [
	{
		value: "screen",
		label: "屏幕录制",
		icon: "i-mdi-monitor",
		desc: "录制整个屏幕",
	},
	{
		value: "tab",
		label: "标签页录制",
		icon: "i-mdi-tab",
		desc: "录制当前标签页",
	},
	{
		value: "area",
		label: "区域录制",
		icon: "i-mdi-crop-free",
		desc: "录制指定区域",
	},
];

const recordMode = ref("screen");
const resolution = ref("1080p");
const frameRate = ref("30");
const audioEnabled = ref(true);
const isRecording = ref(false);

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
watch([recordMode, resolution, frameRate, audioEnabled], savePreferences);

const startRecording = async () => {
	isRecording.value = true;
	try {
		await savePreferences();
		const response = await browser.runtime.sendMessage({
			action: "startRecording",
			config: {
				mode: recordMode.value,
				resolution: resolution.value,
				frameRate: frameRate.value,
				audio: audioEnabled.value,
			},
		});
		if (response && response.success) {
			window.close();
		} else {
			throw new Error(response?.error || "录制启动失败");
		}
	} catch (error) {
		isRecording.value = false;
		const errorMessage = error instanceof Error ? error.message : String(error);
		alert(`录制启动失败: ${errorMessage}`);
	}
};

const openInNewTab = () => {
	const url = browser.runtime.getURL("/popup.html");
	browser.tabs.create({ url });
};

const showKeyboardHelp = () => {
	keyboardShortcuts.toggleHelp();
};
onMounted(() => {
	loadPreferences();
});
</script>

<template>
	<div
		class="w-96 min-h-580px bg-gradient-to-b from-emerald-50 to-white rounded-2xl shadow-2xl p-0 flex flex-col items-center justify-start"
	>
		<!-- 卡片容器 -->
		<div
			class="w-full max-w-96 bg-white rounded-2xl shadow-lg overflow-hidden mt-4"
		>
			<!-- 渐变头部 -->
			<div
				class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 flex flex-col items-center relative"
			>
				<el-button
					icon="i-mdi-open-in-new"
					circle
					size="small"
					class="absolute top-4 right-4 !bg-white/20 !border-0 text-white hover:!bg-white/30"
					@click="openInNewTab"
				/>
				<div
					class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2"
				>
					<div class="i-mdi-record text-red-500 text-2xl"></div>
				</div>
				<h1 class="text-xl font-bold tracking-wide">录屏助手</h1>
			</div>

			<div class="p-6 space-y-6">
				<!-- 录制模式选择 -->
				<div>
					<div class="flex items-center gap-2 mb-2">
						<div class="i-mdi-cog text-gray-400"></div>
						<span class="text-sm font-semibold text-gray-800">录制模式</span>
					</div>
					<div class="space-y-3">
						<el-radio-group v-model="recordMode" class="w-full">
							<div class="flex flex-col gap-2">
								<div
									v-for="mode in recordModes"
									:key="mode.value"
									:class="[
										'flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all',
										recordMode === mode.value
											? 'border-emerald-500 bg-emerald-50'
											: 'border-gray-200 hover:border-gray-300',
									]"
								>
									<el-radio :label="mode.value" class="mr-0">
										<template #default>
											<div class="flex items-center gap-3 ml-2">
												<div
													:class="[
														mode.icon,
														'text-xl',
														recordMode === mode.value
															? 'text-emerald-600'
															: 'text-gray-500',
													]"
												></div>
												<div>
													<div class="font-medium text-gray-800">
														{{ mode.label }}
													</div>
													<div class="text-xs text-gray-500 mt-1">
														{{ mode.desc }}
													</div>
												</div>
												<el-tag
													v-if="recordMode === mode.value"
													type="success"
													size="small"
													class="bg-emerald-100 text-emerald-700 ml-2"
													>已选择</el-tag
												>
											</div>
										</template>
									</el-radio>
								</div>
							</div>
						</el-radio-group>
					</div>
				</div>

				<el-divider class="!my-4" />

				<!-- 录制参数配置 -->
				<div>
					<div class="flex items-center gap-2 mb-2">
						<div class="i-mdi-tune text-gray-400"></div>
						<span class="text-sm font-semibold text-gray-800">录制参数</span>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label
								class="text-xs font-medium text-gray-600 uppercase tracking-wide"
								>分辨率</label
							>
							<el-select v-model="resolution" class="w-full">
								<el-option value="1080p" label="1080p">
									<div class="flex items-center justify-between w-full">
										<span>1080p</span>
										<el-tag size="small" type="info">高清</el-tag>
									</div>
								</el-option>
								<el-option value="720p" label="720p" />
								<el-option value="480p" label="480p" />
							</el-select>
						</div>
						<div class="space-y-2">
							<label
								class="text-xs font-medium text-gray-600 uppercase tracking-wide"
								>帧率</label
							>
							<el-select v-model="frameRate" class="w-full">
								<el-option value="30" label="30 FPS">
									<div class="flex items-center justify-between w-full">
										<span>30 FPS</span>
										<el-tag size="small" type="warning">推荐</el-tag>
									</div>
								</el-option>
								<el-option value="24" label="24 FPS" />
								<el-option value="20" label="20 FPS" />
							</el-select>
						</div>
					</div>
					<div
						class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-4"
					>
						<div class="flex items-center gap-3">
							<div
								:class="
									audioEnabled
										? 'i-mdi-microphone text-emerald-600'
										: 'i-mdi-microphone-off text-gray-400'
								"
							/>
							<div>
								<div class="text-sm font-medium text-gray-800">录制音频</div>
								<div class="text-xs text-gray-500">包含系统和麦克风音频</div>
							</div>
						</div>
						<el-switch v-model="audioEnabled" />
					</div>
				</div>

				<el-divider class="!my-4" />

				<!-- 开始录制按钮 -->
				<el-button
					type="primary"
					size="large"
					class="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 border-0 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl text-white text-base"
					:loading="isRecording"
					:disabled="isRecording"
					@click="startRecording"
				>
					<template v-if="!isRecording">开始录制</template>
					<template v-else>启动中...</template>
				</el-button>

				<!-- 快捷键说明 -->
				<el-alert
					type="info"
					:closable="false"
					class="bg-blue-50 border-blue-200 mt-4"
				>
					<template #title>
						<div class="flex items-center gap-2">
							<div class="i-mdi-keyboard"></div>
							<span class="font-medium">快捷键提示</span>
						</div>
					</template>
					<div class="text-xs mt-1">
						结束录制：<kbd
							class="px-2 py-1 bg-white rounded text-xs font-mono border"
							>Ctrl+Shift+R</kbd
						>
					</div>
				</el-alert>
			</div>
		</div>
	</div>
</template>
