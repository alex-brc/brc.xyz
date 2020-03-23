class Controller {
    constructor(spritesheet, buttonsheet, renderer) {
        this._renderer = renderer;

        this.spritesheet = spritesheet;
        this.buttonsheet = buttonsheet;

        // Prep base sprite
        this.base = new PIXI.Sprite(spritesheet.textures["base.png"]);

        // Setup all the components of the keyboard
        setup_sine(spritesheet, this.base);
        setup_keys(spritesheet, this.base);
        setup_knobs(buttonsheet, this.base);
        setup_sliders(buttonsheet, this.base);

        // Setup the base object
        this.base.x = renderer.screen.width / 2;
        this.base.y = renderer.screen.height / 2;
        this.base.anchor.x = 0.5;
        this.base.anchor.y = 0.5;
        this.base.scale.set(4);

        // Controller now ready to be staged

        // Setup definitions       
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
            const knobsX = [12, 27, 42, 57, 72, 87, 17, 32, 47, 62, 77, 92];
            const knobsY = [27, 27, 27, 27, 27, 27, 40, 40, 40, 40, 40, 40];
            // Define initial knob values
            const knobsVals = [7, 2, 5, 7, 4, 1, 3, 1, 6, 3, 2, 5];
            const knobsTex = ["up.png", "top-right.png", "right.png", "bottom-right.png",
                "bottom.png", "bottom-left.png", "left.png", "top-left.png"];
            let knobs = [];
            for (let i = 0; i < 12; i++) {
                // Create the sprite from the texture
                knobs.push(new PIXI.Sprite(spritesheet.textures[knobsTex[knobsVals[i]]]));
                // Give it an ID
                knobs[i].knobId = i;
                // Position them accordingly
                knobs[i].pivot.x = 2;
                knobs[i].pivot.y = 2;
                knobs[i].x = -base.width / 2 + knobsX[i]; // -2 adjusts for anchor
                knobs[i].y = -base.height / 2 + knobsY[i];
                // Make them clickable
                knobs[i].buttonMode = true;
                knobs[i].interactive = true;
                knobs[i].on('mousedown', onDown);
                knobs[i].on('touchstart', onDown);
                base.addChild(knobs[i]);
            }
            function onDown(event) {
                knobsVals[this.knobId] = (knobsVals[this.knobId] + 1) % 8;
                this.texture = spritesheet.textures[knobsTex[knobsVals[this.knobId]]];
            }
        }
        function setup_sliders(spritesheet, base) {
            // Set initial slider positions
            const slidersX = [110, 118, 126, 134, 142, 150, 158, 166, 224];
            const slidersY = [31, 25, 31, 35, 29, 31, 23, 25, 31];
            let sliders = [];
            for (let i = 0; i < 9; i++) {
                // Create the sprite
                sliders[i] = new PIXI.Sprite(spritesheet.textures["slider.png"]);
                // Position it
                sliders[i].pivot.x = 3;
                sliders[i].pivot.y = 1;
                sliders[i].x = -base.width / 2 + slidersX[i]; // adjustments for anchors
                sliders[i].y = -base.height / 2 + slidersY[i];
                // Add event listeners for dragging
                sliders[i]
                    .on('mousedown', onDragStart)
                    .on('touchstart', onDragStart)
                    .on('mouseup', onDragEnd)
                    .on('mouseupoutside', onDragEnd)
                    .on('touchend', onDragEnd)
                    .on('touchendoutside', onDragEnd)
                    .on('mousemove', onDragMove)
                    .on('touchmove', onDragMove);
                sliders[i].buttonMode = true;
                sliders[i].interactive = true;
                base.addChild(sliders[i]);
            }
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
                    if (newPosition.y > -32 && newPosition.y < -10)
                        // Pixel perfect
                        this.position.y = round(newPosition.y, 2);
                }
            }
        }
        function setup_keys(spritesheet, base) {
            // Locations of keys on base sprite
            const keysX = [34, 43, 47, 56, 60, 73, 82, 86, 95, 99, 108, 112,
                125, 134, 138, 147, 151, 164, 173, 177, 186, 190, 199, 203, 216];
            const keysY = 54;
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
                keys[i].x = -base.width / 2 + keysX[i];
                keys[i].y = -base.height / 2 + keysY;
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
                var velocity = (message.data.length > 2) ? message.data[2] : 0; // a velocity value might not be included with a noteOff command
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
                    // Send the note to the proper range
                    note -= noteRange[0];
                    // Retexture the pressed key
                    keys[note].texture = spritesheet.textures[keysTex[note] + "-on.png"]; // on texture
                }
            }
            function noteOff(note) {
                // If note is outside range, ignore
                if (note >= noteRange[0] && note <= noteRange[1]) {
                    // Send the note to the proper range
                    note -= noteRange[0];
                    // Retexture the pressed key
                    keys[note].texture = spritesheet.textures[keysTex[note] + ".png"]; // off texture
                }
            }
            function onDown(event) {
                mouseDown = true;
                let y = this.toLocal(event.data.global).y;
                let velocity = remap(y, [0, this.height], [0, 127])
                velocity = Math.floor(velocity);
                noteOn(this.keyId + noteRange[0], 63);
            }
            function onUp(event) {
                mouseDown = false;
                noteOff(this.keyId + noteRange[0]);
            }
            function onEnter(event) {
                if (mouseDown)
                    noteOn(this.keyId + noteRange[0], 63);
            }
            function onExit(event) {
                if (mouseDown)
                    noteOff(this.keyId + noteRange[0]);
            }
        }
    }
}
