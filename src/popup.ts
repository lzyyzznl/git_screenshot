console.log("Popup script started");

// 直接在这里实现弹窗功能，不使用复杂的 Vue 组件
document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM loaded");

	const appElement = document.getElementById("app");
	if (!appElement) {
		console.error("App element not found");
		return;
	}

	// 直接设置 HTML 内容
	appElement.innerHTML = `
		<div class="popup-container">
			<div class="header">
				<h2>🎬 GifShot</h2>
				<p>屏幕录制 GIF 插件</p>
				<button id="openFullApp" class="open-app-btn">🚀 完整版</button>
			</div>

			<div class="content">
				<div class="record-options">
					<h3>选择录制类型</h3>
					<div class="option-buttons">
						<button data-type="tab" class="option-btn">
							<span class="icon">📄</span>
							当前标签页
						</button>
						<button data-type="window" class="option-btn">
							<span class="icon">🖥️</span>
							整个桌面
						</button>
						<button data-type="application" class="option-btn">
							<span class="icon">📱</span>
							应用窗口
						</button>
					</div>

					<div class="settings">
						<label>
							录制时长 (秒):
							<input type="number" id="duration" value="10" min="1" max="60">
						</label>
					</div>
				</div>
			</div>
		</div>
	`;

	// 添加样式
	const style = document.createElement("style");
	style.textContent = `
		.popup-container {
			width: 380px;
			min-height: 400px;
			padding: 20px;
			font-family: "Microsoft YaHei", sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
		}
		
		.header {
			text-align: center;
			margin-bottom: 20px;
		}
		
		.header h2 {
			margin: 0 0 8px 0;
			font-size: 24px;
		}
		
		.header p {
			margin: 0 0 12px 0;
			opacity: 0.8;
			font-size: 12px;
		}
		
		.open-app-btn {
			padding: 8px 16px;
			background: rgba(255, 255, 255, 0.2);
			color: white;
			border: 1px solid rgba(255, 255, 255, 0.3);
			border-radius: 6px;
			cursor: pointer;
			font-size: 12px;
		}
		
		.open-app-btn:hover {
			background: rgba(255, 255, 255, 0.3);
		}
		
		.content {
			background: rgba(255, 255, 255, 0.1);
			border-radius: 12px;
			padding: 20px;
			backdrop-filter: blur(10px);
		}
		
		.record-options h3 {
			margin: 0 0 16px 0;
			font-size: 16px;
			text-align: center;
		}
		
		.option-buttons {
			display: flex;
			flex-direction: column;
			gap: 12px;
			margin-bottom: 20px;
		}
		
		.option-btn {
			display: flex;
			align-items: center;
			padding: 12px 16px;
			border: 2px solid rgba(255, 255, 255, 0.3);
			border-radius: 8px;
			background: rgba(255, 255, 255, 0.1);
			color: white;
			font-size: 14px;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		
		.option-btn:hover {
			background: rgba(255, 255, 255, 0.2);
			border-color: rgba(255, 255, 255, 0.5);
			transform: translateY(-2px);
		}
		
		.icon {
			margin-right: 10px;
			font-size: 18px;
		}
		
		.settings {
			text-align: center;
		}
		
		.settings label {
			font-size: 14px;
		}
		
		.settings input {
			width: 80px;
			padding: 6px 8px;
			border: 1px solid rgba(255, 255, 255, 0.3);
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.1);
			color: white;
			margin-left: 8px;
		}
	`;
	document.head.appendChild(style);

	// 添加事件监听器
	document.getElementById("openFullApp")?.addEventListener("click", () => {
		try {
			chrome.tabs.create({
				url: chrome.runtime.getURL("app.html"),
			});
		} catch (error) {
			console.error("打开完整版失败:", error);
			alert(
				"打开完整版失败: " +
					(error instanceof Error ? error.message : String(error))
			);
		}
	});

	// 录制按钮事件
	document.querySelectorAll(".option-btn").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const type = btn.getAttribute("data-type");
			try {
				const constraints: DisplayMediaStreamOptions = {
					video: true,
					audio: false,
				};

				const stream = await navigator.mediaDevices.getDisplayMedia(
					constraints
				);
				alert("录制功能在完整版中提供更好的体验，即将打开完整版");

				// 停止流
				stream.getTracks().forEach((track) => track.stop());

				// 打开完整版
				chrome.tabs.create({
					url: chrome.runtime.getURL("app.html"),
				});
			} catch (err) {
				console.error("录制失败:", err);
				alert(
					"录制失败，请检查权限设置: " +
						(err instanceof Error ? err.message : String(err))
				);
			}
		});
	});

	console.log("Popup initialized successfully");
});
