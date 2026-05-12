let camera, scene, renderer, flashlight, monster, monsterLight, exitDoor, corrupted;
let FLASHLIGHTON=false;
let moveF=0, moveB=0, moveL=0, moveR=0, velocity=new THREE.Vector3();
let canMove=false, jumpscare=false, currentLevel=0;
let lookYaw=0, lookPitch=0, lastTouchX=0, lastTouchY=0, dragging=false;
const clock = new THREE.Clock();
let colliders = [];
let rendererDom = null, mouseDown = false;
let monsterPulseTime = 0, monsterTwitchTimer = 0;
let playerHP = 100, BATTERY = 100;
let observerLOSTimer = 0, observerJustAttacked = false, observerCooldown = 0, distortionTime = 0;
let observerStunTime = 0;
let corruptedSpeed = 7.5, corruptedTimer = 0, corruptedActive = false, corruptedP = 0, hideCooldown = 0;
let flashlightFlashTimer = 0;
let WASD=true;
let RUN=false;
let headBobTimer = 0;
let INTERACT = 0; RON = true;
Flashlyte = 0xffffff;

const redOverlay = document.getElementById('redOverlay');
const distortionOverlay = document.getElementById('distortionOverlay');
const healthBar = document.getElementById('healthBar');
const healthFill = document.getElementById('healthFill');
const batteryBar = document.getElementById('batteryBar');
const batteryFill = document.getElementById('batteryFill');
const hideMessage = document.getElementById('hideMessage');
const levelInfo = document.getElementById('levelInfo');
const coordsInfo = document.getElementById('coordsInfo');

function showHideMessage(messageId, duration = 3000, color=1, show=true) {
  if (show) {
    const msg = document.getElementById(messageId);
    if (color === 1) {
      msg.style.color = '#191970';
    } else {
      msg.style.color = '#AA0000';
    }
    msg.style.opacity = '1';
    setTimeout(() => { msg.style.opacity = '0'; }, duration * 500);
  } else {
    const msg = document.getElementById(messageId);
    msg.style.opacity = '0';
  }
}

function showCHideMessage(message, duration = 3000, show=true, color='#AA0000', top='50%') {
  if (show) {
    const msg = document.getElementById("CUSTOM");
    msg.style.color = color;
    msg.style.top = top;
    msg.textContent = message;
    msg.style.opacity = '1';
    msg.style.zIndex = 100;
    setTimeout(() => { msg.style.opacity = '0'; }, duration * 500);
  } else {
    const msg = document.getElementById("CUSTOM");
    msg.style.opacity = '0';
  }
}


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

function flashObserver() {
  if (FLASHLIGHTON) {
    if (currentLevel != 2 && currentLevel != 0) {

      // start a short flash window
      flashlightFlashTimer = 0.15; // 150 ms strong flash
      applyBattery(5);
      const playerPos = camera.position;
      const toMonster = monster.position.clone().sub(playerPos);
      const dist = toMonster.length();
      if (dist > 15) return;

      const forwardDir = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw));
      const dot = forwardDir.normalize().dot(toMonster.normalize());

      if (dot > 0.65) {
        observerStunTime = 2.5;
        observerJustAttacked = false;
        observerLOSTimer = 0;

        const mat = monster.material;
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = 0.3;
        }
        if (monsterLight) monsterLight.intensity = 0.3;
      }
    }
  }
}


