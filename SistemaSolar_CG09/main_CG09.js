//#region Shaders
//#region Phong Shading
const vs = `
uniform mat4 u_matrix; //worldviewprojectionmatrix
uniform vec3 u_lightWorldPos;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
uniform mat4 u_worldInverseTranspose;            

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texcoord;

varying vec4 v_position;
varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

void main() {
  v_texcoord = texcoord;
  v_normal = (u_worldInverseTranspose * vec4(normal, 0)).xyz;
  v_surfaceToLight = u_lightWorldPos - (u_world * position).xyz;
  v_surfaceToView = (u_viewInverse[3] - (u_world * position)).xyz;
  v_position = u_matrix * position;

  gl_Position = v_position;

}  `;

const fs = `
precision mediump float;

varying vec3 v_postion;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;

uniform sampler2D u_texture;
uniform sampler2D u_diffuse;

uniform vec4 u_lightColor;
uniform vec4 u_ambient;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
//   return vec4(ambient, diffuse, specular, 1.0);
}
            
void main() {
    vec4 diffuseColor = texture2D(u_texture, v_texcoord);
    vec3 a_normal = normalize(v_normal);
    vec3 surfaceToLight = normalize(v_surfaceToLight);
    vec3 surfaceToView = normalize(v_surfaceToView);

    vec3 halfVector = normalize( surfaceToLight + surfaceToView );

    vec4 litR = lit(dot(a_normal, surfaceToLight),
                    dot(a_normal, halfVector), u_shininess);
    
    vec4 outColor = vec4((
    u_lightColor * (diffuseColor * litR.y + diffuseColor * u_ambient +
                u_specular * litR.z * u_specularFactor)).rgb,
      diffuseColor.a);

    gl_FragColor = outColor;
    //gl_FragColor = texture2D(u_texture, v_texcoord);
}`;
//#endregion

//#region Gouraud Shading
var gouraud_vs = `
attribute vec4 position;
attribute vec3 normal;
attribute vec2 texcoord;

uniform mat4 u_matrix;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_lightWorldPos;

uniform vec4 u_lightColor;
uniform vec4 u_ambient;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

varying vec4 v_color;
varying vec2 v_texcoord;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}

void main() {
    vec3 worldNormal = (u_worldInverseTranspose * vec4(normal, 0)).xyz;
    vec3 worldPosition = (u_world * position).xyz;
    vec3 surfaceToLight = u_lightWorldPos - worldPosition;
    vec3 cameraPosition = (u_viewInverse[3]).xyz;
    vec3 surfaceToView = normalize(cameraPosition - worldPosition);
    vec3 halfVector = normalize(surfaceToLight + surfaceToView);

    vec4 litR = lit(dot(worldNormal, surfaceToLight),
                    dot(worldNormal, halfVector),
                    u_shininess);

    v_color = vec4(u_lightColor.rgb * litR.y + u_ambient.rgb + u_specular.rgb * litR.z 
      * u_specularFactor, 1.0);
    v_texcoord = texcoord;

    gl_Position = u_matrix * position;
}
`;

var gouraud_fs = `  
precision mediump float;

uniform sampler2D u_texture;

varying vec4 v_color;
varying vec2 v_texcoord;

void main() {
    vec4 texColor = texture2D(u_texture, v_texcoord);
    gl_FragColor = v_color * texColor;
}
`;

//#endregion
//#endregion

//#region Variables and Constants
const m4 = twgl.m4;
const gl = document.querySelector("canvas").getContext("webgl");
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
//const programInfo = twgl.createProgramInfo(gl, [gouraud_vs, gouraud_fs]); //usa gouraud shading

let eye = [0, 10, -50];
let camera;
let cameraTarget = [0, 0, 0];
let cameraUp = [0, 1, 0];
let cameraTranslationY = 10; // Additional variable to control camera rotation
let cameraTranslationX = 0; 
let cameraTranslationZ = -50;
let cameraRotationAngle = 0; // Variable to keep track of camera rotation angle
let showOrbits = true;
let lookAtSun = false;
let lookAtEarth = false;

const keys = {};

const tex = twgl.createTexture(gl, {
  min: gl.NEAREST,
  mag: gl.NEAREST,
  src: [
    255, 255, 255, 255,
    192, 192, 192, 255,
    192, 192, 192, 255,
    255, 255, 255, 255,
  ],
});
//#endregion

//#region Events

let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;


