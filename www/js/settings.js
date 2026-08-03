/* === 设置模块 === */
const Settings = {
  VERSION: '2.0.2',

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
    this.renderMemories();
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
    if (themeToggle) themeToggle.checked = this.defaults.theme !== 'light';

    const precisionSelect = document.getElementById('precision-select');
    if (precisionSelect) precisionSelect.value = String(this.defaults.precision);

    const vibrationToggle = document.getElementById('vibration-toggle');
    if (vibrationToggle) vibrationToggle.checked = this.defaults.vibration;

    // Update version displays
    const headerVer = document.getElementById('header-version');
    if (headerVer) headerVer.textContent = 'v' + this.VERSION;
    const updateVer = document.getElementById('update-version-text');
    if (updateVer) updateVer.textContent = '当前版本 v' + this.VERSION;
    const aboutVer = document.getElementById('about-version');
    if (aboutVer) aboutVer.textContent = 'Basic 工具箱 v' + this.VERSION;

    this.renderModelList();
    this.renderMemories();
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

  /* ========== 记忆管理 ========== */
  renderMemories() {
    const container = document.getElementById('memories-list');
    if (!container) return;
    const memories = AIChat.getMemories();
    if (memories.length === 0) {
      container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">暂无记忆</span>';
      return;
    }
    container.innerHTML = memories.map(m => `
      <div class="memory-item">
        <div class="memory-item-key">${m.key}</div>
        <div class="memory-item-value">${m.value}</div>
        <button class="memory-item-del" data-key="${m.key}" title="删除">✕</button>
      </div>`).join('');
    // Bind delete
    container.querySelectorAll('.memory-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        const memories = AIChat.getMemories().filter(m => m.key !== key);
        AIChat.saveMemories(memories);
        this.renderMemories();
      });
    });
  },

  clearMemories() {
    AIChat.saveMemories([]);
    this.renderMemories();
  },

  /* ========== 事件绑定 ========== */
  bindEvents() {
    document.getElementById('theme-toggle').addEventListener('change', (e) => {
      this.set('theme', e.target.checked ? 'dark' : 'light');
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

    // Clear memories
    const clearMemBtn = document.getElementById('clear-memories-btn');
    if (clearMemBtn) clearMemBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有记忆吗？此操作不可撤销。')) this.clearMemories();
    });
  },

  checkUpdate() {
    const modal = document.getElementById('update-modal');
    const message = document.getElementById('update-message');
    const confirmBtn = document.getElementById('update-confirm');
    modal.classList.add('show');
    message.textContent = '正在检查更新...';
    confirmBtn.style.display = 'none';

    fetch('https://api.github.com/repos/HuHuBasic/basic-toolbox/releases/latest')
      .then(res => res.json())
      .then(data => {
        const latestVer = (data.tag_name || '').replace('v', '');
        const curVer = this.VERSION;
        if (this._compareVersions(latestVer, curVer) > 0) {
          const body = (data.body || '').replace(/\n/g, '<br>');
          message.innerHTML = `发现新版本：<strong>v${latestVer}</strong>（当前 v${curVer}）<br><br>${body}`;
          confirmBtn.style.display = 'inline-block';
          confirmBtn.textContent = '前往下载';
          confirmBtn.onclick = () => { window.open(data.html_url, '_blank'); };
        } else {
          message.innerHTML = `当前版本：<strong>v${curVer}</strong><br><br>✅ 已是最新版本！`;
          confirmBtn.style.display = 'none';
        }
      })
      .catch(() => {
        message.innerHTML = `当前版本：<strong>v${this.VERSION}</strong><br><br>⚠️ 无法连接更新服务器<br><br><small>请检查网络后重试，或访问 GitHub 仓库查看最新版本</small>`;
        confirmBtn.style.display = 'none';
      });
  },

  _compareVersions(a, b) {
    const pa = (a || '0').split('.').map(Number);
    const pb = (b || '0').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0, nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
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