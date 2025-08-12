// Main application entry point
class WaveGenerator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.isAnimating = false;
        this.autoRotateEnabled = true;
        this.autoRotateSpeed = 0.001;
        this.curveRotationEnabled = true;
        
        // Stats tracking
        this.stats = {
            fps: 0,
            frameTime: 0,
            lastFrameTime: performance.now(),
            frameCount: 0,
            lastStatsUpdate: performance.now()
        };
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.setupLighting();
        this.setupControls();
        this.setupEventListeners();
        this.startAnimation();
        
        console.log('Wave Generator initialized!');
    }
    
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 10, 20);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('threejs-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Make scene globally accessible
        window.scene = this.scene;
    }
    
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        // Point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0x4facfe, 0.5, 30);
        pointLight1.position.set(10, 0, 10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x667eea, 0.5, 30);
        pointLight2.position.set(-10, 0, -10);
        this.scene.add(pointLight2);
        
        // Add some sparkle particles
        this.createParticleField();
    }
    
    createParticleField() {
        const particleCount = 200;
        const particles = new THREE.BufferGeometry();
        const positions = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );
        }
        
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x4facfe,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        // Store reference for animation
        this.particleSystem = particleSystem;
    }
    
    setupControls() {
        this.controls = new CameraControls(this.camera, this.renderer);
        this.renderer.domElement.style.cursor = 'grab';
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'escape':
                    event.preventDefault();
                    this.clearAllNotes();
                    break;
                case 'r':
                    this.controls.reset();
                    break;
                case 'c':
                    event.preventDefault();
                    this.toggleBothRotations();
                    break;
                case 'v':
                    event.preventDefault();
                    this.toggleUI();
                    break;
                case 'b':
                    event.preventDefault();
                    this.clearAllNotes();
                    break;
            }
        });
        
        // Audio context activation on first user interaction
        document.addEventListener('click', this.activateAudio.bind(this), { once: true });
        document.addEventListener('keydown', this.activateAudio.bind(this), { once: true });
        
        // Setup settings panel
        this.setupSettingsPanel();
        
        // Initialize MIDI controls
        this.setupMIDIControls();
        
        // Setup UI toggle
        this.setupUIToggle();
    }
    
    setupUIToggle() {
        const uiToggle = document.getElementById('ui-toggle');
        if (uiToggle) {
            uiToggle.addEventListener('click', () => {
                this.toggleUI();
            });
        }
    }
    
    toggleUI() {
        document.body.classList.toggle('ui-hidden');
        
        // Update the button icon
        const uiToggle = document.getElementById('ui-toggle');
        if (uiToggle) {
            const svg = uiToggle.querySelector('svg');
            const isHidden = document.body.classList.contains('ui-hidden');
            
            if (isHidden) {
                // Show "eye-off" icon
                svg.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
                uiToggle.title = "Show UI (V key)";
            } else {
                // Show "eye" icon
                svg.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
                uiToggle.title = "Hide UI (V key)";
            }
        }
    }
    
    setupMIDIControls() {
        // Initialize MIDI controls when available
        if (window.MIDIControls) {
            this.midiControls = new window.MIDIControls();
        }
    }
    
    setupSettingsPanel() {
        const settingsPanel = document.getElementById('settings-panel');
        const settingsToggle = document.getElementById('settings-toggle');
        const statsPanel = document.getElementById('stats-panel');
        
        // Settings elements
        const particlesToggle = document.getElementById('particles-toggle');
        const autoRotateToggle = document.getElementById('auto-rotate-toggle');
        const autoRotateSpeed = document.getElementById('auto-rotate-speed');
        const autoRotateSpeedValue = document.getElementById('auto-rotate-speed-value');
        const mouseSensitivity = document.getElementById('mouse-sensitivity');
        const mouseSensitivityValue = document.getElementById('mouse-sensitivity-value');
        const zoomSpeed = document.getElementById('zoom-speed');
        const zoomSpeedValue = document.getElementById('zoom-speed-value');
        const statsToggle = document.getElementById('stats-toggle');
        const tRange = document.getElementById('t-range');
        const tRangeValue = document.getElementById('t-range-value');
        const curveRotationToggle = document.getElementById('curve-rotation-toggle');
        const justIntonationToggle = document.getElementById('just-intonation-toggle');
        const rootKeySetting = document.getElementById('root-key-setting');
        const rootKeySelect = document.getElementById('root-key-select');
        
        // Toggle settings panel
        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('collapsed');
        });
        
        // Handle particles toggle
        particlesToggle.addEventListener('change', (e) => {
            this.toggleParticles(e.target.checked);
        });
        
        // Handle auto rotate toggle
        autoRotateToggle.addEventListener('change', (e) => {
            this.autoRotateEnabled = e.target.checked;
        });
        
        // Handle auto rotate speed
        autoRotateSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.autoRotateSpeed = value * 0.001; // Convert to radians
            autoRotateSpeedValue.textContent = value.toFixed(1);
        });
        
        // Handle mouse sensitivity
        mouseSensitivity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.controls) {
                this.controls.rotateSpeed = value * 0.001; // Base speed * multiplier
            }
            mouseSensitivityValue.textContent = value.toFixed(1);
        });
        
        // Handle zoom speed
        zoomSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.controls) {
                this.controls.zoomSpeed = value * 0.1; // Base speed * multiplier
            }
            zoomSpeedValue.textContent = value.toFixed(1);
        });
        
        // Handle stats toggle
        statsToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                statsPanel.classList.remove('hidden');
                this.startStatsUpdates();
            } else {
                statsPanel.classList.add('hidden');
                this.stopStatsUpdates();
            }
        });
        
        // Handle FPS toggle
        const fpsToggle = document.getElementById('fps-toggle');
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsToggle && fpsCounter) {
            fpsToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    fpsCounter.classList.remove('hidden');
                    this.startFpsCounter();
                } else {
                    fpsCounter.classList.add('hidden');
                    this.stopFpsCounter();
                }
            });
        }
        
        // Handle t range
        tRange.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            tRangeValue.textContent = value.toFixed(1);
            if (window.lissajousGenerator) {
                window.lissajousGenerator.setTRange(value);
            }
        });
        
        // Handle curve rotation toggle
        curveRotationToggle.addEventListener('change', (e) => {
            this.curveRotationEnabled = e.target.checked;
            if (window.lissajousGenerator) {
                window.lissajousGenerator.setRotationEnabled(this.curveRotationEnabled);
            }
        });
        
        // New Lissajous controls
        const lissajousRotationToggle = document.getElementById('lissajous-rotation-toggle');
        const lissajousBreathingToggle = document.getElementById('lissajous-breathing-toggle');
        const lissajousGlowToggle = document.getElementById('lissajous-glow-toggle');
        const lissajousThickness = document.getElementById('lissajous-thickness');
        const lissajousThicknessValue = document.getElementById('lissajous-thickness-value');
        const lissajousGlowIntensity = document.getElementById('lissajous-glow-intensity');
        const lissajousGlowIntensityValue = document.getElementById('lissajous-glow-intensity-value');
        const lissajousMonoHue = document.getElementById('lissajous-mono-hue');
        const lissajousMonoHueValue = document.getElementById('lissajous-mono-hue-value');
        
        // Lissajous rotation toggle
        if (lissajousRotationToggle) {
            lissajousRotationToggle.addEventListener('change', (e) => {
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setRotationEnabled(e.target.checked);
                }
            });
        }
        
        // Lissajous breathing toggle
        if (lissajousBreathingToggle) {
            lissajousBreathingToggle.addEventListener('change', (e) => {
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setBreathingEnabled(e.target.checked);
                }
            });
        }
        
        // Lissajous animation speed (only one slider)
        const lissajousAnimationSpeed = document.getElementById('lissajous-animation-speed');
        const lissajousAnimationSpeedValue = document.getElementById('lissajous-animation-speed-value');
        if (lissajousAnimationSpeed && lissajousAnimationSpeedValue) {
            // Sync slider and label with generator value on init
            if (window.lissajousGenerator) {
                const animSpeed = window.lissajousGenerator.animationSpeed;
                lissajousAnimationSpeed.value = animSpeed;
                lissajousAnimationSpeedValue.textContent = parseFloat(animSpeed).toFixed(1);
            }
            lissajousAnimationSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lissajousAnimationSpeedValue.textContent = value.toFixed(1);
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setAnimationSpeed(value);
                }
            });
        }
        
        // Lissajous glow toggle
        if (lissajousGlowToggle) {
            lissajousGlowToggle.addEventListener('change', (e) => {
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setGlowEnabled(e.target.checked);
                }
            });
        }
        
        // Line thickness
        if (lissajousThickness && lissajousThicknessValue) {
            lissajousThickness.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                lissajousThicknessValue.textContent = value;
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setLineThickness(value);
                }
            });
        }
        
        // Glow intensity
        if (lissajousGlowIntensity && lissajousGlowIntensityValue) {
            lissajousGlowIntensity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lissajousGlowIntensityValue.textContent = value.toFixed(1);
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setGlowIntensity(value);
                }
            });
        }
        
        // Color mode - Updated for radio buttons
        const colorModeRadios = document.querySelectorAll('input[name="color-mode"]');
        
        colorModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const mode = e.target.value;
                    const monoColorControls = document.getElementById('mono-color-controls');
                    if (mode === 'mono') {
                        if (monoColorControls) monoColorControls.style.display = 'block';
                    } else {
                        if (monoColorControls) monoColorControls.style.display = 'none';
                    }
                    if (window.lissajousGenerator) {
                        window.lissajousGenerator.setColorMode(mode);
                    }
                }
            });
        });
        
        // Mono color hue
        if (lissajousMonoHue && lissajousMonoHueValue) {
            lissajousMonoHue.addEventListener('input', (e) => {
                const hue = parseInt(e.target.value);
                lissajousMonoHueValue.textContent = hue + '°';
                if (window.lissajousGenerator) {
                    window.lissajousGenerator.setMonoColor(hue / 360, 0.8, 0.6);
                }
            });
        }
        
        // Handle just intonation toggle
        justIntonationToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            if (enabled) {
                rootKeySetting.classList.add('enabled');
            } else {
                rootKeySetting.classList.remove('enabled');
            }
            if (window.audioEngine) {
                window.audioEngine.setJustIntonation(enabled, parseInt(rootKeySelect.value));
            }
        });
        
        // Handle root key selection
        rootKeySelect.addEventListener('change', (e) => {
            const rootKey = parseInt(e.target.value);
            if (window.audioEngine && justIntonationToggle.checked) {
                window.audioEngine.setJustIntonation(true, rootKey);
            }
        });
        
        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            const midiPanel = document.getElementById('midi-panel');
            
            if (!settingsPanel.contains(e.target)) {
                settingsPanel.classList.add('collapsed');
            }
            
            if (midiPanel && !midiPanel.contains(e.target)) {
                midiPanel.classList.add('collapsed');
            }
        });
    }
    
    toggleParticles(show) {
        if (this.particleSystem) {
            this.particleSystem.visible = show;
        }
    }
    
    activateAudio() {
        if (window.audioEngine && window.audioEngine.audioContext.state === 'suspended') {
            window.audioEngine.audioContext.resume();
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.animate();
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        requestAnimationFrame(this.animate.bind(this));
        
        // Calculate FPS and frame time
        const now = performance.now();
        this.stats.frameTime = now - this.stats.lastFrameTime;
        this.stats.lastFrameTime = now;
        this.stats.frameCount++;
        
        // Update FPS every second
        if (now - this.stats.lastStatsUpdate >= 1000) {
            this.stats.fps = this.stats.frameCount;
            this.stats.frameCount = 0;
            this.stats.lastStatsUpdate = now;
        }
        
        // Update Lissajous curves based on currently playing notes
        if (window.lissajousGenerator && window.audioEngine) {
            const currentFrequencies = window.audioEngine.getCurrentFrequencies();
            window.lissajousGenerator.updateCurves(currentFrequencies, this.scene);
        }
        
        // Rotate particle field slowly (only if auto-rotate is enabled)
        if (this.particleSystem && this.autoRotateEnabled) {
            this.particleSystem.rotation.y += 0.001;
            this.particleSystem.rotation.x += 0.0005;
        }
        
        // Auto-rotate camera if enabled (but not while user is dragging)
        if (this.autoRotateEnabled && this.controls && !this.controls.isMouseDown) {
            this.controls.autoRotate(this.autoRotateSpeed);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    toggleAutoRotate() {
        this.autoRotateEnabled = !this.autoRotateEnabled;
        // Sync the checkbox state
        const autoRotateToggle = document.getElementById('auto-rotate-toggle');
        if (autoRotateToggle) {
            autoRotateToggle.checked = this.autoRotateEnabled;
        }
        console.log('Auto-rotate:', this.autoRotateEnabled ? 'ON' : 'OFF');
    }
    
    toggleBothRotations() {
        // Toggle both auto-rotate and curve rotation
        this.autoRotateEnabled = !this.autoRotateEnabled;
        this.curveRotationEnabled = !this.curveRotationEnabled;
        
        // Sync the checkbox states
        const autoRotateToggle = document.getElementById('auto-rotate-toggle');
        const curveRotationToggle = document.getElementById('curve-rotation-toggle');
        
        if (autoRotateToggle) {
            autoRotateToggle.checked = this.autoRotateEnabled;
        }
        if (curveRotationToggle) {
            curveRotationToggle.checked = this.curveRotationEnabled;
        }
        
        // Update the lissajous generator
        if (window.lissajousGenerator) {
            window.lissajousGenerator.setRotationEnabled(this.curveRotationEnabled);
        }
        
        console.log('Rotations:', this.autoRotateEnabled ? 'ON' : 'OFF');
    }
    
    clearCurves() {
        if (window.lissajousGenerator) {
            window.lissajousGenerator.clear(this.scene);
        }
        console.log('Curves cleared');
    }
    
    clearAllNotes() {
        if (window.virtualKeyboard) {
            window.virtualKeyboard.clearAllNotes();
        }
    }
    
    // Create a demo curve for testing
    createDemocurve() {
        if (window.lissajousGenerator) {
            const frequencies = [440, 660, 880]; // A major chord
            window.lissajousGenerator.addCurve(frequencies, this.scene);
        }
    }
    
    startStatsUpdates() {
        if (this.statsInterval) return; // Already running
        
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 100); // Update every 100ms
    }
    
    stopStatsUpdates() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    
    startFpsCounter() {
        if (this.fpsInterval) return; // Already running
        
        this.fpsInterval = setInterval(() => {
            const fpsValue = document.getElementById('fps-value');
            if (fpsValue) {
                fpsValue.textContent = this.stats.fps.toFixed(0);
            }
        }, 500); // Update every 500ms
    }
    
    stopFpsCounter() {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
            this.fpsInterval = null;
        }
    }

    updateStats() {
        // Audio stats
        const activeNotes = window.virtualKeyboard ? window.virtualKeyboard.getActiveNotes().length : 0;
        const audioState = window.audioEngine ? window.audioEngine.audioContext.state : 'unknown';
        const sampleRate = window.audioEngine ? window.audioEngine.audioContext.sampleRate : 0;
        const tuningSystem = window.audioEngine && window.audioEngine.useJustIntonation ? 'Just Intonation' : 'Equal Temperament';
        const rootKey = window.audioEngine ? window.audioEngine.getNoteNameFromMidi(window.audioEngine.rootKey) : 'A';
        
        document.getElementById('stat-notes').textContent = activeNotes;
        document.getElementById('stat-audio-state').textContent = audioState;
        document.getElementById('stat-sample-rate').textContent = sampleRate;
        document.getElementById('stat-tuning').textContent = tuningSystem;
        document.getElementById('stat-root-key').textContent = rootKey;
        
        // Rendering stats
        document.getElementById('stat-fps').textContent = this.stats.fps.toFixed(0);
        document.getElementById('stat-frame-time').textContent = this.stats.frameTime.toFixed(1);
        
        // Count triangles (approximate based on curves and particles)
        const curveCount = window.lissajousGenerator ? window.lissajousGenerator.getActiveCurveCount() : 0;
        const triangleCount = curveCount * 1000 + (this.particleSystem && this.particleSystem.visible ? 200 : 0);
        const tRange = window.lissajousGenerator ? window.lissajousGenerator.tRange : 4.0;
        const animSpeed = window.lissajousGenerator ? window.lissajousGenerator.animationSpeed : 1.5;
        
        document.getElementById('stat-triangles').textContent = triangleCount;
        document.getElementById('stat-curves').textContent = curveCount;
        document.getElementById('stat-t-range').textContent = tRange.toFixed(1);
        document.getElementById('stat-anim-speed').textContent = animSpeed.toFixed(1);
        
        // Camera stats
        if (this.controls) {
            const pos = this.camera.position;
            document.getElementById('stat-camera-pos').textContent = 
                `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
            document.getElementById('stat-camera-dist').textContent = this.controls.distance.toFixed(1);
            document.getElementById('stat-camera-theta').textContent = this.controls.theta.toFixed(2);
            document.getElementById('stat-camera-phi').textContent = this.controls.phi.toFixed(2);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.waveGenerator = new WaveGenerator();
    
    // Show instructions
    console.log(`
🌊 Wave Generator Controls:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎹 Keyboard: A-J keys to play notes
🖱️  Mouse: Drag to rotate camera
🔍 Wheel: Zoom in/out
⌨️  R: Reset camera
⌨️  C: Clear all curves
⌨️  Space: Toggle auto-rotate
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});
