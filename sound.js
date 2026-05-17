class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled) return;
        
        const ctx = this.init();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }

    click() {
        this.playTone(800, 0.05, 'square', 0.15);
    }

    selectColor() {
        this.playTone(1200, 0.08, 'sine', 0.2);
        setTimeout(() => {
            this.playTone(1400, 0.08, 'sine', 0.2);
        }, 80);
    }

    submit() {
        this.playTone(600, 0.1, 'square', 0.2);
        setTimeout(() => {
            this.playTone(800, 0.1, 'square', 0.2);
        }, 100);
        setTimeout(() => {
            this.playTone(1000, 0.15, 'square', 0.2);
        }, 200);
    }

    correct() {
        this.playTone(523, 0.15, 'sine', 0.25);
        setTimeout(() => {
            this.playTone(659, 0.15, 'sine', 0.25);
        }, 150);
        setTimeout(() => {
            this.playTone(784, 0.2, 'sine', 0.25);
        }, 300);
    }

    wrong() {
        this.playTone(200, 0.3, 'sawtooth', 0.2);
        setTimeout(() => {
            this.playTone(150, 0.3, 'sawtooth', 0.2);
        }, 300);
    }

    gameStart() {
        const notes = [262, 330, 392, 523, 392, 523, 659];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.2, 'sine', 0.3);
            }, i * 150);
        });
    }

    gameWin() {
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sine', 0.35);
            }, i * 120);
        });
    }

    gameLose() {
        this.playTone(400, 0.5, 'sawtooth', 0.2);
        setTimeout(() => {
            this.playTone(350, 0.5, 'sawtooth', 0.2);
        }, 500);
        setTimeout(() => {
            this.playTone(300, 0.7, 'sawtooth', 0.2);
        }, 1000);
    }

    modeSwitch() {
        this.playTone(1000, 0.05, 'sine', 0.2);
        setTimeout(() => {
            this.playTone(1200, 0.08, 'sine', 0.2);
        }, 60);
    }

    newGame() {
        this.playTone(440, 0.1, 'square', 0.15);
        setTimeout(() => {
            this.playTone(554, 0.1, 'square', 0.15);
        }, 100);
        setTimeout(() => {
            this.playTone(659, 0.15, 'square', 0.15);
        }, 200);
    }
}

const soundManager = new SoundManager();

document.addEventListener('click', () => {
    soundManager.init();
}, { once: true });