function resetGameState() {
  moveF=moveB=moveL=moveR=0; velocity.set(0,0,0); canMove=false; jumpscare=false;
  lookYaw=lookPitch=0; dragging=false; colliders=[]; mouseDown=false;
  monsterPulseTime=monsterTwitchTimer=0; playerHP=100;
  observerLOSTimer=observerJustAttacked=observerCooldown=distortionTime=0;
  observerStunTime = 0;
  corruptedTimer=hideCooldown=0; corruptedActive=false;
  flashlightFlashTimer = 0;
  headBobTimer = 0;
  updateHealthBar(); redOverlay.style.opacity=0; redOverlay.className='';
  distortionOverlay.style.opacity=0;
  if(renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
}

function playSound(url, loop=false, vol=1) {
  const audio = new Audio(url); audio.loop=loop; audio.volume=vol; audio.play(); return audio;
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
function BLINK(element, times = 5, speed = 100) {
  let count = 0;
  
  function blinkCycle() {
    if (count >= times) return; // Stop after required blinks
    
    const ITKILLEDHIM = document.getElementById(element);
    ITKILLEDHIM.style.display = 'block';
    ITKILLEDHIM.style.opacity = '1';
    
    setTimeout(() => {
      ITKILLEDHIM.style.display = 'none';
      ITKILLEDHIM.style.opacity = '0';
      count++;
      if (count < times) {
        setTimeout(blinkCycle, speed); // Schedule next blink
      }
    }, speed);
  }
  
  blinkCycle(); // Start the sequence
}





function spawnMonsterNearPlayer() {
  if (!monster) return;
  const playerPos = camera.position.clone();
  const angle = Math.random()*Math.PI*2;
  const radius = 6 + Math.random()*4;
  const pos = new THREE.Vector3(
    playerPos.x + Math.cos(angle)*radius,
    1.6,
    playerPos.z + Math.sin(angle)*radius
  );
  pos.x = Math.max(-25, Math.min(25, pos.x));
  pos.z = Math.max(-25, Math.min(25, pos.z));
  monster.position.copy(pos);

  // Make monster face the player
  const toPlayer = playerPos.clone().sub(monster.position);
  const facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
  monster.rotation.y = facingAngle;
}

function spawnCorrupted() {
  if(corrupted) scene.remove(corrupted);
  
  // Load your Cave.glb as the corrupted enemy
  const loader = new THREE.GLTFLoader();
  loader.load('./Cave.glb', (gltf) => {
    corrupted = gltf.scene;
    corrupted.scale.set(0.4, 0.4, 0.4); // Adjusted smaller size
    corrupted.position.set((Math.random()-0.5)*10, -2, -Math.random()*35-10);
    corrupted.rotation.y = Math.random() * Math.PI * 2;
    
    // Add emissive red glow effect
    corrupted.traverse((child) => {
      if (child.isMesh) {
        // Clone the material to avoid affecting other objects
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => {
            const clonedMat = mat.clone();
            clonedMat.emissive = new THREE.Color(0xaa0000);
            clonedMat.emissiveIntensity = 1.5;
            return clonedMat;
          });
        } else {
          const clonedMat = child.material.clone();
          clonedMat.emissive = new THREE.Color(0xaa0000);
          clonedMat.emissiveIntensity = 1.5;
          child.material = clonedMat;
        }
      }
    });
    
    // Add pulsing red light
    const corruptedLight = new THREE.PointLight(0xff3333, 1.8, 8);
    corrupted.add(corruptedLight);
    
    scene.add(corrupted);
    corruptedActive = true;
    corruptedTimer = 0;
    console.log('Cave.glb loaded successfully');
  }, undefined, (error) => {
    console.error('Failed to load Cave.glb:', error);
    // Fallback to sphere if GLB fails
    corrupted = new THREE.Mesh(new THREE.SphereGeometry(0.8,32,32), new THREE.MeshPhongMaterial({
      color: 0x550000, emissive: 0xaa0000, emissiveIntensity: 1.5
    }));
    corrupted.position.set((Math.random()-0.5)*10, -2, -Math.random()*35-10);
    scene.add(corrupted);
    corruptedActive = true;
    corruptedTimer = 0;
  });
}


function hideInCloset() {
  if(hideCooldown > 0 || !currentLevel) return;
  const playerPos = camera.position;
  const nearCloset = colliders.some(col => {
    const dist = playerPos.distanceTo(col.position);
    return dist < 1.8 && col.geometry.parameters.width <= 1.5 && col.geometry.parameters.height >= 2;
  });
  if(nearCloset) {
    if (currentLevel != 2) {
      hideCooldown = 8;
      if(corruptedActive && corrupted) { scene.remove(corrupted); corruptedActive = false; corruptedP = 0;} 
      showHideMessage('C', 2, 2);
      playSound('https://cdn.pixabay.com/audio/2022/10/16/audio_12b1b6c0e2.mp3', false, 0.3);
    } else if (currentLevel === 2) {
      hideCooldown = 8;
      if(corruptedActive && corrupted) { scene.remove(corrupted); corruptedActive = false; corruptedP = 0;} 
      showHideMessage('CANT', 2, 2);
      playSound('https://cdn.pixabay.com/audio/2022/10/16/audio_12b1b6c0e2.mp3', false, 0.3);
    }
  } 
}

function PickUpFlashlight() {
  scene.remove(FLASHOBJ); FLASHLIGHTON = true; colliders = colliders.filter(c => c !== FLASHOBJ);
}

