class Controller {
    constructor(spritesheet, buttonsheet, renderer) {
        this._renderer = renderer;
        var noteStack = [];

        this.spritesheet = spritesheet;
        this.buttonsheet = buttonsheet;

        // Prep base sprite
        this.base = new PIXI.Sprite(spritesheet.textures["base.png"]);

        // Setup all the components of the keyboard
        var tooltipSet = new Tooltip();
        setup_sine(spritesheet, this.base);
        this.keys = setup_keys(spritesheet, this.base);
        this.sliders = setup_sliders(buttonsheet, this.base);
        this.knobs = setup_knobs(buttonsheet, this.base);

        // Add the tooltips last
        this.base.addChild(tooltipSet.container);

        // Setup the base object
        this.base.x = renderer.screen.width / 2;
        this.base.y = renderer.screen.height / 2;
        this.base.anchor.x = 0.5;
        this.base.anchor.y = 0.5;
        this.base.scale.set(4);

        // Controller now ready to be staged

        // Setup definitions
        function setup_keys(spritesheet, base) {
            // Locations of keys on base sprite
            const x = [34, 43, 47, 56, 60, 73, 82, 86, 95, 99, 108, 112,
                125, 134, 138, 147, 151, 164, 173, 177, 186, 190, 199, 203, 216];
            const y = 54;
            const keysTex = [
                "leftkey", "blackkey", "midkey", "blackkey", "rightkey",
                "leftkey", "blackkey", "midkey", "blackkey", "midkey", "blackkey", "rightkey",
                "leftkey", "blackkey", "midkey", "blackkey", "rightkey",
                "leftkey", "blackkey", "midkey", "blackkey", "midkey", "blackkey", "rightkey-logo", "lastkey"
            ];
            // Draw black keys last, for raycast priority
            const drawingOrder = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24,
                1, 3, 6, 8, 10, 13, 15, 18, 20, 22];
            let keys = [];
            let mouseDown = false;
            drawingOrder.forEach((i) => {
                // Create sprite
                keys[i] = new PIXI.Sprite(spritesheet.textures[keysTex[i] + ".png"]);
                // Give it an ID
                keys[i].keyId = i;
                // Position them
                keys[i].x = -base.width / 2 + x[i];
                keys[i].y = -base.height / 2 + y;
                // Add event listeners
                keys[i].buttonMode = true;
                keys[i].interactive = true;
                keys[i]
                    .on('mousedown', onDown)
                    .on('touchstart', onDown)
                    .on('mouseup', onUp)
                    .on('mouseupoutside', onUp)
                    .on('touchend', onUp)
                    .on('touchendoutside', onUp)
                    .on('mouseover', onEnter)
                    .on('mouseout', onExit);
                // Add to base
                base.addChild(keys[i]);
            });
            // Also set up MIDI here
            navigator.requestMIDIAccess()
                .then(onMIDISuccess, onMIDIFailure);
            function onMIDISuccess(midiAccess) {
                // Add listeners to all midi inputs
                for (var input of midiAccess.inputs.values())
                    input.onmidimessage = getMIDIMessage;
            }
            function onMIDIFailure() {
                // TODO: Tell there's no midi, ask to refresh page
            }
            function getMIDIMessage(message) {
                var command = message.data[0];
                var note = message.data[1];
                var velocity = (message.data.length > 2) ? message.data[2] : 0; 
                switch (command) {
                    // Key pressed
                    case 144:
                        if (velocity > 0) {
                            noteOn(note, velocity);
                        }
                        else {
                            noteOff(note);
                        }
                        break;
                    // Key lifted
                    case 128:
                        noteOff(note);
                        break;
                }
            }
            function noteOn(note, velocity) {
                // If note is outside range, ignore
                if (note >= noteRange[0] && note <= noteRange[1]) {
                    // Add this pressed note to the list
                    if((noteStack.length > 0 && noteStack.last()[0] != note) || noteStack.length == 0){
                        noteStack.push([note, velocity]);
                    }
                    // Find the key corresponding to the note
                    let key = note - noteRange[0];
                    // Retexture the pressed key
                    keys[key].texture = spritesheet.textures[keysTex[key] + "-on.png"]; // on texture
                    // Compute gain volume
                    let volume = remap(velocity, [0, 127], [0, 1]);
                    // Play note
                    audioEngine.start(note, volume);
                }
            }
            function noteOff(note) {
                // If note is outside range, ignore
                if (note >= noteRange[0] && note <= noteRange[1]) {
                    // Remove this note from the list
                    {
                        let p = -1;
                        // Find its index
                        for(let i = 0; i < noteStack.length; i++){
                            if(noteStack[i][0] == note){
                                p = i;
                                break;
                            }
                        }
                        // Remove it
                        if(p != -1){
                            noteStack.splice(p, 1);
                        }
                    }
                    // Find the key corresponding to the note
                    let key = note - noteRange[0];
                    // Retexture the depressed key
                    keys[key].texture = spritesheet.textures[keysTex[key] + ".png"]; // off texture
                    // If the last active key is depressed, stop
                    if(noteStack.length == 0){
                        audioEngine.stop();
                    }// Else play the last key that was pressed
                    else{
                        noteOn(noteStack.last()[0], noteStack.last()[1]);
                    }
                }

                return keys;
            }
            function onDown(event) {
                mouseDown = true;
                // Get local mouse y to calculate velocity
                let y = this.toLocal(event.data.global).y;
                let velocity = remap(y, [0, this.height], [0, 127])
                velocity = Math.floor(velocity);
                noteOn(this.keyId + noteRange[0], velocity);
            }
            function onUp(event) {
                mouseDown = false;
                noteOff(this.keyId + noteRange[0]);
            }
            function onEnter(event) {
                if (mouseDown){
                    // Get local mouse y to calculate velocity
                    let y = this.toLocal(event.data.global).y;
                    let velocity = remap(y, [0, this.height], [0, 127])
                    velocity = Math.floor(velocity);
                    noteOn(this.keyId + noteRange[0], velocity);
                }
            }
            function onExit(event) {
                if (mouseDown){
                    noteOff(this.keyId + noteRange[0]);
                }
            }
        }       
        function setup_sine(spritesheet, base) {
            // Make sine animation
            let sineAnimation = new PIXI.AnimatedSprite(spritesheet.animations["sine"]);
            sineAnimation.animationSpeed = 0.3;
            // Position it correctly
            sineAnimation.x = -base.width / 2 + 176;
            sineAnimation.y = -base.height / 2 + 22;
            sineAnimation.play();
            // Add it to base
            base.addChild(sineAnimation);
        }
        function setup_knobs(spritesheet, base) {
            // Set knob positionings
            const x = [12, 27, 42, 57, 72, 87, 17, 32, 47, 62, 77, 92];
            const y = [27, 27, 27, 27, 27, 27, 40, 40, 40, 40, 40, 40];
            // Define initial knob values
            const knobsVals = [7, 2, 5, 7, 4, 1, 3, 1, 6, 3, 2, 5];
            const knobsTex = ["up.png", "top-right.png", "right.png", "bottom-right.png",
                "bottom.png", "bottom-left.png", "left.png", "top-left.png"];
            let tooltips = [
                "shape", "attack", "sustain", "decay", "release", "gain", 
                "shape", "attack", "sustain", "decay", "release", "gain"
            ];
            let knobs = [];
            for (let i = 0; i < 12; i++) {
                // Create the sprite from the texture
                knobs[i] = new PIXI.Sprite(spritesheet.textures[knobsTex[knobsVals[i]]]);
                // Set initial value
                knobs[i].value = knobsVals[i];
                // Give it a name
                knobs[i].name = tooltips[i] + (Math.floor(i / 6) + 1).toString();
                // Position them accordingly
                knobs[i].pivot.x = 2;
                knobs[i].pivot.y = 2;
                knobs[i].x = -base.width / 2 + x[i]; // -2 adjusts for anchor
                knobs[i].y = -base.height / 2 + y[i];
                // Make them clickable
                knobs[i].buttonMode = true;
                knobs[i].interactive = true;
                knobs[i]
                    .on('mousedown', onDown)
                    .on('touchstart', onDown);

                // Add tooltips
                knobs[i]
                    .on('mouseover', Tooltip.showTooltip)
                    .on('mouseout', Tooltip.hideTooltip);
                knobs[i].tooltip = tooltipSet.create(tooltips[i], 'left');

                base.addChild(knobs[i]);
            }
            function onDown(event) {
                this.value = (this.value + 1) % 8;
                this.texture = spritesheet.textures[knobsTex[this.value]];
            }
            
            return knobs;
        }
        function setup_sliders(base) {
            // Set initial slider positions
            const x = [110, 118, 126, 134, 142, 150, 158, 166, 224];
            const y = [31,  25,  31,  35,  29,  31,  23,  25,  31];
            // Write up tooltips
            let tooltips = [ "LFO1 frequency", "LFO2 frequency", 
                             "LFO1 amplitude", "LFO2 amplitude",
                             "pan1", "pan2" ,"", "", "master"];
            let callbacks = [
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;},
                function (v) {audioEngine.masterGain = 1.0 * v / 10;}
            ];
            let sliders = [];
            for (let i = 0; i < 9; i++) {
                sliders[i] = new Slider(
                    -base.width / 2 + x[i], -base.height / 2 + y[i], // position
                    tooltips[i], // name
                    tooltipSet.create(tooltips[i], 'right'),
                    callbacks[i]
                );

                base.addChild(sliders[i]);
            }

