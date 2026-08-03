/* === AI 聊天模块 - 本地大模型 (Transformers.js + ONNX) === */
const AIChat = {
  conversationHistory: [],
  isProcessing: false,
  pipeline: null,
  currentModel: null,
  modelLoading: false,
  modelDownloaded: false,

  init() {
    this.bindEvents();
    this.loadHistory();
    this.tryLoadCachedModel();
  },

  bindEvents() {
    document.getElementById('chat-send-btn').addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  },

  loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem('basic-toolbox-chat') || '[]');
      this.conversationHistory = saved;
      const container = document.getElementById('chat-messages');
      container.innerHTML = '';
      if (saved.length === 0) {
        this.addMessage('bot', '你好！我是 Basic 工具箱的 <strong>本地 AI 助手</strong>。<br><br>我使用本地大模型运行，<strong>完全离线、隐私安全</strong>。首次使用需要下载模型（约 350MB~1.2GB），下载一次后永久可用。<br><br>请在 <strong>设置</strong> 页面中选择模型并下载。');
      } else {
        saved.forEach(msg => {
          this.renderMessage(msg.type, msg.text);
        });
      }
    } catch (e) {
      document.getElementById('chat-messages').innerHTML = '';
      this.addMessage('bot', '你好！我是 Basic 工具箱的本地 AI 助手。请在设置中选择模型并下载后开始对话。');
    }
  },

  saveHistory() {
    localStorage.setItem('basic-toolbox-chat', JSON.stringify(this.conversationHistory));
  },

  /* ========== 模型管理 ========== */
  async tryLoadCachedModel() {
    const modelId = Settings.get('local_model');
    const downloaded = Settings.get('model_downloaded') || {};
    if (downloaded[modelId]) {
      this.currentModel = modelId;
      this.addMessage('bot', '检测到已缓存的模型，正在加载...');
      await this.loadModel(modelId, false);
    }
  },

  getModelName(id) {
    const m = (Settings.LOCAL_MODELS || []).find(x => x.id === id);
    return m ? m.name : id;
  },

  getModelConfig(id) {
    return (Settings.LOCAL_MODELS || []).find(x => x.id === id) || Settings.LOCAL_MODELS[0];
  },

  async downloadAndLoadModel(modelId) {
    if (this.modelLoading) {
      this.addMessage('bot', '模型正在下载中，请耐心等待...');
      return;
    }
    this.modelLoading = true;
    this.currentModel = modelId;

    const config = this.getModelConfig(modelId);
    this.addMessage('bot', '开始下载模型 <strong>' + config.name + '</strong>...\n大小约 ' + config.size + '，首次下载需要一定时间，请保持网络连接。');

    await this.loadModel(modelId, true);
    this.modelLoading = false;
  },

  async loadModel(modelId, showProgress) {
    try {
      const config = this.getModelConfig(modelId);

      // Dynamically import Transformers.js
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0');

      // Configure environment
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.cacheRepo = 'basic-toolbox-models';

      this.showProgressBar(true, config.name);

      // Create pipeline with progress callback
      this.pipeline = await pipeline('text-generation', modelId, {
        dtype: config.dtype,
        device: 'webgpu',
        progress_callback: (progress) => {
          if (showProgress && progress && progress.status) {
            this.updateProgressBar(progress);
          }
        }
      });

      this.onModelLoaded(modelId, config);
    } catch (e) {
      console.error('Model load error:', e);

      // Try fallback to WASM if WebGPU fails
      if (e.message && (e.message.includes('WebGPU') || e.message.includes('webgpu'))) {
        try {
          this.updateProgressStatus('WebGPU 不可用，切换到 WASM 后端...');
          const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0');
          env.allowLocalModels = false;
          env.useBrowserCache = true;
          env.cacheRepo = 'basic-toolbox-models';

          const config = this.getModelConfig(modelId);
          this.pipeline = await pipeline('text-generation', modelId, {
            dtype: config.dtype,
            device: 'wasm',
            progress_callback: (progress) => {
              if (progress && progress.status) {
                this.updateProgressBar(progress);
              }
            }
          });

          this.onModelLoaded(modelId, config, 'WASM');
          return;
        } catch (e2) {
          this.showProgressBar(false);
          this.modelLoading = false;
          this.currentModel = null;
          this.addMessage('bot', '模型加载失败：' + (e2.message || '未知错误') + '\n\n可能原因：\n• 网络连接问题\n• 存储空间不足\n• 浏览器不支持 WebGPU/WASM\n\n请尝试其他模型或检查网络。');
          return;
        }
      }

      this.showProgressBar(false);
      this.modelLoading = false;
      this.currentModel = null;
      this.addMessage('bot', '模型加载失败：' + (e.message || '未知错误') + '\n\n可能原因：\n• 网络连接问题\n• 存储空间不足\n• 该模型暂不支持浏览器运行\n\n请尝试其他模型。');
    }
  },

  onModelLoaded(modelId, config, backend) {
    this.currentModel = modelId;
    this.modelDownloaded = true;
    this.modelLoading = false;

    // Save to settings
    const downloaded = Settings.get('model_downloaded') || {};
    downloaded[modelId] = true;
    Settings.set('model_downloaded', downloaded);
    Settings.set('local_model', modelId);

    this.showProgressBar(false);
    Settings.updateChatUI();
    Settings.renderModelList();

    const backendInfo = backend ? ' (' + backend + ' 后端)' : '';
    this.addMessage('bot', '✅ 模型 <strong>' + config.name + '</strong> 加载成功' + backendInfo + '！现在可以开始对话了。\n\n所有对话数据完全在本地运行，不会上传到任何服务器。');
  },

  showProgressBar(show, modelName) {
    const bar = document.getElementById('model-download-bar');
    if (!bar) return;
    bar.style.display = show ? 'flex' : 'none';
    if (show && modelName) {
      const label = document.getElementById('model-download-label');
      if (label) label.textContent = '下载 ' + modelName;
    }
  },

  updateProgressBar(progress) {
    const bar = document.getElementById('model-download-bar');
    const fill = document.getElementById('model-progress-fill');
    const text = document.getElementById('model-progress-text');
    const status = document.getElementById('model-download-status');
    if (!bar || !fill || !text) return;

    if (progress.status === 'progress' && progress.loaded && progress.total) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      fill.style.width = pct + '%';
      text.textContent = pct + '%';
      if (status) status.textContent = this.formatBytes(progress.loaded) + ' / ' + this.formatBytes(progress.total);
      bar.style.display = 'flex';
    } else if (progress.status === 'initiate') {
      text.textContent = '准备中...';
      if (status) status.textContent = '正在连接 Hugging Face...';
      bar.style.display = 'flex';
    } else if (progress.status === 'ready') {
      fill.style.width = '100%';
      text.textContent = '100%';
      if (status) status.textContent = '加载完成！';
      setTimeout(() => { bar.style.display = 'none'; }, 2000);
    } else if (progress.status === 'done') {
      fill.style.width = '100%';
      text.textContent = '100%';
      if (status) status.textContent = '下载完成，正在初始化模型...';
    }
  },

  updateProgressStatus(msg) {
    const status = document.getElementById('model-download-status');
    if (status) status.textContent = msg;
  },

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
  },

  /* ========== 消息发送 ========== */
  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || this.isProcessing) return;

    input.value = '';
    this.addMessage('user', text);

    if (!this.pipeline) {
      const modelId = Settings.get('local_model');
      const downloaded = Settings.get('model_downloaded') || {};
      if (downloaded[modelId]) {
        this.addMessage('bot', '模型已缓存但尚未加载，正在加载...');
        await this.loadModel(modelId, false);
        if (!this.pipeline) {
          this.addMessage('bot', '模型加载失败，请前往设置重新下载。');
          return;
        }
      } else {
        this.addMessage('bot', '⚠️ 模型尚未下载。\n\n请在 <strong>设置</strong> 页面中选择一个本地模型并点击下载按钮。模型下载后完全离线运行，无需联网。');
        return;
      }
    }

    this.isProcessing = true;
    this.showTyping();

    try {
      const reply = await this.generateLocal(text);
      this.hideTyping();
      this.addMessage('bot', reply);
    } catch (e) {
      this.hideTyping();
      this.addMessage('bot', '生成回复时出错：' + (e.message || '未知错误'));
    } finally {
      this.isProcessing = false;
    }
  },

  async generateLocal(userMessage) {
    // Build messages in the chat format the model expects
    const messages = [
      { role: 'system', content: '你是一个名为 Basic 工具箱的 AI 助手，内置于一个多功能工具箱应用中。你可以帮助用户解答数学问题、编程问题、写作辅助、翻译等各种问题。回答要简洁、准确、有帮助。使用中文回复。' },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: userMessage }
    ];

    // Use the pipeline
    const result = await this.pipeline(messages, {
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true
    });

    // Extract the generated text
    if (result && result.length > 0) {
      const generated = result[0].generated_text;
      if (Array.isArray(generated)) {
        const lastMsg = generated[generated.length - 1];
        return typeof lastMsg === 'string' ? lastMsg : (lastMsg.content || lastMsg);
      }
      if (typeof generated === 'string') {
        return generated;
      }
      if (generated && generated.content) {
        return generated.content;
      }
    }
    return '（模型未返回有效响应，请重试）';
  },

  /* ========== 消息渲染 ========== */
  addMessage(type, text) {
    this.conversationHistory.push({ type, text });
    this.saveHistory();
    this.renderMessage(type, text);
  },

  renderMessage(type, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = `
      <div class="avatar ${type}-avatar">${type === 'user' ? '我' : 'AI'}</div>
      <div class="message-bubble">${this.formatText(text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  showTyping() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message bot';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="avatar bot-avatar">AI</div>
      <div class="message-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  },

  formatText(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/\n/g, '<br>');
    return text;
  }
};