function CUTSCENE(number, section) {
  const ITKILLEDHIM = document.getElementById('ITKILLEDHIM');
  const IFIWASFASTER = document.getElementById('IFIWASFASTER');
  const BLACK1 = document.getElementById('BLACK1');
  const BLACK2 = document.getElementById('BLACK2');
  if (section === 1) {
  if (number === 1) {
    IFIWASFASTER.style.display='block';
    setTimeout(() => {
      IFIWASFASTER.style.display='none';
      ITKILLEDHIM.style.display='block';
    }, 1000);
    setTimeout(() => {
      ITKILLEDHIM.style.display='none';
      initLevel1(); canMove = true; WASD = true; setTimeout(setupTouchControls,500);

    }, 2000);
  } else if (number === 2) {
    showHideMessage('OUT'); setTimeout(() => {
      showHideMessage('OUT', 0, 1, false);
      ITKILLEDHIM.style.display='block';
    }, 2000);
    setTimeout(() => {
      document.getElementById('ITKILLEDHIM').style.display='none';
      initLevel2(); canMove = true; WASD = true; setTimeout(setupTouchControls,500);
    }, 4000);
  } else if (number === 3) {
    setTimeout(() => {
      resetGameState();
      IFIWASFASTER.style.display='block';
      IFIWASFASTER.style.animation=('slowZoom 20s infinite alternate linear');
    }, 1000);
    setTimeout(() => {
      IFIWASFASTER.style.display='none';
      IFIWASFASTER.style.animation=('none');
      ITKILLEDHIM.style.display='block';
    }, 1500);
    setTimeout(() => {
      ITKILLEDHIM.style.display='none';
      IFIWASFASTER.style.display='block';
    }, 2000);
    setTimeout(() => {
      IFIWASFASTER.style.animation=('slowZoom 20s infinite alternate linear');
    }, 4000);
    setTimeout(() => {
      IFIWASFASTER.style.display='none';
      IFIWASFASTER.style.animation='none';
      BLACK2.style.display='block';
    }, 6000);
    setTimeout(() => {
      BLACK1.style.display='block';
      BLACK2.style.display='none';
    }, 8000);
    setTimeout(() => {
      showCHideMessage("right in front of him?", 3, true, '#AA0000', '10%');
    }, 10000);
    setTimeout(() => {
      BLINK('BLACK2' , 2, 2000);
    }, 11000);
    setTimeout(() => {
      showCHideMessage("Yeah.. man it must have been horrifying", 3, true, '#ffffff', '70%');
    }, 14000);
    setTimeout(() => {
      BLINK('BLACK2', 2, 100);
      showCHideMessage("wait! he's waking up! charles?", 3, true, '#ffffff', '70%');
    }, 17000);
    setTimeout(() => {
      showCHideMessage("Çħăřłęś?¿¿?", 3, true, '#AA0000', '50%');
      initLevel1(2); canMove = true; WASD = true; setTimeout(setupTouchControls,500); playerHP = 100;
      BLACK2.style.display='none';
      BLACK1.style.display='none';
    }, 19000);
  }
} else if (section === 2) {

}
}

function LVL1() {
  currentLevel = 0; scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);
  camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,150);
  camera.position.set(0,1.6,0);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.domElement.style.display = 'block';
  document.body.appendChild(renderer.domElement);
  FLASHLIGHTON=false; INTERACT = 0;
  const playerpos = camera.position;
  showHideMessage('B', 5);
  
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





  exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 0.2),
    new THREE.MeshPhongMaterial({
      color:0x999999,
      emissive:0x003300,
    })
  );
  exitDoor.position.set(13,1,0);
  scene.add(exitDoor);
  colliders.push(exitDoor);
 
 lookYaw = -Math.PI / 2;
  lookPitch = -1;
 
  playerHP=100; updateHealthBar(); clock.getDelta(); animate();

}

