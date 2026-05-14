let camera, scene, renderer, flashlight;
let FLASHLIGHTON = false;
let moveF = 0, moveB = 0, moveL = 0, moveR = 0;
let velocity = new THREE.Vector3();
let canMove = false;
let lookYaw = 0, lookPitch = 0, lastTouchX = 0, lastTouchY = 0, dragging = false;
const clock = new THREE.Clock();
let colliders = [];
let rendererDom = null, mouseDown = false;
let playerHP = 100, BATTERY = 100;
let flashlightFlashTimer = 0;
let WASD = true;
let RUN = false;
let headBobTimer = 0;
let INTERACT = 0;

// Fix typos/undefined globals referenced later
let corruptedP = 0; // speed modifier
let currentLevel = 1;
const FlashlightColor = 0xffffff;

// Declare level objects/lights as locals (avoid implicit globals)
let FLASHOBJ = null;
let ONE = null, TWO = null, THRE = null, FOUR = null;
let ONELYTE = null, TWOLYTE = null, THRELYTE = null, FOURLYTE = null;
let FLASHLyght = null;


const healthBar = document.getElementById('healthBar');
const healthFill = document.getElementById('healthFill');
const batteryBar = document.getElementById('batteryBar');
const batteryFill = document.getElementById('batteryFill');
const coordsInfo = document.getElementById('coordsInfo');



function updateHealthBar() {
 const pct = Math.max(0, Math.min(1, playerHP / 100));
 healthFill.style.width = (pct * 100) + '%';
 if (pct > 0.6) healthFill.style.background = 'linear-gradient(to right, #00ff66, #f7ff00)';
 else if (pct > 0.3) healthFill.style.background = 'linear-gradient(to right, #f7ff00, #ff9900)';
 else healthFill.style.background = 'linear-gradient(to right, #ff3300, #990000)';
}



function updateBatteryBar() {
 const pct = Math.max(0, Math.min(1, BATTERY / 100));
 batteryFill.style.height = (pct * 100) + '%';
 if (pct > 0.6) batteryFill.style.background = 'linear-gradient(to bottom, #00ff66, #f7ff00)';
 else if (pct > 0.3) batteryFill.style.background = 'linear-gradient(to bottom, #f7ff00, #ff9900)';
 else batteryFill.style.background = 'linear-gradient(to bottom, #ff3300, #990000)';
}

function applyBattery(amount) {
 BATTERY = Math.max(0, BATTERY - amount);
 updateBatteryBar();
 if (BATTERY <= 0) {
   FLASHLIGHTON = false;
 }
}

function applyDamage(amount) {
 playerHP = Math.max(0, playerHP - amount);
 updateHealthBar();
}

function resetGameState() {
 moveF=moveB=moveL=moveR=0; velocity.set(0,0,0); canMove=false;
 lookYaw=lookPitch=0; dragging=false; colliders=[]; mouseDown=false;
 playerHP=100;
 flashlightFlashTimer = 0;
 headBobTimer = 0;
 updateHealthBar();
 if(renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
}


function addWall(x, y, z, w=2, h=2, d=0.5, color=0x8B4513) { // Brown closets
 const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshPhongMaterial({color}));
 wall.position.set(x,y,z); scene.add(wall); colliders.push(wall);
}

function checkCollision(newPos) {
 const playerBB = new THREE.Box3().setFromCenterAndSize(
   new THREE.Vector3(newPos.x, newPos.y, newPos.z), new THREE.Vector3(0.5, 1.6, 0.5)
 );
 return colliders.some(obj => playerBB.intersectsBox(new THREE.Box3().setFromObject(obj)));
}
function PickUpFlashlight() {
 if (!FLASHOBJ) return;
 scene.remove(FLASHOBJ);
 FLASHLIGHTON = true;
 colliders = colliders.filter(c => c !== FLASHOBJ);
}

// Missing game functions referenced by input handlers
function hideInCloset() {
 // Placeholder: implement closet mechanics if you have the objects.
}

function flashObserver() {
 // Placeholder: implement observer flash logic if you have the observer.
}

function startGame() {
 resetGameState();
 LVL1();
}

