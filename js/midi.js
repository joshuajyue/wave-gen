// MIDI file parser and player
class MIDIParser {
    constructor() {
        this.tracks = [];
        this.ticksPerQuarter = 96;
        this.tempo = 500000; // Default tempo (microseconds per quarter note)
        this.timeSignature = [4, 4]; // Default time signature
    }

    parse(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let offset = 0;

        // console.log('Parsing MIDI file, size:', arrayBuffer.byteLength);

        // Parse header chunk
        const headerChunk = this.parseHeaderChunk(view, offset);
        offset += headerChunk.length + 8;

        this.format = headerChunk.format;
        this.trackCount = headerChunk.trackCount;
        this.ticksPerQuarter = headerChunk.ticksPerQuarter;

        // console.log('MIDI Header:', {
        //     format: this.format,
        //     trackCount: this.trackCount,
        //     ticksPerQuarter: this.ticksPerQuarter
        // });

        // Parse track chunks
        this.tracks = [];
        for (let i = 0; i < this.trackCount; i++) {
            const track = this.parseTrackChunk(view, offset);
            this.tracks.push(track);
            offset += track.length + 8;
            // console.log(`Track ${i}: ${track.events.length} events`);
        }

        return this.processEvents();
    }

    parseHeaderChunk(view, offset) {
        // Check for "MThd" signature
        const signature = this.readString(view, offset, 4);
        if (signature !== 'MThd') {
            throw new Error('Invalid MIDI file: Missing MThd signature');
        }

        const length = view.getUint32(offset + 4);
        const format = view.getUint16(offset + 8);
        const trackCount = view.getUint16(offset + 10);
        const ticksPerQuarter = view.getUint16(offset + 12);

        return { length, format, trackCount, ticksPerQuarter };
    }

    parseTrackChunk(view, offset) {
        // Check for "MTrk" signature
        const signature = this.readString(view, offset, 4);
        if (signature !== 'MTrk') {
            throw new Error('Invalid MIDI file: Missing MTrk signature');
        }

        const length = view.getUint32(offset + 4);
        const events = [];
        let trackOffset = offset + 8;
        const trackEnd = trackOffset + length;
        let runningStatus = 0;
        let currentTime = 0;

        while (trackOffset < trackEnd) {
            // Parse variable-length delta time
            const deltaTime = this.readVariableLength(view, trackOffset);
            trackOffset += deltaTime.bytesRead;
            currentTime += deltaTime.value;

            // Parse event
            const event = this.parseEvent(view, trackOffset, runningStatus, currentTime);
            events.push(event);
            trackOffset += event.bytesRead;
            
            if (event.type === 'noteOn' || event.type === 'noteOff' || event.type === 'controlChange') {
                runningStatus = event.status;
            }
        }

        return { length, events };
    }

    parseEvent(view, offset, runningStatus, time) {
        let status = view.getUint8(offset);
        let bytesRead = 1;
        let event = { time };

        // Handle running status
        if (status < 0x80) {
            status = runningStatus;
            bytesRead = 0;
        }

        const channel = status & 0x0F;
        const messageType = (status & 0xF0) >> 4;

        switch (messageType) {
            case 8: // Note Off
                event.type = 'noteOff';
                event.channel = channel;
                event.note = view.getUint8(offset + bytesRead);
                event.velocity = view.getUint8(offset + bytesRead + 1);
                event.status = status;
                bytesRead += 2;
                break;

            case 9: // Note On
                const velocity = view.getUint8(offset + bytesRead + 1);
                event.type = velocity === 0 ? 'noteOff' : 'noteOn';
                event.channel = channel;
                event.note = view.getUint8(offset + bytesRead);
                event.velocity = velocity;
                event.status = status;
                bytesRead += 2;
                break;

            case 11: // Control Change
                event.type = 'controlChange';
                event.channel = channel;
                event.controller = view.getUint8(offset + bytesRead);
                event.value = view.getUint8(offset + bytesRead + 1);
                event.status = status;
                bytesRead += 2;
                break;

            case 15: // Meta events
                if (status === 0xFF) {
                    const metaType = view.getUint8(offset + bytesRead);
                    bytesRead++;
                    
                    const length = this.readVariableLength(view, offset + bytesRead);
                    bytesRead += length.bytesRead;

                    switch (metaType) {
                        case 0x51: // Set Tempo
                            if (length.value === 3) {
                                const tempo = (view.getUint8(offset + bytesRead) << 16) |
                                            (view.getUint8(offset + bytesRead + 1) << 8) |
                                            view.getUint8(offset + bytesRead + 2);
                                event.type = 'tempo';
                                event.tempo = tempo;
                            }
                            break;

                        case 0x58: // Time Signature
                            if (length.value === 4) {
                                event.type = 'timeSignature';
                                event.numerator = view.getUint8(offset + bytesRead);
                                event.denominator = Math.pow(2, view.getUint8(offset + bytesRead + 1));
                            }
                            break;

                        case 0x2F: // End of Track
                            event.type = 'endOfTrack';
                            break;

                        default:
                            event.type = 'meta';
                            event.metaType = metaType;
                            break;
                    }
                    bytesRead += length.value;
                } else {
                    // System exclusive or other
                    event.type = 'sysex';
                    bytesRead++;
                }
                break;

            default:
                // Skip unknown events
                event.type = 'unknown';
                bytesRead++;
                break;
        }

        event.bytesRead = bytesRead;
        return event;
    }

