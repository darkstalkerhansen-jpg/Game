let camera, scene, renderer, flashlight;
let FLASHLIGHTON=false;
let moveF=0, moveB=0, moveL=0, moveR=0, velocity=new THREE.Vector3();
let canMove=false;
let lookYaw=0, lookPitch=0, lastTouchX=0, lastTouchY=0, dragging=false;
const clock = new THREE.Clock();
let colliders = [];
let rendererDom = null, mouseDown = false;
let playerHP = 100, BATTERY = 100;
let flashlightFlashTimer = 0;
let WASD=true;
let RUN=false;
let headBobTimer = 0;
let INTERACT = 0; RON = true;
Flashlyte = 0xffffff;

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
    showHideMessage('Q', 15); FLASHLIGHTON = false;
  }
}

function applyDamage(amount) {
  playerHP = Math.max(0, playerHP - amount);
  updateHealthBar();
  if (playerHP <= 0 && !jumpscare && RON) {
    if(currentLevel === 1) {
      CUTSCENE(2, 1);
    } else if (currentLevel === 2) {
      CUTSCENE(3, 1); Corrupted = false; corruptedSpeed = 0;
      setTimeout(() => {
        RON = false;  
      }, 0);
   }
  }
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
  scene.remove(FLASHOBJ); FLASHLIGHTON = true; colliders = colliders.filter(c => c !== FLASHOBJ);
}

function LVL1() {
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
  const floorMat = new THREE.MeshPhongMaterial({color:0x222222});
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const skyGeo = new THREE.SphereGeometry(50,32,16,true);
  const skyMat = new THREE.MeshBasicMaterial({color:0x111122, side:THREE.BackSide});
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  scene.add(new THREE.AmbientLight(0x222233, 0.13));


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


    flashlight = new THREE.SpotLight(Flashlyte, 6, 16, Math.PI/10, 0.6, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera);
    

  for(let i=-15;i<=15;i+=30){
    addWall(0,1.5,i,30,3,0.5,0x444444);
  }
  for(let i=-15;i<=15;i+=30){
    addWall(i,1.5,0,0.5,3,30,0x444444);
  }
  addWall(1,1,15,0.5,4,10);
  addWall(8,1,5,15,4,0.3);
  addWall(-5.3,1,-4,0.5,4,5);
  addWall(9,1,0.5,0.5,4,9.2);
  addWall(2,1,-4,14.5,4,0.5);
  addWall(12.5,0,-5,0.8,0.5,0.8,0x8c8573);
  addWall(12.5,0,-5,0.3,0.6,0.3,0xf2ad0d);
  addWall(0,3,0,50,0.5,50,0xAA0000);

  ONE = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 5.5),
    new THREE.MeshPhongMaterial({
      color:0x111111,
      emissive:0xAA0000,
      emissiveIntensity: 0.5,
    })
  );

  TWO= new THREE.Mesh(
    new THREE.BoxGeometry(14.5, 0.2, 0.5),
    new THREE.MeshPhongMaterial({
      color:0x111111,
      emissive:0xAA0000,
      emissiveIntensity: 0.5,
    })
  );

  THRE = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 13),
    new THREE.MeshPhongMaterial({
      color:0x111111,
      emissive:0xAA0000,
      emissiveIntensity: 0.5,
    })
  );

  FOUR = new THREE.Mesh(
    new THREE.BoxGeometry(22.5, 0.2, 0.5),
    new THREE.MeshPhongMaterial({
      color:0x111111,
      emissive:0xAA0000,
      emissiveIntensity: 0.5,
    })
  );

    ONE.position.set(12.5,0,-7.5);
    TWO.position.set(-3,0,3);
    THRE.position.set(-10,0,-3.5);
    FOUR.position.set(1,0,-10);
    scene.add(ONE);
    scene.add(TWO);
    scene.add(THRE);
    scene.add(FOUR);
    colliders.push(ONE);
    colliders.push(TWO);
    colliders.push(THRE);
    colliders.push(FOUR);
    ONELYTE = new THREE.PointLight(0xAA0000, 8, 6);
    TWOLYTE = new THREE.PointLight(0xAA0000, 8, 6);
    THRELYTE = new THREE.PointLight(0xAA0000, 8, 6);
    FOURLYTE = new THREE.PointLight(0xAA0000, 8, 6);
    ONE.add(ONELYTE);
    TWO.add(TWOLYTE);
    THRE.add(THRELYTE);
    FOUR.add(FOURLYTE);

 lookYaw = -Math.PI / 2;
  lookPitch = -1;
 
  playerHP=100; updateHealthBar(); clock.getDelta(); animate();

}


function animate() {
  const dt = clock.getDelta();
  requestAnimationFrame(animate);

  if(canMove) {

    const baseSpeed = RUN ? 6 : 4.5; 
	  const REALSPEED = baseSpeed - corruptedP;
    velocity.set(0,0,0);	

    if(moveF) velocity.z -= REALSPEED*dt; if(moveB) velocity.z += REALSPEED*dt;
    if(moveL) velocity.x -= REALSPEED*dt; if(moveR) velocity.x += REALSPEED*dt;
	
    const forward = new THREE.Vector3(Math.sin(lookYaw),0,Math.cos(lookYaw));
    const right = new THREE.Vector3(Math.cos(lookYaw),0,-Math.sin(lookYaw));
    const intendedPos = camera.position.clone().add(forward.clone().multiplyScalar(velocity.z)).add(right.clone().multiplyScalar(velocity.x));
    
    if(!checkCollision(intendedPos)) camera.position.copy(intendedPos);
    
    const bounds = currentLevel === 3 ? 38 : 28 ; (currentLevel < 3 ? 38 : 28);
    camera.position.x = Math.max(-bounds,Math.min(bounds,camera.position.x));
    camera.position.z = Math.max(-bounds*2,Math.min(bounds*2,camera.position.z));

    // Head bob effect
    const isMoving = moveF || moveB || moveL || moveR;
    if (isMoving) {
      headBobTimer += dt;
      const bobFrequency = RUN ? 10 : 7; // Higher frequency when sprinting
      const bobAmplitude = RUN ? 0.12 : 0.06; // Larger amplitude when sprinting
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

  
    // Flashlight behavior (flicker vs flash)

      flashlight.visible = FLASHLIGHTON;
      if (flashlightFlashTimer > 0) {
       flashlightFlashTimer -= dt;
       flashlight.intensity = 20;
      } else {
       flashlight.intensity = Math.max(2.5,Math.min(8,
         5+Math.sin(performance.now()*0.002*2)*0.6+(Math.random()-0.5)*2));
      }
      flashlight.position.set(0,0,0); flashlight.quaternion.copy(camera.quaternion); flashlight.target.position.set(0,0,-1);

      camera.rotation.order = "YXZ"; camera.rotation.y = lookYaw; camera.rotation.x = lookPitch;
    
    // Observer logic (all levels except tutorial L2 has no observer)
   
  if(FLASHLIGHTON === true) {
    batteryBar.style.opacity = 100;
    batteryFill.style.opacity = 100;
  }


  if(camera.position.distanceTo(FLASHOBJ.position) < 1.8) {
    if(INTERACT===1) {
      PickUpFlashlight(); FLASHLIGHTON=true;
    }
  }


}

  if(renderer && scene && camera) {
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