function loadWalls(iteration=1) {
 if (iteration===1) {
   canMove = true;

 scene = new THREE.Scene();
 scene.background = new THREE.Color(0x111122);
 camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,150);
 camera.position.set(0,1.6,0);
 renderer = new THREE.WebGLRenderer({antialias:true});
 renderer.setSize(window.innerWidth,window.innerHeight);
 renderer.domElement.style.display = 'block';
 document.body.appendChild(renderer.domElement);
 FLASHLIGHTON=false; INTERACT = 0;
 const playerpos = camera.position;
  const floorGeo = new THREE.PlaneGeometry(30,30);
 const floorMat = new THREE.MeshPhongMaterial({color:0xf0f0ff});
 const floor = new THREE.Mesh(floorGeo, floorMat);
 floor.rotation.x = -Math.PI/2;
 scene.add(floor);

 const skyGeo = new THREE.SphereGeometry(50,32,16,true);
 const skyMat = new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.BackSide});
 const sky = new THREE.Mesh(skyGeo, skyMat);
 scene.add(sky);

 scene.add(new THREE.AmbientLight(0xffffff, 1));

 for(let i=-15;i<=15;i+=30){
   addWall(0,1.5,i,30,3,0.5,0x444444);
 }
 for(let i=-15;i<=15;i+=30){
   addWall(i,1.5,0,0.5,3,30,0x444444);
 }

 hill = new THREE.Mesh(
   new THREE.ConeGeometry(10, 1.4, 10),
   new THREE.MeshPhongMaterial({
     color:0x86b123
   })
 );
 hill.position.set(-10,-0.2,5);
 scene.add(hill);
 colliders.push(hill);

 hillshade = new THREE.Mesh(
   new THREE.ConeGeometry(7, 1.4, 7),
   new THREE.MeshPhongMaterial({
     color:0x8B4513
   })
 );
 hillshade.position.set(-10,-0.09,5);
 scene.add(hillshade);
 colliders.push(hillshade);
 


 trunk = new THREE.Mesh(
   new THREE.CylinderGeometry(0.5,0.5,3),
   new THREE.MeshPhongMaterial({
     color:0x8B4513
   })
 );

 trunk.position.set(5,1.5,-5);
 scene.add(trunk);

  leaves = new THREE.Mesh(new THREE.SphereGeometry(1.75), new THREE.MeshPhongMaterial({color:0x228B22}));
 leaves.position.set(5,4,-5);
  scene.add(leaves);
 const tree = new THREE.Group();
 tree.add(trunk);
 tree.add(leaves);
 const tree1 = tree.clone();
 tree1.position.set(-5,0,-5);
 tree1.visible = false;
 scene.add(tree1);
 const tree2 = tree.clone();
 tree2.position.set(5,0,-5);
 tree2.visible = false;
 scene.add(tree2);
 const tree3 = tree.clone();
 tree3.position.set(5,0,8);
 tree3.visible = false;
 scene.add(tree3);
  const loader = new THREE.GLTFLoader();
 loader.load('./tree.glb', (gltf) => {
   const treea = gltf.scene;
   treea.scale.setScalar(0.1); // Reduces size by a factor of 10

    // Adjusted smaller size
   treea.position.set(5,0,-5);
  
   // Add emissive red glow effect
  
   scene.add(treea);
   colliders.push(treea);
   tree1.add(treea);
 });


loader.load('tree 2.glb', (gltf) => {
    const model = gltf.scene;
    
    // Scale the model down
    model.scale.setScalar(0.1);
    model.position.set(-5,0,5); 
    
    scene.add(model);
    colliders.push(model);
    tree2.add(model);
    tree3.add(model);
});

 const treecluster = new THREE.Group();
 treecluster.add(tree);
 treecluster.add(tree1);
 treecluster.add(tree2);
 treecluster.add(tree3);
 treecluster.position.set(-10,0,5);
 scene.add(treecluster);
 const treecluster2 = treecluster.clone();
 treecluster2.position.set(7,0,12);
 scene.add(treecluster2);
 colliders.push(trunk, tree1.children[0], tree1.children[1], tree2.children[0], tree2.children[1], tree3.children[0], tree3.children[1], treecluster.children[0], treecluster.children[1], treecluster.children[2], treecluster.children[3], treecluster2.children[0], treecluster2.children[1], treecluster2.children[2], treecluster2.children[3]);
 colliders.push(camera);
 }
}

