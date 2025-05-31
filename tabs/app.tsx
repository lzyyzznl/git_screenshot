import React, { useState, useEffect, useRef } from "react"

import { generateGif } from "../utils/gifGenerator"
import "./app.less"

function AppPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedTime, setRecordedTime] = useState(0)
  const [recordDuration, setRecordDuration] = useState(10)
  const [frameRate, setFrameRate] = useState(8)
  const [gifPreview, setGifPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("准备中...")
  const [gifSize, setGifSize] = useState("")
  const [gifDimensions, setGifDimensions] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const openPopup = () => {
    chrome.action.openPopup()
  }

  const startRecording = async (type: "tab" | "window" | "application") => {
    try {
      setProcessingStatus("请求屏幕权限...")

      const constraints: MediaStreamConstraints = {
        video: {
          // @ts-ignore
          mediaSource: type === "tab" ? "tab" : "screen"
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

      recordedChunksRef.current = []
      setRecordedTime(0)
      setIsRecording(true)

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm"
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        await processRecording()
      }

      mediaRecorderRef.current.start()

      timerRef.current = window.setInterval(() => {
        setRecordedTime((prev) => {
          const newTime = prev + 1
          if (newTime >= recordDuration) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
    } catch (err) {
      console.error("录制失败:", err)
      alert("录制失败，请检查权限设置")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setIsRecording(false)
  }

  const processRecording = async () => {
    if (recordedChunksRef.current.length === 0) return

    setIsProcessing(true)
    setProcessingStatus("正在处理视频...")

    try {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
      console.log("开始处理视频，大小:", formatFileSize(blob.size))

      setProcessingStatus("正在生成 GIF...")
      const gifBlob = await generateGif(blob)

      // 获取图片信息
      const img = new Image()
      img.onload = () => {
        setGifDimensions(`${img.width} x ${img.height}`)
      }

      setGifSize(formatFileSize(gifBlob.size))

      const reader = new FileReader()
      reader.onload = () => {
        setGifPreview(reader.result as string)
        img.src = reader.result as string
        setIsProcessing(false)
        setProcessingStatus("")
      }
      reader.readAsDataURL(gifBlob)
    } catch (err) {
      console.error("GIF生成失败:", err)
      alert(`GIF生成失败: ${err instanceof Error ? err.message : String(err)}`)
      setIsProcessing(false)
    }
  }

  const saveGif = async () => {
    if (!gifPreview) return

    try {
      const response = await fetch(gifPreview)
      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gifshot-${Date.now()}.gif`
      a.click()

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("保存失败:", err)
      alert("保存失败")
    }
  }

  const reset = () => {
    setGifPreview(null)
    setRecordedTime(0)
    recordedChunksRef.current = []
    setGifSize("")
    setGifDimensions("")
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>🎬 GifShot</h1>
          <p>屏幕录制 GIF 插件</p>
        </div>
        <div className="actions">
          <button onClick={openPopup} className="btn-secondary">
            弹窗模式
          </button>
        </div>
      </header>

      <main className="app-main">
        {!isRecording && !gifPreview && (
          <div className="record-section">
            <h2>选择录制类型</h2>
            <div className="record-grid">
              <div className="record-card" onClick={() => startRecording("tab")}>
                <div className="card-icon">📄</div>
                <h3>当前标签页</h3>
                <p>录制当前浏览器标签页内容</p>
              </div>
              <div className="record-card" onClick={() => startRecording("window")}>
                <div className="card-icon">🖥️</div>
                <h3>整个桌面</h3>
                <p>录制整个桌面屏幕</p>
              </div>
              <div className="record-card" onClick={() => startRecording("application")}>
                <div className="card-icon">📱</div>
                <h3>应用窗口</h3>
                <p>录制特定应用程序窗口</p>
              </div>
            </div>

            <div className="settings-panel">
              <h3>录制设置</h3>
              <div className="setting-item">
                <label>录制时长 (秒):</label>
                <input
                  value={recordDuration}
                  onChange={(e) => setRecordDuration(Number(e.target.value))}
                  type="number"
                  min="1"
                  max="60"
                  className="setting-input"
                />
              </div>
              <div className="setting-item">
                <label>帧率:</label>
                <select
                  value={frameRate}
                  onChange={(e) => setFrameRate(Number(e.target.value))}
                  className="setting-select">
                  <option value="5">5 FPS (文件小)</option>
                  <option value="8">8 FPS (推荐)</option>
                  <option value="10">10 FPS (文件大)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="recording-section">
            <div className="recording-display">
              <div className="recording-indicator">
                <span className="pulse"></span>
                <span className="text">正在录制...</span>
              </div>
              <div className="timer">{formatTime(recordedTime)}</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: (recordedTime / recordDuration) * 100 + "%" }}
                ></div>
              </div>
              <button onClick={stopRecording} className="btn-stop">
                ⏹️ 停止录制
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-section">
            <div className="processing-display">
              <div className="loader"></div>
              <h3>正在生成 GIF...</h3>
              <p className="progress-text">{processingStatus}</p>
            </div>
          </div>
        )}

        {gifPreview && (
          <div className="preview-section">
            <h2>GIF 预览</h2>
            <div className="preview-container">
              <img src={gifPreview} alt="GIF预览" className="gif-preview" />
              <div className="preview-info">
                <p>大小: {gifSize}</p>
                <p>尺寸: {gifDimensions}</p>
              </div>
            </div>
            <div className="preview-actions">
              <button onClick={saveGif} className="btn-primary">
                💾 保存 GIF
              </button>
              <button onClick={reset} className="btn-secondary">
                🔄 重新录制
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 GifShot. Made with ❤️</p>
      </footer>
    </div>
  )
}

export default AppPage 