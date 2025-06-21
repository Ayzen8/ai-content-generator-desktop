export class SoundService {
    private static audioContext: AudioContext | null = null;
    private static isEnabled: boolean = true;

    // Initialize audio context
    private static getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    // Enable/disable sound notifications
    static setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        localStorage.setItem('soundNotificationsEnabled', enabled.toString());
    }

    static isEnabledStatic(): boolean {
        const stored = localStorage.getItem('soundNotificationsEnabled');
        return stored !== null ? stored === 'true' : true; // Default to enabled
    }

    // Generate a tone with specific frequency and duration
    private static playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
        if (!this.isEnabled || !this.isEnabledStatic()) return;

        try {
            const audioContext = this.getAudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;

            // Fade in and out for smoother sound
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Sound notification failed:', error);
        }
    }

    // Play success notification (pleasant ascending chime)
    static playSuccess(): void {
        if (!this.isEnabledStatic()) return;
        
        setTimeout(() => this.playTone(523.25, 0.15), 0);   // C5
        setTimeout(() => this.playTone(659.25, 0.15), 100); // E5
        setTimeout(() => this.playTone(783.99, 0.2), 200);  // G5
    }

    // Play error notification (descending tone)
    static playError(): void {
        if (!this.isEnabledStatic()) return;
        
        setTimeout(() => this.playTone(400, 0.2), 0);   // Lower tone
        setTimeout(() => this.playTone(300, 0.3), 150); // Even lower
    }

    // Play posting notification (quick double beep)
    static playPosted(): void {
        if (!this.isEnabledStatic()) return;
        
        setTimeout(() => this.playTone(800, 0.1), 0);
        setTimeout(() => this.playTone(800, 0.1), 150);
    }

    // Play generation started notification (single soft tone)
    static playGenerating(): void {
        if (!this.isEnabledStatic()) return;
        
        this.playTone(440, 0.1, 'sine');
    }

    // Play copy notification (quick high beep)
    static playCopied(): void {
        if (!this.isEnabledStatic()) return;
        
        this.playTone(1000, 0.08);
    }

    // Test all sounds
    static testSounds(): void {
        console.log('Testing sound notifications...');
        
        setTimeout(() => {
            console.log('Playing success sound...');
            this.playSuccess();
        }, 500);
        
        setTimeout(() => {
            console.log('Playing error sound...');
            this.playError();
        }, 2000);
        
        setTimeout(() => {
            console.log('Playing posted sound...');
            this.playPosted();
        }, 3500);
        
        setTimeout(() => {
            console.log('Playing generating sound...');
            this.playGenerating();
        }, 5000);
        
        setTimeout(() => {
            console.log('Playing copied sound...');
            this.playCopied();
        }, 6000);
    }
}

export default SoundService;
