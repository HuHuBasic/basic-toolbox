/* === 竖式计算模块 === */
const VerticalCalc = {
  init() {
    document.getElementById('vc-calc-btn').addEventListener('click', () => this.calculate());
    // Also calculate on Enter key
    document.getElementById('vc-num1').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.calculate();
    });
    document.getElementById('vc-num2').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.calculate();
    });
  },

  calculate() {
    const num1Str = document.getElementById('vc-num1').value.trim();
    const num2Str = document.getElementById('vc-num2').value.trim();
    const operator = document.getElementById('vc-operator').value;

    if (!num1Str || !num2Str) {
      this.showResult('请输入两个数字', '');
      return;
    }

    const num1 = num1Str;
    const num2 = num2Str;

    switch (operator) {
      case '+': this.showAddition(num1, num2); break;
      case '-': this.showSubtraction(num1, num2); break;
      case '×': this.showMultiplication(num1, num2); break;
      case '÷': this.showDivision(num1, num2); break;
    }
  },

  showAddition(a, b) {
    const x = this.parseDecimal(a);
    const y = this.parseDecimal(b);
    const result = x + y;
    const resultStr = this.stripTrailingZeros(result.toString());

    const maxDec = Math.max(this.decimalPlaces(a), this.decimalPlaces(b));
    const aAligned = this.alignDecimal(a, maxDec);
    const bAligned = this.alignDecimal(b, maxDec);
    const rAligned = this.alignDecimal(resultStr, maxDec);

    const maxLen = Math.max(aAligned.length, bAligned.length, rAligned.length);

    let display = '';
    display += this.padLeft(aAligned, maxLen) + '\n';
    display += '+ ' + this.padLeft(bAligned, maxLen - 2) + '\n';
    display += '─'.repeat(maxLen) + '\n';
    display += this.padLeft(rAligned, maxLen);

    this.showResult(`${this.stripTrailingZeros(a)} + ${this.stripTrailingZeros(b)} = ${resultStr}`, display);
  },

  showSubtraction(a, b) {
    const x = this.parseDecimal(a);
    const y = this.parseDecimal(b);
    const result = x - y;
    const resultStr = this.stripTrailingZeros(result.toString());

    const maxDec = Math.max(this.decimalPlaces(a), this.decimalPlaces(b));
    const aAligned = this.alignDecimal(a, maxDec);
    const bAligned = this.alignDecimal(b, maxDec);
    const rAligned = this.alignDecimal(resultStr, maxDec);

    const maxLen = Math.max(aAligned.length, bAligned.length + 2, rAligned.length);

    let display = '';
    display += this.padLeft(aAligned, maxLen) + '\n';
    display += '− ' + this.padLeft(bAligned, maxLen - 2) + '\n';
    display += '─'.repeat(maxLen) + '\n';
    display += this.padLeft(rAligned, maxLen);

    this.showResult(`${this.stripTrailingZeros(a)} − ${this.stripTrailingZeros(b)} = ${resultStr}`, display);
  },

  showMultiplication(a, b) {
    const x = this.parseDecimal(a);
    const y = this.parseDecimal(b);
    const result = x * y;
    const resultStr = this.stripTrailingZeros(result.toString());

    // For integer multiplication, show traditional vertical method
    if (this.isInteger(a) && this.isInteger(b) && b.length <= 10) {
      this.showIntegerMultiplication(a, b, resultStr);
      return;
    }

    const aStr = this.stripTrailingZeros(a);
    const bStr = this.stripTrailingZeros(b);
    const rStr = resultStr;

    const maxLen = Math.max(aStr.length, bStr.length + 2, rStr.length);

    let display = '';
    display += this.padLeft(aStr, maxLen) + '\n';
    display += '× ' + this.padLeft(bStr, maxLen - 2) + '\n';
    display += '─'.repeat(maxLen) + '\n';
    display += this.padLeft(rStr, maxLen);

    this.showResult(`${aStr} × ${bStr} = ${rStr}`, display);
  },

  showIntegerMultiplication(a, b, resultStr) {
    if (a === '0' || b === '0') {
      this.showResult(`${a} × ${b} = 0`, `${a}\n× ${b}\n──\n0`);
      return;
    }

    const aStr = a;
    const bStr = b;
    const bDigits = bStr.split('').reverse();

    // Calculate partial products
    const partials = [];
    const bigA = BigInt(aStr);
    for (let i = 0; i < bDigits.length; i++) {
      if (bDigits[i] === '0') continue;
      const partial = bigA * BigInt(bDigits[i]) * BigInt(10) ** BigInt(i);
      partials.push({ digit: bDigits[i], shift: i, value: partial.toString() });
    }

    const maxLen = Math.max(aStr.length, bStr.length + 2, resultStr.length);
    let display = '';

    display += this.padLeft(aStr, maxLen) + '\n';
    display += '× ' + this.padLeft(bStr, maxLen - 2) + '\n';
    display += '─'.repeat(maxLen) + '\n';

    if (partials.length === 1 && partials[0].shift === 0) {
      display += this.padLeft(partials[0].value, maxLen) + '\n';
    } else {
      // Show each partial product
      for (const p of partials) {
        const shifted = p.value;
        display += this.padLeft(shifted, maxLen) + '\n';
      }
      display += '─'.repeat(maxLen) + '\n';
    }
    display += this.padLeft(resultStr, maxLen);

    this.showResult(`${aStr} × ${bStr} = ${resultStr}`, display);
  },

  showDivision(a, b) {
    const x = this.parseDecimal(a);
    const y = this.parseDecimal(b);

    if (y === 0) {
      this.showResult('错误：除数不能为零', '');
      return;
    }

    const result = x / y;
    const resultStr = this.stripTrailingZeros(result.toString());

    if (this.isInteger(a) && this.isInteger(b) && BigInt(b) !== BigInt(0)) {
      this.showIntegerDivision(a, b, resultStr);
      return;
    }

    const aStr = this.stripTrailingZeros(a);
    const bStr = this.stripTrailingZeros(b);
    const rStr = resultStr;

    const maxLen = Math.max(aStr.length + 2, bStr.length + 3, rStr.length);

    let display = '';
    display += this.padLeft(rStr, maxLen) + '\n';
    display += '─'.repeat(maxLen) + '\n';
    display += bStr + ' ) ' + aStr;

    this.showResult(`${aStr} ÷ ${bStr} = ${rStr}`, display);
  },

  showIntegerDivision(dividend, divisor, resultStr) {
    const bigDiv = BigInt(dividend);
    const bigDivisor = BigInt(divisor);
    const quotient = bigDiv / bigDivisor;
    const remainder = bigDiv % bigDivisor;
    const qStr = quotient.toString();

    const maxLen = Math.max(dividend.length + 2, divisor.length + 3, qStr.length);

    let display = '';
    display += this.padLeft(qStr, maxLen) + '\n';
    display += '─'.repeat(maxLen) + '\n';
    display += divisor + ' ) ' + dividend;

    if (remainder !== BigInt(0)) {
      display += '\n\n余数: ' + remainder.toString();
    }

    const resultText = remainder !== BigInt(0)
      ? `${dividend} ÷ ${divisor} = ${quotient} 余 ${remainder}`
      : `${dividend} ÷ ${divisor} = ${quotient}`;

    this.showResult(resultText, display);
  },

  showResult(text, display) {
    document.getElementById('vc-result').innerHTML = text;
    document.getElementById('vc-result').classList.add('show');

    const displayEl = document.getElementById('vc-display');
    if (display) {
      displayEl.textContent = display;
      displayEl.classList.add('show');
    } else {
      displayEl.classList.remove('show');
    }
  },

  parseDecimal(s) {
    return parseFloat(s.replace(/,/g, ''));
  },

  decimalPlaces(s) {
    const parts = s.split('.');
    return parts.length > 1 ? parts[1].length : 0;
  },

  alignDecimal(s, maxDec) {
    const parts = s.split('.');
    if (parts.length === 1) {
      return maxDec > 0 ? s + '.' + '0'.repeat(maxDec) : s;
    }
    const dec = parts[1].length;
    if (dec < maxDec) {
      return s + '0'.repeat(maxDec - dec);
    }
    return s;
  },

  isInteger(s) {
    return /^-?\d+$/.test(s.replace(/,/g, ''));
  },

  stripTrailingZeros(s) {
    if (s.includes('.')) {
      s = s.replace(/\.?0+$/, '');
    }
    return s || '0';
  },

  padLeft(s, len) {
    return ' '.repeat(Math.max(0, len - s.length)) + s;
  }
};