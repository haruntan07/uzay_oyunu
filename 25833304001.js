// Sahne oluştur
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Işıklandırma
const ambientLight = new THREE.AmbientLight(0x000000); // sabit karanlık
scene.add(ambientLight);

const light = new THREE.PointLight(0xffffff, 1, 500);
light.position.set(10, 10, 10);
scene.add(light);
let lightIntensity = 1;
let lightOn = true;

// Klavye kontrol
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Escape') showGameOver();
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Işık kontrolü + yıldızlar
function handleLightControl() {

  if (keys['KeyL']) {
    keys['KeyL'] = false;
    lightOn = !lightOn;
    light.intensity = lightOn ? lightIntensity : 0;
    stars.visible = lightOn; // yıldızları görünmez yap
  }

  if (lightOn && (keys['Equal'] || keys['NumpadAdd'])) {
    keys['Equal'] = false;
    keys['NumpadAdd'] = false;
    lightIntensity = Math.min(5, lightIntensity + 0.1);
    light.intensity = lightIntensity;
  }

  if (lightOn && (keys['Minus'] || keys['NumpadSubtract'])) {
    keys['Minus'] = false;
    keys['NumpadSubtract'] = false;
    lightIntensity = Math.max(0.1, lightIntensity - 0.1);
    light.intensity = lightIntensity;
  }

  
}

  // Işık hareket
  function handleLightMovement() {
  const moveSpeed = 0.3;
  if (keys['KeyW']) light.position.z -= moveSpeed;
  if (keys['KeyS']) light.position.z += moveSpeed;
  if (keys['KeyA']) light.position.x -= moveSpeed;
  if (keys['KeyD']) light.position.x += moveSpeed;
}

let ship; 

const loader = new THREE.GLTFLoader();
loader.load(
  'ship.glb', // model dosyanızın adı
  function (gltf) {
    ship = gltf.scene;
    ship.scale.set(1.5, 1.5, 1.5); // boyut ayarı
    ship.position.set(0, 0, 0); // sahnedeki konumu
    scene.add(ship);
  },
  undefined,
  function (error) {
    console.error('Gemiyi yüklerken hata oluştu:', error);
  }
);



// Yıldızlar
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
const starVertices = [];
for (let i = 0; i < 10000; i++) {
  starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Oyun durumu
const meteors = [];
const bullets = [];
const particles = [];
let level = 1;
let wave = 1;
let countdown = 20;
let countdownInterval;
let meteorsLeftInWave = 20;
let totalMeteorsDestroyed = 0;
let gameOver = false;
let meteorScale = 1.0;
let lastShotTime = 0;
const shootCooldown = 200;

// Gemi hareketi (yön tuşları)
function handleShipMovement() {
  const moveSpeed = 0.1 * (1 + level * 0.05);
  let newX = ship.position.x;
  let newY = ship.position.y;
  if (keys['ArrowUp']) newY += moveSpeed;
  if (keys['ArrowDown']) newY -= moveSpeed;
  if (keys['ArrowLeft']) newX -= moveSpeed;
  if (keys['ArrowRight']) newX += moveSpeed;
  ship.position.x = Math.max(-15, Math.min(15, newX));
  ship.position.y = Math.max(-8, Math.min(8, newY));
  ship.position.z = 0;
}

// Sayaç
function startCountdown() {
  clearInterval(countdownInterval);
  document.getElementById('countdown').textContent = countdown;
  countdownInterval = setInterval(() => {
    countdown--;
    document.getElementById('countdown').textContent = countdown;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      showGameOver();
    }
  }, 1000);
}

// Bilgi güncelle
function updateInfo() {
  document.getElementById('level').textContent = level;
  document.getElementById('wave').textContent = wave;
  document.getElementById('meteors').textContent = meteorsLeftInWave;
  document.getElementById('countdown').textContent = countdown;
}

// Meteor oluştur
const meteorModels = ['meteor-1.glb', 'meteor-2.glb', 'meteor-3.glb'];
const gltfLoader = new THREE.GLTFLoader();

function spawnWave() {
  if (gameOver) return;

  meteors.forEach(m => scene.remove(m));
  meteors.length = 0;

  const xPositions = [-6, -3, 0, 3, 6];
  const zPositions = [-60, -50, -40, -30];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const modelPath = meteorModels[Math.floor(Math.random() * meteorModels.length)];

      gltfLoader.load(modelPath, (gltf) => {
        const meteor = gltf.scene;
        meteor.scale.set(1.2, 1.2, 1.2);
        meteor.position.set(
          xPositions[col] + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 4,
          zPositions[row] + (Math.random() - 0.5) * 10
        );
        meteor.userData = {
          velocityX: (Math.random() > 0.5 ? 0.008 : -0.008) * (1 + level * 0.05),
          velocityZ: 0.0035 * (1 + level * 0.05)
        };
        scene.add(meteor);
        meteors.push(meteor);
      });
    }
  }

  meteorsLeftInWave = 20;
  countdown = Math.max(5, 20 - (wave - 1) * 2);
  updateInfo();
  startCountdown();
}