            return sliders;
        }
    }

    searchComponent(string){
        // Search knobs
        for(var e of this.knobs)
            if(e.name == string)
                return e;
        
        // Search sliders
        for(var e of this.sliders){
            if(e.name == string)
                return e;
        }
        
        return undefined;
    }
}

/** 
 * Basic component class for the synth controls. Does not
 * define any interactivity and should be overriden
 */
class Component extends PIXI.Sprite {
    /**
     * @param {PIXI.Texture} texture Texture to generate sprite from
     * @param {number} x Position x
     * @param {number} y Position y
     * @param {number} px Pivot x
     * @param {number} py Pivot y
     * @param {string} name Searchable component name
     * @param {number} maxValue Maximum acceptable value (inclusive)
     * @param {number} initialValue Initial value (0 to maxValue)
     * @param {PIXI.Container} tooltip Tooltip object
     * @param {*} propagationFunction Function to execute when this.value changes
     */
    constructor(texture, x, y, px, py, name, maxValue, initialValue, tooltip, propagationFunction){
        // Sprite details
        super(texture);
        this.x = x;
        this.y = y;
        this.pivot.x = px;
        this.pivot.y = py;

        // Component details
        this.propagationFunction = propagationFunction;
        this.name = name;
        this.maxValue = maxValue;
        this._value = initialValue;
        this.tooltip = tooltip;
        this.on('mouseover', Tooltip.showTooltip)
            .on('mouseout', Tooltip.hideTooltip);
    }

