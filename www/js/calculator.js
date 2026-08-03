/* === 科学计算器模块 === */
const Calculator = {
  expression: '',
  result: '0',
  lastWasResult: false,
  mode: 'basic',

  init() {
    this.renderKeypad();
    this.bindEvents();
  },

  renderKeypad() {
    const keypad = document.getElementById('calc-keypad');
    const basicKeys = [
      ['C', '⌫', '%', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '−'],
      ['1', '2', '3', '+'],
      ['±', '0', '.', '=']
    ];
    const sciKeys = [
      ['sin', 'cos', 'tan', 'log'],
      ['π', 'e', '(', ')'],
      ['x²', 'x³', 'xⁿ', '√'],
      ['ln', 'n!', '1/x', '|x|'],
      ['10ˣ', 'eˣ', 'RAD', 'DEG']
    ];

    const allKeys = this.mode === 'scientific' ? [...sciKeys, ...basicKeys] : basicKeys;

    let html = '';
    allKeys.forEach(row => {
      row.forEach(key => {
        let cls = 'calc-btn';
        if (key === '=') cls += ' equal';
        else if (['C', 'AC'].includes(key)) cls += ' clear';
        else if (key === '⌫') cls += ' back';
        else if (['÷', '×', '−', '+'].includes(key)) cls += ' op';
        else if (['sin', 'cos', 'tan', 'log', 'ln', 'n!', '1/x', '|x|', 'x²', 'x³', 'xⁿ', '√', '10ˣ', 'eˣ', 'RAD', 'DEG'].includes(key)) cls += ' func';
        else if (!isNaN(key) || key === '.' || key === '±') cls += ' num';
        if (['sin', 'cos', 'tan', 'log', 'π', 'e', '(', ')', 'x²', 'x³', 'xⁿ', '√', 'ln', 'n!', '1/x', '|x|', '10ˣ', 'eˣ', 'RAD', 'DEG'].includes(key)) cls += ' sci-btn';
        html += `<button class="${cls}" data-key="${key}">${key}</button>`;
      });
    });
    keypad.innerHTML = html;
    keypad.className = 'keypad';
  },

  bindEvents() {
    document.getElementById('calc-keypad').addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-btn');
      if (!btn) return;
      this.handleKey(btn.dataset.key);
      if (Settings.get('vibration') !== false) {
        navigator.vibrate?.(10);
      }
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
        this.renderKeypad();
      });
    });
  },

  handleKey(key) {
    switch (key) {
      case 'C': case 'AC': this.clear(); break;
      case '⌫': this.backspace(); break;
      case '=': this.calculate(); break;
      case '±': this.negate(); break;
      case 'π': this.insertValue('π'); break;
      case 'e': this.insertValue('e'); break;
      case 'sin': this.insertFunc('sin('); break;
      case 'cos': this.insertFunc('cos('); break;
      case 'tan': this.insertFunc('tan('); break;
      case 'log': this.insertFunc('log10('); break;
      case 'ln': this.insertFunc('ln('); break;
      case '√': this.insertFunc('sqrt('); break;
      case 'x²': this.insertFunc('sqr('); break;
      case 'x³': this.insertFunc('cube('); break;
      case 'xⁿ': this.insertValue('^'); break;
      case 'n!': this.insertFunc('fact('); break;
      case '1/x': this.insertFunc('inv('); break;
      case '|x|': this.insertFunc('abs('); break;
      case '10ˣ': this.insertFunc('pow10('); break;
      case 'eˣ': this.insertFunc('exp('); break;
      case 'RAD': this.setAngle('rad'); break;
      case 'DEG': this.setAngle('deg'); break;
      default: this.insertValue(key);
    }
    this.updateDisplay();
  },

  clear() {
    this.expression = '';
    this.result = '0';
    this.lastWasResult = false;
  },

  backspace() {
    if (this.lastWasResult) {
      this.expression = this.result;
      this.lastWasResult = false;
    }
    // Handle multi-char functions
    const funcs = ['sin(', 'cos(', 'tan(', 'log10(', 'ln(', 'sqrt(', 'sqr(', 'cube(', 'fact(', 'inv(', 'abs(', 'pow10(', 'exp('];
    for (const f of funcs) {
      if (this.expression.endsWith(f)) {
        this.expression = this.expression.slice(0, -f.length);
        return;
      }
    }
    this.expression = this.expression.slice(0, -1);
  },

  negate() {
    if (this.expression === '' || this.lastWasResult) {
      if (this.lastWasResult) {
        this.expression = String(-parseFloat(this.result));
        this.lastWasResult = false;
      } else {
        this.expression = '-';
      }
    } else {
      // Toggle negation at the end
      this.expression = this.expression + '*(-1)';
    }
  },

  insertValue(val) {
    if (this.lastWasResult) {
      if (/[+\-×÷^]/.test(val) || val === '%') {
        this.expression = this.result;
      } else {
        this.expression = '';
      }
      this.lastWasResult = false;
    }
    this.expression += val;
  },

  insertFunc(func) {
    if (this.lastWasResult) {
      this.expression = func;
      this.lastWasResult = false;
    } else {
      this.expression += func;
    }
  },

  setAngle(mode) {
    // Toggle angle mode - stored for sin/cos/tan evaluation
    this._angleMode = mode;
    const display = document.getElementById('calc-result');
    display.textContent = mode === 'rad' ? 'RAD' : 'DEG';
    setTimeout(() => this.updateDisplay(), 800);
  },

  updateDisplay() {
    const exprEl = document.getElementById('calc-expr');
    const resEl = document.getElementById('calc-result');
    exprEl.textContent = this.formatExpression(this.expression);
    resEl.textContent = this.result;
  },

  formatExpression(expr) {
    return expr
      .replace(/×/g, '×')
      .replace(/÷/g, '÷')
      .replace(/−/g, '−')
      .replace(/π/g, 'π')
      .replace(/sin\(/g, 'sin(')
      .replace(/cos\(/g, 'cos(')
      .replace(/tan\(/g, 'tan(')
      .replace(/log10\(/g, 'log(')
      .replace(/ln\(/g, 'ln(')
      .replace(/sqrt\(/g, '√(')
      .replace(/sqr\(/g, 'sqr(')
      .replace(/cube\(/g, 'cube(')
      .replace(/fact\(/g, 'fact(')
      .replace(/inv\(/g, '1/(')
      .replace(/abs\(/g, '|')
      .replace(/pow10\(/g, '10^(')
      .replace(/exp\(/g, 'e^(');
  },

  calculate() {
    try {
      let expr = this.expression;
      if (!expr) {
        this.result = '0';
        return;
      }
      const result = this.evaluate(expr);
      this.result = this.formatNumber(result);
      this.lastWasResult = true;
    } catch (e) {
      this.result = '错误';
      this.lastWasResult = true;
    }
  },

  evaluate(expr) {
    // Replace operators and constants
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, `(${Math.PI})`).replace(/(?<![a-zA-Z])e(?![a-zA-Z+\-^])/g, `(${Math.E})`);

    // Handle functions
    expr = expr.replace(/sin\(/g, 'Math.sin(');
    expr = expr.replace(/cos\(/g, 'Math.cos(');
    expr = expr.replace(/tan\(/g, 'Math.tan(');
    expr = expr.replace(/log10\(/g, 'Math.log10(');
    expr = expr.replace(/ln\(/g, 'Math.log(');
    expr = expr.replace(/sqrt\(/g, 'Math.sqrt(');
    expr = expr.replace(/sqr\(/g, '(x=>x*x)(');
    expr = expr.replace(/cube\(/g, '(x=>x*x*x)(');
    expr = expr.replace(/fact\(/g, 'this.factorial(');
    expr = expr.replace(/inv\(/g, '(1/(');
    expr = expr.replace(/abs\(/g, 'Math.abs(');
    expr = expr.replace(/pow10\(/g, 'Math.pow(10,');
    expr = expr.replace(/exp\(/g, 'Math.exp(');

    // Handle ^ operator
    expr = expr.replace(/\^/g, '**');

    // Handle percentage
    expr = expr.replace(/(\d+\.?\d*)%/g, '($1/100)');

    // Handle implicit multiplication like 2(3) or 2sin(3)
    expr = expr.replace(/(\d)(\()/g, '$1*$2');
    expr = expr.replace(/(\))(\d)/g, '$1*$2');
    expr = expr.replace(/\)\(/g, ')*(');

    // Angle conversion for trig functions
    if (this._angleMode === 'deg') {
      expr = expr.replace(/Math\.sin\(/g, 'Math.sin(Math.PI/180*(');
      expr = expr.replace(/Math\.cos\(/g, 'Math.cos(Math.PI/180*(');
      expr = expr.replace(/Math\.tan\(/g, 'Math.tan(Math.PI/180*(');
      // Close extra parens
      const extraParens = (expr.match(/Math\.PI\/180\*\(/g) || []).length;
      for (let i = 0; i < extraParens; i++) {
        expr += ')';
      }
    }

    // Make factorial work
    const factFunc = this.factorial.bind(this);
    const result = Function('factorial', `"use strict"; return (${expr})`)(factFunc);
    return result;
  },

  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },

  formatNumber(num) {
    if (isNaN(num) || !isFinite(num)) return '错误';
    const precision = Settings.get('precision') || 6;
    // For very large or very small numbers, use scientific notation
    if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-10 && num !== 0)) {
      return num.toExponential(precision);
    }
    // Round to precision
    const rounded = parseFloat(num.toPrecision(precision + 2));
    // Remove trailing zeros
    if (Number.isInteger(rounded)) return String(rounded);
    return parseFloat(rounded.toFixed(precision)).toString();
  }
};