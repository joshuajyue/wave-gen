// Mouse and touch controls for 3D navigation
class CameraControls {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.canvas = renderer.domElement;
        
        // Control state
        this.isMouseDown = false;
        this.mousePosition = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };
        
        // Camera orbit parameters
        this.target = new THREE.Vector3(0, 0, 0);
        this.distance = 25;
        this.phi = Math.PI / 4; // Vertical angle (0 to PI)
        this.theta = Math.PI / 4; // Horizontal angle
        
        // Control settings
        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.1;
        this.minDistance = 5;
        this.maxDistance = 50;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.update(); // Initial update
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle mouse leaving canvas
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    }
    
    onMouseDown(event) {
        this.isMouseDown = true;
        this.updateMousePosition(event.clientX, event.clientY);
        this.lastMousePosition = { ...this.mousePosition };
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(event) {
        this.updateMousePosition(event.clientX, event.clientY);
        
        if (this.isMouseDown) {
            this.handleRotation();
        }
    }
    
    onMouseUp(event) {
        this.isMouseDown = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? 1 : -1;
        this.distance += delta * this.zoomSpeed * this.distance * 0.1;
        this.distance = THREE.MathUtils.clamp(
            this.distance,
            this.minDistance,
            this.maxDistance
        );
        
        this.update();
    }
    
    // Touch events
    onTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    onTouchEnd(event) {
        this.onMouseUp(event);
    }
    
    updateMousePosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = clientX - rect.left;
        this.mousePosition.y = clientY - rect.top;
    }
    
    handleRotation() {
        const deltaX = this.mousePosition.x - this.lastMousePosition.x;
        const deltaY = this.mousePosition.y - this.lastMousePosition.y;
        
        // Update angles
        this.theta -= deltaX * this.rotateSpeed;
        this.phi += deltaY * this.rotateSpeed;
        
        // Keep theta in reasonable range to avoid floating point issues
        this.theta = this.theta % (Math.PI * 2);
        
        // Constrain phi to prevent gimbal lock and camera flipping
        // Keep phi between a small epsilon and PI - epsilon
        const epsilon = 0.001;
        this.phi = THREE.MathUtils.clamp(this.phi, epsilon, Math.PI - epsilon);
        
        this.lastMousePosition = { ...this.mousePosition };
        this.update();
    }
    
    update() {
        // Convert spherical coordinates to cartesian position
        const x = this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        const y = this.distance * Math.cos(this.phi);
        const z = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
        
        this.camera.position.set(x, y, z);
        this.camera.position.add(this.target);
        this.camera.lookAt(this.target);
    }
    
    // Auto-rotate camera slowly
    autoRotate(speed = 0.001) {
        this.theta += speed;
        this.update();
    }
    
    // Reset camera to initial position
    reset() {
        this.distance = 25;
        this.phi = Math.PI / 4;
        this.theta = Math.PI / 4;
        this.target.set(0, 0, 0);
        this.update();
    }
    
    // Smooth camera movement to a new position
    animateTo(newPosition, duration = 1000) {
        const startPosition = this.camera.position.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            const currentPosition = startPosition.clone().lerp(newPosition, easeProgress);
            this.camera.position.copy(currentPosition);
            this.camera.lookAt(this.target);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Update spherical coordinates to match final position
                const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
                this.distance = offset.length();
                this.theta = Math.atan2(offset.z, offset.x);
                this.phi = Math.acos(offset.y / this.distance);
            }
        };
        
        animate();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

// MIDI file controls
class MIDIControls {
    constructor() {
        this.midiParser = new MIDIParser();
        this.midiPlayer = null;
        this.fileInput = null;
        this.playButton = null;
        this.pauseButton = null;
        this.stopButton = null;
        this.positionDisplay = null;
        this.trackInfo = null;
        this.controlsContainer = null;
        
        this.init();
    }
    
    init() {
        this.setupElements();
        this.setupEventListeners();
        
        // Initialize MIDI player when audio engine is ready
        if (window.audioEngine) {
            this.midiPlayer = new MIDIPlayer(window.audioEngine);
            this.setupPlayerEvents();
        } else {
            // Wait for audio engine to be initialized
            setTimeout(() => this.init(), 100);
        }
    }
    
    setupElements() {
        this.fileInput = document.getElementById('midi-file-input');
        this.playButton = document.getElementById('midi-play');
        this.pauseButton = document.getElementById('midi-pause');
        this.stopButton = document.getElementById('midi-stop');
        this.positionDisplay = document.getElementById('midi-position');
        this.trackInfo = document.getElementById('midi-track-info');
        this.controlsContainer = document.getElementById('midi-controls');
        this.midiPanel = document.getElementById('midi-panel');
        this.midiToggle = document.getElementById('midi-toggle');
        this.trackSelect = document.getElementById('midi-track-select');
        this.trackDropdown = document.getElementById('midi-track-dropdown');
    }
    
