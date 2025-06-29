import type {
	RecordingSettings,
	RecordingState,
	RecordingMessage,
} from "../types/recording";
import {
	startCapture,
	stopCapture,
	recordingSettingsToCaptureOptions,
	watchStreamStatus,
} from "../utils/screenCapture";
import { getRecordingService } from "../utils/recordingService";
import {
	errorHandler,
	setLastAction,
	setRecoveryData,
} from "../utils/errorHandler";

// 全局状态
const recordingState: RecordingState = {
	isRecording: false,
	isPaused: false,
	mode: null,
	startTime: null,
	duration: 0,
	fileSize: 0,
	settings: {
		resolution: "1080p",
		frameRate: 30,
		audio: true,
		mode: "screen",
	},
	mediaStream: null,
	mediaRecorder: null,
	recordedChunks: [],
};

// 录制服务实例
const recordingService = getRecordingService();

// 活动的标签页 ID 映射
const activeTabsMap = new Map<number, string>();

export default defineBackground(() => {
	console.log("录屏助手后台脚本启动", { id: browser.runtime.id });

	// 初始化错误处理器
	initializeErrorHandler();

	// 会话恢复
	recoverSession();

	// 消息监听器 - 修复异步处理问题
	browser.runtime.onMessage.addListener(
		(message: any, sender, sendResponse) => {
			console.log("收到消息:", message, "来自:", sender);

			// 处理异步消息
			(async () => {
				try {
					// 处理来自popup的消息
					if (message.action) {
						switch (message.action) {
							case "startRecording":
								if (message.config) {
									await handleStartRecording(message.config, sender);
									sendResponse({ success: true });
								}
								break;

							case "stopRecording":
								await handleStopRecording(sender);
								sendResponse({ success: true });
								break;

							case "pauseRecording":
								await handlePauseRecording();
								sendResponse({ success: true });
								break;

							case "resumeRecording":
								await handleResumeRecording();
								sendResponse({ success: true });
								break;

							case "getRecordingState":
								sendResponse({ success: true, data: recordingState });
								break;

							case "updateSettings":
								if (message.settings) {
									updateRecordingSettings(message.settings);
									sendResponse({ success: true });
								}
								break;

							default:
								console.warn("未知消息类型:", message.action);
								sendResponse({ success: false, error: "未知消息类型" });
						}
					}
					// 处理来自content script覆盖层的消息
					else if (message.type) {
						switch (message.type) {
							case "STOP_RECORDING":
								await handleStopRecording(sender);
								sendResponse({ success: true });
								break;

							case "PAUSE_RECORDING":
								await handlePauseRecording();
								sendResponse({ success: true });
								break;

							case "RESUME_RECORDING":
								await handleResumeRecording();
								sendResponse({ success: true });
								break;

							case "TOOL_CHANGE":
								// 记录当前绘图工具
								recordingState.drawingTool = message.payload?.tool;
								await notifyAllTabs("TOOL_CHANGED", {
									tool: message.payload?.tool,
								});
								sendResponse({ success: true });
								break;

							case "COLOR_CHANGE":
								// 记录当前绘图颜色
								recordingState.drawingColor = message.payload?.color;
								await notifyAllTabs("COLOR_CHANGED", {
									color: message.payload?.color,
								});
								sendResponse({ success: true });
								break;

							case "BRUSH_SIZE_CHANGE":
								// 记录当前画笔大小
								recordingState.brushSize = message.payload?.size;
								await notifyAllTabs("BRUSH_SIZE_CHANGED", {
									size: message.payload?.size,
								});
								sendResponse({ success: true });
								break;

							case "OVERLAY_VISIBILITY_TOGGLE":
								// 切换覆盖层可见性
								await notifyAllTabs("OVERLAY_VISIBILITY_TOGGLE", {});
								sendResponse({ success: true });
								break;

							case "GET_RECORDING_STATE":
								sendResponse({ success: true, data: recordingState });
								break;

							default:
								console.warn("未知覆盖层消息类型:", message.type);
								sendResponse({ success: false, error: "未知覆盖层消息类型" });
						}
					} else {
						sendResponse({ success: false, error: "无效的消息格式" });
					}
				} catch (error) {
					console.error("处理消息时出错:", error);
					sendResponse({ success: false, error: (error as Error).message });
				}
			})();

			// 返回 true 表示将异步发送响应
			return true;
		}
	);

	// 权限检查
	browser.permissions.onAdded.addListener((permissions) => {
		console.log("权限已添加:", permissions);
	});

	browser.permissions.onRemoved.addListener((permissions) => {
		console.log("权限已移除:", permissions);
	});

	// 标签页管理
	browser.tabs.onRemoved.addListener((tabId) => {
		activeTabsMap.delete(tabId);
	});
});

