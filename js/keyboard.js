// Virtual keyboard implementation
class VirtualKeyboard {
    constructor() {
        this.keys = [];
        this.keyboardElement = document.getElementById('keyboard');
        this.currentOctave = 4; // Start at octave 4 (middle C = C4)
        this.sustainMode = false; // Sustain toggle state
        
        // Piano state array (MIDI 12 to 125: C0 to F9)
        // Index 0 = MIDI 12 (C0), Index 113 = MIDI 125 (F9)
        this.keyStates = new Array(114).fill(false);
        
        // Track which keys are currently physically pressed (not sustained)
        this.physicallyPressed = new Set();
        
        // Map note names to MIDI numbers (C0 = 12, F9 = 125)
        this.noteToMidi = {
            'C': [12, 24, 36, 48, 60, 72, 84, 96, 108, 120], // C0 to C9
            'C#': [13, 25, 37, 49, 61, 73, 85, 97, 109, 121], // C#0 to C#9
            'D': [14, 26, 38, 50, 62, 74, 86, 98, 110, 122], // D0 to D9
            'D#': [15, 27, 39, 51, 63, 75, 87, 99, 111, 123], // D#0 to D#9
            'E': [16, 28, 40, 52, 64, 76, 88, 100, 112, 124], // E0 to E9
            'F': [17, 29, 41, 53, 65, 77, 89, 101, 113, 125], // F0 to F9
            'F#': [18, 30, 42, 54, 66, 78, 90, 102, 114], // F#0 to F#8
            'G': [19, 31, 43, 55, 67, 79, 91, 103, 115], // G0 to G8
            'G#': [20, 32, 44, 56, 68, 80, 92, 104, 116], // G#0 to G#8
            'A': [21, 33, 45, 57, 69, 81, 93, 105, 117], // A0 to A8
            'A#': [22, 34, 46, 58, 70, 82, 94, 106, 118], // A#0 to A#8
            'B': [23, 35, 47, 59, 71, 83, 95, 107, 119] // B0 to B8
        };
        
        // Extended keyboard layout covering more keys up to apostrophe
        this.keyLayout = [
            // First octave (base octave)
            { note: 'C', type: 'white', key: 'a' },
            { note: 'C#', type: 'black', key: 'w' },
            { note: 'D', type: 'white', key: 's' },
            { note: 'D#', type: 'black', key: 'e' },
            { note: 'E', type: 'white', key: 'd' },
            { note: 'F', type: 'white', key: 'f' },
            { note: 'F#', type: 'black', key: 't' },
            { note: 'G', type: 'white', key: 'g' },
            { note: 'G#', type: 'black', key: 'y' },
            { note: 'A', type: 'white', key: 'h' },
            { note: 'A#', type: 'black', key: 'u' },
            { note: 'B', type: 'white', key: 'j' },
            // Second octave (extended keys)
            { note: 'C', type: 'white', key: 'k', octaveOffset: 1 },
            { note: 'D', type: 'white', key: 'l', octaveOffset: 1 },
            { note: 'E', type: 'white', key: ';', octaveOffset: 1 },
            { note: 'F', type: 'white', key: "'", octaveOffset: 1 },
            // Black keys for second octave
            { note: 'C#', type: 'black', key: 'o', octaveOffset: 1 },
            { note: 'D#', type: 'black', key: 'p', octaveOffset: 1 }
        ];
        
        this.init();
    }
    
    init() {
        this.createKeyboardHTML();
        this.setupEventListeners();
    }
    
    createKeyboardHTML() {
        // First create all white keys
        const whiteKeys = this.keyLayout.filter(key => key.type === 'white');
        whiteKeys.forEach(keyData => {
            const keyElement = this.createKeyElement(keyData);
            this.keyboardElement.appendChild(keyElement);
            this.keys.push({ element: keyElement, ...keyData });
        });
        
        // Then create black keys with absolute positioning
        const blackKeys = this.keyLayout.filter(key => key.type === 'black');
        blackKeys.forEach(keyData => {
            const keyElement = this.createKeyElement(keyData);
            this.keyboardElement.appendChild(keyElement);
            this.keys.push({ element: keyElement, ...keyData });
        });
    }
    
    createKeyElement(keyData) {
        const keyElement = document.createElement('div');
        keyElement.className = `key ${keyData.type}`;
        keyElement.dataset.note = keyData.note;
        keyElement.dataset.key = keyData.key;
        keyElement.textContent = keyData.key.toUpperCase();
        
        return keyElement;
    }
    