    readVariableLength(view, offset) {
        let value = 0;
        let bytesRead = 0;
        let byte;

        do {
            byte = view.getUint8(offset + bytesRead);
            value = (value << 7) | (byte & 0x7F);
            bytesRead++;
        } while (byte & 0x80);

        return { value, bytesRead };
    }

    readString(view, offset, length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += String.fromCharCode(view.getUint8(offset + i));
        }
        return result;
    }

    processEvents() {
        // Merge all tracks and sort by time
        const allEvents = [];
        
        this.tracks.forEach((track, trackIndex) => {
            track.events.forEach(event => {
                event.track = trackIndex;
                allEvents.push(event);
            });
        });

        // Sort by time
        allEvents.sort((a, b) => a.time - b.time);

        // Convert ticks to seconds with better precision
        let currentTempo = this.tempo;
        let currentTime = 0;
        let lastTickTime = 0;

        allEvents.forEach(event => {
            if (event.type === 'tempo') {
                currentTempo = event.tempo;
            }

            // Convert tick time to seconds
            const tickDelta = event.time - lastTickTime;
            // More precise calculation: (ticks / ticksPerQuarter) * (tempo in microseconds / 1,000,000)
            const quartersElapsed = tickDelta / this.ticksPerQuarter;
            const secondsDelta = quartersElapsed * (currentTempo / 1000000);
            currentTime += secondsDelta;
            event.seconds = currentTime;
            lastTickTime = event.time;
        });

        // console.log('Processed events:', allEvents.length);
        // console.log('Duration:', currentTime, 'seconds');
        // console.log('Sample events:', allEvents.slice(0, 10));

        return allEvents;
    }
}