window.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    const sensitivity = 0.1; 
    const deltaX = (e.clientX - prevMouseX) * sensitivity;
    const deltaY = (e.clientY - prevMouseY) * sensitivity;


    // cima e baixo


    var x = cameraTranslationY * Math.cos(degToRad(deltaY)) - cameraTranslationZ * Math.sin(degToRad(deltaY));
    var y = cameraTranslationZ * Math.cos(degToRad(deltaY)) + cameraTranslationY * Math.sin(degToRad(deltaY));
    cameraTranslationY = x;
    cameraTranslationZ = y;

    //esquerda direita

    var x = cameraTranslationX * Math.cos(degToRad(deltaX)) - cameraTranslationZ * Math.sin(degToRad(deltaX));
    var y = cameraTranslationZ * Math.cos(degToRad(deltaX)) + cameraTranslationX * Math.sin(degToRad(deltaX));
    cameraTranslationX = x;
    cameraTranslationZ = y;

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }
});


window.addEventListener('wheel', (e) => {
  const delta = e.deltaY; // Positive value when scrolling up, negative when scrolling down
  const zoomSpeed = 1; 
  var direction = delta * zoomSpeed;


  if (cameraTranslationZ != 0) {
    if (cameraTranslationZ > 0) {
      cameraTranslationZ -= direction;
    } else {
      cameraTranslationZ += direction;
    }
  }
  if (cameraTranslationX != 0) {
    if (cameraTranslationX > 0) {
      cameraTranslationX -= direction;
    } else {
      cameraTranslationX += direction;
    }

  }

  e.preventDefault(); // Prevent the default scroll behavior
});



window.addEventListener('keydown', (e) => {
  keys[e.keyCode] = true;
  e.preventDefault();

  if (e.keyCode == 79) {
    showOrbits = !showOrbits;
  }

  if (e.keyCode == 49) {
    lookAtEarth = !lookAtEarth;
    lookAtSun = false;
    cameraTranslationZ = -50; // Additional variable to control camera rotation
    cameraTranslationX = 0; 
    cameraTranslationY = 0;
    cameraRotationAngle = 0;
  }
  console.log(e.cameraTranslationY);


  if (e.keyCode == 50) {
    lookAtSun = !lookAtSun;
    lookAtEarth = false;
    cameraTranslationZ = -50; // Additional variable to control camera rotation
    cameraTranslationX = 0; 
    cameraTranslationY = 0;
    cameraRotationAngle = 0;
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.keyCode] = false;
  e.preventDefault();
});

//#endregion

//#region Textures and Buffers

sunTex = twgl.createTexture(gl, { src: 'textures/sun.jpg' })
mercuryTex = twgl.createTexture(gl, { src: 'textures/mercury.jpg' })
venusTex = twgl.createTexture(gl, { src: 'textures/venus.jpg' })
earthTex = twgl.createTexture(gl, { src: 'textures/earth.jpg' })
luaTex = twgl.createTexture(gl, { src: 'textures/moon.jpg' })
marsTex = twgl.createTexture(gl, { src: 'textures/mars.jpg' })
jupiterTex = twgl.createTexture(gl, { src: 'textures/jupiter2.jpg' })
saturnTex = twgl.createTexture(gl, { src: 'textures/saturn.jpg' })
uranusTex = twgl.createTexture(gl, { src: 'textures/uranus.jpg' })
neptuneTex = twgl.createTexture(gl, { src: 'textures/neptune.jpg' })

orbitTex = twgl.createTexture(gl, { src: 'textures/orbit_tex.jpg' })

asteroidTex = twgl.createTexture(gl, { src: 'textures/gravel.jpg' })

saturnRingsTex = twgl.createTexture(gl, { src: 'textures/saturn_rings.jpg' })
uranusRingsTex = twgl.createTexture(gl, { src: 'textures/uranus_rings.jpg' })


sunbufferInfo = twgl.primitives.createSphereBufferInfo(gl, 2.5, 50, 50);

mercuryBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.1, 50, 50);

venusBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.25, 50, 50);

earthBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.3, 50, 50);
luaBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.1, 50, 50);

marsBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.2, 50, 50);

jupiterBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.5, 50, 50);

saturnBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.4, 50, 50);
saturnRingBufferInfo = twgl.primitives.createCylinderBufferInfo(gl, 0.7, 0.01, 32, 1);

uranusBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.3, 50, 50);
uranusRingBufferInfo = twgl.primitives.createCylinderBufferInfo(gl, 0.3, 0.01, 32, 1);

neptuneBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.27, 50, 50);

asteroidBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.1, 10, 10);


const textures = [
  sunTex,
  mercuryTex,
  venusTex,
  earthTex,
  marsTex,
  luaTex,
  jupiterTex,
  saturnTex,
  uranusTex,
  neptuneTex,
  saturnRingsTex,
  uranusRingsTex
];

//#endregion

//#region Planet Information
const planets = [
  {
    name: "Sun",
    textureIndex: 0,
    rotationSpeed: 1/24.47,
    orbitRotationSpeed: 0,
    translation: 0,
    bufferInfo: sunbufferInfo,
    transform: {
      world: m4.identity(),
      x: 0,
      y: 0,
      z: 0
    },
    satelites: [
      {
        name: "Mercury",
        textureIndex: 1,
        rotationSpeed: 1/59,
        orbitRotationSpeed: 47.4,
        translation: 4,
        bufferInfo: mercuryBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 3,
          elipseY: 0,
          elipseZ: 3,
          x: 0,
          y: 0,
          z: 0
        },
      },
      {
        name: "Venus",
        textureIndex: 2,
        rotationSpeed: -1/243,
        orbitRotationSpeed: 35,
        //translation: -6, 
        bufferInfo: venusBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 4,
          elipseY: 0,
          elipseZ: 4,
          x: 0,
          y: 0,
          z: 0
        },
      },
      {
        name: "Earth",
        textureIndex: 3,
        rotationSpeed: 1,
        orbitRotationSpeed: 29.8,
        translation: 8,
        bufferInfo: earthBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 6,
          elipseY: 0,
          elipseZ: 6,
          x: 0,
          y: 0,
          z: 0,
          inclination: 23.5,
        },
        satelites: [{
          name: "Moon",
          textureIndex: 5,
          rotationSpeed: 0,
          orbitRotationSpeed: 120,
          translation: 1,
          bufferInfo: luaBufferInfo,
          transform: {
            world: m4.create(),
            elipseX: .5,
            elipseY: .5,
            elipseZ: .5,
            x: 0,
            y: 0,
            z: 0
          }
        }]
      },
      {
        name: "Mars",
        textureIndex: 4,
        rotationSpeed: 1.03,
        orbitRotationSpeed: 24.1,
        translation: 10,
        bufferInfo: marsBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 8,
          elipseY: 0,
          elipseZ: 8,
          x: 0,
          y: 0,
          z: 0
        },
      },
      {
        name: "Jupiter",
        textureIndex: 6,
        rotationSpeed: 1/0.41,
        orbitRotationSpeed: 13.1,
        //translation: 12,
        bufferInfo: jupiterBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 12,
          elipseY: 0,
          elipseZ: 11,
          x: 0,
          y: 0,
          z: 0,
        },
      },
      {
        name: "Saturn",
        textureIndex: 7,
        rotationSpeed: 1/0.445,
        orbitRotationSpeed: 9.7,
        translation: 14,
        bufferInfo: saturnBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 14,
          elipseY: 0,
          elipseZ: 13,
          x: 0,
          y: 0,
          z: 0,
          inclination: 20,
          inclinationAxis: 'z'
        },
        satelites: [{
          name: "Saturn Rings",
          textureIndex: 10,
          rotationSpeed: 0,
          orbitRotationSpeed: 9.7,
          translation: 0,
          bufferInfo: saturnRingBufferInfo,
          transform: {
            world: m4.create(),
            elipseX: 0,
            elipseY: 0,
            elipseZ: 0,
            x: 0,
            y: 0,
            z: 0,
            inclination: 20,
            inclinationAxis: 'z'
          }
        }]
      },
      {
        name: "Uranus",
        textureIndex: 8,
        rotationSpeed: 1/0.708,
        orbitRotationSpeed:  6.8,
        translation: 16,
        bufferInfo: uranusBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 17,
          elipseY: 0,
          elipseZ: 15,
          x: 0,
          y: 0,
          z: 0,
          inclination: -97.77,
          inclinationAxis: 'z'
        },
        satelites: [{
          name: "Uranus Rings",
          textureIndex: 11,
          rotationSpeed: 1/0.708,
          orbitRotationSpeed: 6.8,
          translation: 0,
          bufferInfo: saturnRingBufferInfo,
          transform: {
            world: m4.create(),
            elipseX: 0,
            elipseY: 0,
            elipseZ: 0,
            x: 0,
            y: 0,
            z: 0,
            inclination: -97.77,
            inclinationAxis: 'z'
          }
        }]
      },
      {
        name: "Neptune",
        textureIndex: 9,
        rotationSpeed: 1/0.667,
        orbitRotationSpeed: 5.4,
        translation: 18,
        bufferInfo: uranusBufferInfo,
        transform: {
          world: m4.create(),
          elipseX: 19,
          elipseY: 0,
          elipseZ: 17,
          x: 0,
          y: 0,
          z: 0
        },
      }
    ]
  }
]