// 开始录制处理
async function handleStartRecording(config: RecordingSettings, sender: any) {
	// 设置当前操作用于错误恢复
	setLastAction(() => handleStartRecording(config, sender));

	if (recordingState.isRecording) {
		throw new Error("录制已在进行中");
	}

	try {
		// 更新设置
		Object.assign(recordingState.settings, config);

		// 请求权限
		const hasPermissions = await requestPermissions();
		if (!hasPermissions) {
			throw new Error("缺少必要权限");
		}

		// 使用新的屏幕捕获工具
		const captureOptions = recordingSettingsToCaptureOptions(config);
		const captureResult = await startCapture(captureOptions);

		recordingState.mediaStream = captureResult.stream;

		// 监听流状态变化
		watchStreamStatus(captureResult.stream, {
			onStreamInactive: () => {
				console.log("媒体流变为非活动状态，自动停止录制");
				handleStopRecording(sender).catch(console.error);
			},
			onTrackEnded: (track) => {
				console.log("媒体轨道结束:", track.kind);
			},
		});

		// 使用录制服务开始录制
		const mediaRecorder = await recordingService.startRecording(
			captureResult.stream,
			config,
			{
				frameRate: config.frameRate,
				chunkInterval: 1000,
			}
		);

		recordingState.mediaRecorder = mediaRecorder;

		// 设置录制服务事件监听器
		recordingService.setEventListeners({
			onChunkAvailable: (chunk) => {
				recordingState.recordedChunks.push(chunk.data);
				recordingState.fileSize = recordingService.getRecordingSize();

				// 通知覆盖层更新文件大小
				notifyAllTabs("UPDATE_FILE_SIZE", {
					fileSize: recordingState.fileSize,
				}).catch(console.error);
			},
			onRecordingStateChange: (state) => {
				recordingState.isRecording = state === "recording";
				recordingState.isPaused = state === "paused";
			},
			onError: (error) => {
				console.error("录制服务错误:", error);
				handleStopRecording(null).catch(console.error);
			},
		});

		// 更新状态
		recordingState.isRecording = true;
		recordingState.mode = config.mode;
		recordingState.startTime = Date.now();
		recordingState.recordedChunks = [];

		// 保存状态到存储
		await saveStateToStorage();

		// 通知所有标签页录制开始
		await notifyAllTabs("recordingStarted", {
			state: recordingState,
			captureInfo: captureResult.settings,
		});

		// 通知content script显示录制覆盖层
		if (sender?.tab?.id) {
			try {
				await browser.tabs.sendMessage(sender.tab.id, {
					type: "START_RECORDING",
					payload: {
						settings: recordingState.settings,
						captureInfo: captureResult.settings,
					},
				});
			} catch (error) {
				console.warn("无法向标签页发送覆盖层消息:", error);
			}
		} else {
			// 如果没有特定标签页ID，通知所有活动标签页
			await notifyAllTabs("START_RECORDING", {
				settings: recordingState.settings,
				captureInfo: captureResult.settings,
			});
		}

		console.log("录制已开始", captureResult.settings);
	} catch (error) {
		console.error("启动录制失败:", error);

		// 使用错误处理器处理错误
		if (error instanceof Error) {
			if (
				error.message.includes("Permission") ||
				error.message.includes("permission")
			) {
				errorHandler.handlePermissionError(error);
			} else {
				errorHandler.handleError(error, "recording.start");
			}
		}

		// 重置状态
		recordingState.isRecording = false;
		recordingState.mode = null;
		recordingState.startTime = null;

		throw error;
	}
}

// 停止录制处理
async function handleStopRecording(sender: any) {
	if (!recordingState.isRecording) {
		throw new Error("没有正在进行的录制");
	}

	try {
		// 使用录制服务停止录制
		const videoBlob = await recordingService.stopRecording();

		// 使用新的屏幕捕获工具停止捕获
		if (recordingState.mediaStream) {
			stopCapture(recordingState.mediaStream);
		}

		// 更新状态
		recordingState.isRecording = false;
		recordingState.isPaused = false;
		recordingState.duration = recordingService.getRecordingDuration();
		recordingState.fileSize = videoBlob.size;

		// 创建结果页面
		const resultTab = await browser.tabs.create({
			url: "/result/index.html",
		});

		// 保存录制数据到存储
		await saveRecordingData(videoBlob);

		// 清理状态
		await clearState();

		// 通知content script隐藏录制覆盖层
		await notifyAllTabs("STOP_RECORDING", {});

		// 通知所有标签页录制结束
		await notifyAllTabs("recordingStopped", {
			duration: recordingState.duration,
			fileSize: recordingState.fileSize,
		});

		console.log("录制已停止");
	} catch (error) {
		console.error("停止录制失败:", error);
		throw error;
	}
}

// 暂停录制
async function handlePauseRecording() {
	if (!recordingState.isRecording || recordingState.isPaused) {
		throw new Error("无法暂停录制");
	}

	try {
		recordingService.pauseRecording();
		recordingState.isPaused = true;
		await saveStateToStorage();

		// 通知覆盖层更新暂停状态
		await notifyAllTabs("PAUSE_RECORDING", {});

		console.log("录制已暂停");
	} catch (error) {
		console.error("暂停录制失败:", error);
		throw error;
	}
}