function initLevel1(iteration=1) {
  currentLevel = iteration === 1? 1 : 0.5; scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);
  camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,150);
  camera.position.set(0,1.6,0);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.domElement.style.display = 'block';
  document.body.appendChild(renderer.domElement);
  if (iteration === 1) {
    showHideMessage('N', 4); 
  } else {
    showCHideMessage("My name is charles...", 3, true, '#191970', '10%');
  }
  
  if (iteration === 2) { 
    setTimeout(() => { BLINK('BLACK2', 2, 1000); }, 7000);
  }

  showHideMessage('E', 0, 1, false);
  canMove = true; WASD = true; setTimeout(setupTouchControls,500); FLASHLIGHTON=true;

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
 

  if (iteration === 1) {
    addWall(-5,1,5,10,2,0.5);
    addWall(5,1,-5,10,2,0.5);
    addWall(0,1,-10,0.5,2,10);
    addWall(10,1,0,0.5,2,10);
    addWall(-10,1,0,0.5,2,10);
  } else {
    addWall(9,1,2,10,2,0.5);
    addWall(-3,1,6,0.5,2,10);
    addWall(1,1,-10,0.5,2,10);
    addWall(10,1,7,0.5,2,10);
    addWall(5,1,7,10,2,0.5);
  }


  exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 0.2),
    new THREE.MeshPhongMaterial({
      color:0x999999,
      emissive:0x003300,
    })
  );
  exitDoor.position.set(13,1,0);
  if (iteration === 1) {
    scene.add(exitDoor);
    colliders.push(exitDoor);
  }

  if (iteration === 1) {
    monster = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x000000,
        emissiveIntensity: 1.3
      })
    );
    const playerPos = camera.position;
    monster.position.set(-10, 1.6, -10);
    scene.add(monster);

    monsterLight = new THREE.PointLight(0x111111, 1.2, 6);
    monster.add(monsterLight);

    // Eyes of the observer
    const eyeGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const eyeMat = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.5
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.17, 0.05, 0.68);
    rightEye.position.set(0.17, 0.05, 0.68);
    monster.add(leftEye);
    monster.add(rightEye);
  }

  if (iteration === 1) {
    for(let i=0;i<100;i++){
      let box = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshPhongMaterial({color:0x333333})
      );
      box.position.set(-12+Math.random()*24,0.5,-12+Math.random()*24);
      scene.add(box);
    }
  }
        
      
    



  playSound('https://cdn.pixabay.com/audio/2022/10/16/audio_12b1b6c0e2.mp3',true, 0.1);
 
  lookYaw = 0;
  lookPitch = 0;
 
  playerHP=100; updateHealthBar(); clock.getDelta(); animate();
}

function initLevel2() {
  currentLevel = 2; scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);
  camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,150);
  camera.position.set(0,1.6,0);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.domElement.style.display = 'block';
  document.body.appendChild(renderer.domElement);
  showHideMessage('L2', 4, 2);

	scene.add(new THREE.AmbientLight(0x111122, 0.15));
  flashlight = new THREE.SpotLight(0xffffffff, 4, 30, Math.PI/12, 0.8, 2);
  flashlight.position.set(0,0,0); flashlight.target.position.set(0,0,-1);
  camera.add(flashlight); camera.add(flashlight.target); scene.add(camera);

 
  const hallwayLength = 60;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8,hallwayLength), new THREE.MeshPhongMaterial({color:0x202020}));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  addWall(-4,1.5,0,0.5,3,hallwayLength,0x333333);
  addWall(4,1.5,0,0.5,3,hallwayLength,0x333333);

  const skyGeo = new THREE.SphereGeometry(50,32,16,true);
  const skyMat = new THREE.MeshBasicMaterial({color:0x111122, side:THREE.BackSide});
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);


  for(let i=-25;i<=25;i+=8) {
    addWall(-3.2,1.1,i,1.5,2.2,1.5);
    addWall(3.2,1.1,i,1.5,2.2,1.5);
  }

  exitDoor = new THREE.Mesh(new THREE.BoxGeometry(6,2,0.2), new THREE.MeshPhongMaterial({color:0x00ff00, emissive:0x002200}));
  exitDoor.position.set(0,1,26); scene.add(exitDoor); colliders.push(exitDoor);

  spawnCorrupted(); corruptedSpeed = 9;
  
  playerHP=100; updateHealthBar(); clock.getDelta(); animate();
}