function checkIfInside(sphere, tree) {
 // 1. Create a bounding box for the tree (cylinder)
 const treeBox = new THREE.Box3().setFromObject(tree);
  // 2. Create a bounding box for the sphere
 const sphereBox = new THREE.Box3().setFromObject(sphere);

 // 3. Check if the sphere's box is entirely within the tree's box
 if (treeBox.containsBox(sphereBox)) {
   window.alert("The sphere is inside the tree!");
   return true;
 }
  return false;
}



function LVL1() {
 // Enable movement/look immediately after the level loads
 loadWalls(1);

 FLASHOBJ= new THREE.Mesh(
   new THREE.BoxGeometry(0.2, 0.2, 0.5),
   new THREE.MeshPhongMaterial({
     color:0x111111,
     emissive:0xffffff,
     emissiveIntensity: 0.5,
   })
 );
  
 FLASHOBJ.position.set(8,0,0);
 scene.add(FLASHOBJ);
 colliders.push(FLASHOBJ);
 FLASHLyght = new THREE.PointLight(0xffffff, 1.2, 6);
 FLASHOBJ.add(FLASHLyght);


 flashlight = new THREE.SpotLight(FlashlightColor, 6, 16, Math.PI/10, 0.6, 1.5);

   flashlight.position.set(0, 0, 0);
   flashlight.target.position.set(0, 0, -1);
   camera.add(flashlight);
   camera.add(flashlight.target);
   scene.add(camera);
  

 lookYaw = -Math.PI / 2;
 lookPitch = 0;
 playerHP=100; updateHealthBar(); clock.getDelta();
 setupTouchControls();
 animate();

}



function animate() {
 const dt = clock.getDelta();
 requestAnimationFrame(animate);

 if (!camera || !scene || !renderer) return;

 if (canMove) {
   const baseSpeed = RUN ? 6 : 4.5;
   const REALSPEED = baseSpeed - corruptedP;
   velocity.set(0, 0, 0);

   if (moveF) velocity.z -= REALSPEED * dt;
   if (moveB) velocity.z += REALSPEED * dt;
   if (moveL) velocity.x -= REALSPEED * dt;
   if (moveR) velocity.x += REALSPEED * dt;

   const forward = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw));
   const right = new THREE.Vector3(Math.cos(lookYaw), 0, -Math.sin(lookYaw));
   const intendedPos = camera.position.clone()
     .add(forward.clone().multiplyScalar(velocity.z))
     .add(right.clone().multiplyScalar(velocity.x));

   if (!checkCollision(intendedPos)) camera.position.copy(intendedPos);

   const bounds = currentLevel === 3 ? 38 : 28;
   camera.position.x = Math.max(-bounds, Math.min(bounds, camera.position.x));
   camera.position.z = Math.max(-bounds * 2, Math.min(bounds * 2, camera.position.z));

   // Head bob effect
   const isMoving = moveF || moveB || moveL || moveR;
   if (isMoving) {
     headBobTimer += dt;
     const bobFrequency = RUN ? 10 : 7;
     const bobAmplitude = RUN ? 0.12 : 0.06;
     const bobAmount = Math.sin(headBobTimer * bobFrequency) * bobAmplitude;
     camera.position.y = 1.6 + bobAmount;
   } else {
     headBobTimer = 0;
     camera.position.y = 1.6;
   }

   // Update player coordinates display
   if (coordsInfo) {
     coordsInfo.textContent = `Pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`;
   }
 }

 const playersphere = new THREE.Mesh(
   new THREE.SphereGeometry(5, 0, 8),
   new THREE.MeshBasicMaterial({color: 0xff0000})
 );
 playersphere.position.set(0,5,0);
 camera.position.y = 1.6; // Reset to default height before checking collisions
 colliders.pop(camera); // Remove after checking to avoid cluttering the scene
 colliders.pop(playersphere); // Add player's sphere for collision detection


 const isInside = checkIfInside(playersphere, hill);

 if (isInside) {
   camera.position.y = 5 * dt;
 } else {
   camera.position.y = camera.position.y; // gravity
 }

 renderer.render(scene, camera);

 // Flashlight behavior
 if (flashlight) {
   flashlight.visible = FLASHLIGHTON;

   if (flashlightFlashTimer > 0) {
     flashlightFlashTimer -= dt;
     flashlight.intensity = 20;
   } else {
     flashlight.intensity = Math.max(
       2.5,
       Math.min(
         8,
         5 + Math.sin(performance.now() * 0.002 * 2) * 0.6 + (Math.random() - 0.5) * 2
       )
     );
   }

   // Camera handles rotation; flashlight is attached to it.
   flashlight.position.set(0, 0, 0);
   flashlight.target.position.set(0, 0, -1);
 }

 // Apply look rotation once per frame (single source of truth)
 camera.rotation.order = "YXZ";
 camera.rotation.x = lookPitch;
 camera.rotation.y = lookYaw;


 if (FLASHLIGHTON === true) {
   if (batteryBar) batteryBar.style.opacity = 100;
   if (batteryFill) batteryFill.style.opacity = 100;
 }

 if (FLASHOBJ && camera && INTERACT === 1) {
   if (camera.position.distanceTo(FLASHOBJ.position) < 1.8) {
     PickUpFlashlight();
     FLASHLIGHTON = true;
   }
 }

 renderer.render(scene, camera);
}


