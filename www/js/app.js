/* === Basic 工具箱 - 主应用逻辑 === */
(function() {
  'use strict';

  // 标签页切换
  function initTabs() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(tc => tc.classList.remove('active'));
        const target = document.getElementById('tab-' + tabName);
        if (target) target.classList.add('active');
      });
    });
  }

  // 弹窗关闭
  function initModal() {
    document.getElementById('update-modal').addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  }

  // 键盘支持
  function initKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Only handle when calculator tab is active
      const calcTab = document.getElementById('tab-calculator');
      if (!calcTab || !calcTab.classList.contains('active')) return;

      const keyMap = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
        '+': '+', '-': '−', '*': '×', '/': '÷', '.': '.',
        'Enter': '=', 'Backspace': '⌫', 'Delete': 'C', 'Escape': 'C',
        '%': '%', '^': 'xⁿ', '(': '(', ')': ')'
      };

      const key = keyMap[e.key];
      if (key) {
        e.preventDefault();
        Calculator.handleKey(key);
        if (Settings.get('vibration') !== false) {
          navigator.vibrate?.(10);
        }
      }
    });
  }

  // 注册 Service Worker
  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Silently fail - app works offline without SW
      });
    }
  }

  // 初始化所有模块
  function init() {
    Settings.init();
    Calculator.init();
    EquationSolver.init();
    VerticalCalc.init();
    AIChat.init();
    initTabs();
    initModal();
    initKeyboard();
    initServiceWorker();
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();