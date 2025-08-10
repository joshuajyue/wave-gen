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

// Export for use in main.js
window.CameraControls = CameraControls;