// 恢复录制
async function handleResumeRecording() {
	if (!recordingState.isRecording || !recordingState.isPaused) {
		throw new Error("无法恢复录制");
	}

	try {
		recordingService.resumeRecording();
		recordingState.isPaused = false;
		await saveStateToStorage();

		// 通知覆盖层更新恢复状态
		await notifyAllTabs("RESUME_RECORDING", {});

		console.log("录制已恢复");
	} catch (error) {
		console.error("恢复录制失败:", error);
		throw error;
	}
}

// 请求权限
async function requestPermissions(): Promise<boolean> {
	try {
		const permissions = await browser.permissions.request({
			permissions: ["activeTab", "desktopCapture", "storage", "scripting"],
		});
		return permissions;
	} catch (error) {
		console.error("权限请求失败:", error);
		return false;
	}
}

// 注意：setupMediaRecorder 函数已被 RecordingService 替代
// MediaRecorder 现在通过 recordingService.startRecording() 管理

// 分辨率工具函数
function getResolutionWidth(resolution: string): number {
	switch (resolution) {
		case "1080p":
			return 1920;
		case "720p":
			return 1280;
		case "480p":
			return 854;
		default:
			return 1280;
	}
}

function getResolutionHeight(resolution: string): number {
	switch (resolution) {
		case "1080p":
			return 1080;
		case "720p":
			return 720;
		case "480p":
			return 480;
		default:
			return 720;
	}
}

// 更新录制设置
function updateRecordingSettings(settings: Partial<RecordingSettings>) {
	Object.assign(recordingState.settings, settings);
	saveStateToStorage();
}

// 保存状态到存储
async function saveStateToStorage() {
	try {
		await browser.storage.local.set({
			recordingState: {
				isRecording: recordingState.isRecording,
				isPaused: recordingState.isPaused,
				mode: recordingState.mode,
				startTime: recordingState.startTime,
				duration: recordingState.duration,
				settings: recordingState.settings,
			},
		});
	} catch (error) {
		console.error("保存状态失败:", error);
	}
}

// 保存录制数据
async function saveRecordingData(videoBlob: Blob) {
	try {
		// 将 Blob 转换为 ArrayBuffer
		const arrayBuffer = await videoBlob.arrayBuffer();

		// 保存到存储
		await browser.storage.local.set({
			recordingData: {
				data: Array.from(new Uint8Array(arrayBuffer)),
				size: videoBlob.size,
				type: videoBlob.type,
				timestamp: Date.now(),
			},
		});
	} catch (error) {
		console.error("保存录制数据失败:", error);
	}
}

// 会话恢复
async function recoverSession() {
	try {
		const result = await browser.storage.local.get(["recordingState"]);
		if (result.recordingState) {
			const savedState = result.recordingState;

			// 恢复基本状态（但不恢复媒体流）
			if (savedState.isRecording) {
				console.log("检测到未完成的录制会话，正在清理...");
				// 清理未完成的会话
				await clearState();
			} else {
				// 恢复设置
				Object.assign(recordingState.settings, savedState.settings);
			}
		}
	} catch (error) {
		console.error("会话恢复失败:", error);
	}
}

// 清理状态
async function clearState() {
	recordingState.isRecording = false;
	recordingState.isPaused = false;
	recordingState.mode = null;
	recordingState.startTime = null;
	recordingState.duration = 0;
	recordingState.fileSize = 0;
	recordingState.mediaStream = null;
	recordingState.mediaRecorder = null;

	// 清理录制服务
	recordingService.cleanup();
	recordingState.recordedChunks = [];

	await browser.storage.local.remove(["recordingState"]);
}

// 通知所有标签页
async function notifyAllTabs(action: string, data: any) {
	try {
		const tabs = await browser.tabs.query({});
		for (const tab of tabs) {
			if (tab.id) {
				try {
					await browser.tabs.sendMessage(tab.id, { action, data });
				} catch (error) {
					// 忽略无法发送消息的标签页
				}
			}
		}
	} catch (error) {
		console.error("通知标签页失败:", error);
	}
}

// 初始化错误处理器
function initializeErrorHandler() {
	// 检查是否有恢复数据
	if (errorHandler.hasRecoveryData()) {
		const recoveryData = errorHandler.getRecoveryData();
		if (recoveryData?.recordingState?.isRecording) {
			console.log("发现录制恢复数据，尝试恢复录制状态");
			// 这里可以尝试恢复录制状态
			// 实际实现中可能需要更复杂的恢复逻辑
		}
	}

	// 设置录制相关的错误处理
	recordingService.setEventListeners({
		onError: (error: Error) => {
			console.error("录制服务错误:", error);
			errorHandler.handleError(error, "recording.service");

			// 保存当前状态用于恢复
			setRecoveryData({
				recordingState: {
					isRecording: recordingState.isRecording,
					startTime: recordingState.startTime || 0,
					settings: recordingState.settings,
					chunks: recordingState.recordedChunks,
				},
			});
		},
		onRecordingStateChange: (state) => {
			console.log("录制状态变化:", state);
			// 保存状态变化用于恢复
			setRecoveryData({
				recordingState: {
					isRecording: state === "recording",
					startTime: recordingState.startTime || 0,
					settings: recordingState.settings,
					chunks: recordingState.recordedChunks,
				},
			});
		},
	});

	console.log("错误处理器初始化完成");
}
