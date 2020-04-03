// Globals
const DEBUG = false;
var haveMidi = false;
var scaleModifier = 0;
var onMobile;
var audioEngine;
var controller;
var renderer;
var stage;

// Start program
main();

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

    // Detect mobile
    function isMobile() {
        var check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
      };
    
    
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

    loader
    .add("tooltipFont", "img/pixelmix.fnt")
    .add("ui", "img/ui.json")
    .add("controller", "img/controller.json")
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
            scale = Math.min(scale, 6);
            scale += scaleModifier;

            if(scale == 0)
                alert("Where did you find a screen this small? Sorry, content won't fit!");

            // Rescale
            controller.scale.set(scale);
            overlay.scale.set(scale);

            if (DEBUG) {
                console.log("-------------------------------");
                console.log("aspect: ", aspect);
                console.log("window.innner: ", window.innerWidth, window.innerHeight);
                console.log("pixicanvas: ", pixicanvas.width, pixicanvas.height);
                console.log("pixicanvas.client: ", pixicanvas.clientWidth, pixicanvas.clientHeight);
                console.log("renderer: ", renderer.screen.width, renderer.screen.height);
                console.log("controller: ", controller.texture.width, controller.texture.height);
                console.log("dpr, w,h,scale: ", devicePixelRatio, w, h, scale);
                console.log("-------------------------------");
            }
            
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
