/* === 方程求解器模块 - 支持 N 元 N 次方程 === */
const EquationSolver = {
  init() {
    this.bindEvents();
    this.updateInputs();
  },

  bindEvents() {
    document.getElementById('eq-type').addEventListener('change', () => this.updateInputs());
    document.getElementById('eq-solve-btn').addEventListener('click', () => this.solve());
  },

  updateInputs() {
    const type = document.getElementById('eq-type').value;
    const container = document.getElementById('eq-inputs');
    let html = '';

    switch (type) {
      case 'linear':
        html = `
          <div class="eq-input-group">
            <label>a =</label><input type="number" id="eq-a" placeholder="系数 a" step="any" value="1">
            <label>x +</label>
            <label>b =</label><input type="number" id="eq-b" placeholder="系数 b" step="any" value="0">
            <label>= 0</label>
          </div>`;
        break;
      case 'quadratic':
        html = `
          <div class="eq-input-group">
            <label>a =</label><input type="number" id="eq-a" placeholder="x²系数" step="any" value="1">
            <label>x² +</label>
          </div>
          <div class="eq-input-group">
            <label>b =</label><input type="number" id="eq-b" placeholder="x系数" step="any" value="0">
            <label>x +</label>
          </div>
          <div class="eq-input-group">
            <label>c =</label><input type="number" id="eq-c" placeholder="常数" step="any" value="0">
            <label>= 0</label>
          </div>`;
        break;
      case 'cubic':
        html = `
          <div class="eq-input-group">
            <label>a =</label><input type="number" id="eq-a" placeholder="x³系数" step="any" value="1">
            <label>x³ +</label>
          </div>
          <div class="eq-input-group">
            <label>b =</label><input type="number" id="eq-b" placeholder="x²系数" step="any" value="0">
            <label>x² +</label>
          </div>
          <div class="eq-input-group">
            <label>c =</label><input type="number" id="eq-c" placeholder="x系数" step="any" value="0">
            <label>x +</label>
          </div>
          <div class="eq-input-group">
            <label>d =</label><input type="number" id="eq-d" placeholder="常数" step="any" value="0">
            <label>= 0</label>
          </div>`;
        break;
      case 'system2':
        html = `
          <div class="eq-input-group">
            <input type="number" id="eq-a1" placeholder="a1" step="any" value="1"><label>x +</label>
            <input type="number" id="eq-b1" placeholder="b1" step="any" value="0"><label>y =</label>
            <input type="number" id="eq-c1" placeholder="c1" step="any" value="0">
          </div>
          <div class="eq-input-group">
            <input type="number" id="eq-a2" placeholder="a2" step="any" value="0"><label>x +</label>
            <input type="number" id="eq-b2" placeholder="b2" step="any" value="1"><label>y =</label>
            <input type="number" id="eq-c2" placeholder="c2" step="any" value="0">
          </div>`;
        break;
      case 'system3':
        html = `
          <div class="eq-input-group">
            <input type="number" id="eq-a1" placeholder="a1" step="any" value="1"><label>x+</label>
            <input type="number" id="eq-b1" placeholder="b1" step="any" value="0"><label>y+</label>
            <input type="number" id="eq-c1" placeholder="c1" step="any" value="0"><label>z=</label>
            <input type="number" id="eq-d1" placeholder="d1" step="any" value="0">
          </div>
          <div class="eq-input-group">
            <input type="number" id="eq-a2" placeholder="a2" step="any" value="0"><label>x+</label>
            <input type="number" id="eq-b2" placeholder="b2" step="any" value="1"><label>y+</label>
            <input type="number" id="eq-c2" placeholder="c2" step="any" value="0"><label>z=</label>
            <input type="number" id="eq-d2" placeholder="d2" step="any" value="0">
          </div>
          <div class="eq-input-group">
            <input type="number" id="eq-a3" placeholder="a3" step="any" value="0"><label>x+</label>
            <input type="number" id="eq-b3" placeholder="b3" step="any" value="0"><label>y+</label>
            <input type="number" id="eq-c3" placeholder="c3" step="any" value="1"><label>z=</label>
            <input type="number" id="eq-d3" placeholder="d3" step="any" value="0">
          </div>`;
        break;
      case 'nlinear':
        html = this.buildNLinearInputs();
        break;
      case 'npoly':
        html = this.buildNPolynomialInputs();
        break;
      case 'nnonlinear':
        html = this.buildNNonlinearInputs();
        break;
      case 'custom':
        html = `
          <div class="eq-input-group" style="flex-direction:column;align-items:stretch;gap:8px;">
            <label>输入方程 f(x) = 0：</label>
            <input type="text" id="eq-custom" placeholder="例: x^3 - 2*x + 1" style="text-align:left;font-size:16px;">
            <label style="font-size:12px;color:var(--text-muted);">支持: + - * / ^ ( ) sin cos tan log ln sqrt abs exp</label>
            <div style="display:flex;gap:8px;">
              <label style="font-size:12px;">初始猜测 x₀:</label>
              <input type="number" id="eq-guess" placeholder="初始值" step="any" value="0" style="width:80px;">
            </div>
          </div>`;
        break;
    }
    container.innerHTML = html;
    document.getElementById('eq-result').classList.remove('show');
    document.getElementById('eq-steps').classList.remove('show');

    // Bind N-system controls
    if (['nlinear', 'npoly', 'nnonlinear'].includes(type)) {
      this.bindNControls();
    }
  },

  /* ========== N 元线性方程组 ========== */
  buildNLinearInputs() {
    const n = 3; // default 3 variables, user can change
    const vars = 'xyzabcdefghijklmnopqrstuvw';
    let html = `<div class="n-config">
      <label>变量数:</label>
      <input type="number" id="eq-n" value="${n}" min="2" max="26" style="width:60px;padding:6px;text-align:center;">
      <button class="mode-btn" id="eq-n-apply" style="padding:6px 12px;width:auto;">应用</button>
    </div>`;
    html += '<div class="n-matrix" id="eq-n-matrix">';
    for (let i = 0; i < n; i++) {
      html += '<div class="eq-input-group">';
      for (let j = 0; j < n; j++) {
        html += `<input type="number" id="eq-a${i}_${j}" placeholder="a${i+1}${j+1}" step="any" value="${i === j ? 1 : 0}" style="width:55px;">`;
        html += `<label style="font-size:11px;">${vars[j]}${j < n-1 ? '+' : ''}</label>`;
      }
      html += `<label>=</label><input type="number" id="eq-b${i}" placeholder="b${i+1}" step="any" value="0" style="width:55px;">`;
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  bindNControls() {
    const btn = document.getElementById('eq-n-apply');
    if (btn) {
      btn.addEventListener('click', () => {
        const n = parseInt(document.getElementById('eq-n').value) || 3;
        const vars = 'xyzabcdefghijklmnopqrstuvw';
        let html = '';
        for (let i = 0; i < n; i++) {
          html += '<div class="eq-input-group">';
          for (let j = 0; j < n; j++) {
            html += `<input type="number" id="eq-a${i}_${j}" placeholder="a${i+1}${j+1}" step="any" value="${i === j ? 1 : 0}" style="width:55px;">`;
            html += `<label style="font-size:11px;">${vars[j]}${j < n-1 ? '+' : ''}</label>`;
          }
          html += `<label>=</label><input type="number" id="eq-b${i}" placeholder="b${i+1}" step="any" value="0" style="width:55px;">`;
          html += '</div>';
        }
        document.getElementById('eq-n-matrix').innerHTML = html;
      });
    }
  },

  /* ========== N 次多项式 ========== */
  buildNPolynomialInputs() {
    let html = `<div class="n-config">
      <label>最高次数:</label>
      <input type="number" id="eq-n" value="5" min="1" max="20" style="width:60px;padding:6px;text-align:center;">
      <button class="mode-btn" id="eq-n-apply" style="padding:6px 12px;width:auto;">应用</button>
    </div>`;
    html += '<div id="eq-n-matrix">';
    html += this.buildPolyInputs(5);
    html += '</div>';
    return html;
  },

  buildPolyInputs(n) {
    let html = '';
    html += '<div class="eq-input-group">';
    for (let i = n; i >= 0; i--) {
      const label = i === 0 ? '' : i === 1 ? 'x +' : `x<sup>${i}</sup> +`;
      html += `<input type="number" id="eq-p${i}" placeholder="a${i}" step="any" value="${i === n ? 1 : 0}" style="width:55px;">`;
      if (label) html += `<label style="font-size:11px;">${label}</label>`;
    }
    html += '<label>= 0</label>';
    html += '</div>';
    return html;
  },

  /* ========== N 元非线性方程组 ========== */
  buildNNonlinearInputs() {
    let html = `<div class="n-config">
      <label>变量数:</label>
      <input type="number" id="eq-n" value="2" min="2" max="10" style="width:60px;padding:6px;text-align:center;">
      <button class="mode-btn" id="eq-n-apply" style="padding:6px 12px;width:auto;">应用</button>
    </div>`;
    html += '<div class="n-config" style="margin-top:4px;">';
    html += '<label style="font-size:11px;color:var(--text-muted);">变量: x,y,z,a,b,c,... 输入表达式 &lt;expr&gt; = 0</label>';
    html += '</div>';
    html += '<div id="eq-n-matrix">';
    const n = 2;
    const vars = 'xyzabcdefghijklmnopqrstuvw';
    for (let i = 0; i < n; i++) {
      html += `<div class="eq-input-group" style="flex-direction:column;align-items:stretch;gap:4px;">
        <label style="font-size:12px;">方程 ${i+1}（使用 ${vars.slice(0, n).split('').join(',')}）:</label>
        <input type="text" id="eq-f${i}" placeholder="例: x^2 + y^2 - 1" style="text-align:left;font-size:14px;">
      </div>`;
    }
    html += '<div class="eq-input-group" style="gap:8px;">';
    for (let i = 0; i < n; i++) {
      html += `<label style="font-size:11px;">${vars[i]}₀=</label><input type="number" id="eq-g${i}" placeholder="初值" step="any" value="0" style="width:55px;">`;
    }
    html += '</div>';
    html += '</div>';
    return html;
  },

  /* ========== 求解分发 ========== */
  getVal(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  },

  getStr(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  },

  solve() {
    const type = document.getElementById('eq-type').value;
    let result = '';
    let steps = '';

    switch (type) {
      case 'linear': ({ result, steps } = this.solveLinear()); break;
      case 'quadratic': ({ result, steps } = this.solveQuadratic()); break;
      case 'cubic': ({ result, steps } = this.solveCubic()); break;
      case 'system2': ({ result, steps } = this.solveSystem2()); break;
      case 'system3': ({ result, steps } = this.solveSystem3()); break;
      case 'nlinear': ({ result, steps } = this.solveNLinear()); break;
      case 'npoly': ({ result, steps } = this.solveNPolynomial()); break;
      case 'nnonlinear': ({ result, steps } = this.solveNNonlinear()); break;
      case 'custom': ({ result, steps } = this.solveCustom()); break;
    }

    const resEl = document.getElementById('eq-result');
    const stepsEl = document.getElementById('eq-steps');
    resEl.innerHTML = result;
    resEl.classList.add('show');
    if (steps) {
      stepsEl.innerHTML = '<strong>求解步骤：</strong><br>' + steps;
      stepsEl.classList.add('show');
    } else {
      stepsEl.classList.remove('show');
    }
  },

  /* ========== 高斯消元法 (N 元线性方程组) ========== */
  gaussianElimination(A, b) {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      let maxVal = Math.abs(augmented[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > maxVal) {
          maxVal = Math.abs(augmented[row][col]);
          maxRow = row;
        }
      }
      // Swap rows
      if (maxRow !== col) {
        [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
      }

      if (Math.abs(augmented[col][col]) < 1e-12) continue;

      // Eliminate below
      for (let row = col + 1; row < n; row++) {
        const factor = augmented[row][col] / augmented[col][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }

    // Check rank
    let rank = 0;
    for (let i = 0; i < n; i++) {
      let allZero = true;
      for (let j = 0; j < n; j++) {
        if (Math.abs(augmented[i][j]) > 1e-10) { allZero = false; break; }
      }
      if (!allZero) rank++;
    }

    // Check for inconsistency
    for (let i = rank; i < n; i++) {
      if (Math.abs(augmented[i][n]) > 1e-10) {
        return { solutions: null, rank, singular: true, inconsistent: true };
      }
    }

    if (rank < n) {
      return { solutions: null, rank, singular: true, inconsistent: false };
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= augmented[i][j] * x[j];
      }
      x[i] = sum / augmented[i][i];
    }
    return { solutions: x, rank: n, singular: false };
  },

  solveNLinear() {
    const n = parseInt(document.getElementById('eq-n').value) || 3;
    const A = [];
    const b = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row.push(this.getVal(`eq-a${i}_${j}`));
      }
      A.push(row);
      b.push(this.getVal(`eq-b${i}`));
    }

    const { solutions, rank, singular, inconsistent } = this.gaussianElimination(A, b);
    const vars = 'xyzabcdefghijklmnopqrstuvw';

    if (inconsistent) {
      return { result: '方程组无解（矛盾方程）', steps: `系数矩阵秩 = ${rank}，增广矩阵秩 > ${rank}，方程组矛盾。` };
    }
    if (singular) {
      return { result: `方程组有无穷多解（系数矩阵秩 = ${rank} < ${n}）`, steps: `系数矩阵奇异，秩 = ${rank}，自由变量数 = ${n - rank}。` };
    }

    let result = solutions.map((v, i) => `${vars[i]} = ${this.fmt(v)}`).join('<br>');
    let steps = `使用 <b>高斯消元法（列主元）</b> 求解 ${n} 元线性方程组：<br>`;
    steps += `系数矩阵秩 = ${rank}，有唯一解。<br>`;
    A.forEach((row, i) => {
      steps += `方程${i+1}: ${row.map((a,j) => `${this.fmt(a)}${vars[j]}`).join(' + ')} = ${this.fmt(b[i])}<br>`;
    });

    return { result, steps };
  },

  /* ========== N 次多项式方程 ========== */
  solveNPolynomial() {
    const n = parseInt(document.getElementById('eq-n').value) || 5;
    const coeffs = [];
    for (let i = n; i >= 0; i--) {
      coeffs.push(this.getVal(`eq-p${i}`));
    }

    // Build polynomial function
    const f = (x) => {
      let r = 0;
      for (let i = 0; i <= n; i++) {
        r += coeffs[i] * Math.pow(x, n - i);
      }
      return r;
    };
    const fp = (x) => {
      let r = 0;
      for (let i = 0; i < n; i++) {
        r += coeffs[i] * (n - i) * Math.pow(x, n - i - 1);
      }
      return r;
    };

    const roots = this.findAllRoots(f, fp, -100, 100, 0.001);
    const uniqueRoots = this.deduplicateRoots(roots, 0.0001);

    if (uniqueRoots.length === 0) {
      return { result: '在 [-100, 100] 范围内未找到实数根。<br>请尝试扩大搜索范围或检查系数。', steps: '' };
    }

    let polyStr = coeffs.map((c, i) => {
      const deg = n - i;
      if (deg === 0) return `${this.fmt(c)}`;
      if (deg === 1) return `${this.fmt(c)}x`;
      return `${this.fmt(c)}x<sup>${deg}</sup>`;
    }).join(' + ');

    let result = uniqueRoots.map((r, i) => `x${uniqueRoots.length > 1 ? '₁₂₃₄₅₆₇₈₉'[i] || (i+1) : ''} = ${this.fmt(r)}`).join('<br>');
    let steps = `${n} 次多项式: ${polyStr} = 0<br>`;
    steps += `使用牛顿-拉弗森方法在 [-100, 100] 范围内找到 ${uniqueRoots.length} 个实根：<br>`;
    uniqueRoots.forEach((r, i) => {
      steps += `根 ${i+1}: x ≈ ${this.fmt(r)}，f(x) ≈ ${this.fmt(f(r))}<br>`;
    });

    return { result, steps };
  },

  /* ========== N 元非线性方程组 (牛顿法) ========== */
  solveNNonlinear() {
    const n = parseInt(document.getElementById('eq-n').value) || 2;
    const vars = 'xyzabcdefghijklmnopqrstuvw';
    const exprStrs = [];
    const guess = [];

    for (let i = 0; i < n; i++) {
      const s = this.getStr(`eq-f${i}`);
      if (!s) return { result: '请输入所有方程表达式', steps: '' };
      exprStrs.push(s);
      guess.push(this.getVal(`eq-g${i}`));
    }

    try {
      // Compile functions
      const funcs = exprStrs.map(s => this.compileMultiVar(s, n));
      const jacobian = this.buildJacobian(exprStrs, n);

      const solution = this.newtonMultiVar(funcs, jacobian, guess, 100, 1e-10);
      if (!solution) {
        return { result: '牛顿迭代未收敛。<br>请尝试不同的初始猜测值。', steps: '' };
      }

      let result = solution.map((v, i) => `${vars[i]} = ${this.fmt(v)}`).join('<br>');
      let steps = `使用 <b>多变量牛顿-拉弗森方法</b> 求解 ${n} 元非线性方程组：<br>`;
      exprStrs.forEach((s, i) => {
        steps += `方程${i+1}: ${s} = 0<br>`;
      });
      steps += `<br>初始猜测: ${guess.map((g,i) => vars[i]+'₀='+this.fmt(g)).join(', ')}<br>`;
      steps += `<br><b>收敛解：</b><br>`;
      solution.forEach((v, i) => {
        steps += `${vars[i]} = ${this.fmt(v)}<br>`;
      });
      steps += `<br>验证：<br>`;
      funcs.forEach((f, i) => {
        const fv = f(solution);
        steps += `f${i+1}(${solution.map(v=>this.fmt(v)).join(',')}) = ${this.fmt(fv)}<br>`;
      });

      return { result, steps };
    } catch (e) {
      return { result: '表达式解析错误', steps: '请检查表达式格式。支持: + - * / ^ ( ) sin cos tan log ln sqrt abs exp<br>变量名: x,y,z,a,b,c,...' };
    }
  },

  compileMultiVar(expr, n) {
    const vars = 'xyzabcdefghijklmnopqrstuvw';
    let e = expr.replace(/\^/g, '**');
    e = e.replace(/sin/g, 'Math.sin');
    e = e.replace(/cos/g, 'Math.cos');
    e = e.replace(/tan/g, 'Math.tan');
    e = e.replace(/log/g, 'Math.log10');
    e = e.replace(/ln/g, 'Math.log');
    e = e.replace(/sqrt/g, 'Math.sqrt');
    e = e.replace(/abs/g, 'Math.abs');
    e = e.replace(/exp/g, 'Math.exp');
    const argNames = vars.slice(0, n).split('');
    return new Function(argNames, `"use strict"; return (${e})`);
  },

  buildJacobian(exprs, n) {
    const h = 1e-7;
    const vars = 'xyzabcdefghijklmnopqrstuvw';
    const funcs = exprs.map(e => this.compileMultiVar(e, n));

    return (x) => {
      const J = [];
      for (let i = 0; i < n; i++) {
        J[i] = [];
        for (let j = 0; j < n; j++) {
          const xPlus = [...x];
          xPlus[j] += h;
          const xMinus = [...x];
          xMinus[j] -= h;
          J[i][j] = (funcs[i](...xPlus) - funcs[i](...xMinus)) / (2 * h);
        }
      }
      return J;
    };
  },

  newtonMultiVar(funcs, jacobian, x0, maxIter, tol) {
    const n = x0.length;
    let x = [...x0];

    for (let iter = 0; iter < maxIter; iter++) {
      const F = funcs.map(f => f(...x));
      let maxErr = 0;
      for (let i = 0; i < n; i++) {
        maxErr = Math.max(maxErr, Math.abs(F[i]));
      }
      if (maxErr < tol) return x;

      const J = jacobian(x);
      const { solutions, singular } = this.gaussianElimination(
        J.map(row => [...row]),
        F.map(v => -v)
      );

      if (singular || !solutions) break;

      for (let i = 0; i < n; i++) {
        x[i] += solutions[i];
      }
    }
    return null; // not converged
  },

  /* ========== 原始求解器 ========== */
  solveLinear() {
    const a = this.getVal('eq-a');
    const b = this.getVal('eq-b');
    if (a === 0) return { result: b === 0 ? '无穷多解（恒等式）' : '无解（矛盾方程）', steps: '' };
    const x = -b / a;
    return {
      result: `x = ${this.fmt(x)}`,
      steps: `${a}x + ${b} = 0<br>→ ${a}x = ${-b}<br>→ x = ${this.fmt(x)}`
    };
  },

  solveQuadratic() {
    const a = this.getVal('eq-a');
    const b = this.getVal('eq-b');
    const c = this.getVal('eq-c');
    if (a === 0) {
      const x = -c / b;
      return { result: `退化为一次方程: x = ${this.fmt(x)}`, steps: '' };
    }
    const delta = b * b - 4 * a * c;
    let steps = `${a}x² + ${b}x + ${c} = 0<br>判别式 Δ = b² − 4ac = ${this.fmt(delta)}<br>`;
    if (delta > 0) {
      const x1 = (-b + Math.sqrt(delta)) / (2 * a);
      const x2 = (-b - Math.sqrt(delta)) / (2 * a);
      return {
        result: `x₁ = ${this.fmt(x1)}<br>x₂ = ${this.fmt(x2)}`,
        steps: steps + `Δ > 0，有两个不相等的实根<br>x₁ = (−b + √Δ) / 2a = ${this.fmt(x1)}<br>x₂ = (−b − √Δ) / 2a = ${this.fmt(x2)}`
      };
    } else if (delta === 0) {
      const x = -b / (2 * a);
      return {
        result: `x = ${this.fmt(x)}（重根）`,
        steps: steps + `Δ = 0，有一个重根<br>x = −b / 2a = ${this.fmt(x)}`
      };
    } else {
      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-delta) / (2 * a);
      return {
        result: `x₁ = ${this.fmt(realPart)} + ${this.fmt(imagPart)}i<br>x₂ = ${this.fmt(realPart)} − ${this.fmt(imagPart)}i`,
        steps: steps + `Δ < 0，有两个共轭复根<br>x = (−b ± i√|Δ|) / 2a<br>= ${this.fmt(realPart)} ± ${this.fmt(imagPart)}i`
      };
    }
  },

  solveCubic() {
    const a = this.getVal('eq-a');
    const b = this.getVal('eq-b');
    const c = this.getVal('eq-c');
    const d = this.getVal('eq-d');
    if (a === 0) {
      const oldA = document.getElementById('eq-a');
      const oldB = document.getElementById('eq-b');
      const oldC = document.getElementById('eq-c');
      if (oldA) oldA.value = b;
      if (oldB) oldB.value = c;
      if (oldC) oldC.value = d;
      document.getElementById('eq-type').value = 'quadratic';
      this.updateInputs();
      return this.solveQuadratic();
    }
    const f = (x) => a * x * x * x + b * x * x + c * x + d;
    const fp = (x) => 3 * a * x * x + 2 * b * x + c;
    const roots = this.findAllRoots(f, fp, -100, 100, 0.001);
    const uniqueRoots = this.deduplicateRoots(roots, 0.0001);

    if (uniqueRoots.length === 0) {
      return { result: '未找到实数根', steps: '三次方程至少有一个实根，请检查系数是否正确。' };
    }
    let result = uniqueRoots.map((r, i) => `x${uniqueRoots.length > 1 ? '₂₃'[i] : ''} = ${this.fmt(r)}`).join('<br>');
    let steps = '使用牛顿-拉弗森方法迭代求解:<br>';
    uniqueRoots.forEach((r, i) => { steps += `根 ${i + 1} ≈ ${this.fmt(r)}<br>`; });
    return { result, steps };
  },

  solveSystem2() {
    const a1 = this.getVal('eq-a1'), b1 = this.getVal('eq-b1'), c1 = this.getVal('eq-c1');
    const a2 = this.getVal('eq-a2'), b2 = this.getVal('eq-b2'), c2 = this.getVal('eq-c2');
    const det = a1 * b2 - a2 * b1;
    if (det === 0) {
      return { result: '方程组无唯一解（系数矩阵奇异）', steps: '行列式 det = 0，方程组可能无解或有无穷多解。' };
    }
    const x = (c1 * b2 - c2 * b1) / det;
    const y = (a1 * c2 - a2 * c1) / det;
    return {
      result: `x = ${this.fmt(x)}<br>y = ${this.fmt(y)}`,
      steps: `使用克莱姆法则:<br>det = a₁b₂ − a₂b₁ = ${this.fmt(det)}<br>x = (c₁b₂ − c₂b₁) / det = ${this.fmt(x)}<br>y = (a₁c₂ − a₂c₁) / det = ${this.fmt(y)}`
    };
  },

  solveSystem3() {
    const a1 = this.getVal('eq-a1'), b1 = this.getVal('eq-b1'), c1 = this.getVal('eq-c1'), d1 = this.getVal('eq-d1');
    const a2 = this.getVal('eq-a2'), b2 = this.getVal('eq-b2'), c2 = this.getVal('eq-c2'), d2 = this.getVal('eq-d2');
    const a3 = this.getVal('eq-a3'), b3 = this.getVal('eq-b3'), c3 = this.getVal('eq-c3'), d3 = this.getVal('eq-d3');
    const det = a1*(b2*c3 - b3*c2) - b1*(a2*c3 - a3*c2) + c1*(a2*b3 - a3*b2);
    if (Math.abs(det) < 1e-10) {
      return { result: '方程组无唯一解（系数矩阵奇异）', steps: '行列式 det = 0，方程组可能无解或有无穷多解。' };
    }
    const x = (d1*(b2*c3 - b3*c2) - b1*(d2*c3 - d3*c2) + c1*(d2*b3 - d3*b2)) / det;
    const y = (a1*(d2*c3 - d3*c2) - d1*(a2*c3 - a3*c2) + c1*(a2*d3 - a3*d2)) / det;
    const z = (a1*(b2*d3 - b3*d2) - b1*(a2*d3 - a3*d2) + d1*(a2*b3 - a3*b2)) / det;
    return {
      result: `x = ${this.fmt(x)}<br>y = ${this.fmt(y)}<br>z = ${this.fmt(z)}`,
      steps: `使用克莱姆法则:<br>det = ${this.fmt(det)}<br>x = ${this.fmt(x)}<br>y = ${this.fmt(y)}<br>z = ${this.fmt(z)}`
    };
  },

  solveCustom() {
    const expr = this.getStr('eq-custom');
    const guess = this.getVal('eq-guess');
    if (!expr) return { result: '请输入方程表达式', steps: '' };
    try {
      const f = this.compileFunction(expr);
      const fp = this.numericalDerivative(f);
      const roots = this.findAllRoots(f, fp, -100, 100, 0.001);
      const uniqueRoots = this.deduplicateRoots(roots, 0.0001);
      if (uniqueRoots.length === 0) {
        const root = this.newtonRaphson(f, fp, guess, 100);
        if (isNaN(root)) {
          return { result: '在 [-100, 100] 范围内未找到实数根。<br>请尝试不同的初始猜测值。', steps: '' };
        }
        uniqueRoots.push(root);
      }
      let result = uniqueRoots.map((r, i) => `x${uniqueRoots.length > 1 ? '₂₃₄₅'[i] : ''} = ${this.fmt(r)}`).join('<br>');
      let steps = '使用牛顿-拉弗森方法求解 f(x) = 0:<br>';
      steps += `f(x) = ${expr}<br>`;
      uniqueRoots.forEach((r, i) => {
        steps += `根 ${i + 1}: x ≈ ${this.fmt(r)}，验证: f(${this.fmt(r)}) ≈ ${this.fmt(f(r))}<br>`;
      });
      return { result, steps };
    } catch (e) {
      return { result: '表达式解析错误', steps: '请检查表达式格式。支持: + - * / ^ ( ) sin cos tan log ln sqrt abs exp<br>例: x^3 - 2*x + 1' };
    }
  },

  compileFunction(expr) {
    let e = expr.replace(/\^/g, '**');
    e = e.replace(/sin/g, 'Math.sin');
    e = e.replace(/cos/g, 'Math.cos');
    e = e.replace(/tan/g, 'Math.tan');
    e = e.replace(/log/g, 'Math.log10');
    e = e.replace(/ln/g, 'Math.log');
    e = e.replace(/sqrt/g, 'Math.sqrt');
    e = e.replace(/abs/g, 'Math.abs');
    e = e.replace(/exp/g, 'Math.exp');
    return new Function('x', `"use strict"; return (${e})`);
  },

  numericalDerivative(f, h = 1e-7) {
    return (x) => (f(x + h) - f(x - h)) / (2 * h);
  },

  newtonRaphson(f, fp, x0, maxIter = 100, tol = 1e-10) {
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      if (Math.abs(fx) < tol) return x;
      const fpx = fp(x);
      if (Math.abs(fpx) < 1e-15) break;
      const dx = fx / fpx;
      x = x - dx;
      if (Math.abs(dx) < tol) return x;
    }
    return NaN;
  },

  findAllRoots(f, fp, xMin, xMax, step) {
    const roots = [];
    let prevF = f(xMin);
    for (let x = xMin + step; x <= xMax; x += step) {
      const currF = f(x);
      if (prevF * currF <= 0 && isFinite(currF) && isFinite(prevF)) {
        const root = this.newtonRaphson(f, fp, (x + x - step) / 2, 50);
        if (!isNaN(root) && root >= xMin && root <= xMax) {
          roots.push(root);
        }
      }
      prevF = currF;
    }
    return roots;
  },

  deduplicateRoots(roots, tol) {
    return roots.filter((r, i) => {
      for (let j = 0; j < i; j++) {
        if (Math.abs(r - roots[j]) < tol) return false;
      }
      return true;
    });
  },

  fmt(num) {
    const precision = Settings.get('precision') || 6;
    if (Math.abs(num) < 1e-12) return '0';
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    return parseFloat(num.toPrecision(precision + 2)).toString();
  }
};