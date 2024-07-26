import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import tableMatImage from "./table.png";

// SECTION constants
const candleRadius = 0.35; // Base radius of the candle
const candleHeight = 3.5; // Total height of the candle
const candleCount = 5; // Number of candles

const baseRadius = 2.5; // Base radius of the cake
const baseHeight = 2; // Height of the cake base
const middleRadius = 2; // Middle radius of the cake
const middleHeight = 1.25; // Height of the cake middle
const topRadius = 1.5 // Top radius of the cake
const topHeight = 1; // Height of the cake top

const tableHeightOffset = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(3, 5, 8).setLength(15);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101005);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minPolarAngle = THREE.MathUtils.degToRad(60);
controls.maxPolarAngle = THREE.MathUtils.degToRad(95);
controls.minDistance = 4;
controls.maxDistance = 20;
controls.autoRotate = true;
controls.autoRotateSpeed = 1;
controls.target.set(0, 2, 0);
controls.update();

var light = new THREE.DirectionalLight(0xffffff, 0.025);
light.position.setScalar(10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.05));


// flame

function getFlameMaterial(isFrontSide) {
	let side = isFrontSide ? THREE.FrontSide : THREE.BackSide;
	return new THREE.ShaderMaterial({
		uniforms: {
			time: { value: 0 }
		},
		vertexShader: `
uniform float time;
varying vec2 vUv;
varying float hValue;

//https://thebookofshaders.com/11/
// 2D Random
float random (in vec2 st) {
return fract(sin(dot(st.xy,
vec2(12.9898,78.233)))
* 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
vec2 i = floor(st);
vec2 f = fract(st);

// Four corners in 2D of a tile
float a = random(i);
float b = random(i + vec2(1.0, 0.0));
float c = random(i + vec2(0.0, 1.0));
float d = random(i + vec2(1.0, 1.0));

// Smooth Interpolation

// Cubic Hermine Curve.  Same as SmoothStep()
vec2 u = f*f*(3.0-2.0*f);
// u = smoothstep(0.,1.,f);

// Mix 4 coorners percentages
return mix(a, b, u.x) +
(c - a)* u.y * (1.0 - u.x) +
(d - b) * u.x * u.y;
}

void main() {
vUv = uv;
vec3 pos = position;

pos *= vec3(0.8, 2, 0.725);
hValue = position.y;
//float sinT = sin(time * 2.) * 0.5 + 0.5;
float posXZlen = length(position.xz);

pos.y *= 1. + (cos((posXZlen + 0.25) * 3.1415926) * 0.25 + noise(vec2(0, time)) * 0.125 + noise(vec2(position.x + time, position.z + time)) * 0.5) * position.y; // flame height

pos.x += noise(vec2(time * 2., (position.y - time) * 4.0)) * hValue * 0.0312; // flame trembling
pos.z += noise(vec2((position.y - time) * 4.0, time * 2.)) * hValue * 0.0312; // flame trembling

gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
`,
		fragmentShader: `
varying float hValue;
varying vec2 vUv;

// honestly stolen from https://www.shadertoy.com/view/4dsSzr
vec3 heatmapGradient(float t) {
return clamp((pow(t, 1.5) * 0.8 + 0.2) * vec3(smoothstep(0.0, 0.35, t) + t * 0.5, smoothstep(0.5, 1.0, t), max(1.0 - t * 1.7, t * 7.0 - 6.0)), 0.0, 1.0);
}

void main() {
float v = abs(smoothstep(0.0, 0.4, hValue) - 1.);
float alpha = (1. - v) * 0.99; // bottom transparency
alpha -= 1. - smoothstep(1.0, 0.97, hValue); // tip transparency
gl_FragColor = vec4(heatmapGradient(smoothstep(0.0, 0.3, hValue)) * vec3(0.95,0.95,0.4), alpha) ;
gl_FragColor.rgb = mix(vec3(0,0,1), gl_FragColor.rgb, smoothstep(0.0, 0.3, hValue)); // blueish for bottom
gl_FragColor.rgb += vec3(1, 0.9, 0.5) * (1.25 - vUv.y); // make the midst brighter
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.66, 0.32, 0.03), smoothstep(0.95, 1., hValue)); // tip
}
`,
		transparent: true,
		side: side
	});
}
var flameMaterials = [];
function flame() {
	let flameGeo = new THREE.SphereGeometry(0.5, 32, 32);
	flameGeo.translate(0, 0.5, 0);
	let flameMat = getFlameMaterial(true);
	flameMaterials.push(flameMat);
	let flame = new THREE.Mesh(flameGeo, flameMat);
	flame.position.set(0.06, candleHeight, 0.06);
	flame.rotation.y = THREE.MathUtils.degToRad(-45);
	return flame;
}


