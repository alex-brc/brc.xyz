// Globals
const DEBUG = false;
var haveMidi = false;
var scaleModifier = 0;
var onMobile, iOS;
var audioEngine;
var controller;
var renderer;
var stage;

function main(){
    // Meta settings
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.ROUND_PIXELS = true;
    renderer = new PIXI.Renderer({ 
        view: pixicanvas,
        backgroundColor: 0x276E7B,
    }); 

    stage = new PIXI.Container();
    const ticker = PIXI.Ticker.shared;
    const loader = PIXI.Loader.shared;

    try{// Set up MIDI here
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
        
        function onMIDIFailure() { console.log("MIDI Not Supported")};
        function onMIDISuccess(midiAccess) {
            haveMidi = true;

            // Add listeners to all midi inputs
            for (var input of midiAccess.inputs.values()){
                input.onmidimessage = Controller.processMIDIMessage;
            }

            // If a new device is input, listen to it
            midiAccess.onstatechange = (e) => {
                e.port.onmidimessage = Controller.processMIDIMessage;
            }
        }

    } catch(error) {
        // Midi not supported
    }

    onMobile = isMobile();
    iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Double test to be sure
    var t = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    if(t != iOS) // Tests give different results
        console.log("Confusion ensues! Two tests for iOS give two different results");

    loader
    .add("tooltipFont", "img/pixelmix.fnt")
    .add("sprites", "img/spritesheet.json")
    .load(setup);

    function setup() {
        // Build components
        audioEngine = new AudioEngine();
        controller = new Controller(0.5, 0.5);
        var overlay = createOverlay();
            
        // Attach size modifier
        var scaleUp = keybind("=");
        scaleUp.press = (event) => { 
            if(!event.getModifierState("Control"))
                return;
            scaleModifier++; 
            sizeRenderer();}
        var scaleUp = keybind("-");
        scaleUp.press = (event) => { 
            if(!event.getModifierState("Control"))
                return;
            scaleModifier--; 
            sizeRenderer();}

        // Resize handler
        window.addEventListener('resize', sizeRenderer);

        // Arrange everything
        sizeRenderer();

        // Add components to stage
        stage.addChild(controller); 
        stage.addChild(overlay);

        ticker.maxFPS = 30;
        ticker.add(() => { renderer.render(stage); });
        ticker.start();

        function sizeRenderer(){
            // Update vertical units (thanks, Apple)
            vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
          
            size = {
                width: pixicanvas.clientWidth,
                height: pixicanvas.clientHeight,
            }
            
            pixicanvas.width = size.width * devicePixelRatio; 
            pixicanvas.height = size.height * devicePixelRatio;

            // Resize renderer
            renderer.resize(size.width, size.height);

            let aspect = (size.width > size.height) ? 'landscape' : 'portrait';

            // Find the maximum scale we can use
            let w,h,scale;
            if(aspect == 'landscape'){
                w = Math.floor((size.width - 5) / controller.texture.width);
                h = Math.floor((size.height - 5) / controller.texture.height);
            }
            else {
                w = Math.floor((size.height - 5) / controller.texture.width);
                h = Math.floor((size.width - 5) / controller.texture.height);
            }
            scale = Math.min(w,h);
            scale += scaleModifier;

            if(scale == 0)
                alert("Where did you find a screen this small? Sorry, content won't fit!");

            // Rescale
            controller.scale.set(scale);
            overlay.scale.set(scale);

            // Reposition
            controller.position.set(renderer.screen.width / 2, renderer.screen.height / 2);
            overlay.position.set(renderer.screen.width / 2, renderer.screen.height / 2);
            if(aspect == 'portrait'){
                controller.angle = 90;
                overlay.angle = 90;
                overlay.buttons.position.set(renderer.screen.height / (2*scale), -renderer.screen.width / (2*scale) + 2);
            }
            else {
                controller.angle = 0;
                overlay.angle = 0;
                overlay.buttons.position.set(renderer.screen.width / (2*scale), -renderer.screen.height / (2*scale) + 2);
            }

            
        }
    }
}
