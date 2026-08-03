/* === AI 聊天模块 - 本地大模型 + 上传/搜索/深度思考/记忆 === */
const AIChat = {
  conversationHistory: [],
  isProcessing: false,
  pipeline: null,
  currentModel: null,
  modelLoading: false,
  modelDownloaded: false,
  attachments: [],        // 当前附件列表
  webSearchEnabled: false,
  deepThinkEnabled: false,
  memoryEnabled: true,

  /* ========== 初始化 ========== */
  init() {
    this.bindEvents();
    this.loadHistory();
    this.loadChatSettings();
    this.updateToolbarUI();
    this.tryLoadCachedModel();
  },

  bindEvents() {
    document.getElementById('chat-send-btn').addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });
    // Toolbar toggles
    const searchBtn = document.getElementById('chat-search-toggle');
    if (searchBtn) searchBtn.addEventListener('click', () => this.toggleWebSearch());
    const thinkBtn = document.getElementById('chat-think-toggle');
    if (thinkBtn) thinkBtn.addEventListener('click', () => this.toggleDeepThink());
    const memoryBtn = document.getElementById('chat-memory-toggle');
    if (memoryBtn) memoryBtn.addEventListener('click', () => this.toggleMemory());
    // File input
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
  },

  loadChatSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('bt-chat-settings') || '{}');
      this.webSearchEnabled = s.webSearch !== false;
      this.deepThinkEnabled = s.deepThink === true;
      this.memoryEnabled = s.memory !== false;
    } catch (e) { /* defaults */ }
  },

  saveChatSettings() {
    localStorage.setItem('bt-chat-settings', JSON.stringify({
      webSearch: this.webSearchEnabled,
      deepThink: this.deepThinkEnabled,
      memory: this.memoryEnabled
    }));
  },

  updateToolbarUI() {
    const searchBtn = document.getElementById('chat-search-toggle');
    const thinkBtn = document.getElementById('chat-think-toggle');
    const memoryBtn = document.getElementById('chat-memory-toggle');
    if (searchBtn) searchBtn.classList.toggle('active', this.webSearchEnabled);
    if (thinkBtn) thinkBtn.classList.toggle('active', this.deepThinkEnabled);
    if (memoryBtn) memoryBtn.classList.toggle('active', this.memoryEnabled);
  },

  /* ========== 历史记录 ========== */
  loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem('basic-toolbox-chat') || '[]');
      this.conversationHistory = saved;
      const container = document.getElementById('chat-messages');
      container.innerHTML = '';
      if (saved.length === 0) {
        this.addMessage('bot', '你好！我是 Basic 工具箱的 <strong>本地 AI 助手</strong>。<br><br>'
          + '✨ <strong>v2.0 新功能：</strong><br>'
          + '📎 上传图片/视频/文件/音频<br>'
          + '🌐 联网搜索<br>'
          + '🧠 深度思考<br>'
          + '💾 长期记忆<br><br>'
          + '请在 <strong>设置</strong> 页面中选择模型并下载后开始对话。');
      } else {
        saved.forEach(msg => {
          this.renderMessage(msg.type, msg.text, msg.attachments, msg.thinking);
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
    if (this.modelLoading) { this.addMessage('bot', '模型正在下载中，请耐心等待...'); return; }
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
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.cacheRepo = 'basic-toolbox-models';
      this.showProgressBar(true, config.name);
      this.pipeline = await pipeline('text-generation', modelId, {
        dtype: config.dtype,
        device: 'webgpu',
        progress_callback: (p) => { if (showProgress && p && p.status) this.updateProgressBar(p); }
      });
      this.onModelLoaded(modelId, config);
    } catch (e) {
      console.error('Model load error:', e);
      if (e.message && (e.message.includes('WebGPU') || e.message.includes('webgpu'))) {
        try {
          this.updateProgressStatus('WebGPU 不可用，切换到 WASM 后端...');
          const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0');
          env.allowLocalModels = false; env.useBrowserCache = true; env.cacheRepo = 'basic-toolbox-models';
          const config = this.getModelConfig(modelId);
          this.pipeline = await pipeline('text-generation', modelId, {
            dtype: config.dtype, device: 'wasm',
            progress_callback: (p) => { if (p && p.status) this.updateProgressBar(p); }
          });
          this.onModelLoaded(modelId, config, 'WASM');
          return;
        } catch (e2) {
          this.showProgressBar(false); this.modelLoading = false; this.currentModel = null;
          this.addMessage('bot', '模型加载失败：' + (e2.message || '未知错误') + '\n\n可能原因：网络连接问题、存储空间不足、浏览器不支持。请尝试其他模型。');
          return;
        }
      }
      this.showProgressBar(false); this.modelLoading = false; this.currentModel = null;
      this.addMessage('bot', '模型加载失败：' + (e.message || '未知错误') + '\n\n请尝试其他模型。');
    }
  },

  onModelLoaded(modelId, config, backend) {
    this.currentModel = modelId; this.modelDownloaded = true; this.modelLoading = false;
    const downloaded = Settings.get('model_downloaded') || {};
    downloaded[modelId] = true;
    Settings.set('model_downloaded', downloaded);
    Settings.set('local_model', modelId);
    this.showProgressBar(false);
    Settings.updateChatUI();
    Settings.renderModelList();
    const b = backend ? ' (' + backend + ' 后端)' : '';
    this.addMessage('bot', '✅ 模型 <strong>' + config.name + '</strong> 加载成功' + b + '！现在可以开始对话了。\n\n所有对话数据完全在本地运行，不会上传到任何服务器。');
  },

  /* ========== 进度条 ========== */
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
      fill.style.width = pct + '%'; text.textContent = pct + '%';
      if (status) status.textContent = this.formatBytes(progress.loaded) + ' / ' + this.formatBytes(progress.total);
      bar.style.display = 'flex';
    } else if (progress.status === 'initiate') {
      text.textContent = '准备中...'; if (status) status.textContent = '正在连接...'; bar.style.display = 'flex';
    } else if (progress.status === 'ready') {
      fill.style.width = '100%'; text.textContent = '100%';
      if (status) status.textContent = '加载完成！';
      setTimeout(() => { bar.style.display = 'none'; }, 2000);
    } else if (progress.status === 'done') {
      fill.style.width = '100%'; text.textContent = '100%';
      if (status) status.textContent = '下载完成，正在初始化...';
    }
  },

  updateProgressStatus(msg) { const s = document.getElementById('model-download-status'); if (s) s.textContent = msg; },
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
  },

  /* ========== 工具栏切换 ========== */
  toggleWebSearch() {
    this.webSearchEnabled = !this.webSearchEnabled;
    this.saveChatSettings();
    this.updateToolbarUI();
    this.addMessage('bot', this.webSearchEnabled ? '🌐 联网搜索已开启，我会在需要时搜索最新信息。' : '🌐 联网搜索已关闭。');
  },

  toggleDeepThink() {
    this.deepThinkEnabled = !this.deepThinkEnabled;
    this.saveChatSettings();
    this.updateToolbarUI();
    this.addMessage('bot', this.deepThinkEnabled ? '🧠 深度思考已开启，我会展示详细的推理过程。' : '🧠 深度思考已关闭。');
  },

  toggleMemory() {
    this.memoryEnabled = !this.memoryEnabled;
    this.saveChatSettings();
    this.updateToolbarUI();
    this.addMessage('bot', this.memoryEnabled ? '💾 长期记忆已开启，我会记住重要信息。' : '💾 长期记忆已关闭。');
  },

  /* ========== 文件上传 ========== */
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    files.forEach(file => this.addAttachment(file));
    event.target.value = ''; // reset
    this.renderAttachments();
  },

  addAttachment(file) {
    const id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const type = this.getFileType(file.type, file.name);
    const attachment = { id, file, name: file.name, size: file.size, type };
    // Read for preview
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = () => { attachment.dataUrl = reader.result; this.renderAttachments(); };
      reader.readAsDataURL(file);
    } else if (type === 'audio') {
      const reader = new FileReader();
      reader.onload = () => { attachment.dataUrl = reader.result; this.renderAttachments(); };
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      const reader = new FileReader();
      reader.onload = () => { attachment.dataUrl = reader.result; this.renderAttachments(); };
      reader.readAsDataURL(file);
    }
    // Read text content for txt/code files
    if (type === 'text' || type === 'code') {
      const reader = new FileReader();
      reader.onload = () => { attachment.textContent = reader.result; };
      reader.readAsText(file);
    }
    this.attachments.push(attachment);
  },

  getFileType(mime, name) {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    const ext = name.split('.').pop().toLowerCase();
    if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) return 'text';
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'html', 'css', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'sh'].includes(ext)) return 'code';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'file';
  },

  renderAttachments() {
    const container = document.getElementById('chat-attachments');
    if (!container) return;
    container.style.display = this.attachments.length > 0 ? 'flex' : 'none';
    container.innerHTML = this.attachments.map(a => this.renderAttachmentChip(a)).join('');
    // Bind remove events
    container.querySelectorAll('.att-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.attachments = this.attachments.filter(a => a.id !== id);
        this.renderAttachments();
      });
    });
  },

  renderAttachmentChip(a) {
    const icons = { image: '🖼️', video: '🎬', audio: '🎵', text: '📄', code: '💻', pdf: '📕', file: '📎' };
    const preview = a.dataUrl && a.type === 'image'
      ? `<img src="${a.dataUrl}" class="att-chip-preview" loading="lazy">`
      : `<span class="att-chip-icon">${icons[a.type] || '📎'}</span>`;
    return `<div class="att-chip" title="${a.name} (${this.formatBytes(a.size)})">
      ${preview}
      <span class="att-chip-name">${a.name.length > 12 ? a.name.slice(0, 10) + '..' : a.name}</span>
      <button class="att-remove" data-id="${a.id}">✕</button>
    </div>`;
  },

  /* ========== 联网搜索 ========== */
  async webSearch(query) {
    try {
      // Use DuckDuckGo lite (CORS-friendly)
      const url = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(query);
      const resp = await fetch(url);
      const html = await resp.text();
      // Extract result snippets
      const results = [];
      const snippetRe = /<a[^>]*class="result-link"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*class="result-snippet"[^>]*>([^<]+)<\/td>/gi;
      let match;
      while ((match = snippetRe.exec(html)) !== null && results.length < 5) {
        results.push({ title: match[1].trim(), snippet: match[2].trim() });
      }
      // Fallback: try extracting text
      if (results.length === 0) {
        const textRe = /<td[^>]*class="result-snippet"[^>]*>([^<]+)<\/td>/gi;
        while ((match = textRe.exec(html)) !== null && results.length < 5) {
          results.push({ title: '', snippet: match[1].trim() });
        }
      }
      return results;
    } catch (e) {
      console.error('Web search error:', e);
      return [];
    }
  },

  /* ========== 记忆系统 ========== */
  getMemories() {
    try {
      return JSON.parse(localStorage.getItem('bt-memories') || '[]');
    } catch (e) { return []; }
  },

  saveMemories(memories) {
    localStorage.setItem('bt-memories', JSON.stringify(memories));
  },

  addMemory(key, value) {
    if (!this.memoryEnabled) return;
    const memories = this.getMemories();
    // Update existing or add new
    const existing = memories.find(m => m.key === key.toLowerCase());
    if (existing) {
      existing.value = value;
      existing.time = Date.now();
    } else {
      memories.push({ key: key.toLowerCase(), value, time: Date.now() });
    }
    // Keep max 50 memories
    if (memories.length > 50) memories.sort((a, b) => b.time - a.time).splice(50);
    this.saveMemories(memories);
  },

  getRelevantMemories(query) {
    const memories = this.getMemories();
    if (memories.length === 0) return [];
    const q = query.toLowerCase();
    return memories
      .filter(m => q.includes(m.key) || m.key.includes(q) || q.split(/\s+/).some(w => m.key.includes(w) || m.value.includes(w)))
      .slice(0, 5)
      .map(m => `• ${m.key}: ${m.value}`);
  },

  extractMemoriesFromResponse(userMessage, aiResponse) {
    if (!this.memoryEnabled) return;
    // Simple pattern-based extraction
    const patterns = [
      { re: /我叫(.{1,10})[，。,\s]/, key: '用户名', val: (m) => m[1] },
      { re: /我是(.{1,20})[，。,\s]/, key: '用户身份', val: (m) => m[1] },
      { re: /我在(.{1,30})[，。,\s]/, key: '用户位置', val: (m) => m[1] },
      { re: /(?:喜欢|爱好|兴趣).{0,5}(.{2,20})/, key: '用户爱好', val: (m) => m[1] },
      { re: /(?:记住|记下)[：:]\s*(.+)/, key: '自定义', val: (m) => m[1] },
    ];
    patterns.forEach(p => {
      const m = userMessage.match(p.re);
      if (m) this.addMemory(p.key === '自定义' ? 'note_' + Date.now() : p.key, p.val(m));
    });
  },

  /* ========== 消息发送 ========== */
  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if ((!text && this.attachments.length === 0) || this.isProcessing) return;
    input.value = '';

    const hasAttachments = this.attachments.length > 0;
    const attachments = [...this.attachments];
    this.attachments = [];
    this.renderAttachments();

    // Build display text
    let displayText = text;
    if (hasAttachments) {
      const names = attachments.map(a => a.name).join(', ');
      displayText = text ? `[文件: ${names}] ${text}` : `[文件: ${names}]`;
    }

    this.addMessage('user', displayText, attachments);

    if (!this.pipeline) {
      const modelId = Settings.get('local_model');
      const downloaded = Settings.get('model_downloaded') || {};
      if (downloaded[modelId]) {
        this.addMessage('bot', '模型已缓存但尚未加载，正在加载...');
        await this.loadModel(modelId, false);
        if (!this.pipeline) { this.addMessage('bot', '模型加载失败，请前往设置重新下载。'); return; }
      } else {
        this.addMessage('bot', '⚠️ 模型尚未下载。\n\n请在 <strong>设置</strong> 页面中选择一个本地模型并点击下载按钮。');
        return;
      }
    }

    this.isProcessing = true;
    this.showTyping();

    try {
      // Build context
      let contextParts = [];

      // 1. File content
      if (attachments.length > 0) {
        contextParts.push('【用户上传的文件】');
        attachments.forEach(a => {
          let info = `- ${a.name} (${this.formatBytes(a.size)}, 类型: ${a.type})`;
          if (a.textContent) {
            const preview = a.textContent.slice(0, 2000);
            info += `\n  内容:\n${preview}${a.textContent.length > 2000 ? '\n...(内容太长已截断)' : ''}`;
          }
          contextParts.push(info);
        });
      }

      // 2. Web search
      if (this.webSearchEnabled && text) {
        const searchResults = await this.webSearch(text);
        if (searchResults.length > 0) {
          contextParts.push('【联网搜索结果（最新信息）】');
          searchResults.forEach((r, i) => {
            contextParts.push(`${i + 1}. ${r.title}\n   ${r.snippet}`);
          });
        }
      }

      // 3. Memory
      if (this.memoryEnabled) {
        const relevant = this.getRelevantMemories(text);
        if (relevant.length > 0) {
          contextParts.push('【用户记忆（之前对话中的重要信息）】');
          contextParts.push(relevant.join('\n'));
        }
      }

      const context = contextParts.length > 0 ? '\n\n' + contextParts.join('\n') : '';

      // 4. Deep thinking
      let thinking = '';
      if (this.deepThinkEnabled) {
        const thinkResult = await this.generateThinking(text, context);
        thinking = thinkResult;
        // Show thinking inline
        this.hideTyping();
        const thinkId = await this.showThinkingBubble(thinking);
        this.showTyping();
      }

      const reply = await this.generateLocal(text, context, thinking);
      this.hideTyping();
      this.addMessage('bot', reply, null, thinking);
      this.extractMemoriesFromResponse(text, reply);
    } catch (e) {
      this.hideTyping();
      this.addMessage('bot', '生成回复时出错：' + (e.message || '未知错误'));
    } finally {
      this.isProcessing = false;
    }
  },

  async generateThinking(userMessage, context) {
    const messages = [
      { role: 'system', content: '你是一个深度思考分析器。请对用户的问题进行逐步推理分析。思考应该包括：1) 理解问题的核心 2) 分析可能的方向 3) 列出关键考虑因素。用中文，简洁但深入。只输出思考过程，不要给出最终答案。' },
      { role: 'user', content: userMessage + (context ? '\n\n参考上下文:\n' + context : '') }
    ];
    try {
      const result = await this.pipeline(messages, { max_new_tokens: 256, temperature: 0.5, top_p: 0.9, do_sample: true });
      if (result && result.length > 0) {
        const g = result[0].generated_text;
        if (Array.isArray(g)) return g[g.length - 1]?.content || '';
        return typeof g === 'string' ? g : (g?.content || '');
      }
    } catch (e) { /* ignore */ }
    return '';
  },

  async generateLocal(userMessage, context, thinking) {
    // Build system prompt
    let systemPrompt = '你是 Basic 工具箱的 AI 助手，内置于一个多功能工具箱应用中。帮助用户解答数学、编程、写作、翻译等问题。回答要简洁、准确、有帮助。使用中文回复。';

    if (this.deepThinkEnabled && thinking) {
      systemPrompt += '\n\n以下是你的深度思考过程，请基于此给出最终答案：\n' + thinking;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: userMessage + (context ? '\n' + context : '') }
    ];

    const result = await this.pipeline(messages, {
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true
    });

    if (result && result.length > 0) {
      const generated = result[0].generated_text;
      if (Array.isArray(generated)) {
        const lastMsg = generated[generated.length - 1];
        return typeof lastMsg === 'string' ? lastMsg : (lastMsg.content || lastMsg);
      }
      if (typeof generated === 'string') return generated;
      if (generated && generated.content) return generated.content;
    }
    return '（模型未返回有效响应，请重试）';
  },

  /* ========== 消息渲染 ========== */
  addMessage(type, text, attachments, thinking) {
    this.conversationHistory.push({ type, text, attachments, thinking });
    this.saveHistory();
    this.renderMessage(type, text, attachments, thinking);
  },

  renderMessage(type, text, attachments, thinking) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;

    let html = `<div class="avatar ${type}-avatar">${type === 'user' ? '我' : 'AI'}</div>`;
    html += '<div class="message-content">';

    // Thinking section
    if (thinking) {
      html += `<div class="thinking-block">
        <div class="thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span>🧠 深度思考</span>
          <span class="thinking-toggle">收起</span>
        </div>
        <div class="thinking-body">${this.formatText(thinking)}</div>
      </div>`;
    }

    // Attachments
    if (attachments && attachments.length > 0) {
      html += '<div class="msg-attachments">';
      attachments.forEach(a => {
        if (a.type === 'image' && a.dataUrl) {
          html += `<div class="msg-att"><img src="${a.dataUrl}" class="msg-img" loading="lazy" onclick="this.classList.toggle('zoomed')"><span class="msg-att-name">${a.name}</span></div>`;
        } else if (a.type === 'audio' && a.dataUrl) {
          html += `<div class="msg-att"><audio controls src="${a.dataUrl}" class="msg-audio"></audio><span class="msg-att-name">${a.name}</span></div>`;
        } else if (a.type === 'video' && a.dataUrl) {
          html += `<div class="msg-att"><video controls src="${a.dataUrl}" class="msg-video" preload="metadata"></video><span class="msg-att-name">${a.name}</span></div>`;
        } else {
          html += `<div class="msg-att msg-file"><span>📎 ${a.name}</span><span class="msg-att-size">${this.formatBytes(a.size)}</span></div>`;
        }
      });
      html += '</div>';
    }

    html += `<div class="message-bubble">${this.formatText(text)}</div>`;
    html += '</div>';

    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  showThinkingBubble(thinking) {
    return new Promise(resolve => {
      const container = document.getElementById('chat-messages');
      const div = document.createElement('div');
      div.className = 'chat-message bot';
      div.id = 'thinking-bubble';
      div.innerHTML = `
        <div class="avatar bot-avatar">AI</div>
        <div class="message-content">
          <div class="thinking-block thinking-live">
            <div class="thinking-header">
              <span>🧠 深度思考中...</span>
              <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <div class="thinking-body">${this.formatText(thinking)}</div>
          </div>
        </div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      resolve();
    });
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
          <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
    const tb = document.getElementById('thinking-bubble');
    if (tb) tb.remove();
  },

  /* ========== 文本格式化 ========== */
  formatText(text) {
    if (!text) return '';
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/\n/g, '<br>');
    return text;
  }
};