    setupEventListeners() {
        // MIDI panel toggle
        if (this.midiToggle) {
            this.midiToggle.addEventListener('click', () => {
                this.midiPanel.classList.toggle('collapsed');
            });
        }
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        if (this.trackDropdown) {
            this.trackDropdown.addEventListener('change', (e) => {
                if (this.midiPlayer) {
                    this.midiPlayer.applyTrackFilter(e.target.value);
                    const trackInfo = this.midiPlayer.getTrackInfo();
                    this.displayTrackInfo(trackInfo);
                }
            });
        }
        
        if (this.playButton) {
            this.playButton.addEventListener('click', () => {
                if (this.midiPlayer) {
                    this.midiPlayer.play();
                    this.updateButtonStates();
                }
            });
        }
        
        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => {
                if (this.midiPlayer) {
                    this.midiPlayer.pause();
                    this.updateButtonStates();
                }
            });
        }
        
        if (this.stopButton) {
            this.stopButton.addEventListener('click', () => {
                if (this.midiPlayer) {
                    this.midiPlayer.stop();
                    this.updateButtonStates();
                }
            });
        }
    }
    
    setupPlayerEvents() {
        if (this.midiPlayer) {
            this.midiPlayer.onTimeUpdate = (currentTime, duration) => {
                this.updateTimeDisplay(currentTime, duration);
            };
            
            this.midiPlayer.onEnd = () => {
                this.updateButtonStates();
            };
        }
    }
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const events = this.midiParser.parse(arrayBuffer);
            
            if (this.midiPlayer) {
                const trackInfo = this.midiPlayer.load(events);
                this.populateTrackSelector(this.midiPlayer.getAvailableTracks());
                this.displayTrackInfo(trackInfo);
                this.showControls();
            }
            
        } catch (error) {
            console.error('Error parsing MIDI file:', error);
            alert('Error loading MIDI file. Please ensure it\'s a valid MIDI file.');
        }
    }
    
    populateTrackSelector(availableTracks) {
        if (!this.trackDropdown) return;
        
        // Clear existing options except "All Tracks"
        this.trackDropdown.innerHTML = '<option value="all">All Tracks</option>';
        
        // Add track options
        availableTracks.forEach(({ track, noteCount }) => {
            const option = document.createElement('option');
            option.value = track.toString();
            option.textContent = `Track ${track + 1} (${noteCount} notes)`;
            this.trackDropdown.appendChild(option);
        });
        
        // Show track selector if there are multiple tracks
        if (this.trackSelect && availableTracks.length > 1) {
            this.trackSelect.style.display = 'block';
        }
    }
    
    displayTrackInfo(info) {
        if (this.trackInfo) {
            const duration = this.formatTime(info.duration);
            const noteRange = this.getMidiNoteName(info.noteRange.min) + 
                            ' - ' + this.getMidiNoteName(info.noteRange.max);
            
            let trackDisplay = '';
            if (info.selectedTrack === 'all') {
                trackDisplay = `All ${info.tracks} tracks`;
            } else {
                trackDisplay = `Track ${parseInt(info.selectedTrack) + 1}`;
            }
            
            this.trackInfo.innerHTML = `
                <div><strong>Duration:</strong> ${duration}</div>
                <div><strong>Playing:</strong> ${trackDisplay}</div>
                <div><strong>Notes:</strong> ${info.noteCount}${info.totalNoteCount !== info.noteCount ? ` of ${info.totalNoteCount}` : ''}</div>
                <div><strong>Range:</strong> ${noteRange}</div>
            `;
            this.trackInfo.parentElement.style.display = 'block';
        }
    }
    
    showControls() {
        if (this.controlsContainer) {
            this.controlsContainer.style.display = 'block';
        }
    }
    
    updateButtonStates() {
        if (!this.midiPlayer) return;
        
        const isPlaying = this.midiPlayer.isPlaying && !this.midiPlayer.isPaused;
        const isPaused = this.midiPlayer.isPaused;
        
        if (this.playButton) {
            this.playButton.disabled = isPlaying;
            
            // Update button text using the span element
            const textSpan = this.playButton.querySelector('span');
            if (textSpan) {
                textSpan.textContent = isPaused ? 'Resume' : 'Play';
            }
        }
        
        if (this.pauseButton) {
            this.pauseButton.disabled = !isPlaying;
        }
        
        if (this.stopButton) {
            this.stopButton.disabled = !isPlaying && !isPaused;
        }
        
        console.log('Button states updated - Playing:', isPlaying, 'Paused:', isPaused);
    }
    
    updateTimeDisplay(currentTime, duration) {
        if (this.positionDisplay) {
            const current = this.formatTime(currentTime);
            const total = this.formatTime(duration);
            this.positionDisplay.textContent = `${current} / ${total}`;
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    getMidiNoteName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const note = noteNames[midiNote % 12];
        return `${note}${octave}`;
    }
}

// Export for use in main.js
window.CameraControls = CameraControls;
window.MIDIControls = MIDIControls;
