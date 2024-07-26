// prevent Vite from trying to optimize these dependencies
export default {
  optimizeDeps: {
    exclude: [
      'three-mesh-bvh',
      'three/addons/renderers/webgl/nodes/WebGLNodes.js',
      'three-subdivide',
      'web-ifc-three',
      'web-ifc',
      'three-bvh-csg',
      'three-gpu-pathtracer',
      'flow',
      'three/addons/loaders/IFCLoader.js',
    ],
  },
};