    setupEventListeners() {
        // Mouse events
        this.keys.forEach(key => {
            key.element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.pressKey(key.note, key.octaveOffset || 0);
            });
            
            key.element.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.releaseKey(key.note, key.octaveOffset || 0);
            });
            
            key.element.addEventListener('mouseleave', (e) => {
                this.releaseKey(key.note, key.octaveOffset || 0);
            });
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Ignore repeated keydown events
            
            // Handle octave changes
            if (e.key === 'z' || e.key === 'Z') {
                this.changeOctave(-1);
                return;
            }
            if (e.key === 'x' || e.key === 'X') {
                this.changeOctave(1);
                return;
            }
            
            // Handle sustain toggle (spacebar)
            if (e.key === ' ') {
                this.toggleSustain();
                return;
            }
            
            const key = this.keys.find(k => k.key === e.key);
            if (key) {
                this.pressKey(key.note, key.octaveOffset || 0);
            }
        });
        document.addEventListener('keyup', (e) => {
            const key = this.keys.find(k => k.key === e.key);
            if (key) {
                this.releaseKey(key.note, key.octaveOffset || 0);
            }
        });

        // Prevent context menu on right click
        this.keyboardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    pressKey(note, octaveOffset = 0) {
        const octave = this.currentOctave + octaveOffset;
        const midiNote = this.noteToMidi[note][octave];
        
        if (!midiNote || midiNote < 12 || midiNote > 125) return; // Out of range
        
        const arrayIndex = midiNote - 12;
        const noteKey = `${note}${octave}`;
        
        // Prevent duplicate presses
        if (this.physicallyPressed.has(noteKey)) return;
        
        // Add to physically pressed set
        this.physicallyPressed.add(noteKey);
        
        // Set state to true (this triggers audio)
        this.keyStates[arrayIndex] = true;
        
        // Update visual state
        const keyElement = this.keys.find(k => k.note === note && (k.octaveOffset || 0) === octaveOffset)?.element;
        if (keyElement) {
            keyElement.classList.add('active');
        }
        
        // Update visualization
        this.updateVisualization();
    }
    
    releaseKey(note, octaveOffset = 0) {
        const octave = this.currentOctave + octaveOffset;
        const midiNote = this.noteToMidi[note][octave];
        const noteKey = `${note}${octave}`;
        
        if (!midiNote || midiNote < 12 || midiNote > 125) return; // Out of range
        if (!this.physicallyPressed.has(noteKey)) return; // Not currently pressed
        
        const arrayIndex = midiNote - 12;
        
        // Remove from physically pressed set
        this.physicallyPressed.delete(noteKey);
        
        // Update visual state (always remove active visual state)
        const keyElement = this.keys.find(k => k.note === note && (k.octaveOffset || 0) === octaveOffset)?.element;
        if (keyElement) {
            keyElement.classList.remove('active');
        }
        
        // Only set state to false if sustain is OFF
        if (!this.sustainMode) {
            this.keyStates[arrayIndex] = false;
        }
        // If sustain is ON, leave the state as true (keeps audio playing)
        
        // Update visualization
        this.updateVisualization();
    }
    
    changeOctave(direction) {
        const newOctave = this.currentOctave + direction;
        // Valid range: C0 (octave 0) to high octaves
        // Limit to octaves 0-8 to ensure keyboard keys can reach F9
        if (newOctave >= 0 && newOctave <= 7) {
            this.currentOctave = newOctave;
            
            // Only clear the notes that are currently physically pressed
            // This preserves sustained notes from previous sustain sessions
            for (const noteKey of this.physicallyPressed) {
                // Parse the note key (e.g., "C4" -> note="C", octave=4)
                const matches = noteKey.match(/^([A-G]#?)(\d+)$/);
                if (matches) {
                    const [, note, octave] = matches;
                    const midiNote = this.noteToMidi[note][parseInt(octave)];
                    if (midiNote) {
                        const arrayIndex = midiNote - 12;
                        // Only clear if sustain is OFF (otherwise keep sustained notes)
                        if (!this.sustainMode) {
                            this.keyStates[arrayIndex] = false;
                        }
                    }
                }
            }
            
            // Clear physically pressed keys and visual states
            this.physicallyPressed.clear();
            this.keys.forEach(key => {
                key.element.classList.remove('active');
            });
            
            this.updateVisualization();
        }
    }
    
    toggleSustain() {
        this.sustainMode = !this.sustainMode;
        
        // Update sustain indicator
        const sustainIndicator = document.getElementById('sustain-indicator');
        if (sustainIndicator) {
            if (this.sustainMode) {
                sustainIndicator.classList.remove('hidden');
            } else {
                sustainIndicator.classList.add('hidden');
            }
        }
        
        console.log('Sustain mode:', this.sustainMode ? 'ON' : 'OFF');
    }
    
    // Clear all playing notes (new method for 'B' key)
    clearAllNotes() {
        // Set all key states to false
        this.keyStates.fill(false);
        // Clear physically pressed set
        this.physicallyPressed.clear();
        // Remove all visual active states
        this.keys.forEach(key => {
            key.element.classList.remove('active');
        });
        // Update visualization
        this.updateVisualization();
        console.log('All notes cleared');
    }
    
    // Get the current key states for audio engine
    getKeyStates() {
        return this.keyStates;
    }
    
    // Get active MIDI notes for visualization
    getActiveNotes() {
        const activeNotes = [];
        for (let i = 0; i < this.keyStates.length; i++) {
            if (this.keyStates[i]) {
                activeNotes.push(i + 12); // Convert back to MIDI number
            }
        }
        return activeNotes;
    }
    
    updateVisualization() {
        if (window.lissajousGenerator && window.scene) {
            // Get current frequencies from audio engine
            const frequencies = window.audioEngine ? window.audioEngine.getCurrentFrequencies() : [];
            window.lissajousGenerator.updateCurves(frequencies, window.scene);
        }
    }
    
    // Release all keys (used for cleanup)
    releaseAllKeys() {
        this.keyStates.fill(false);
        this.physicallyPressed.clear();
        this.keys.forEach(key => {
            key.element.classList.remove('active');
        });
        this.updateVisualization();
    }
}

// Initialize keyboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.virtualKeyboard = new VirtualKeyboard();
});