// create candle except flame
function createCandle() {
	var casePath = new THREE.Path();
	casePath.moveTo(0, 0);
	casePath.lineTo(0, 0);
	casePath.absarc(0, 0, candleRadius, Math.PI * 1.5, Math.PI * 2);
	casePath.lineTo(candleRadius, candleHeight); // Use baseRadius and candleHeight
	var caseGeo = new THREE.LatheGeometry(casePath.getPoints(), 64);
	var caseMat = new THREE.MeshStandardMaterial({ color: 0xff4500 }); // Orange-red color
	var caseMesh = new THREE.Mesh(caseGeo, caseMat);
	caseMesh.castShadow = true;

	// top part of the candle
	const topGeometry = new THREE.CylinderGeometry(0.2, candleRadius, 0.1, 32); // Use baseRadius for the top base
	const topMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500 });
	const topMesh = new THREE.Mesh(topGeometry, topMaterial);
	topMesh.position.y = candleHeight; // Use candleHeight for positioning
	caseMesh.add(topMesh);

	// candlewick
	var candlewickProfile = new THREE.Shape();
	candlewickProfile.absarc(0, 0, 0.0625, 0, Math.PI * 2);

	var candlewickCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, candleHeight - 1, 0),
		new THREE.Vector3(0, candleHeight - 0.5, -0.0625),
		new THREE.Vector3(0.25, candleHeight - 0.5, 0.125)
	]);

	var candlewickGeo = new THREE.ExtrudeGeometry(candlewickProfile, {
		steps: 8,
		bevelEnabled: false,
		extrudePath: candlewickCurve
	});
	var colors = [];
	var color1 = new THREE.Color("black");
	var color2 = new THREE.Color(0x994411);
	var color3 = new THREE.Color(0xffff44);
	for (let i = 0; i < candlewickGeo.attributes.position.count; i++) {
		if (candlewickGeo.attributes.position.getY(i) < 0.4) {
			color1.toArray(colors, i * 3);
		}
		else {
			color2.toArray(colors, i * 3);
		};
		if (candlewickGeo.attributes.position.getY(i) < 0.15) color3.toArray(colors, i * 3);
	}
	candlewickGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
	candlewickGeo.translate(0, 0.95, 0);
	var candlewickMat = new THREE.MeshBasicMaterial({ vertexColors: true });

	var candlewickMesh = new THREE.Mesh(candlewickGeo, candlewickMat);
	caseMesh.add(candlewickMesh);

	return caseMesh;
}

const candleMesh = createCandle();

// candle light
var candleLight = new THREE.PointLight(0xffaa33, 1, 5, 2);
candleLight.position.set(0, candleHeight, 0);
candleLight.castShadow = true;
candleMesh.add(candleLight);
var candleLight2 = new THREE.PointLight(0xffaa33, 1, 10, 2);
candleLight2.position.set(0, candleHeight + 1, 0);
candleLight2.castShadow = true;
candleMesh.add(candleLight2);

candleMesh.add(flame());
candleMesh.add(flame())

// table
var tableGeo = new THREE.CylinderGeometry(14, 14, 0.5, 64);
tableGeo.translate(0, -tableHeightOffset, 0);
const textureLoader = new THREE.TextureLoader();
const tableTexture = textureLoader.load(tableMatImage); // in the public folder
console.log(tableTexture);
var tableMat = new THREE.MeshStandardMaterial({ map: tableTexture, metalness: 0, roughness: 0.75 });
var tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.receiveShadow = true;

scene.add(tableMesh);

var clock = new THREE.Clock();
var time = 0;

render();
function render() {
	requestAnimationFrame(render);
	time += clock.getDelta();
	flameMaterials[0].uniforms.time.value = time;
	flameMaterials[1].uniforms.time.value = time;
	candleLight2.position.x = Math.sin(time * Math.PI) * 0.25;
	candleLight2.position.z = Math.cos(time * Math.PI * 0.75) * 0.25;
	candleLight2.intensity = 2 + Math.sin(time * Math.PI * 2) * Math.cos(time * Math.PI * 1.5) * 0.25;
	controls.update();
	renderer.render(scene, camera);
}