class MIDIPlayer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.allEvents = []; // Store all events
        this.events = []; // Filtered events for playback
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.eventIndex = 0;
        this.playbackInterval = null;
        this.duration = 0;
        this.onTimeUpdate = null;
        this.onEnd = null;
        this.activeNotes = new Set(); // Track currently playing notes
        this.selectedTrack = 'all'; // Current track selection
    }

    load(events) {
        // Store all events
        this.allEvents = events.filter(event => 
            event.type === 'noteOn' || 
            event.type === 'noteOff' || 
            event.type === 'tempo' ||
            event.type === 'timeSignature'
        );
        
        // Apply current track filter
        this.applyTrackFilter(this.selectedTrack);
        
        this.reset();
        return this.getTrackInfo();
    }

    applyTrackFilter(trackFilter) {
        this.selectedTrack = trackFilter;
        
        // Filter events by track
        let filteredEvents;
        if (trackFilter === 'all') {
            filteredEvents = [...this.allEvents];
        } else {
            const trackIndex = parseInt(trackFilter);
            filteredEvents = this.allEvents.filter(event => 
                event.track === trackIndex || 
                event.type === 'tempo' || 
                event.type === 'timeSignature'
            );
        }
        
        // Sort events by time and then by type (noteOff before noteOn for same time/note)
        filteredEvents.sort((a, b) => {
            if (a.seconds !== b.seconds) return a.seconds - b.seconds;
            if (a.note !== b.note) return 0;
            // For same time and note, process noteOff before noteOn
            if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
            if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
            return 0;
        });
        
        // Advanced deduplication: group by time and note, then clean up sequences
        const deduplicatedEvents = [];
        const eventGroups = new Map();
        
        // Group events by timestamp (rounded to nearest millisecond)
        filteredEvents.forEach(event => {
            const timeKey = Math.round(event.seconds * 1000);
            if (!eventGroups.has(timeKey)) {
                eventGroups.set(timeKey, []);
            }
            eventGroups.get(timeKey).push(event);
        });
        
        // Process each time group to remove true duplicates and conflicting events
        for (const [timeKey, eventsAtTime] of eventGroups) {
            const noteStates = new Map(); // note -> last event type
            
            eventsAtTime.forEach(event => {
                if (event.type !== 'noteOn' && event.type !== 'noteOff') {
                    deduplicatedEvents.push(event);
                    return;
                }
                
                const lastEventType = noteStates.get(event.note);
                
                // Debug: log what we're processing
                if (event.note === 67 && event.seconds < 5) { // Debug first few seconds of note 67
                    console.log(`Time ${event.seconds.toFixed(3)}: ${event.type} note ${event.note}, last was: ${lastEventType || 'none'}`);
                }
                
                // Only add the event if it creates a meaningful state change
                if (!lastEventType || 
                    (lastEventType === 'noteOff' && event.type === 'noteOn') ||
                    (lastEventType === 'noteOn' && event.type === 'noteOff')) {
                    deduplicatedEvents.push(event);
                    noteStates.set(event.note, event.type);
                    
                    if (event.note === 67 && event.seconds < 5) {
                        console.log(`  -> KEPT event`);
                    }
                } else {
                    if (event.note === 67 && event.seconds < 5) {
                        console.log(`  -> SKIPPED event (redundant)`);
                    }
                }
                // Skip redundant events (noteOn after noteOn, noteOff after noteOff)
            });
        }
        
        // Sort the final events by time
        deduplicatedEvents.sort((a, b) => a.seconds - b.seconds);
        
        // Debug: check for problematic sequences and extend very short notes
        const minNoteDuration = 0.05; // Minimum 50ms note duration
        let shortNotesFound = 0;
        let totalNotes = 0;
        
        for (let i = 0; i < deduplicatedEvents.length - 1; i++) {
            const current = deduplicatedEvents[i];
            
            if (current.type === 'noteOn') {
                // Find the corresponding noteOff
                for (let j = i + 1; j < deduplicatedEvents.length; j++) {
                    const candidate = deduplicatedEvents[j];
                    if (candidate.type === 'noteOff' && candidate.note === current.note) {
                        const noteDuration = candidate.seconds - current.seconds;
                        totalNotes++;
                        
                        if (noteDuration < minNoteDuration) {
                            shortNotesFound++;
                            // Extend the note to minimum duration
                            candidate.seconds = current.seconds + minNoteDuration;
                            
                            if (shortNotesFound <= 5) { // Only log first 5 for debugging
                                console.log(`SHORT NOTE: note ${current.note} duration ${(noteDuration * 1000).toFixed(1)}ms -> extended to ${(minNoteDuration * 1000).toFixed(1)}ms`);
                            }
                        }
                        break; // Found the matching noteOff
                    }
                }
            }
        }
        
        if (shortNotesFound > 0) {
            console.log(`Found ${shortNotesFound} short notes out of ${totalNotes} total notes (${(shortNotesFound/totalNotes*100).toFixed(1)}%)`);
        }
        
        // Re-sort after extending notes
        deduplicatedEvents.sort((a, b) => a.seconds - b.seconds);
        
        this.events = deduplicatedEvents;
        
        this.duration = this.events.length > 0 ? 
            Math.max(...this.events.map(e => e.seconds)) : 0;
        
        console.log('Track', this.selectedTrack, 'loaded:');
        console.log('Filtered events:', filteredEvents.length);
        console.log('Deduplicated events:', this.events.length);
        console.log('Duration:', this.duration.toFixed(2), 'seconds');
        console.log('Note events:', this.events.filter(e => e.type === 'noteOn' || e.type === 'noteOff').length);
    }

    getTrackInfo() {
        const noteEvents = this.events.filter(e => e.type === 'noteOn');
        const allNoteEvents = this.allEvents.filter(e => e.type === 'noteOn');
        const tracks = [...new Set(allNoteEvents.map(e => e.track))];
        const noteRange = noteEvents.length > 0 ? {
            min: Math.min(...noteEvents.map(e => e.note)),
            max: Math.max(...noteEvents.map(e => e.note))
        } : { min: 0, max: 127 };

        return {
            duration: this.duration,
            tracks: tracks.length,
            availableTracks: tracks,
            noteCount: noteEvents.length,
            totalNoteCount: allNoteEvents.length,
            noteRange,
            selectedTrack: this.selectedTrack
        };
    }

    getAvailableTracks() {
        const noteEvents = this.allEvents.filter(e => e.type === 'noteOn');
        const trackCounts = new Map();
        
        // Count notes per track
        noteEvents.forEach(event => {
            const track = event.track;
            trackCounts.set(track, (trackCounts.get(track) || 0) + 1);
        });
        
        // Return track info sorted by track number
        return Array.from(trackCounts.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([track, noteCount]) => ({ track, noteCount }));
    }

    play() {
        if (this.isPaused) {
            this.resume();
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = performance.now() / 1000;
        this.eventIndex = 0;

        this.playbackInterval = setInterval(() => {
            this.update();
        }, 8); // Update every 8ms for good timing with less rapid retriggering
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.isPaused = true;
            this.pauseTime = this.currentTime;
            clearInterval(this.playbackInterval);
            
            // Stop all currently playing notes
            this.audioEngine.stopAllNotes();
            this.activeNotes.clear();
            
            // Clear Lissajous visualization
            if (window.virtualKeyboard) {
                window.virtualKeyboard.keyStates.fill(false);
                window.virtualKeyboard.updateVisualization();
            }
        }
    }

    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.startTime = (performance.now() / 1000) - this.pauseTime;
            
            this.playbackInterval = setInterval(() => {
                this.update();
            }, 8);
        }
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        clearInterval(this.playbackInterval);
        this.audioEngine.stopAllNotes();
        this.activeNotes.clear();
        
        // Clear Lissajous visualization
        if (window.virtualKeyboard) {
            window.virtualKeyboard.keyStates.fill(false);
            window.virtualKeyboard.updateVisualization();
        }
        
        this.reset();
    }

    reset() {
        this.currentTime = 0;
        this.eventIndex = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.activeNotes.clear();
        
        // Clear Lissajous visualization
        if (window.virtualKeyboard) {
            window.virtualKeyboard.keyStates.fill(false);
            window.virtualKeyboard.updateVisualization();
        }
    }

    update() {
        if (!this.isPlaying || this.isPaused) return;

        this.currentTime = (performance.now() / 1000) - this.startTime;

        // Process events at current time
        while (this.eventIndex < this.events.length && 
               this.events[this.eventIndex].seconds <= this.currentTime) {
            
            const event = this.events[this.eventIndex];
            this.processEvent(event);
            this.eventIndex++;
        }

        // Update time display
        if (this.onTimeUpdate) {
            this.onTimeUpdate(this.currentTime, this.duration);
        }

        // Check if playback is complete
        if (this.currentTime >= this.duration) {
            this.stop();
            if (this.onEnd) {
                this.onEnd();
            }
        }
    }

    processEvent(event) {
        switch (event.type) {
            case 'noteOn':
                this.audioEngine.playNote(event.note, event.velocity / 127);
                this.activeNotes.add(event.note);
                
                // Sync with Lissajous visualization: set keyStates for note
                if (window.virtualKeyboard && event.note >= 12 && event.note <= 125) {
                    const arrayIndex = event.note - 12;
                    window.virtualKeyboard.keyStates[arrayIndex] = true;
                    window.virtualKeyboard.updateVisualization();
                }
                
                // console.log('Note ON:', event.note, 'velocity:', event.velocity, 'time:', event.seconds);
                break;
            case 'noteOff':
                if (this.activeNotes.has(event.note)) {
                    this.audioEngine.stopNote(event.note);
                    this.activeNotes.delete(event.note);
                    
                    // Sync with Lissajous visualization: clear keyStates for note
                    if (window.virtualKeyboard && event.note >= 12 && event.note <= 125) {
                        const arrayIndex = event.note - 12;
                        window.virtualKeyboard.keyStates[arrayIndex] = false;
                        window.virtualKeyboard.updateVisualization();
                    }
                    
                    // console.log('Note OFF:', event.note, 'time:', event.seconds);
                }
                // If note wasn't active, ignore the noteOff (common in MIDI files)
                break;
        }
    }

    seek(timePercent) {
        const targetTime = this.duration * timePercent;
        
        // Stop all notes and clear active notes
        this.audioEngine.stopAllNotes();
        this.activeNotes.clear();
        
        // Find the event index for the target time
        this.eventIndex = 0;
        while (this.eventIndex < this.events.length && 
               this.events[this.eventIndex].seconds < targetTime) {
            this.eventIndex++;
        }

        // Calculate which notes should be playing at the target time
        // by scanning backwards from the target time
        const notesAtTime = new Set();
        for (let i = this.eventIndex - 1; i >= 0; i--) {
            const event = this.events[i];
            if (event.type === 'noteOn' && !notesAtTime.has(event.note)) {
                notesAtTime.add(event.note);
                this.audioEngine.playNote(event.note, event.velocity / 127);
                this.activeNotes.add(event.note);
            } else if (event.type === 'noteOff') {
                notesAtTime.add(event.note); // Mark as processed
            }
        }

        if (this.isPlaying && !this.isPaused) {
            this.startTime = (performance.now() / 1000) - targetTime;
        } else {
            this.currentTime = targetTime;
            this.pauseTime = targetTime;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