document.addEventListener('keydown', e => {

     if(!canMove && WASD === true) return;
     if(e.code==='KeyW') moveF=1;
     if(e.code==='KeyS') moveB=1;
     if(e.code==='KeyA') moveL=1;
     if(e.code==='KeyD') moveR=1;
     if(e.code==='KeyE') hideInCloset(), INTERACT = 1;
     if(e.code==='KeyF') flashObserver();
   if(e.code==='ShiftLeft') RUN=true;
     e.preventDefault();
 });
 document.addEventListener('keyup', e => {
     if(e.code==='KeyW') moveF=0;
     if(e.code==='KeyS') moveB=0;
     if(e.code==='KeyA') moveL=0;
     if(e.code==='KeyD') moveR=0;
     if(e.code==='KeyE') INTERACT = 0;
   if(e.code==='ShiftLeft') RUN=false;
 });
    document.addEventListener('keydown', e => {
     if(!canMove && WASD !== true) return;
     if(e.code==='ArrowUp') moveF=1;
     if(e.code==='ArrowDown') moveB=1;
     if(e.code==='ArrowLeft') moveL=1;
     if(e.code==='ArrowRight') moveR=1;
     if(e.code==='KeyE') INTERACT = 1;
     if(e.code==='KeyF') flashObserver();
   if(e.code==='ShiftLeft') RUN=true;
     e.preventDefault();
 });
 document.addEventListener('keyup', e => {
     if(e.code==='ArrowUp') moveF=0;
     if(e.code==='ArrowDown') moveB=0;
     if(e.code==='ArrowLeft') moveL=0;
     if(e.code==='ArrowRight') moveR=0;
   if(e.code==='ShiftLeft') RUN=false;
 });

function setupTouchControls() {
 rendererDom = renderer.domElement;
 rendererDom.addEventListener('touchstart', e => {
   if(e.touches.length===1) { dragging=true; lastTouchX=e.touches[0].clientX; lastTouchY=e.touches[0].clientY; }
 });
 rendererDom.addEventListener('touchmove', e => {
   if(dragging && e.touches.length===1) {
     const dx = e.touches[0].clientX - lastTouchX, dy = e.touches[0].clientY - lastTouchY;
     lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
     lookYaw -= dx * 0.005; lookPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, lookPitch - dy * 0.005));
   }
 });
 rendererDom.addEventListener('touchend', () => dragging=false);
}

window.addEventListener('mousedown', e => { if(canMove) { mouseDown=true; lastTouchX=e.clientX; lastTouchY=e.clientY; } });
window.addEventListener('mousemove', e => {
 if(mouseDown && canMove) {
   const dx = e.clientX - lastTouchX, dy = e.clientY - lastTouchY;
   lastTouchX = e.clientX; lastTouchY = e.clientY;
   lookYaw -= dx * 0.005; lookPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, lookPitch - dy * 0.005));
 }
});
window.addEventListener('mouseup', () => mouseDown=false);
window.addEventListener('resize', () => {

 if(camera && renderer) {
   camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
   renderer.setSize(window.innerWidth, window.innerHeight);
 }
});

startGame();
