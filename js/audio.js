// Audio synthesis and Web Audio API handling
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = new Map(); // Map MIDI note to oscillator data
        this.analyser = null;
        this.dataArray = null;
        this.updateInterval = null;
        
        // Just intonation settings
        this.useJustIntonation = false;
        this.rootKey = 9; // A (MIDI note % 12)
        
        // Just intonation ratios (based on C major scale)
        this.justRatios = [
            1,          // C (1:1)
            16/15,      // C# (16:15)
            9/8,        // D (9:8)
            6/5,        // D# (6:5)
            5/4,        // E (5:4)
            4/3,        // F (4:3)
            45/32,      // F# (45:32)
            3/2,        // G (3:2)
            8/5,        // G# (8:5)
            5/3,        // A (5:3)
            9/5,        // A# (9:5)
            15/8        // B (15:8)
        ];
        
        this.init();
    }
    
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            // Create analyser for visual feedback
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Start the audio update loop
            this.startUpdateLoop();
            
            console.log('Audio engine initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }
    
    // Convert MIDI note number to frequency
    midiToFrequency(midiNote) {
        if (this.useJustIntonation) {
            return this.midiToJustFrequency(midiNote);
        } else {
            // Equal temperament: A4 (MIDI 69) = 440Hz
            return 440 * Math.pow(2, (midiNote - 69) / 12);
        }
    }
    
    // Convert MIDI note to just intonation frequency
    midiToJustFrequency(midiNote) {
        // Get octave and note within octave
        const octave = Math.floor(midiNote / 12);
        const noteInOctave = midiNote % 12;
        
        // Calculate offset from root key
        let offsetFromRoot = (noteInOctave - this.rootKey + 12) % 12;
        
        // Get ratio for this note
        const ratio = this.justRatios[offsetFromRoot];
        
        // Calculate the frequency using the same octave system as equal temperament
        // Start with the root key frequency in the same octave as the target note
        const rootMidiInSameOctave = octave * 12 + this.rootKey;
        const baseFreq = 440 * Math.pow(2, (rootMidiInSameOctave - 69) / 12);
        
        return baseFreq * ratio;
    }
    
    // Set just intonation mode
    setJustIntonation(enabled, rootKey = this.rootKey) {
        this.useJustIntonation = enabled;
        this.rootKey = rootKey;
        
        // Update frequencies of currently playing notes
        for (const [midiNote, data] of this.oscillators) {
            const newFreq = this.midiToFrequency(midiNote);
            data.oscillator.frequency.setValueAtTime(newFreq, this.audioContext.currentTime);
            data.frequency = newFreq;
        }
        
        console.log(`Just intonation ${enabled ? 'enabled' : 'disabled'}, root key: ${this.getNoteNameFromMidi(this.rootKey)}`);
    }
    
    // Get note name from MIDI number
    getNoteNameFromMidi(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return noteNames[midiNote % 12];
    }
    
    // Start the audio update loop that reads keyboard state
    startUpdateLoop() {
        this.updateInterval = setInterval(() => {
            this.updateFromKeyboard();
        }, 10); // Update every 10ms
    }
    
    // Update audio based on keyboard state
    updateFromKeyboard() {
        if (!window.virtualKeyboard) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const keyStates = window.virtualKeyboard.getKeyStates();
        
        // Check each MIDI note (12-125: C0 to F9)
        for (let i = 0; i < keyStates.length; i++) {
            const midiNote = i + 12;
            const shouldPlay = keyStates[i];
            const isPlaying = this.oscillators.has(midiNote);
            
            if (shouldPlay && !isPlaying) {
                // Start note
                this.startNote(midiNote);
            } else if (!shouldPlay && isPlaying) {
                // Stop note
                this.stopNote(midiNote);
            }
        }
    }
    
    // Start playing a MIDI note with optional velocity
    playNote(midiNote, velocity = 0.5) {
        // If note is already playing, crossfade to prevent clicking
        if (this.oscillators.has(midiNote)) {
            const { oscillator: oldOscillator, gainNode: oldGainNode } = this.oscillators.get(midiNote);
            
            // Fade out the old oscillator quickly
            oldGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.003);
            oldOscillator.stop(this.audioContext.currentTime + 0.003);
            
            // Remove from map immediately and start new note
            this.oscillators.delete(midiNote);
        }
        
        const frequency = this.midiToFrequency(midiNote);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // Smooth attack with velocity control
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(velocity, this.audioContext.currentTime + 0.003);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start();
        
        this.oscillators.set(midiNote, { oscillator, gainNode, frequency });
    }

    // Start playing a MIDI note (called by keyboard)
    startNote(midiNote) {
        this.playNote(midiNote, 0.5);
    }

    // Stop all currently playing notes
    stopAllNotes() {
        for (const [midiNote] of this.oscillators) {
            this.stopNote(midiNote);
        }
    }

    // Stop playing a MIDI note
    stopNote(midiNote) {
        if (this.oscillators.has(midiNote)) {
            const { oscillator, gainNode } = this.oscillators.get(midiNote);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.005);
            oscillator.stop(this.audioContext.currentTime + 0.005);
            this.oscillators.delete(midiNote);
        }
    }
    
    // Get current audio data for visualization
    getAudioData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        }
        return null;
    }
    
    // Get currently playing frequencies for visualization
    getCurrentFrequencies() {
        const frequencies = [];
        for (const [midiNote, data] of this.oscillators) {
            frequencies.push(data.frequency);
        }
        return frequencies;
    }
    
    // Clean up resources
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        // Stop all oscillators
        for (const [midiNote] of this.oscillators) {
            this.stopNote(midiNote);
        }
    }
}

// Global audio engine instance
window.audioEngine = new AudioEngine();
