# Wave Generator - 3D Lissajous Renderer

An interactive 3D Lissajous curve renderer with a virtual piano keyboard. Play notes and chords to generate beautiful wave patterns in 3D space that you can explore with mouse controls.

## Features

- Real-time 3D Lissajous curve generation based on played notes
- Virtual piano keyboard (supports multiple octaves and sustain)
- 3D camera controls with mouse/trackball navigation
- Web Audio synthesis with equal temperament and just intonation options
- Configurable curve parameters and visual settings
- Debug stats panel for performance monitoring

## Controls

**Keyboard:**
- `A-J` keys: Play notes (C through B)
- `K-L-;-'` keys: Extended octave
- `Z/X`: Change octaves
- `Space`: Toggle sustain mode

**Mouse:**
- Drag to rotate camera
- Scroll to zoom
- Settings panel (top-right) for advanced options

## How to Run

Just open `index.html` in a modern web browser. No build process required.

## Technical Details

**Built with:**
- Three.js for 3D rendering
- Web Audio API for sound synthesis
- Vanilla JavaScript (no framework dependencies)

**File Structure:**
```
wave-gen/
├── index.html          # Main page
├── style.css           # Styles
├── js/
│   ├── main.js         # App initialization and scene setup
│   ├── lissajous.js    # Curve math and generation
│   ├── keyboard.js     # Piano keyboard logic
│   ├── audio.js        # Audio engine and synthesis
│   └── controls.js     # Camera controls
└── README.md
```

## Lissajous Curves

The curves are generated using parametric equations:
- `x = sin(ratio_x * t)`
- `y = sin(ratio_y * t + π/4)`  
- `z = sin(ratio_z * t + π/2)`

Where the ratios are derived from the frequency relationships of the notes being played. Different chord combinations create different curve patterns.

## Audio Features

- **Equal Temperament**: Standard piano tuning (default)
- **Just Intonation**: Pure harmonic ratios for cleaner intervals
- **Sustain Mode**: Hold notes even after releasing keys
- **Extended Range**: MIDI notes C0 to F9

The visual curves update in real-time as you play, with each combination of notes creating unique 3D shapes.