    /** @param {number} value */
    set value(value){
        this.propagationFunction();
    }
    
    get value(){
        return this._value;
    }
}
class Slider extends Component {
    /**
     * @param {number} x Position x
     * @param {number} y Position y
     * @param {number} px Pivot x
     * @param {number} py Pivot y
     * @param {PIXI.Container} tooltip Tooltip object
     * @param {*} propagationFunction Function to execute when this.value changes
     */
    constructor(x, y, name, tooltip, propagationFunction){
        super(PIXI.Loader.shared.resources.common.spritesheet.textures["slider.png"],
        x, y, 3, 1, name, 10, (-y-12)/2, tooltip, propagationFunction);

        // Bind interactions
        this.on('mousedown', onDragStart)
            .on('touchstart', onDragStart)
            .on('mouseup', onDragEnd)
            .on('mouseupoutside', onDragEnd)
            .on('touchend', onDragEnd)
            .on('touchendoutside', onDragEnd)
            .on('mousemove', onDragMove)
            .on('touchmove', onDragMove);
        this.buttonMode = true;
        this.interactive = true;

        
        function onDragStart(event) {
            this.eventData = event.data;
            this.dragging = true;
        }
        function onDragEnd(event) {
            this.eventData = null;
            this.dragging = false;
        }
        function onDragMove(event) {
            if (this.dragging) {
                var newPosition = this.eventData.getLocalPosition(this.parent);
                if (newPosition.y > -32 && newPosition.y <= -10){
                    // Also update value and master gain
                    this.value = (-round(newPosition.y, 2) - 12) / 2;
                }
            }
        }
    }

    /**
     * @param {number} value
     */
    set value(value){
        // Clamp to [0, maxValue]
        if(value >= 0 && value <= this.maxValue){
            this._value = value;
            // Propagate
            this.position.y = - value * 2 - 12;
            this.propagationFunction(value);
        }
    }

}
class Knob extends Component {
    constructor(x, y, ){

    }
}
