// Plasmo Framework Background Service Worker
// Chrome 插件 Service Worker

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
	console.log("GifShot 插件已安装");
});

// 监听来自content script或popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "REQUEST_DESKTOP_CAPTURE") {
		// 请求桌面捕获权限
		chrome.desktopCapture.chooseDesktopMedia(
			["screen", "window", "tab"],
			(streamId: string) => {
				if (streamId) {
					sendResponse({ success: true, streamId });
				} else {
					sendResponse({ success: false, error: "用户取消了屏幕共享" });
				}
			}
		);
		return true; // 保持消息通道打开以进行异步响应
	}

	if (message.type === "SAVE_GIF") {
		// 处理GIF保存
		const { dataUrl, filename } = message;

		chrome.downloads.download(
			{
				url: dataUrl,
				filename: filename || `gifshot-${Date.now()}.gif`,
				saveAs: true,
			},
			(downloadId) => {
				if (chrome.runtime.lastError) {
					sendResponse({
						success: false,
						error: chrome.runtime.lastError.message,
					});
				} else {
					sendResponse({ success: true, downloadId });
				}
			}
		);

		return true;
	}
});

// 处理插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
	// 如果没有设置popup，这里可以处理点击事件
	console.log("插件图标被点击", tab);
});

export {}; 