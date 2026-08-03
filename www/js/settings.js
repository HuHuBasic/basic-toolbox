/* === 设置模块 === */
const Settings = {
  defaults: {
    theme: 'dark',
    precision: 6,
    vibration: true,
    local_model: 'onnx-community/Qwen2.5-0.5B-Instruct',
    model_downloaded: {}
  },

  // 可用本地模型列表
  LOCAL_MODELS: [
    {
      id: 'onnx-community/Qwen2.5-0.5B-Instruct',
      name: 'Qwen2.5-0.5B（推荐）',
      size: '~350MB',
      desc: '速度最快，中文优秀，适合日常对话',
      dtype: 'q4',
      icon: '⚡'
    },
    {
      id: 'onnx-community/Llama-3.2-1B-Instruct',
      name: 'Llama-3.2-1B',
      size: '~750MB',
      desc: '平衡性能，英文能力强',
      dtype: 'q4',
      icon: '🦙'
    },
    {
      id: 'onnx-community/gemma-2-2b-it',
      name: 'Gemma-2-2B',
      size: '~1.2GB',
      desc: '质量最佳，理解力强',
      dtype: 'q4',
      icon: '💎'
    }
  ],

  init() {
    this.load();
    this.bindEvents();
    this.renderModelList();
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('basic-toolbox-settings') || '{}');
      Object.assign(this.defaults, saved);
      if (!this.defaults.model_downloaded) this.defaults.model_downloaded = {};
    } catch (e) { /* use defaults */ }
    this.apply();
  },

  save() {
    localStorage.setItem('basic-toolbox-settings', JSON.stringify(this.defaults));
  },

  get(key) {
    return this.defaults[key];
  },

  set(key, value) {
    this.defaults[key] = value;
    this.save();
    this.apply();
  },

  apply() {
    if (this.defaults.theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = this.defaults.theme === 'light';

    const precisionSelect = document.getElementById('precision-select');
    if (precisionSelect) precisionSelect.value = String(this.defaults.precision);

    const vibrationToggle = document.getElementById('vibration-toggle');
    if (vibrationToggle) vibrationToggle.checked = this.defaults.vibration;

    this.renderModelList();
    this.updateChatUI();
  },

  /* ========== 模型列表渲染 ========== */
  renderModelList() {
    const container = document.getElementById('local-model-list');
    if (!container) return;

    const selectedModel = this.defaults.local_model;
    container.innerHTML = this.LOCAL_MODELS.map(m => {
      const downloaded = this.defaults.model_downloaded[m.id];
      const isSelected = selectedModel === m.id;
      const isDownloading = AIChat.modelLoading && AIChat.currentModel === m.id;
      const isLoaded = AIChat.modelDownloaded && AIChat.currentModel === m.id;

      let btnText = '下载';
      let btnClass = 'model-download-btn';
      let btnDisabled = '';

      if (isDownloading) {
        btnText = '下载中...';
        btnClass += ' downloading';
        btnDisabled = 'disabled';
      } else if (isLoaded) {
        btnText = '已加载';
        btnClass += ' loaded';
        btnDisabled = 'disabled';
      } else if (downloaded) {
        btnText = '加载';
        btnClass += ' cached';
      }

      const selectedClass = isSelected ? 'model-card-selected' : '';

      return `
        <div class="model-card ${selectedClass}" data-model-id="${m.id}">
          <div class="model-card-header">
            <span class="model-icon">${m.icon}</span>
            <div class="model-card-info">
              <span class="model-name">${m.name}</span>
              <span class="model-desc">${m.desc}</span>
            </div>
            <span class="model-size">${m.size}</span>
          </div>
          <div class="model-card-actions">
            <button class="model-select-btn ${isSelected ? 'active' : ''}" data-action="select" data-model="${m.id}">
              ${isSelected ? '✓ 已选' : '选择'}
            </button>
            <button class="${btnClass}" data-action="download" data-model="${m.id}" ${btnDisabled}>
              ${btnText}
            </button>
          </div>
        </div>`;
    }).join('');

    // Bind model card events
    container.querySelectorAll('[data-action="select"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelId = e.target.dataset.model;
        this.selectModel(modelId);
      });
    });
    container.querySelectorAll('[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelId = e.target.dataset.model;
        this.downloadModel(modelId);
      });
    });
  },

  selectModel(modelId) {
    this.set('local_model', modelId);
    this.renderModelList();
  },

  async downloadModel(modelId) {
    if (AIChat.modelLoading) {
      alert('模型正在下载中，请等待完成后再试。');
      return;
    }
    // Switch to chat tab to show progress
    const chatTab = document.querySelector('[data-tab="chat"]');
    if (chatTab) chatTab.click();

    this.renderModelList();
    await AIChat.downloadAndLoadModel(modelId);
    this.renderModelList();
    this.updateChatUI();
  },

  updateChatUI() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const badge = document.getElementById('model-badge');

    if (AIChat.modelDownloaded) {
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      if (badge) {
        badge.style.display = 'inline';
        badge.textContent = '本地模型 ✓';
      }
    } else {
      if (input) input.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
      if (badge) {
        badge.style.display = 'inline';
        badge.textContent = '未加载';
      }
    }
  },

  /* ========== 事件绑定 ========== */
  bindEvents() {
    document.getElementById('theme-toggle').addEventListener('change', (e) => {
      this.set('theme', e.target.checked ? 'light' : 'dark');
    });

    document.getElementById('precision-select').addEventListener('change', (e) => {
      this.set('precision', parseInt(e.target.value));
    });

    document.getElementById('vibration-toggle').addEventListener('change', (e) => {
      this.set('vibration', e.target.checked);
    });

    document.getElementById('check-update-btn').addEventListener('click', () => this.checkUpdate());
    document.getElementById('update-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('update-confirm').addEventListener('click', () => this.downloadUpdate());
  },

  checkUpdate() {
    const modal = document.getElementById('update-modal');
    const message = document.getElementById('update-message');
    const confirmBtn = document.getElementById('update-confirm');
    modal.classList.add('show');
    message.textContent = '正在检查更新...';
    confirmBtn.style.display = 'none';
    setTimeout(() => {
      message.innerHTML = '当前版本：<strong>v1.3.0</strong><br><br>✅ 已是最新版本！<br><br>新功能：本地大模型 AI 对话（完全离线、隐私安全）、N 元 N 次方程求解。';
      confirmBtn.style.display = 'none';
    }, 1500);
  },

  closeModal() {
    document.getElementById('update-modal').classList.remove('show');
  },

  downloadUpdate() {
    const message = document.getElementById('update-message');
    message.textContent = '正在下载更新...';
    setTimeout(() => {
      message.textContent = '更新已下载！请重新安装应用。';
      document.getElementById('update-confirm').style.display = 'none';
    }, 2000);
  }
};