//#endregion

//#region Asteroid Belt
const numAsteroids = 500;
asteroidPoints = generateAsteroidBeltPoints(9, 10, numAsteroids);
asteroidScale = randomiseAsteroidScale(0.2, 0.5, 0.2, 0.5, 0.2, 0.5, numAsteroids);
//#endregion

//#region Orbits

mercuryPoints = generateEllipsePoints(planets[0].satelites[0].transform.elipseX, planets[0].satelites[0].transform.elipseY, planets[0].satelites[0].transform.elipseZ, 100);
mercuryElipseOrbit = createEllipseBuffer(gl, mercuryPoints);

venusPoints = generateEllipsePoints(planets[0].satelites[1].transform.elipseX, planets[0].satelites[1].transform.elipseY, planets[0].satelites[1].transform.elipseZ, 100)
venusElipseOrbit = createEllipseBuffer(gl, venusPoints);

earthPoints = generateEllipsePoints(planets[0].satelites[2].transform.elipseX, planets[0].satelites[2].transform.elipseY, planets[0].satelites[2].transform.elipseZ, 100);
earthElipseOrbit = createEllipseBuffer(gl, earthPoints);

moonPoints = generateEllipsePoints(planets[0].satelites[2].satelites[0].transform.elipseX, planets[0].satelites[2].satelites[0].transform.elipseY, planets[0].satelites[2].satelites[0].transform.elipseZ, 100);
moonElipseOrbit = createEllipseBuffer(gl, moonPoints);

marsPoints = generateEllipsePoints(planets[0].satelites[3].transform.elipseX, planets[0].satelites[3].transform.elipseY, planets[0].satelites[3].transform.elipseZ, 100);
marsElipseOrbit = createEllipseBuffer(gl, marsPoints);

jupiterPoints = generateEllipsePoints(planets[0].satelites[4].transform.elipseX, planets[0].satelites[4].transform.elipseY, planets[0].satelites[4].transform.elipseZ, 100);
jupiterElipseOrbit = createEllipseBuffer(gl, jupiterPoints);

saturnPoints = generateEllipsePoints(planets[0].satelites[5].transform.elipseX, planets[0].satelites[5].transform.elipseY, planets[0].satelites[5].transform.elipseZ, 100);
saturnElipseOrbit = createEllipseBuffer(gl, saturnPoints);

uranusPoints = generateEllipsePoints(planets[0].satelites[6].transform.elipseX, planets[0].satelites[6].transform.elipseY, planets[0].satelites[6].transform.elipseZ, 100);
uranusElipseOrbit = createEllipseBuffer(gl, uranusPoints);

neptunePoints = generateEllipsePoints(planets[0].satelites[7].transform.elipseX, planets[0].satelites[7].transform.elipseY, planets[0].satelites[7].transform.elipseZ, 100);
neptuneElipseOrbit = createEllipseBuffer(gl, neptunePoints);


elipseOrbits = [
  mercuryElipseOrbit, //0
  venusElipseOrbit, //1
  earthElipseOrbit, //2
  marsElipseOrbit, //3
  moonElipseOrbit, //4
  jupiterElipseOrbit, //5
  saturnElipseOrbit, //6
  uranusElipseOrbit, //7
  neptuneElipseOrbit, //8
];

//#endregion

