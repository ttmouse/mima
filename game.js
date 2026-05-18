class MastermindGame {
    constructor() {
        // 7色定义 - 按用户指定顺序
        this.colors = ['red', 'green', 'orange', 'blue', 'yellow', 'purple', 'cyan'];
        this.colorRGB = {
            'red': { r: 231, g: 76, b: 60 },
            'green': { r: 46, g: 204, b: 113 },
            'orange': { r: 230, g: 126, b: 34 },
            'blue': { r: 52, g: 152, b: 219 },
            'yellow': { r: 241, g: 196, b: 15 },
            'purple': { r: 155, g: 89, b: 182 },
            'cyan': { r: 0, g: 188, b: 212 }
        };
        this.colorThreshold = 5;

        // 难度等级定义 - codeLength固定为4，colors决定可用颜色数量
        this.DIFFICULTY = {
            EASY: { name: '简单', codeLength: 4, colors: 4 },
            NORMAL: { name: '普通', codeLength: 4, colors: 5 },
            HARD: { name: '困难', codeLength: 4, colors: 6 },
            EXTREME: { name: '极难', codeLength: 4, colors: 7 }
        };

        // 从 localStorage 读取已解锁的难度
        this.unlockedDifficulty = parseInt(localStorage.getItem('unlockedDifficulty')) || 1;
        this.currentDifficulty = this.DIFFICULTY.EASY;
        this.codeLength = this.currentDifficulty.codeLength;
        this.maxGuesses = 7;
        this.secretCode = [];
        this.currentGuess = [null, null, null, null];
        this.guessHistory = [];
        this.remainingGuesses = this.maxGuesses;
        this.currentRow = 0;
        this.selectedSlot = null;
        this.selectedColor = null;
        this.gameOver = false;
        this.displayMode = 'grid';
        this.showNumbers = true;
        this.level = 1;
        this.startTime = null;
        this.attempts = 0;

        this.init();
    }

    init() {
        this.bindEvents();
        this.startNewGame();
        this.updateLCDDisplay();
    }

    bindEvents() {
        document.getElementById('submit-btn').addEventListener('click', () => this.submitGuess());
        document.getElementById('lcd-screen').addEventListener('click', () => this.cycleDifficulty());
        document.getElementById('modal-btn').addEventListener('click', () => {
            this.hideModal();
            this.startNewGame();
        });

        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                if (this.selectedSlot !== null && !this.gameOver) {
                    this.placeColor(color);
                    soundManager.selectColor();
                    this.confirmSlot();
                }
            });
        });

        document.querySelector('.mode-hotspot-left').addEventListener('click', () => {
            this.changeDisplayMode('grid');
            soundManager.modeSwitch();
        });

        document.querySelector('.mode-hotspot-right').addEventListener('click', () => {
            this.changeDisplayMode('side');
            soundManager.modeSwitch();
        });

        document.getElementById('game-board').addEventListener('click', (e) => {
            const slot = e.target.closest('.guess-slot.editable');
            if (slot) {
                this.handleSlotClick(slot);
            }
        });

        document.addEventListener('wheel', (e) => {
            if (this.selectedSlot !== null && !this.gameOver) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.cycleColor(1);
                } else {
                    this.cycleColor(-1);
                }
            }
        });

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.selectedSlot !== null && !this.gameOver) {
                if (this.currentGuess[this.selectedSlot] !== null) {
                    this.confirmSlot();
                }
            }
        });

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    confirmSlot() {
        if (this.selectedSlot === null || this.gameOver) return;
        if (this.currentGuess[this.selectedSlot] === null) return;

        soundManager.click();
        
        const confirmedColor = this.currentGuess[this.selectedSlot];
        
        for (let i = 0; i < this.codeLength; i++) {
            if (i !== this.selectedSlot && this.currentGuess[i] === confirmedColor) {
                this.currentGuess[i] = null;
                this.updateSingleSlot(i, null);
            }
        }
        
        this.moveToNextSlot();
    }

    moveToNextSlot() {
        // 先向右查找待确认的格子（currentGuess 为 null）
        for (let i = 1; i < this.codeLength; i++) {
            const nextIndex = (this.selectedSlot + i) % this.codeLength;
            if (this.currentGuess[nextIndex] === null) {
                this.selectedSlot = nextIndex;
                this.updateActiveIndicator();
                return;
            }
        }

        // 没有待确认格子，查找已确认的格子
        for (let i = 1; i < this.codeLength; i++) {
            const nextIndex = (this.selectedSlot + i) % this.codeLength;
            if (this.currentGuess[nextIndex] !== null) {
                this.selectedSlot = nextIndex;
                this.updateActiveIndicator();
                return;
            }
        }

        // 没有其他格子了，保持在当前位置
        this.updateActiveIndicator();
    }

    updateActiveIndicator() {
        const currentRowEl = document.querySelector('.guess-row.current-row');
        if (!currentRowEl) return;

        const slots = currentRowEl.querySelectorAll('.guess-slot');
        slots.forEach((slot, index) => {
            const light = currentRowEl.querySelector(`.status-light[data-index="${index}"]`);
            if (index === this.selectedSlot) {
                light.classList.add('active');
            } else {
                light.classList.remove('active');
            }
        });
    }

    cycleColor(direction) {
        const currentColor = this.currentGuess[this.selectedSlot];
        const availableColors = this.colors.slice(0, this.currentDifficulty.colors);
        let currentIndex = availableColors.indexOf(currentColor);

        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            currentIndex = (currentIndex + direction + availableColors.length) % availableColors.length;
        }

        const newColor = availableColors[currentIndex];
        this.placeColor(newColor);
        soundManager.selectColor();
    }

    startNewGame(difficulty) {
        // 设置难度
        if (difficulty) {
            this.currentDifficulty = difficulty;
            this.codeLength = difficulty.codeLength;
        }

        this.secretCode = this.generateSecretCode();
        this.currentGuess = new Array(this.codeLength).fill(null);
        this.guessHistory = [];
        this.remainingGuesses = this.maxGuesses;
        this.currentRow = 0;
        this.selectedSlot = 0;
        this.selectedColor = null;
        this.gameOver = false;
        this.level = this.currentDifficulty.colors; // LCD显示难度（颜色数量）
        this.startTime = Date.now();
        this.attempts = 0;

        this.resetBoard();
        this.updateUI();
        this.updateLCDDisplay();
        this.clearSideFeedback();
        this.updateActiveIndicator();
        this.updateColorSelector();
        soundManager.gameStart();
        this.updateAllSlotsDisplay();
    }

    generateSecretCode() {
        // 只用当前难度对应的颜色来生成密码
        const availableColors = this.colors.slice(0, this.currentDifficulty.colors);
        const shuffled = [...availableColors].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, this.codeLength);
    }

    resetBoard() {
        document.querySelectorAll('.guess-row').forEach((row, index) => {
            const slots = row.querySelectorAll('.guess-slot');
            slots.forEach(slot => {
                slot.style.backgroundColor = '#111111';
                slot.classList.remove('filled', 'selected', 'editable');
            });

            const pegs = row.querySelectorAll('.feedback-peg');
            pegs.forEach(peg => {
                peg.className = 'feedback-peg';
            });

            const statusLights = row.querySelectorAll('.status-light');
            statusLights.forEach(light => {
                light.className = 'status-light';
            });

            if (index === 0) {
                row.classList.add('current-row');
                slots.forEach(slot => slot.classList.add('editable'));
            } else {
                row.classList.remove('current-row', 'completed');
                slots.forEach(slot => slot.classList.remove('editable'));
            }

            row.classList.remove('completed');
        });

        document.querySelectorAll('.feedback-row').forEach((row, index) => {
            const points = row.querySelectorAll('.feedback-point');
            points.forEach(point => point.className = 'feedback-point');
            if (index === 0) {
                row.classList.add('current-row');
            } else {
                row.classList.remove('current-row');
            }
        });

        document.querySelectorAll('.secret-slot').forEach(slot => {
            slot.style.backgroundColor = '#444';
            slot.classList.remove('revealed');
        });

        this.changeDisplayMode(this.displayMode);
    }

    calculateColorDifference(color1, color2) {
        const rgb1 = this.colorRGB[color1];
        const rgb2 = this.colorRGB[color2];
        const diff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
        return diff;
    }

    isColorMatch(color1, color2) {
        return this.calculateColorDifference(color1, color2) <= this.colorThreshold;
    }

    updateStatusLights(rowEl, guess, secret) {
        if (this.displayMode === 'grid') {
            const statusLights = rowEl.querySelectorAll('.status-light');
            statusLights.forEach((light, index) => {
                if (guess[index] !== null) {
                    if (guess[index] === secret[index]) {
                        light.classList.add('correct');
                    } else if (secret.includes(guess[index])) {
                        light.classList.add('wrong');
                    }
                }
            });
        } else {
            const feedbackRow = document.querySelector(`.feedback-row[data-row="${this.currentRow}"]`);
            if (!feedbackRow) return;

            const feedbackPoints = feedbackRow.querySelectorAll('.feedback-point');
            // Clear all feedback points first
            feedbackPoints.forEach(point => point.className = 'feedback-point');
            const feedback = this.calculateFeedback(guess, secret);
            let pointIndex = 0;

            for (let i = 0; i < feedback.correct; i++) {
                if (feedbackPoints[pointIndex]) {
                    feedbackPoints[pointIndex].classList.add('correct');
                    pointIndex++;
                }
            }

            for (let i = 0; i < feedback.misplaced; i++) {
                if (feedbackPoints[pointIndex]) {
                    feedbackPoints[pointIndex].classList.add('wrong');
                    pointIndex++;
                }
            }

            for (let i = 0; i < feedback.wrong; i++) {
                if (feedbackPoints[pointIndex]) {
                    feedbackPoints[pointIndex].classList.add('absent');
                    pointIndex++;
                }
            }
        }
    }

    handleSlotClick(slot) {
        if (this.gameOver) return;

        const index = parseInt(slot.dataset.index);
        this.selectedSlot = index;
        soundManager.click();
        this.updateActiveIndicator();
    }

    placeColor(color) {
        if (this.selectedSlot === null) return;

        this.currentGuess[this.selectedSlot] = color;
        this.updateSingleSlot(this.selectedSlot, color);
    }

    updateSingleSlot(index, color, rowEl = null) {
        const currentRowEl = rowEl || document.querySelector('.guess-row.current-row');
        const slot = currentRowEl.querySelector(`.guess-slot[data-index="${index}"]`);

        if (color) {
            slot.style.backgroundColor = this.getColorHex(color);
            slot.classList.add('filled');
        } else {
            slot.style.backgroundColor = '#111111';
            slot.classList.remove('filled');
        }

        // 显示数字
        let numberEl = slot.querySelector('.slot-number');
        if (this.showNumbers && color) {
            const colorIndex = this.colors.indexOf(color);
            if (!numberEl) {
                numberEl = document.createElement('span');
                numberEl.className = 'slot-number';
                slot.appendChild(numberEl);
            }
            numberEl.textContent = colorIndex >= 0 ? (colorIndex + 1) : '';
        } else {
            if (numberEl) {
                numberEl.remove();
            }
        }
    }

    updateAllSlotsDisplay() {
        // 更新所有行的格子
        document.querySelectorAll('.guess-row').forEach(rowEl => {
            const rowIndex = parseInt(rowEl.dataset.row);
            const guessData = rowIndex < this.guessHistory.length ? this.guessHistory[rowIndex] : null;
            const slots = rowEl.querySelectorAll('.guess-slot');
            slots.forEach((slot, index) => {
                let color = null;
                if (rowEl.classList.contains('current-row')) {
                    color = this.currentGuess[index];
                } else if (guessData) {
                    color = guessData.guess[index];
                }

                let numberEl = slot.querySelector('.slot-number');
                if (this.showNumbers && color) {
                    const colorIndex = this.colors.indexOf(color);
                    if (!numberEl) {
                        numberEl = document.createElement('span');
                        numberEl.className = 'slot-number';
                        slot.appendChild(numberEl);
                    }
                    numberEl.textContent = colorIndex >= 0 ? (colorIndex + 1) : '';
                } else {
                    if (numberEl) {
                        numberEl.remove();
                    }
                }
            });
        });
    }

    updateCurrentGuessDisplay() {
        const slots = document.querySelectorAll('.guess-row.current-row .guess-slot');
        slots.forEach((slot, index) => {
            slot.style.backgroundColor = this.currentGuess[index]
                ? this.getColorHex(this.currentGuess[index])
                : '#111111';
        });
    }

    getColorHex(color) {
        const colorMap = {
            'red': '#e74c3c',
            'green': '#2ecc71',
            'orange': '#e67e22',
            'blue': '#3498db',
            'yellow': '#f1c40f',
            'purple': '#9b59b6',
            'cyan': '#00bcd4'
        };
        return colorMap[color] || '#111111';
    }

    submitGuess() {
        if (this.gameOver) {
            this.startNewGame();
            return;
        }

        if (this.currentGuess.includes(null)) {
            return;
        }

        soundManager.submit();

        const feedback = this.calculateFeedback(this.currentGuess, this.secretCode);

        this.attempts++;

        this.guessHistory.push({
            guess: [...this.currentGuess],
            feedback: feedback
        });

        this.remainingGuesses--;

        this.updateStatusLights(document.querySelector('.guess-row.current-row'), this.currentGuess, this.secretCode);

        this.clearActiveIndicator();

        if (feedback.correct === this.codeLength) {
            this.gameOver = true;
            this.revealSecretCode();
            this.saveGameRecord(true);
            soundManager.gameWin();
        } else if (this.remainingGuesses === 0) {
            this.gameOver = true;
            this.revealSecretCode();
            this.saveGameRecord(false);
            soundManager.gameLose();
        } else {
            this.moveToNextRow();
        }

        this.updateUI();
        this.updateAllSlotsDisplay();
    }

    clearActiveIndicator() {
        const currentRowEl = document.querySelector('.guess-row.current-row');
        if (!currentRowEl) return;

        const statusLights = currentRowEl.querySelectorAll('.status-light');
        statusLights.forEach(light => {
            light.classList.remove('active');
        });
    }

    calculateFeedback(guess, secret) {
        let correct = 0;
        let misplaced = 0;

        const secretCopy = [...secret];
        const guessCopy = [...guess];

        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                correct++;
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }

        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] !== null) {
                const index = secretCopy.findIndex(c => c === guessCopy[i]);
                if (index !== -1) {
                    misplaced++;
                    secretCopy[index] = null;
                }
            }
        }

        return {
            correct,
            misplaced,
            wrong: this.codeLength - correct - misplaced,
            positions: this.calculatePositions(guess, secret)
        };
    }

    calculatePositions(guess, secret) {
        const positions = [];
        for (let i = 0; i < this.codeLength; i++) {
            if (guess[i] === secret[i]) {
                positions.push('correct');
            } else if (secret.includes(guess[i])) {
                positions.push('misplaced');
            } else {
                positions.push('wrong');
            }
        }
        return positions;
    }

    displaySideFeedback(feedback) {
        const sideFeedbackDisplay = document.getElementById('side-feedback-display');
        sideFeedbackDisplay.innerHTML = '';

        for (let i = 0; i < feedback.correct; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg correct';
            sideFeedbackDisplay.appendChild(peg);
        }

        for (let i = 0; i < feedback.misplaced; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg misplaced';
            sideFeedbackDisplay.appendChild(peg);
        }

        for (let i = 0; i < feedback.wrong; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg wrong';
            sideFeedbackDisplay.appendChild(peg);
        }
    }

    clearSideFeedback() {
        const sideFeedbackDisplay = document.getElementById('side-feedback-display');
        sideFeedbackDisplay.innerHTML = '<span style="color: #aaa;">等待提交...</span>';
    }

    moveToNextRow() {
        const currentRowEl = document.querySelector('.guess-row.current-row');
        currentRowEl.classList.remove('current-row');
        currentRowEl.classList.add('completed');

        const slots = currentRowEl.querySelectorAll('.guess-slot');
        slots.forEach(slot => {
            slot.classList.remove('editable', 'active', 'selected');
        });

        const currentLights = currentRowEl.querySelectorAll('.status-light');
        currentLights.forEach(light => {
            light.classList.remove('active');
        });

        this.selectedSlot = null;

        const nextRowEl = document.querySelector(`.guess-row[data-row="${this.currentRow + 1}"]`);
        if (nextRowEl) {
            this.currentRow++;
            nextRowEl.classList.add('current-row');

            const nextSlots = nextRowEl.querySelectorAll('.guess-slot');
            nextSlots.forEach(slot => slot.classList.add('editable'));

            this.currentGuess = new Array(this.codeLength).fill(null);
            this.selectedSlot = 0;
            this.updateActiveIndicator();
        }
    }

    revealSecretCode() {
        const secretSlots = document.querySelectorAll('.secret-slot');
        secretSlots.forEach((slot, index) => {
            slot.style.backgroundColor = this.getColorHex(this.secretCode[index]);
            slot.classList.add('revealed');
        });
    }

    changeDisplayMode(mode) {
        this.displayMode = mode;
        const modeSwitch = document.querySelector('.mode-switch');

        if (mode === 'grid') {
            modeSwitch.classList.remove('side-mode');
        } else {
            modeSwitch.classList.add('side-mode');
        }
    }

    updateUI() {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.style.opacity = '1';
        submitBtn.style.pointerEvents = 'auto';
    }

    updateLCDDisplay() {
        const lcdNumber = document.getElementById('lcd-level');
        if (lcdNumber) {
            // 格式：L + 两位数字（如 L04, L05, L06, L07）
            const num = this.level.toString().padStart(2, '0');
            lcdNumber.textContent = 'L' + num;
        }
    }

    showModal(title, message) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;

        const modalSecret = document.getElementById('modal-secret');
        modalSecret.innerHTML = '';
        this.secretCode.forEach(color => {
            const peg = document.createElement('div');
            peg.className = 'peg';
            peg.style.backgroundColor = this.getColorHex(color);
            modalSecret.appendChild(peg);
        });

        document.getElementById('modal').classList.add('show');
    }

    hideModal() {
        document.getElementById('modal').classList.remove('show');
    }

    updateColorSelector() {
        const colorCount = this.currentDifficulty.colors;
        document.querySelectorAll('.color-btn').forEach((btn, index) => {
            // 按顺序: red(0), green(1), orange(2), blue(3), yellow(4), purple(5), cyan(6)
            if (index < colorCount) {
                btn.classList.remove('disabled');
                btn.style.pointerEvents = '';
            } else {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
            }
        });
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.codeLength = difficulty.codeLength;
        this.startNewGame(difficulty);
    }

    cycleDifficulty() {
        // 难度循环：EASY → NORMAL → HARD → EXTREME → EASY
        const difficulties = [
            this.DIFFICULTY.EASY,
            this.DIFFICULTY.NORMAL,
            this.DIFFICULTY.HARD,
            this.DIFFICULTY.EXTREME
        ];
        const currentIndex = difficulties.indexOf(this.currentDifficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        const targetDifficulty = difficulties[nextIndex];

        this.setDifficulty(targetDifficulty);
        soundManager.click();
    }

    handleKeyPress(e) {
        if (e.key >= '1' && e.key <= '7') {
            const index = parseInt(e.key) - 1;
            const availableColors = this.colors.slice(0, this.currentDifficulty.colors);
            if (index < availableColors.length && this.selectedSlot !== null && !this.gameOver) {
                this.placeColor(availableColors[index]);
                soundManager.selectColor();
                this.confirmSlot();
            }
        }

        const colorMap = {
            'r': 'red',
            'g': 'green',
            'o': 'orange',
            'b': 'blue',
            'y': 'yellow',
            'p': 'purple',
            'c': 'cyan'
        };

        if (colorMap[e.key.toLowerCase()] && !this.gameOver) {
            const color = colorMap[e.key.toLowerCase()];
            // 检查这个颜色是否在当前难度中可用
            const colorIndex = this.colors.indexOf(color);
            if (colorIndex < this.currentDifficulty.colors) {
                this.placeColor(color);
                soundManager.selectColor();
            }
        }

        if (e.key === 'Enter' && !this.gameOver) {
            this.submitGuess();
        }

        if (e.key === 'Escape') {
        }

        if (e.key === 'h' || e.key === 'H') {
            this.showNumbers = !this.showNumbers;
            this.updateAllSlotsDisplay();
        }
    }

    // ========== 历史记录管理 ==========

    getHistory() {
        const history = localStorage.getItem('mima_history');
        return history ? JSON.parse(history) : [];
    }

    saveHistory(history) {
        localStorage.setItem('mima_history', JSON.stringify(history));
    }

    saveGameRecord(won) {
        const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
        const record = {
            id: Date.now(),
            difficulty: this.currentDifficulty.colors,
            attempts: this.attempts,
            timeSpent: timeSpent,
            won: won,
            secretCode: won ? [...this.secretCode] : null,
            guessHistory: [...this.guessHistory],
            timestamp: Date.now()
        };

        const history = this.getHistory();
        history.unshift(record);
        // 最多保存50条
        if (history.length > 50) {
            history.pop();
        }
        this.saveHistory(history);
        this.updateHistoryPanel();
    }

    getBestRecords() {
        const history = this.getHistory();
        const best = {};
        [4, 5, 6, 7].forEach(colors => {
            best[colors] = null;
        });

        history.forEach(record => {
            if (record.won) {
                if (best[record.difficulty] === null || record.attempts < best[record.difficulty].attempts) {
                    best[record.difficulty] = record;
                }
            }
        });

        return best;
    }

    getRecentRecords(limit = 10) {
        const history = this.getHistory();
        return history.slice(0, limit);
    }

    deleteRecord(id) {
        const history = this.getHistory();
        const filtered = history.filter(r => r.id !== id);
        this.saveHistory(filtered);
        this.updateHistoryPanel();
    }

    clearHistory() {
        this.saveHistory([]);
        this.updateHistoryPanel();
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return seconds + 's';
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins + ':' + secs.toString().padStart(2, '0');
    }

    formatDate(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const day = 24 * 60 * 60 * 1000;

        if (diff < day) {
            // 今天
            const date = new Date(timestamp);
            return date.getHours().toString().padStart(2, '0') + ':' +
                   date.getMinutes().toString().padStart(2, '0');
        } else if (diff < 2 * day) {
            // 昨天
            return '昨天';
        } else if (diff < 7 * day) {
            // 一周内
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            return '周' + days[new Date(timestamp).getDay()];
        } else {
            // 更早
            const date = new Date(timestamp);
            return (date.getMonth() + 1) + '/' + date.getDate();
        }
    }

    // 格式化完整日期时间 "5/18 14:32"
    formatFullDate(timestamp) {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    }

    updateHistoryPanel() {
        const panel = document.getElementById('history-panel');
        if (!panel) return;

        const history = this.getHistory();
        const recentRecords = this.getRecentRecords(10);

        // 统计各难度累计次数
        const stats = { 4: { total: 0, won: 0 }, 5: { total: 0, won: 0 }, 6: { total: 0, won: 0 }, 7: { total: 0, won: 0 } };
        history.forEach(record => {
            if (stats[record.difficulty]) {
                stats[record.difficulty].total++;
                if (record.won) stats[record.difficulty].won++;
            }
        });

        // 更新累计统计
        const statsContainer = panel.querySelector('.best-records');
        if (statsContainer) {
            statsContainer.innerHTML = '';
            [4, 5, 6, 7].forEach(colors => {
                const div = document.createElement('div');
                div.className = 'best-item';
                div.innerHTML = `<span class="best-level">L0${colors}</span><span class="best-attempts">${stats[colors].won}/${stats[colors].total}</span>`;
                statsContainer.appendChild(div);
            });
        }

        // 更新最近战绩
        const recentContainer = panel.querySelector('.recent-records');
        if (recentContainer) {
            recentContainer.innerHTML = '';
            if (recentRecords.length === 0) {
                recentContainer.innerHTML = '<div class="no-record">暂无记录</div>';
            } else {
                recentRecords.forEach(record => {
                    const div = document.createElement('div');
                    div.className = 'record-item' + (record.won ? ' won' : ' lost');
                    div.dataset.id = record.id;
                    div.innerHTML = `
                        <span class="record-date" title="${this.formatFullDate(record.timestamp)}">${this.formatDate(record.timestamp)}</span>
                        <span class="record-level">L0${record.difficulty}</span>
                        <span class="record-result">${record.won ? '✓' : '✗'}</span>
                        <span class="record-attempts">${record.attempts}次</span>
                    `;
                    div.addEventListener('click', () => this.showRecordDetail(record));
                    recentContainer.appendChild(div);
                });
            }
        }
    }

    showRecordDetail(record) {
        const detail = document.getElementById('record-detail');
        if (!detail) return;

        detail.innerHTML = `
            <div class="detail-header">
                <span class="detail-level">L0${record.difficulty}</span>
                <span class="detail-result ${record.won ? 'won' : 'lost'}">${record.won ? '通关' : '失败'}</span>
            </div>
            <div class="detail-time">
                <span class="detail-label">记录时间</span>
                <span class="time-value">${this.formatFullDate(record.timestamp)}</span>
            </div>
            <div class="detail-stats">
                <div class="stat-item">
                    <span class="stat-label">尝试次数</span>
                    <span class="stat-value">${record.attempts}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">用时</span>
                    <span class="stat-value">${record.won ? this.formatTime(record.timeSpent) : '-'}</span>
                </div>
            </div>
            ${record.won && record.secretCode ? `
            <div class="detail-secret">
                <span class="detail-label">正确答案</span>
                <div class="secret-colors">
                    ${record.secretCode.map(c => `<div class="secret-color" style="background:${this.getColorHex(c)}"></div>`).join('')}
                </div>
            </div>
            ` : ''}
            <div class="detail-guesses">
                <span class="detail-label">猜测过程</span>
                ${record.guessHistory.map((g, i) => `
                    <div class="guess-row-detail">
                        <span class="guess-num">${i + 1}</span>
                        <div class="guess-colors">
                            ${g.guess.map(c => `<div class="guess-color" style="background:${this.getColorHex(c)}"></div>`).join('')}
                        </div>
                        <span class="guess-feedback">
                            <span class="feedback-correct">${g.feedback.correct}</span>
                            <span class="feedback-misplaced">${g.feedback.misplaced}</span>
                        </span>
                    </div>
                `).join('')}
            </div>
            <div class="detail-actions">
                <button class="btn-delete" onclick="game.deleteRecord(${record.id})">删除</button>
                <button class="btn-close" onclick="game.closeRecordDetail()">关闭</button>
            </div>
        `;
        detail.style.display = 'block';
    }

    closeRecordDetail() {
        const detail = document.getElementById('record-detail');
        if (detail) {
            detail.style.display = 'none';
        }
    }

    initHistoryPanel() {
        this.updateHistoryPanel();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new MastermindGame();
    game.initHistoryPanel();
    window.game = game;
});