// Cake body
function createCake() {
	const cakeGroup = new THREE.Group();

	// Cake base layer
	const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
	const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xfff5ee }); // 更白的顏色
	const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);

	//Cake middle layer
	const middleGeometry = new THREE.CylinderGeometry(middleRadius, middleRadius, middleHeight, 32);
	const middleMaterial = new THREE.MeshPhongMaterial({ color: 0xfffafa }); // 雪白色
	const middleMesh = new THREE.Mesh(middleGeometry, middleMaterial);
	middleMesh.position.y = baseHeight / 2 + middleHeight / 2;

	// Cake top layer
	const topGeometry = new THREE.CylinderGeometry(topRadius, topRadius, topHeight, 32);
	const topMaterial = new THREE.MeshPhongMaterial({ color: 0xf0ffff }); // 天藍白
	const topMesh = new THREE.Mesh(topGeometry, topMaterial);
	topMesh.position.y = baseHeight / 2 + middleHeight + topHeight / 2;

	// Add each part of the cake to the cake group
	cakeGroup.add(baseMesh);
	cakeGroup.add(middleMesh);
	cakeGroup.add(topMesh);

	return cakeGroup;
}

const cake = createCake();
scene.add(cake);

//Modify caseMesh Scale and Position
candleMesh.scale.set(0.3, 0.3, 0.3);
candleMesh.castShadow = false;
candleMesh.position.y = baseHeight / 2 + middleHeight + topHeight; // 調整高度以放置在蛋糕頂部

// Create multiple candles
function createCandles(count) {
	const candleGroup = new THREE.Group();
	const radius = 1;
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		const candle = candleMesh.clone();
		candle.position.x = Math.cos(angle) * radius;
		candle.position.z = Math.sin(angle) * radius;
		candleGroup.add(candle);
	}
	return candleGroup;
}

// Add candles to the cake
const candles = createCandles(candleCount);
cake.add(candles);

// Adjust the camera position
camera.position.set(0, 5, 10);
camera.lookAt(cake.position);

// this could be used for light on
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

// Add hold event listener
let holdTimeout;
let allowBlowout=false;


const holdReminder=document.getElementById('hold-reminder');
const audio=document.getElementById("happy-birthday-audio");

audio.addEventListener('ended', function() {
	holdReminder.style.display = 'flex';
	setTimeout(function() {
		holdReminder.classList.add('show');
	}, 10); // Ensure display class name after settings take effect
	allowBlowout=true;
});

// enable the hold event after the song is played
function handleHoldStart() {
	if(!allowBlowout){
		return;
	}
	holdTimeout = setTimeout(() => {
		blowOutCandles();
	}, 500);
}

function handleHoldEnd() {
	clearTimeout(holdTimeout);
}

document.addEventListener('mousedown', handleHoldStart);
document.addEventListener('touchstart', handleHoldStart);
document.addEventListener('mouseup', handleHoldEnd);
document.addEventListener('touchend', handleHoldEnd);

function showCongratulation() {
  const overlay = document.getElementById('congratulation-overlay');
  overlay.style.pointerEvents = 'auto';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.opacity = '1';
}

function blowOutCandles() {
	candles.children.forEach(candle => {
		const speed = 1 + Math.random() * 3;
		extinguishCandle(candle, speed);
	});

	// Gradually increase ambient light
	let ambientLightIntensity = ambientLight.intensity;
	const ambientInterval = setInterval(() => {
		ambientLightIntensity += 0.01;
		if (ambientLightIntensity >= 0.1) {
			clearInterval(ambientInterval);
			ambientLight.intensity = 0.1;
			showCongratulation();
		} else {
			ambientLight.intensity = ambientLightIntensity;
		}
	}, 50);

	// Hide hint text
	document.getElementById('hold-reminder').style.display = 'none';
}

function extinguishCandle(candle, speed) {
	const flames = candle.children.filter(child => child.material && child.material.type === 'ShaderMaterial');
	const lights = candle.children.filter(child => child instanceof THREE.PointLight);

	let progress = 0;
	const extinguishInterval = setInterval(() => {
		progress += 0.02 * speed;
		if (progress >= 1) {
			clearInterval(extinguishInterval);
			flames.forEach(flame => flame.visible = false);
			lights.forEach(light => light.intensity = 0);
		} else {
			// Reduce opacity and size of the flame
			flames.forEach(flame => {
				flame.material.opacity = 1 - progress;
				flame.scale.set(1 - progress, 1 - progress, 1 - progress);
			});

			// Reduce light source intensity
			lights.forEach(light => {
				light.intensity = 1 - progress;
			});
		}
	}, 30);

}

