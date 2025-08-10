// Lissajous curve generation and 3D math
class LissajousGenerator {
    constructor() {
        this.activeCurves = new Map(); // Map note combinations to curve objects
        this.tRange = 4; // Default t range (4π)
        this.rotationEnabled = true; // Default curve rotation enabled
    }
    
    // Set the t range for curve generation
    setTRange(range) {
        this.tRange = range;
        // Regenerate all active curves with new t range
        this.regenerateActiveCurves();
    }
    
    // Set curve rotation enabled/disabled
    setRotationEnabled(enabled) {
        this.rotationEnabled = enabled;
    }
    
    // Regenerate all active curves (called when t range changes)
    regenerateActiveCurves() {
        // Get current state and regenerate
        const currentFrequencies = window.audioEngine ? window.audioEngine.getCurrentFrequencies() : [];
        if (currentFrequencies.length > 0 && window.scene) {
            this.updateCurves(currentFrequencies, window.scene);
        }
    }
    
    // Create a new Lissajous curve based on frequencies
    createCurve(frequencies, colors = null) {
        if (frequencies.length === 0) return null;
        
        // Use up to 3 frequencies for X, Y, Z axes
        const freq = {
            x: frequencies[0] || 440,
            y: frequencies[1] || frequencies[0] * 1.5 || 660,
            z: frequencies[2] || frequencies[0] * 2 || 880
        };
        
        // Normalize frequencies to create interesting ratios
        const baseFreq = Math.min(...Object.values(freq));
        const ratios = {
            x: freq.x / baseFreq,
            y: freq.y / baseFreq,
            z: freq.z / baseFreq
        };
        
        // Generate curve points
        const points = [];
        const numPoints = 2000; // Increased for smoother curves
        const scale = 5; // Size of the curve
        
        for (let i = 0; i < numPoints; i++) {
            const t = (i / numPoints) * Math.PI * this.tRange; // Use configurable t range
            
            const x = scale * Math.sin(ratios.x * t);
            const y = scale * Math.sin(ratios.y * t + Math.PI / 4); // Phase offset
            const z = scale * Math.sin(ratios.z * t + Math.PI / 2); // Different phase
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create geometry and material
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Color based on frequency or use provided colors
        const hue = colors ? colors.h : (freq.x % 360) / 360;
        const saturation = colors ? colors.s : 0.8;
        const lightness = colors ? colors.l : 0.6;
        
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHSL(hue, saturation, lightness),
            linewidth: 2,
            transparent: true,
            opacity: 0.9
        });
        
        const curve = new THREE.Line(geometry, material);
        
        // Store curve data
        const curveData = {
            mesh: curve,
            frequencies: freq,
            ratios: ratios,
            startTime: Date.now(),
            baseColor: { h: hue, s: saturation, l: lightness }
        };
        
        return curveData;
    }
    
    // Update curves for currently playing notes
    updateCurves(currentFrequencies, scene) {
        // Create a key for the current chord
        const chordKey = currentFrequencies.sort().join(',');
        
        // Remove all curves that don't match current chord
        for (const [key, curveData] of this.activeCurves) {
            if (key !== chordKey) {
                scene.remove(curveData.mesh);
                curveData.mesh.geometry.dispose();
                curveData.mesh.material.dispose();
                this.activeCurves.delete(key);
            }
        }
        
        // Add or update curve for current chord
        if (currentFrequencies.length > 0) {
            if (!this.activeCurves.has(chordKey)) {
                // Create new curve for this chord
                const colors = {
                    h: (currentFrequencies[0] % 360) / 360,
                    s: 0.8,
                    l: 0.6
                };
                
                const newCurve = this.createCurve(currentFrequencies, colors);
                if (newCurve) {
                    this.activeCurves.set(chordKey, newCurve);
                    scene.add(newCurve.mesh);
                }
            }
            
            // Animate the active curve
            const activeCurve = this.activeCurves.get(chordKey);
            if (activeCurve) {
                this.animateCurve(activeCurve, (Date.now() - activeCurve.startTime) / 1000);
            }
        }
    }
    
    // Animate a single curve
    animateCurve(curveData, time) {
        const { mesh, ratios } = curveData;
        
        // Rotate the curve based on frequency ratios (if enabled)
        if (this.rotationEnabled) {
            mesh.rotation.x = time * 0.1 * ratios.x;
            mesh.rotation.y = time * 0.15 * ratios.y;
            mesh.rotation.z = time * 0.05 * ratios.z;
        }
        
        // Subtle breathing effect
        const breathe = 1 + 0.05 * Math.sin(time * 2);
        mesh.scale.setScalar(breathe);
    }
    
    // Clear all curves immediately
    clear(scene) {
        for (const [key, curveData] of this.activeCurves) {
            scene.remove(curveData.mesh);
            curveData.mesh.geometry.dispose();
            curveData.mesh.material.dispose();
        }
        this.activeCurves.clear();
    }
    
    // Get the number of active curves
    getActiveCurveCount() {
        return this.activeCurves.size;
    }
}

// Global Lissajous generator
window.lissajousGenerator = new LissajousGenerator();