function initLevel3() {
  currentLevel = 3; scene = new THREE.Scene(); scene.background = new THREE.Color(0x080810);
  camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,150);
  camera.position.set(0,1.6,0);
  renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.domElement.style.display = 'block';
  document.body.appendChild(renderer.domElement);
  FLASHLIGHTON = true;

  scene.add(new THREE.AmbientLight(0x111122, 0.15));
  flashlight = new THREE.SpotLight(0xffffff, 4, 30, Math.PI/12, 0.8, 2);
  flashlight.position.set(0,0,0); flashlight.target.position.set(0,0,-1);
  camera.add(flashlight); camera.add(flashlight.target); scene.add(camera);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshPhongMaterial({color:0x181818}));
  floor.rotation.x = -Math.PI/2; scene.add(floor);

  const mazeWalls = [
    [-30,1.5,0,10,3,20], [20,1.5,0,10,3,20], [0,1.5,-30,40,3,1],
    [-15,1.5,-15,8,3,15], [15,1.5,10,8,3,15], [-25,1.5,20,15,3,1],
    [10,1.5,-25,1,3,20], [25,1.5,15,1,3,20]
  ];
  mazeWalls.forEach(([x,y,z,w,h,d]) => addWall(x,y,z,w,h,d,0x333333));

  for(let i=0; i<25; i++) {
    const x = -35 + Math.random()*70, z = -35 + Math.random()*70;
    addWall(x,1.1,z,1.2,2.2,1.3);
  }

  exitDoor = new THREE.Mesh(new THREE.BoxGeometry(2,2,0.2), new THREE.MeshPhongMaterial({color:0x00ff00, emissive:0x002200}));
  exitDoor.position.set(35,1,35); scene.add(exitDoor); colliders.push(exitDoor);

  monster = new THREE.Mesh(new THREE.SphereGeometry(0.7,32,32), new THREE.MeshPhongMaterial({color:0x000000, emissive:0x000000, emissiveIntensity:0}));
  scene.add(monster); monsterLight = new THREE.PointLight(0xAA0000,1.5,12); monster.add(monsterLight);
  spawnMonsterNearPlayer();
  spawnCorrupted(); corruptedSpeed = 9;
  
  playerHP=100; updateHealthBar(); clock.getDelta(); animate();
}

function animate() {
  const dt = clock.getDelta();
  monsterPulseTime += dt; monsterTwitchTimer += dt; requestAnimationFrame(animate);

  if(canMove && !jumpscare) {

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

  if (camera.position.x <= -5 && currentLevel === 0) {
    showHideMessage('W', 4); showHideMessage('A', 0, 1, false);
  }

  if (camera.position.x >= 8 && camera.position.z <= -4 && currentLevel === 0) {
    showHideMessage('E', 4); showHideMessage('W', 0, 1, false);
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
    if (monster && currentLevel != 2) {
      const playerPos = camera.position;
      const toMonsterVec = monster.position.clone().sub(playerPos);
      const dist = toMonsterVec.length();

      if (observerStunTime > 0) {
        observerStunTime -= dt;
        const pulse = 0.02 * Math.sin(monsterPulseTime * 2);
        monster.scale.setScalar(1 + pulse);

        if (observerStunTime <= 0) {
          observerStunTime = 0;
          const mat = monster.material;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity = currentLevel === 3 ? 1.8 : 1.3;
          }
          if (monsterLight) monsterLight.intensity = currentLevel === 3 ? 1.5 : 1.2;
        }
      } else {
        if (dist > 12 && observerCooldown <= 0) spawnMonsterNearPlayer();

        const pulse = 0.04 * Math.sin(monsterPulseTime * 3);
        monster.scale.setScalar(1 + pulse);

        const forwardDir = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw));
        const toMonsterNorm = toMonsterVec.clone().normalize();
        const dot = forwardDir.dot(toMonsterNorm);

        if (dot > 0.3 && dist < 18 && observerCooldown <= 0) {
          const targetAngle = Math.atan2(toMonsterNorm.x, toMonsterNorm.z);
          monster.rotation.y += (targetAngle - monster.rotation.y) * 0.25;

          if (observerLOSTimer > 0.4 && !observerJustAttacked && dist < 12) {
            observerJustAttacked = true;
            observerLOSTimer = 0;

            const flashOffset = new THREE.Vector3(0, 0, -1.8);
            flashOffset.applyQuaternion(camera.quaternion);
            monster.position.copy(camera.position.clone().add(flashOffset));

            applyDamage(currentLevel === 1? 50 : 25);
            distortionTime = 3.0;
            observerCooldown = 4.0;
          }

          observerLOSTimer += dt;
        } else {
          observerLOSTimer = 0;
        }

        if (observerCooldown > 0) {
          observerCooldown -= dt;
          if (observerCooldown <= 0) {
            spawnMonsterNearPlayer();
            observerJustAttacked = false;
          }
        }
      }
    }

    // Corrupted logic - works with GLTF model
