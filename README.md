# Wave Generator - 3D Lissajous Renderer

A interactive 3D Lissajous curve renderer with a virtual keyboard for playing chords. Users can drag to look around and explore beautiful wave patterns in 3D space.

## Features

- 🌊 Real-time 3D Lissajous curve generation
- 🎹 Interactive keyboard spanning two octaves (A-S-D-F-G-H-J for first octave, K-L-;-' for extended range)
- 🖱️ Mouse drag controls for 3D navigation
- 🎵 Audio synthesis with visual feedback
- ✨ Beautiful wave pattern visualization

## How to Build

### Prerequisites
- Modern web browser with WebGL support
- Basic knowledge of JavaScript, HTML5 Canvas, and Web Audio API

### Tech Stack
- **Three.js** - 3D rendering and scene management
- **Web Audio API** - Audio synthesis and processing
- **HTML5 Canvas** - 2D keyboard interface
- **JavaScript ES6+** - Core logic

### Project Structure
```
wave-gen/
├── index.html          # Main HTML file
├── style.css           # Styling
├── js/
│   ├── main.js         # Entry point and scene setup
│   ├── lissajous.js    # Lissajous curve generation
│   ├── keyboard.js     # Virtual keyboard logic
│   ├── audio.js        # Web Audio API handling
│   └── controls.js     # Mouse/touch controls
└── README.md
```

### Getting Started

1. **Set up the basic HTML structure** with Three.js
2. **Create the 3D scene** with camera, lights, and renderer
3. **Implement Lissajous curve math** using parametric equations
4. **Build the virtual keyboard** with chord detection
5. **Connect audio synthesis** to visual parameters
6. **Add mouse controls** for camera movement

### Key Concepts

#### Lissajous Curves
Parametric equations: `x = A*sin(at + δ)`, `y = B*sin(bt)`, `z = C*sin(ct + φ)`
- Adjust frequency ratios (a:b:c) for different patterns
- Phase differences (δ, φ) create rotation effects
- Amplitudes (A, B, C) control curve size

#### Audio-Visual Mapping
- Chord frequencies → curve parameters
- Note velocity → curve brightness/thickness
- Harmonic content → color variations
- Time → curve animation and trail effects

Want me to create the initial code files to get you started?