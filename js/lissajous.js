// Lissajous curve generation and 3D math
class LissajousGenerator {
    constructor() {
        this.activeCurves = new Map(); // Map note combinations to curve objects
        this.tRange = 4; // Default t range (4π)
        this.rotationEnabled = true; // Default curve rotation enabled
        this.breathingEnabled = true; // Default breathing animation enabled
        this.lineThickness = 2; // Line thickness (1-10)
        this.colorMode = 'multi'; // 'multi' or 'mono'
        this.monoColor = { h: 0.6, s: 0.8, l: 0.6 }; // Default mono color (blue)
        this.glowEnabled = false; // Glow effect
        this.glowIntensity = 1.0; // Glow intensity (0-2)
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
    
    // Set breathing animation enabled/disabled
    setBreathingEnabled(enabled) {
        this.breathingEnabled = enabled;
    }
    
    // Set line thickness (1-10)
    setLineThickness(thickness) {
        this.lineThickness = Math.max(1, Math.min(10, thickness));
        this.regenerateActiveCurves();
    }
    
    // Set color mode ('multi' or 'mono')
    setColorMode(mode) {
        this.colorMode = mode;
        this.regenerateActiveCurves();
    }
    
    // Set mono color (hue 0-1, saturation 0-1, lightness 0-1)
    setMonoColor(h, s, l) {
        this.monoColor = { h, s, l };
        if (this.colorMode === 'mono') {
            this.regenerateActiveCurves();
        }
    }
    
    // Set glow enabled/disabled
    setGlowEnabled(enabled) {
        this.glowEnabled = enabled;
        this.regenerateActiveCurves();
    }
    
    // Set glow intensity (0-2)
    setGlowIntensity(intensity) {
        this.glowIntensity = Math.max(0, Math.min(2, intensity));
        if (this.glowEnabled) {
            this.regenerateActiveCurves();
        }
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
        
        // Group frequencies into X, Y, Z axes: x = 1,4,7; y = 2,5,8; z = 3,6,9
        const xFreqs = frequencies.filter((_, i) => i % 3 === 0); // indices 0,3,6,9...
        const yFreqs = frequencies.filter((_, i) => i % 3 === 1); // indices 1,4,7,10...
        const zFreqs = frequencies.filter((_, i) => i % 3 === 2); // indices 2,5,8,11...
        
        // Calculate combined frequencies using constructive interference
        const primaryFreq = frequencies[0] || 440; // Use first frequency as base
        const freq = {
            x: this.combineFrequencies(xFreqs) || primaryFreq,
            y: this.combineFrequencies(yFreqs) || primaryFreq * 1.5,  // 1.5x the base frequency
            z: this.combineFrequencies(zFreqs) || primaryFreq * 2     // 2x the base frequency
        };
        
        // Normalize frequencies to create interesting ratios
        const baseFreq = Math.min(...Object.values(freq));
        const ratios = {
            x: freq.x / baseFreq,
            y: freq.y / baseFreq,
            z: freq.z / baseFreq
        };
        
        // Generate curve points with interference
        const points = [];
        const numPoints = 2000;
        const scale = 5;
        
        for (let i = 0; i < numPoints; i++) {
            const t = (i / numPoints) * Math.PI * this.tRange;
            
            // Base coordinates with primary frequency
            let x = scale * Math.sin(ratios.x * t);
            let y = scale * Math.sin(ratios.y * t + Math.PI / 4);
            let z = scale * Math.sin(ratios.z * t + Math.PI / 2);
            
            // Add interference from additional frequencies
            x += this.calculateInterference(xFreqs, t, baseFreq, scale * 0.3);
            y += this.calculateInterference(yFreqs, t, baseFreq, scale * 0.3);
            z += this.calculateInterference(zFreqs, t, baseFreq, scale * 0.3);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create geometry and material
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Color based on mode
        let hue, saturation, lightness;
        if (this.colorMode === 'mono') {
            hue = this.monoColor.h;
            saturation = this.monoColor.s;
            lightness = this.monoColor.l;
        } else {
            // Multi-color mode - use frequency-based coloring
            hue = colors ? colors.h : this.calculateComplexHue(frequencies);
            saturation = colors ? colors.s : Math.min(0.9, 0.6 + frequencies.length * 0.05);
            lightness = colors ? colors.l : 0.6;
        }
        
        // Create material with glow if enabled
        const materialProps = {
            color: new THREE.Color().setHSL(hue, saturation, lightness),
            linewidth: this.lineThickness,
            transparent: true,
            opacity: 0.9
        };
        
        let material;
        if (this.glowEnabled) {
            // Create glowing material using MeshBasicMaterial for emissive properties
            material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(hue, saturation, lightness),
                transparent: true,
                opacity: 0.9,
                emissive: new THREE.Color().setHSL(hue, saturation * 0.5, lightness * this.glowIntensity)
            });
            
            // For lines, we'll create a tube geometry to get the glow effect
            const tubeGeometry = new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3(points),
                Math.floor(points.length / 4), // segments
                this.lineThickness * 0.02, // radius
                8, // radial segments
                false // closed
            );
            
            const curve = new THREE.Mesh(tubeGeometry, material);
            geometry.dispose(); // Clean up the line geometry
            
            const curveData = {
                mesh: curve,
                frequencies: freq,
                ratios: ratios,
                allFrequencies: frequencies,
                startTime: Date.now(),
                baseColor: { h: hue, s: saturation, l: lightness }
            };
            
            return curveData;
        } else {
            // Standard line material
            material = new THREE.LineBasicMaterial(materialProps);
        }
        
        const curve = new THREE.Line(geometry, material);
        
        // Store curve data
        const curveData = {
            mesh: curve,
            frequencies: freq,
            ratios: ratios,
            allFrequencies: frequencies,
            startTime: Date.now(),
            baseColor: { h: hue, s: saturation, l: lightness }
        };
        
        return curveData;
    }
    
    // Combine multiple frequencies into one using harmonic mean
    combineFrequencies(freqs) {
        if (freqs.length === 0) return null;
        if (freqs.length === 1) return freqs[0];
        
        // Use harmonic mean for frequency combination
        const harmonicMean = freqs.length / freqs.reduce((sum, f) => sum + 1/f, 0);
        return harmonicMean;
    }
    
    // Calculate interference effects from multiple frequencies
    calculateInterference(freqs, t, baseFreq, amplitude) {
        if (freqs.length <= 1) return 0;
        
        let interference = 0;
        for (let i = 1; i < freqs.length; i++) {
            const ratio = freqs[i] / baseFreq;
            const phase = (i * Math.PI) / freqs.length;
            const weight = 1 / Math.sqrt(freqs.length); // Normalize amplitude
            interference += weight * amplitude * Math.sin(ratio * t + phase);
        }
        return interference;
    }
    
    // Calculate hue based on frequency complexity
    calculateComplexHue(frequencies) {
        if (frequencies.length === 0) return 0;
        
        // Use the sum of all frequencies, modulated by count
        const freqSum = frequencies.reduce((sum, f) => sum + f, 0);
        const avgFreq = freqSum / frequencies.length;
        const complexity = Math.log2(frequencies.length + 1);
        
        return ((avgFreq * complexity) % 360) / 360;
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
        
        // Subtle breathing effect (if enabled)
        if (this.breathingEnabled) {
            const breathe = 1 + 0.05 * Math.sin(time * 2);
            mesh.scale.setScalar(breathe);
        } else {
            // Ensure scale is normalized when breathing is disabled
            mesh.scale.setScalar(1);
        }
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