if(currentLevel > 1 && corrupted) {
  if(hideCooldown > 0) hideCooldown -= dt;
  
  const playerPos = camera.position;
  const toPlayer = playerPos.clone().sub(corrupted.position);
  const dist = toPlayer.length();
  // Always look at player
  corrupted.lookAt(playerPos);
  // Adjust for model orientation (rotate 90 degrees on Y-axis)
  corrupted.rotation.y += Math.PI / -2;
  
  // Move toward player
  corrupted.position.add(toPlayer.clone().normalize().multiplyScalar(corruptedSpeed * dt));
  
  // Attack on contact
  if(dist < 2.0 && hideCooldown <= 0) {
    applyDamage(0.5); corruptedP = 3
    // Pulse effect
    const baseScale = 0.01;
    corrupted.scale.setScalar(baseScale * 1);
    setTimeout(() => corrupted.scale.setScalar(baseScale), 100);
  }
  
  if(!corruptedActive) corruptedTimer += dt;
  if(!corruptedActive && corruptedTimer > 10 + Math.random() * 8) {
    corruptedTimer = 0; 
    spawnCorrupted();
  }
}
  // Win conditions
  if(camera.position.distanceTo(exitDoor.position) < 1.8) {
    if(currentLevel === 2) {
      document.getElementById('instructions').style.display = 'flex';
      document.getElementById('instructions').innerHTML = '<h1>Tutorial Complete!</h1><p><button id="newGameBtn">Play Nightmare Mode</button><br><button id="tutorialBtn">Play Tutorial Again</button></p>';
      canMove = true;
    } else if(currentLevel === 3) {
      document.getElementById('instructions').style.display = 'flex';
      document.getElementById('instructions').innerHTML = '<h1>You ESCAPED THE NIGHTMARE!</h1><p><button id="newGameBtn">Play Again</button><br><button id="tutorialBtn">Tutorial</button></p>';
      canMove = false;
    } else if(currentLevel === 1) {
      nextLevel();
    } else if(currentLevel === 0.5) {
      nextLevel(); 
    } else if(currentLevel === 0) {
      nextLevel();
    }
    return;
  }

  if(FLASHLIGHTON === true) {
    batteryBar.style.opacity = 100;
    batteryFill.style.opacity = 100;
  }

  if (currentLevel === 0) {
    if(camera.position.distanceTo(FLASHOBJ.position) < 1.8) {
      if(INTERACT===1) {
        PickUpFlashlight(); FLASHLIGHTON=true;
      } else if(!FLASHLIGHTON) {
        showHideMessage('A', 5); showHideMessage('B', 0, 1, false);
      }
    }
  }

  if(distortionTime > 0) {
    distortionTime -= dt;
    const p = Math.max(0, distortionTime / 3.0);
    distortionOverlay.style.opacity = 0.15 + 0.35 * p;
    camera.rotation.z = Math.sin(performance.now() * 0.002) * 0.03 * p;
  } else {
    distortionOverlay.style.opacity = 0; camera.rotation.z = 0;
  }

  if(renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}


function nextLevel() {
  if (currentLevel === 0) {
      resetGameState(); CUTSCENE(1, 1); canMove = true; setTimeout(setupTouchControls,500);
  } else if(currentLevel === 1) {
    resetGameState(); initLevel2(); canMove = true; setTimeout(setupTouchControls,300);
  } else if(currentLevel === 0.5) {
    resetGameState(); initLevel3(); canMove = true; setTimeout(setupTouchControls,300);
  } else {
    document.getElementById('instructions').style.display = 'flex';
    document.getElementById('instructions').innerHTML = '<h1>Tutorial Complete!</h1><p><button id="newGameBtn">Play Nightmare Mode</button></p>';
    canMove = false;
  }
}

function triggerJumpscare() {
  jumpscare=true; document.getElementById('JUMPSCARE').style.display='flex';
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

// Button handlers
document.getElementById('tutorialBtn').onclick = () => {
  document.getElementById('instructions').style.display='none';
  resetGameState(); canMove=true; currentLevel=0; LVL1(); setTimeout(setupTouchControls,500); let WASD=true;
};

document.getElementById('newGameBtn').onclick = () => {
  document.getElementById('instructions').style.display='none';
  resetGameState(); canMove=true; currentLevel=3; initLevel3(); setTimeout(setupTouchControls,500); let WASD=true;
};

document.getElementById('settingsBtn').onclick = () => {
	document.getElementById('instructions').style.display='none';
  resetGameState(); canMove=true; currentLevel=3; initLevel3(); setTimeout(setupTouchControls,500);
	let WASD=false;
};