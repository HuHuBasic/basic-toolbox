# Basic 工具箱

集科学计算器、方程求解、竖式计算、AI 聊天于一体的 Android 效率工具。

## 功能

- 🔢 **科学计算器**：基础/科学双模式，支持三角函数、对数、阶乘等
- 📐 **方程求解**：N 元 N 次方程，支持线性/非线性方程组
- 📝 **竖式计算**：加减乘除竖式分步展示
- 🤖 **AI 聊天**：本地大模型 + 云端 AI
  - **本地模型**：Qwen2.5-0.5B / Llama-3.2-1B / Gemma-2-2B（完全离线）
  - **云端 AI**：DeepSeek-V3 / DeepSeek-R1 / 文心一言 4.0 Turbo
  - 📎 上传图片/视频/文件/音频
  - 🌐 联网搜索
  - 🧠 深度思考
  - 💾 长期记忆

## 下载

| 版本 | 下载 |
|------|------|
| v2.1.0 | [Basic工具箱-v2.1.0-release.apk](./Basic工具箱-v2.1.0-release.apk) |
| 历史版本 | [GitHub Releases](https://github.com/HuHuBasic/basic-toolbox/releases) |

## 安装

1. 下载 APK 文件到 Android 手机
2. 打开文件管理器，点击 APK 安装
3. 如提示"未知来源"，去 设置 → 安全 → 允许安装未知应用

## 使用云端 AI

1. 去 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 或 [百度千帆](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application) 获取 API Key
2. 在设置页填入 Key
3. 选择云端模型即可使用

## 开发

本项目使用纯 HTML/CSS/JS 构建，通过 WebView 打包为 Android APK。

```
basic-toolbox/
├── www/              # Web 应用源码
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── icons/
└── Basic工具箱-v2.1.0-release.apk  # 安装包
```