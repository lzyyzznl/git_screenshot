import React from "react";

function IndexPopup() {
  const openFullApp = () => {
    try {
      chrome.tabs.create({
        url: chrome.runtime.getURL("tabs/app.html"),
      });
    } catch (error) {
      console.error("打开完整版失败:", error);
      alert(
        "打开完整版失败: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleRecordClick = async (type: string) => {
    try {
      const constraints: DisplayMediaStreamOptions = {
        video: true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      alert("录制功能在完整版中提供更好的体验，即将打开完整版");

      // 停止流
      stream.getTracks().forEach((track) => track.stop());

      // 打开完整版
      chrome.tabs.create({
        url: chrome.runtime.getURL("tabs/app.html"),
      });
    } catch (err) {
      console.error("录制失败:", err);
      alert(
        "录制失败，请检查权限设置: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  return (
    <div style={styles.popupContainer}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎬 GifShot</h2>
        <p style={styles.subtitle}>屏幕录制 GIF 插件</p>
        <button 
          onClick={openFullApp} 
          style={styles.openAppBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
        >
          🚀 完整版
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.recordOptions}>
          <h3 style={styles.optionsTitle}>选择录制类型</h3>
          <div style={styles.optionButtons}>
            {recordingOptions.map((option) => (
              <button 
                key={option.type}
                onClick={() => handleRecordClick(option.type)}
                style={styles.optionBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={styles.icon}>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>

          <div style={styles.settings}>
            <label style={styles.settingsLabel}>
              录制时长 (秒):
              <input 
                type="number" 
                defaultValue="10" 
                min="1" 
                max="60"
                style={styles.settingsInput}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

const recordingOptions = [
  { type: "tab", icon: "📄", label: "当前标签页" },
  { type: "window", icon: "🖥️", label: "整个桌面" },
  { type: "application", icon: "📱", label: "应用窗口" }
];

const styles = {
  popupContainer: {
    width: "380px",
    minHeight: "400px",
    padding: "20px",
    fontFamily: '"Microsoft YaHei", sans-serif',
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white"
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "20px"
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "24px"
  },
  subtitle: {
    margin: "0 0 12px 0",
    opacity: 0.8,
    fontSize: "12px"
  },
  openAppBtn: {
    padding: "8px 16px",
    background: "rgba(255, 255, 255, 0.2)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s ease"
  },
  content: {
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "20px",
    backdropFilter: "blur(10px)"
  },
  recordOptions: {},
  optionsTitle: {
    margin: "0 0 16px 0",
    fontSize: "16px",
    textAlign: "center" as const
  },
  optionButtons: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    marginBottom: "20px"
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  icon: {
    marginRight: "10px",
    fontSize: "18px"
  },
  settings: {
    textAlign: "center" as const
  },
  settingsLabel: {
    fontSize: "14px"
  },
  settingsInput: {
    width: "80px",
    padding: "6px 8px",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    marginLeft: "8px"
  }
};

export default IndexPopup; 