// Patlama efekti
const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });

function createExplosion(position) {
  for (let i = 0; i < 25; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(position);
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ),
      life: 1.0
    };
    scene.add(particle);
    particles.push(particle);
  }
}



// Game Over
function showGameOver() {
  gameOver = true;
  clearInterval(countdownInterval);
  document.querySelector('#finalScore span').textContent = totalMeteorsDestroyed;
  document.getElementById('gameOver').style.display = 'block';
  meteors.forEach(m => scene.remove(m));
  bullets.forEach(b => scene.remove(b));
  particles.forEach(p => scene.remove(p));
  meteors.length = 0;
  bullets.length = 0;
  particles.length = 0;
}

// Oyun yeniden başlatma
document.getElementById('restart').addEventListener('click', () => {
  gameOver = false;
  level = 1;
  wave = 1;
  meteorScale = 1.0;
  totalMeteorsDestroyed = 0;
  meteorsLeftInWave = 20;
  countdown = 20;
  ship.position.set(0, 0, 0);
  lastShotTime = 0;
  document.getElementById('gameOver').style.display = 'none';
  meteors.length = 0;
  bullets.length = 0;
  particles.length = 0;
  spawnWave();
  updateInfo();
});

document.getElementById('exit').addEventListener('click', () => window.close());

// Kamera kontrol
const spherical = new THREE.Spherical(15, Math.PI / 3, 0);
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

document.addEventListener('mousedown', (e) => {
  if (!gameOver) {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }
});
document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', (e) => {
  if (isDragging && !gameOver) {
    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };
    spherical.theta -= deltaMove.x * 0.005;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaMove.y * 0.005));
    previousMousePosition = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  }
});
document.addEventListener('wheel', (e) => {
  if (!gameOver) {
    spherical.radius = Math.max(5, Math.min(30, spherical.radius + e.deltaY * 0.01));
    updateCameraPosition();
  }
});

function updateCameraPosition() {
  camera.position.setFromSpherical(spherical);
  camera.position.add(ship.position);
  camera.lookAt(ship.position);
}

// Ana döngü
function animate() {
  requestAnimationFrame(animate);
  if (gameOver) return;

  handleShipMovement();
  handleLightControl();
  handleLightMovement();

if (keys['Space'] && Date.now() - lastShotTime > shootCooldown && ship) {
  gltfLoader.load('fire.glb', (gltf) => {
    const bullet = gltf.scene;
    bullet.scale.set(0.5, 0.5, 0.5);
    bullet.position.set(ship.position.x, ship.position.y, ship.position.z + 1.8);
    bullet.userData = { velocity: -0.5 * (1 + level * 0.05) };
    scene.add(bullet);
    bullets.push(bullet);
  });

  lastShotTime = Date.now();
}


  meteors.forEach((meteor, mi) => {
    meteor.position.x += meteor.userData.velocityX;
    meteor.position.z += meteor.userData.velocityZ;
    if (Math.abs(meteor.position.x) > 7) meteor.userData.velocityX *= -1;
    if (meteor.position.z > 10) {
      scene.remove(meteor);
      meteors.splice(mi, 1);
      meteorsLeftInWave--;
      updateInfo();
    }
  });

  bullets.forEach((bullet, bi) => {
    bullet.position.z += bullet.userData.velocity;
    if (bullet.position.z < -100) {
      scene.remove(bullet);
      bullets.splice(bi, 1);
      return;
    }

    meteors.forEach((meteor, mi) => {
      if (bullet.position.distanceTo(meteor.position) < 1.2) {
        createExplosion(meteor.position);
        scene.remove(bullet);
        scene.remove(meteor);
        bullets.splice(bi, 1);
        meteors.splice(mi, 1);
        meteorsLeftInWave--;
        totalMeteorsDestroyed++;
        updateInfo();

        if (meteorsLeftInWave === 0) {
          if (level === 5 && wave === 5) return alert('Tebrikler, oyunu kazandınız!');
          if (wave < 5) wave++;
          else { level++; wave = 1; meteorScale *= 0.9; }
          spawnWave();
        }
      }
    });
  });

  particles.forEach((particle, pi) => {
    particle.position.add(particle.userData.velocity);
    particle.userData.life -= 0.015;
    particle.scale.setScalar(particle.userData.life);
    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particles.splice(pi, 1);
    }
  });

  meteors.forEach((meteor) => {
    if (ship.position.distanceTo(meteor.position) < 1.5) showGameOver();
  });

  updateCameraPosition();
  renderer.render(scene, camera);
}

spawnWave();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