//#region Camera
function updateCameraRotationAndPosition() {
  //w/s aproxima e afasta 
  if (keys['87'] || keys['83']) {
    const direction = keys['87'] ? 1 : -1;

    if (cameraTranslationZ != 0) {
      if (cameraTranslationZ > 0) {
        cameraTranslationZ -= direction;
      } else {
        cameraTranslationZ += direction;
      }
    }
    if (cameraTranslationX != 0) {
      if (cameraTranslationX > 0) {
        cameraTranslationX -= direction;
      } else {
        cameraTranslationX += direction;
      }
    }
  }

  //cima baixo front arrow and down
  if (keys['40'] || keys['38']) {
    const direction = keys['40'] ? -1 : 1;
    ang = direction;
    angRad = degToRad(ang);
    var x = cameraTranslationY * Math.cos(angRad) - cameraTranslationZ * Math.sin(angRad);
    var y = cameraTranslationZ * Math.cos(angRad) + cameraTranslationY * Math.sin(angRad);
    cameraTranslationY = x;
    cameraTranslationZ = y;
  }
  //rodar esquerda/direita arrow left e right
  if (keys['37'] || keys['39']) {
    const direction = keys['37'] ? 1 : -1;
    ang = direction;
    angRad = degToRad(ang);
    var x = cameraTranslationX * Math.cos(angRad) - cameraTranslationZ * Math.sin(angRad);
    var y = cameraTranslationZ * Math.cos(angRad) + cameraTranslationX * Math.sin(angRad);
    cameraTranslationX = x;
    cameraTranslationZ = y;
  }
 
}

function getUpdatedViewProjectionMatrix() {
  const fov = 30 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 1000;

  var target = [0, 0, 0];

  if (lookAtSun) {
    target = [0, 0, 0];
    eye = [
      planets[0].transform.x,
      2 + cameraTranslationY,
      planets[0].transform.z - 7
    ];
  }
  else if (lookAtEarth) {
    target = [planets[0].satelites[2].transform.x, 0, planets[0].satelites[2].transform.z];

    eye = [
      planets[0].satelites[2].transform.x,
      2 + cameraTranslationY,
      planets[0].satelites[2].transform.z - 7
    ];
  }
  else {
    target = [0, 0, 0];
    eye = [
      cameraTranslationX,
      cameraTranslationY,
      cameraTranslationZ
    ];
  }

  const up = [0, 1, 0];
  camera = m4.lookAt(eye, target, up);
  const view = m4.inverse(camera);
  const projection = m4.perspective(fov, aspect, zNear, zFar);
  const viewProjection = m4.multiply(projection, view);

  return viewProjection;
}

//#endregion

//#region Draw Functions

//#region Asteroid Belt
function randomiseAsteroidScale(minX, maxX, minY, maxY, minZ, maxZ, numAsteroids) {
  scale = [];
  for (let i = 0; i < numAsteroids; i++) {
    x = Math.random() * (maxX - minX) + minX;
    y = Math.random() * (maxY - minY) + minY;
    z = Math.random() * (maxZ - minZ) + minZ;
    scale.push({ x, y, z });
  }
  return scale;
}

function generateAsteroidBeltPoints(innerRadius, outerRadius, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push({ x, y });
  }
  return points;
}

function drawAsteroidBelt() {
  for (let index = 0; index < numAsteroids; index++) {
    const point = asteroidPoints[index];
    const scale = asteroidScale[index];

    let asteroidWorldMatrix = m4.translate(m4.identity(), [point.x, 0, point.y]);
    asteroidWorldMatrix = m4.scale(asteroidWorldMatrix, [scale.x, scale.y, scale.z]);

    const uniforms = {
      u_texture: asteroidTex,
      u_matrix: m4.multiply(getUpdatedViewProjectionMatrix(), asteroidWorldMatrix),
      u_worldInverseTranspose: m4.transpose(m4.inverse(asteroidWorldMatrix)),
      u_world: asteroidWorldMatrix,
      u_viewInverse: camera,
      u_lightWorldPos: [0, 0, 0],
      u_lightColor: [1, 1, 1, 1],
      u_ambient: [.9, .9, .9, .9],
      u_specular: [1, 1, 1, 1],
      u_specularFactor: 0.5,
      u_shininess: 0.5,
      u_diffuse: tex,
    };

    twgl.setBuffersAndAttributes(gl, programInfo, asteroidBufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, asteroidBufferInfo);
  }
}

//#endregion

//#region Orbits

function createEllipseBuffer(gl, points) {
  const arrays = {
    position: { numComponents: 3, data: points },
  };
  return twgl.createBufferInfoFromArrays(gl, arrays);
}

function generateEllipsePoints(a, b, c, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    let point = [
      a * Math.cos(theta),
      b * Math.sin(theta),
      c * Math.sin(theta)
    ];
    points.push(...point);
  }
  return points;
}

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

