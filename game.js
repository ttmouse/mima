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

        // 难度等级定义
        this.DIFFICULTY = {
            EASY: { name: '简单', codeLength: 4, colors: 4 },
            NORMAL: { name: '普通', codeLength: 5, colors: 5 },
            HARD: { name: '困难', codeLength: 6, colors: 6 },
            EXTREME: { name: '极难', codeLength: 7, colors: 7 }
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

        this.init();
    }

    init() {
        this.bindEvents();
        this.startNewGame();
    }

    bindEvents() {
        document.getElementById('submit-btn').addEventListener('click', () => this.submitGuess());
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

        document.querySelector('.mode-switch').addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            const mode = btn.id === 'mode-grid' ? 'grid' : 'side';
            this.changeDisplayMode(mode);
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
        const nextIndex = (this.selectedSlot + 1) % this.codeLength;
        this.selectedSlot = nextIndex;
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

        this.resetBoard();
        this.updateUI();
        this.clearSideFeedback();
        this.updateActiveIndicator();
        this.updateColorSelector();
        soundManager.gameStart();
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

    updateSingleSlot(index, color) {
        const currentRowEl = document.querySelector('.guess-row.current-row');
        const slot = currentRowEl.querySelector(`.guess-slot[data-index="${index}"]`);

        if (color) {
            slot.style.backgroundColor = this.getColorHex(color);
            slot.classList.add('filled');
        } else {
            slot.style.backgroundColor = '#111111';
            slot.classList.remove('filled');
        }
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
        if (this.gameOver) return;

        if (this.currentGuess.includes(null)) {
            return;
        }

        soundManager.submit();

        const feedback = this.calculateFeedback(this.currentGuess, this.secretCode);

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
            soundManager.gameWin();
        } else if (this.remainingGuesses === 0) {
            this.gameOver = true;
            this.revealSecretCode();
            soundManager.gameLose();
        } else {
            this.moveToNextRow();
        }

        this.updateUI();
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

        const modeGrid = document.getElementById('mode-grid');
        const modeSide = document.getElementById('mode-side');
        const thumb = document.querySelector('.mode-thumb');

        modeGrid.classList.remove('active');
        modeSide.classList.remove('active');

        if (mode === 'grid') {
            modeGrid.classList.add('active');
            thumb.style.transform = 'translateX(3px)';
        } else {
            modeSide.classList.add('active');
            thumb.style.transform = 'translateX(35px)';
        }
    }

    updateUI() {
        const submitBtn = document.getElementById('submit-btn');

        if (this.gameOver) {
            submitBtn.style.opacity = '0.5';
            submitBtn.style.pointerEvents = 'none';
        } else {
            submitBtn.style.opacity = '1';
            submitBtn.style.pointerEvents = 'auto';
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

    handleKeyPress(e) {
        if (e.key >= '1' && e.key <= '7') {
            const index = parseInt(e.key) - 1;
            const slots = document.querySelectorAll('.guess-row.current-row .guess-slot');
            if (slots[index]) {
                slots[index].click();
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MastermindGame();
});
