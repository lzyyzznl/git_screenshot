import { createApp } from "vue";
import type { App } from "vue";
import RecordingOverlay from "../components/RecordingOverlay.vue";
import { keyboardShortcuts } from "../utils/keyboardShortcuts";

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {
		// 录制状态接口
		interface RecordingState {
			isRecording: boolean;
			duration: number;
			fileSize: number;
			isPaused: boolean;
		}

		// Vue应用实例
		let overlayApp: App<Element> | null = null;
		let overlayContainer: HTMLDivElement | null = null;

		// 录制状态
		const recordingState: RecordingState = {
			isRecording: false,
			duration: 0,
			fileSize: 0,
			isPaused: false,
		};

		// 计时器
		let durationTimer: number | null = null;
		let startTime = 0;

		// 创建覆盖层
		const createOverlay = () => {
			if (overlayContainer) return;

			// 创建容器
			overlayContainer = document.createElement("div");
			overlayContainer.id = "recording-overlay-container";
			overlayContainer.style.cssText = `
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
				z-index: 999999;
			`;
			document.body.appendChild(overlayContainer);

			// 初始化全局键盘快捷键
			keyboardShortcuts.enable();
			keyboardShortcuts.updateContext({
				recording: true,
				drawing: true,
				overlay: true,
			});

			// 创建Vue应用
			overlayApp = createApp(RecordingOverlay, {
				isRecording: recordingState.isRecording,
				duration: recordingState.duration,
				fileSize: recordingState.fileSize,
				isPaused: recordingState.isPaused,

				// 事件处理
				onStopRecording: () => {
					browser.runtime.sendMessage({
						type: "STOP_RECORDING",
					});
				},

				onPauseRecording: () => {
					browser.runtime.sendMessage({
						type: "PAUSE_RECORDING",
					});
				},

				onResumeRecording: () => {
					browser.runtime.sendMessage({
						type: "RESUME_RECORDING",
					});
				},

				onToolChange: (tool: string) => {
					browser.runtime.sendMessage({
						type: "TOOL_CHANGE",
						payload: { tool },
					});
				},

				onColorChange: (color: string) => {
					browser.runtime.sendMessage({
						type: "COLOR_CHANGE",
						payload: { color },
					});
				},

				onBrushSizeChange: (size: number) => {
					browser.runtime.sendMessage({
						type: "BRUSH_SIZE_CHANGE",
						payload: { size },
					});
				},
			});

			overlayApp.mount(overlayContainer);
		};

		// 销毁覆盖层
		const destroyOverlay = () => {
			if (overlayApp) {
				overlayApp.unmount();
				overlayApp = null;
			}

			if (overlayContainer) {
				overlayContainer.remove();
				overlayContainer = null;
			}

			if (durationTimer) {
				clearInterval(durationTimer);
				durationTimer = null;
			}

			// 清理键盘快捷键
			keyboardShortcuts.disable();
		};

		// 更新录制状态
		const updateRecordingState = (newState: Partial<RecordingState>) => {
			Object.assign(recordingState, newState);

			if (overlayApp && overlayApp._instance) {
				// 更新组件属性
				Object.assign(overlayApp._instance.props, recordingState);
			}
		};

		// 开始计时
		const startTimer = () => {
			startTime = Date.now();
			durationTimer = window.setInterval(() => {
				updateRecordingState({
					duration: Date.now() - startTime,
				});
			}, 100);
		};

		// 停止计时
		const stopTimer = () => {
			if (durationTimer) {
				clearInterval(durationTimer);
				durationTimer = null;
			}
		};

		// 暂停计时
		const pauseTimer = () => {
			if (durationTimer) {
				clearInterval(durationTimer);
				durationTimer = null;
			}
		};

		// 恢复计时
		const resumeTimer = () => {
			const currentDuration = recordingState.duration;
			startTime = Date.now() - currentDuration;
			durationTimer = window.setInterval(() => {
				updateRecordingState({
					duration: Date.now() - startTime,
				});
			}, 100);
		};

		// 监听来自后台脚本的消息
		browser.runtime.onMessage.addListener(
			(message: any, sender: any, sendResponse: any) => {
				console.log("Content script received message:", message);

				switch (message.type) {
					case "START_RECORDING":
						recordingState.isRecording = true;
						recordingState.duration = 0;
						recordingState.fileSize = 0;
						recordingState.isPaused = false;

						createOverlay();
						startTimer();
						break;

					case "STOP_RECORDING":
						recordingState.isRecording = false;
						recordingState.isPaused = false;

						stopTimer();
						destroyOverlay();
						break;

					case "PAUSE_RECORDING":
						recordingState.isPaused = true;
						pauseTimer();
						updateRecordingState(recordingState);
						break;

					case "RESUME_RECORDING":
						recordingState.isPaused = false;
						resumeTimer();
						updateRecordingState(recordingState);
						break;

					case "UPDATE_FILE_SIZE":
						updateRecordingState({
							fileSize: message.payload.fileSize,
						});
						break;

					case "OVERLAY_VISIBILITY_TOGGLE":
						// 切换覆盖层可见性
						if (overlayContainer) {
							overlayContainer.style.display =
								overlayContainer.style.display === "none" ? "block" : "none";
						}
						break;

					case "GET_RECORDING_STATE":
						sendResponse(recordingState);
						break;

					default:
						console.warn("Unknown message type:", message.type);
				}
			}
		);

		// 页面可见性变化处理
		document.addEventListener("visibilitychange", () => {
			if (document.hidden && recordingState.isRecording) {
				// 页面隐藏时暂时隐藏覆盖层
				if (overlayContainer) {
					overlayContainer.style.display = "none";
				}
			} else if (!document.hidden && recordingState.isRecording) {
				// 页面显示时恢复覆盖层
				if (overlayContainer) {
					overlayContainer.style.display = "block";
				}
			}
		});

		// 键盘快捷键处理
		document.addEventListener("keydown", (event) => {
			if (!recordingState.isRecording) return;

			// Ctrl/Cmd + Shift + R: 停止录制
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === "R"
			) {
				event.preventDefault();
				browser.runtime.sendMessage({ type: "STOP_RECORDING" });
			}

			// Ctrl/Cmd + Shift + P: 暂停/恢复录制
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === "P"
			) {
				event.preventDefault();
				if (recordingState.isPaused) {
					browser.runtime.sendMessage({ type: "RESUME_RECORDING" });
				} else {
					browser.runtime.sendMessage({ type: "PAUSE_RECORDING" });
				}
			}

			// Ctrl/Cmd + Shift + H: 隐藏/显示覆盖层
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === "H"
			) {
				event.preventDefault();
				browser.runtime.sendMessage({ type: "OVERLAY_VISIBILITY_TOGGLE" });
			}
		});

		// 确保在页面卸载时清理资源
		window.addEventListener("beforeunload", () => {
			destroyOverlay();
		});

		// 防止内存泄漏：定期检查覆盖层状态
		setInterval(() => {
			if (recordingState.isRecording && !overlayContainer) {
				// 如果录制中但覆盖层不存在，重新创建
				createOverlay();
			} else if (!recordingState.isRecording && overlayContainer) {
				// 如果不在录制但覆盖层存在，销毁覆盖层
				destroyOverlay();
			}
		}, 5000);

		console.log("Recording overlay content script loaded");
	},
});