function drawOrbits(orbit) {

  const identity = twgl.m4.identity()

  var world = identity;

  if (elipseOrbits.indexOf(orbit) == 4) {
    world = planets[0].satelites[2].transform.world;
  } 

  const uniforms = {
    u_texture: orbitTex,
    u_matrix: m4.multiply(getUpdatedViewProjectionMatrix(), world),
    u_worldInverseTranspose: m4.transpose(m4.inverse(world)),
    u_world: world,
    u_viewInverse: camera,
    u_lightWorldPos: [0, 0, 0],
    u_lightColor: [1, 1, 1, 1],
    u_ambient: [1, 1, 1, 1],
    u_specular: [1, 1, 1, 1],
    u_specularFactor: 0,
    u_shininess: 100,
    u_diffuse: tex,
  };

  twgl.setUniforms(programInfo, uniforms);
  twgl.setBuffersAndAttributes(gl, programInfo, orbit);
  twgl.drawBufferInfo(gl, orbit, gl.LINE_LOOP);
}

//#endregion

//#region Planets
function drawPlanets(parent, planet, time) {

  var m = parent ? parent.transform.world : planet.transform.world;

  if (planet.orbitRotationSpeed != 0) {
    x = planet.transform.elipseX * Math.cos(time * (planet.orbitRotationSpeed / 100000));
    y = planet.transform.elipseY * Math.sin(time * (planet.orbitRotationSpeed / 100000));
    z = planet.transform.elipseZ * Math.sin(time * (planet.orbitRotationSpeed / 100000));

    planet.transform.x = x;
    planet.transform.z = z;

    m = m4.translate(m, [x, y, z]);
  }

  planet.transform.world = m;

  if (planet.rotationSpeed != 0) {
    m = m4.rotateY(m, time * (planet.rotationSpeed/ 100000));
  }

  if (planet.transform.inclination) {
    if(planet.transform.inclinationAxis == 'z'){
      const inclinationMatrix = m4.rotationZ(planet.transform.inclination * Math.PI / 180);
      m = m4.multiply(m, inclinationMatrix);
    }else{
      const inclinationMatrix = m4.rotationX(planet.transform.inclination * Math.PI / 180);
      m = m4.multiply(m, inclinationMatrix);
    }

  }

  var uniforms = {};

  if (planet.name == "Sun") {
    uniforms = {
      u_texture: textures[planet.textureIndex],
      u_matrix: m4.multiply(getUpdatedViewProjectionMatrix(), m), // u_worldViewProjection
      u_world: m,
      u_viewInverse: camera,
      u_lightWorldPos: [0, 0, 0],
      u_lightColor: [1, 1, 1, 1],
      u_ambient: [1, 1, 1, 1],
      u_specular: [1, 1, 1, 1],
      u_specularFactor: 0.5,
      u_shininess: 50,
      u_diffuse: tex,
    };
  } else {
    uniforms = {
      u_texture: textures[planet.textureIndex],
      u_matrix: m4.multiply(getUpdatedViewProjectionMatrix(), m), // u_worldViewProjection
      u_worldInverseTranspose: m4.transpose(m4.inverse(m)),
      u_world: m,
      u_viewInverse: camera,
      u_lightWorldPos: [0, 0, 0],
      u_lightColor: [1, 1, 1, 1],
      u_ambient: [.1, .1, .1, .1],
      u_specular: [1, 1, 1, 1],
      u_specularFactor: 0.5,
      u_shininess: 50,
      u_diffuse: tex,
    };
  }

  twgl.setUniforms(programInfo, uniforms);
  twgl.setBuffersAndAttributes(gl, programInfo, planet.bufferInfo);
  twgl.drawBufferInfo(gl, planet.bufferInfo);


  if (planet.satelites) {
    planet.satelites.forEach(satelite => {
      drawPlanets(planet, satelite, time);
    });
  }

}
//#endregion
//#endregion

function render(time) {
  gl.useProgram(programInfo.program);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  
  updateCameraRotationAndPosition();
  
  drawPlanets(null, planets[0], time);
  
  if (showOrbits) {
    elipseOrbits.forEach(orbit => {
      drawOrbits(orbit);
    });
  }
  
  drawAsteroidBelt();

  requestAnimationFrame(render);
}
2
function degToRad(d) {
  return d * Math.PI / 180;
}

render();

