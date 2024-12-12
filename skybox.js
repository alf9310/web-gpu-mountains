// see https://webgpufundamentals.org/webgpu/lessons/webgpu-utils.html#wgpu-matrix
import {mat4, vec3} from 'https://webgpufundamentals.org/3rdparty/wgpu-matrix.module.js';

// ------------- Global Vars --------------
let cameraPositionValue,
    canvas, 
    context, 
    depthTexture,
    device,
    envMapUniformBuffer,
    envMapUniformValues,
    envMapPipeline,
    envMapBindGroup,
    indexBuffer,
    indexData,
    numVertices,
    projectionValue,
    renderPassDescriptor,
    skyBoxUniformBuffer,
    skyBoxUniformValues,
    skyBoxPipeline,
    skyBoxBindGroup,
    vertexBuffer,
    vertexData,
    viewValue,
    viewDirectionProjectionInverseValue,
    worldValue;

let cameraTranslation = [5, 3, -5]; // Initial camera position
let angleInc = 1;


// -------------------------- Helper Function for Creating a Cube --------------------------
function createCubeVertices() {
  const vertexData = new Float32Array([
     //  position   |  normals
     //-------------+----------------------
     // front face      positive z
    -1,  1,  1,         0,  0,  1,
    -1, -1,  1,         0,  0,  1,
     1,  1,  1,         0,  0,  1,
     1, -1,  1,         0,  0,  1,
     // right face      positive x
     1,  1, -1,         1,  0,  0,
     1,  1,  1,         1,  0,  0,
     1, -1, -1,         1,  0,  0,
     1, -1,  1,         1,  0,  0,
     // back face       negative z
     1,  1, -1,         0,  0, -1,
     1, -1, -1,         0,  0, -1,
    -1,  1, -1,         0,  0, -1,
    -1, -1, -1,         0,  0, -1,
    // left face        negative x
    -1,  1,  1,        -1,  0,  0,
    -1,  1, -1,        -1,  0,  0,
    -1, -1,  1,        -1,  0,  0,
    -1, -1, -1,        -1,  0,  0,
    // bottom face      negative y
     1, -1,  1,         0, -1,  0,
    -1, -1,  1,         0, -1,  0,
     1, -1, -1,         0, -1,  0,
    -1, -1, -1,         0, -1,  0,
    // top face         positive y
    -1,  1,  1,         0,  1,  0,
     1,  1,  1,         0,  1,  0,
    -1,  1, -1,         0,  1,  0,
     1,  1, -1,         0,  1,  0,
  ]);

  const indexData = new Uint16Array([
     0,  1,  2,  2,  1,  3,  // front
     4,  5,  6,  6,  5,  7,  // right
     8,  9, 10, 10,  9, 11,  // back
    12, 13, 14, 14, 13, 15,  // left
    16, 17, 18, 18, 17, 19,  // bottom
    20, 21, 22, 22, 21, 23,  // top
  ]);

  return [
    vertexData,
    indexData,
    indexData.length,
  ];
}

// -------------------------- Main Function --------------------------
export async function initProgram() {
  const adapter = await navigator.gpu?.requestAdapter();
  device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  canvas = document.querySelector('canvas');
  context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // -------------------------- Draw Skybox --------------------------
  const skyBoxModule = device.createShaderModule({
    code: `
      struct Uniforms {
        viewDirectionProjectionInverse: mat4x4f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) pos: vec4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var ourSampler: sampler;
      @group(0) @binding(2) var ourTexture: texture_cube<f32>;

      @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
        let pos = array(
          vec2f(-1, 3),
          vec2f(-1,-1),
          vec2f( 3,-1),
        );
        var vsOut: VSOutput;
        vsOut.position = vec4f(pos[vNdx], 1, 1);
        vsOut.pos = vsOut.position;
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let t = uni.viewDirectionProjectionInverse * vsOut.pos;
        return textureSample(ourTexture, ourSampler, normalize(t.xyz / t.w) * vec3f(1, 1, -1));
      }
    `,
  });

  skyBoxPipeline = device.createRenderPipeline({
    label: 'no attributes',
    layout: 'auto',
    vertex: {
      module: skyBoxModule,
    },
    fragment: {
      module: skyBoxModule,
      targets: [{ format: presentationFormat }],
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
      format: 'depth24plus',
    },
  });

  // -------------------------- Draw Cube --------------------------
  const envMapModule = device.createShaderModule({
    code: `
      struct Uniforms {
        projection: mat4x4f,
        view: mat4x4f,
        world: mat4x4f,
        cameraPosition: vec3f,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) worldPosition: vec3f,
        @location(1) worldNormal: vec3f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var ourSampler: sampler;
      @group(0) @binding(2) var ourTexture: texture_2d<f32>;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = uni.projection * uni.view * uni.world * vert.position;
        vsOut.worldPosition = (uni.world * vert.position).xyz;
        vsOut.worldNormal = (uni.world * vec4f(vert.normal, 0)).xyz;
        return vsOut;
      }

      @fragment
      fn fs(vsOut: VSOutput) -> @location(0) vec4f {
          // Normalize direction vector
          let direction = normalize(vsOut.worldNormal);

          // Convert the direction to 2D coordinates
          let u = 0.5 + 0.5 * direction.x;
          let v = 0.5 + 0.5 * direction.y;

          // Sample the 2D texture
          return textureSample(ourTexture, ourSampler, vec2f(u, v));
      }
    `,
  });

  envMapPipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module: envMapModule,
      buffers: [
        {
          arrayStride: (3 + 3) * 4, // (6) floats 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 12, format: 'float32x3'},  // normal
          ],
        },
      ],
    },
    fragment: {
      module: envMapModule,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  // -------------------------- Mip-Texturing Code --------------------------
  const numMipLevels = (...sizes) => {
    const maxSize = Math.max(...sizes);
    return 1 + Math.log2(maxSize) | 0;
  };

  function copySourcesToTexture(device, texture, sources, {flipY} = {}) {
    sources.forEach((source, layer) => {
      device.queue.copyExternalImageToTexture(
        { source, flipY, },
        { texture, origin: [0, 0, layer] },
        { width: source.width, height: source.height },
      );
    });
    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }

  function createTextureFromSources(device, sources, options = {}) {
    // Assume are sources all the same size so just use the first one for width and height
    const source = sources[0];
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
      size: [source.width, source.height, sources.length],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
    copySourcesToTexture(device, texture, sources, options);
    return texture;
  }

  // -------------------------- Mipmap Structure (not actually implemented) --------------------------
  const generateMips = (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};

    return function generateMips(device, texture) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }

      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module,
          },
          fragment: {
            module,
            targets: [{ format: texture.format }],
          },
        });
      }
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      });

      let width = texture.width;
      let height = texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);

        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              {
                binding: 1,
                resource: texture.createView({
                  dimension: '2d',
                  baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
              },
            ],
          });

          const renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          };

          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);  // call our vertex shader 6 times
          pass.end();
        }
        ++baseMipLevel;
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();

  // -------------------------- Texture Code --------------------------
  async function loadImageBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  }

  async function createTextureFromImages(device, urls, options) {
    const images = await Promise.all(urls.map(loadImageBitmap));
    return createTextureFromSources(device, images, options);
  }

  // ----------------- Skybox Textures --------------
  const skyboxTexture = await createTextureFromImages(
      device,
      [
        './cloudy-skybox/pos-x.jpg',  
        './cloudy-skybox/neg-x.jpg',  
        './cloudy-skybox/pos-y.jpg',  
        './cloudy-skybox/neg-y.jpg',  
        './cloudy-skybox/pos-z.jpg',  
        './cloudy-skybox/neg-z.jpg',  
      ],
      {mips: true, flipY: false},
  );

  // ----------------- Cube Textures --------------
  const url = './example-biome-lookup-smooth.png';
  let image = await loadImageBitmap(url);

  // Create a cube texture with the same image for all six faces
  const cubeTexture = createTextureFromSources(device, Array(6).fill(image), {
    flipY: false,  // Flip the Y-axis if needed
  });

  // -------------------------- Bind Groups --------------------------
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  // viewDirectionProjectionInverse
  const skyBoxUniformBufferSize = (16) * 4;
  skyBoxUniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: skyBoxUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  skyBoxUniformValues = new Float32Array(skyBoxUniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kViewDirectionProjectionInverseOffset = 0;

  viewDirectionProjectionInverseValue = skyBoxUniformValues.subarray(
      kViewDirectionProjectionInverseOffset,
      kViewDirectionProjectionInverseOffset + 16);

  skyBoxBindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: skyBoxPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: skyBoxUniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: skyboxTexture.createView({dimension: 'cube'}) },
    ],
  });

  // projection, view, world, cameraPosition, pad
  const envMapUniformBufferSize = (16 + 16 + 16 + 3 + 1) * 4;
  envMapUniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: envMapUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  envMapUniformValues = new Float32Array(envMapUniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kProjectionOffset = 0;
  const kViewOffset = 16;
  const kWorldOffset = 32;
  const kCameraPositionOffset = 48;

  projectionValue = envMapUniformValues.subarray(kProjectionOffset, kProjectionOffset + 16);
  viewValue = envMapUniformValues.subarray(kViewOffset, kViewOffset + 16);
  worldValue = envMapUniformValues.subarray(kWorldOffset, kWorldOffset + 16);
  cameraPositionValue = envMapUniformValues.subarray(
      kCameraPositionOffset, kCameraPositionOffset + 3);

  // Create cube
  [vertexData, indexData, numVertices] = createCubeVertices();
  vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  indexBuffer = device.createBuffer({
    label: 'index buffer',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

  envMapBindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: envMapPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: envMapUniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: cubeTexture.createView({dimension: '2d'}) },
    ],
  });

  renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- to be filled out when we render
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  // -------------------------- Rendering Loop --------------------------
  // Initial render loop call
  requestAnimationFrame(render);

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
  });
  observer.observe(canvas);
}

// Function to update the camera translation
export function setCameraPosition(x, y, z){
  cameraTranslation = [x, y, z];
};

// -------------------------- Render Function --------------------------
export function render() {
  //time *= 0.001;

  // Get the current texture from the canvas context and
  // set it as the texture to render to.
  const canvasTexture = context.getCurrentTexture();
  renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

  // If we don't have a depth texture OR if its size is different
  // from the canvasTexture when make a new depth texture
  if (!depthTexture ||
      depthTexture.width !== canvasTexture.width ||
      depthTexture.height !== canvasTexture.height) {
    if (depthTexture) {
      depthTexture.destroy();
    }
    depthTexture = device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
  renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(renderPassDescriptor);

  // -------------------------- Camera Code --------------------------
  const aspect = canvas.clientWidth / canvas.clientHeight;
  mat4.perspective(
      60 * Math.PI / 180,
      aspect,
      0.1,      // zNear
      10,      // zFar
      projectionValue,
  );

  // Update the camera position based on the input translation values
  cameraPositionValue.set(cameraTranslation);

  const view = mat4.lookAt(
    cameraPositionValue,
    [0, 0, 0],  // target
    [0, 1, 0],  // up
  );

  // Copy the view into the viewValue since we're going
  // to zero out the view's translation
  viewValue.set(view);

  // We only care about direction so remove the translation
  view[12] = 0;
  view[13] = 0;
  view[14] = 0;
  const viewProjection = mat4.multiply(projectionValue, view);
  mat4.inverse(viewProjection, viewDirectionProjectionInverseValue);

  // Rotate the cube
  mat4.identity(worldValue);
  /**
  mat4.rotateX(worldValue, time * -0.1, worldValue);
  mat4.rotateY(worldValue, time * -0.2, worldValue);
  */

  // Upload the uniform values to the uniform buffers
  device.queue.writeBuffer(envMapUniformBuffer, 0, envMapUniformValues);
  device.queue.writeBuffer(skyBoxUniformBuffer, 0, skyBoxUniformValues);

  // -------------------------- Draw Objects --------------------------
  // Draw the cube
  pass.setPipeline(envMapPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setIndexBuffer(indexBuffer, 'uint16');
  pass.setBindGroup(0, envMapBindGroup);
  pass.drawIndexed(numVertices);

  // Draw the skyBox
  pass.setPipeline(skyBoxPipeline);
  pass.setBindGroup(0, skyBoxBindGroup);
  pass.draw(3);

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // recursive call (keep rendering frames)
  requestAnimationFrame(render);
}

function fail(msg) {
  alert(msg);
}

function rotateCamera(distance) {
  cameraTranslation = vec3.rotateY(cameraTranslation, [0, 0, 0], distance)
  //cameraTranslation = vec3.rotateX(cameraTranslation, [0, 0, 0], 0.05)
  //cameraTranslation = vec3.add([1, 0, 0], cameraTranslation)
  /*
  viewValue.set(mat4.lookAt(
    cameraTranslation,
    [0, 0, 0],  // target
    [0, 1, 0],  // up
  ));
  */
}
function moveCamera(x, y, z) {
  cameraTranslation = vec3.add(cameraTranslation, [x, y, z])

  // bounds checking
  if (cameraTranslation[1] > 5) {cameraTranslation[1] = 5}
  if (cameraTranslation[1] < -1) {cameraTranslation[1] = -1}
}

function gotKey(event) {

  var key = event.key;

  //  incremental rotation
  if (key == 'ArrowRight'){
    //cameraTranslation[0] -= angleInc; 
    rotateCamera(0.025)
  }else if (key == 'ArrowLeft')
    rotateCamera(-0.025)
  else if (key == 'w')
    moveCamera(0, 0.1, 0)
  else if (key == 's')
    moveCamera(0, -0.1, 0)
  else if (key == 'Y')
      angles[1] += angleInc;
  else if (key == 'Z')
      angles[2] += angleInc;

  // reset
  else if (key == 'r' || key == 'R') {
      angles[0] = anglesReset[0];
      angles[1] = anglesReset[1];
      angles[2] = anglesReset[2];
  }

  // redo the draw
  render();
}

// Entry point to our application
async function init() {
  // Retrieve the canvas
  //canvas = document.querySelector("canvas");

  // deal with keypress
  window.addEventListener('keydown', gotKey, false);

  // Read, compile, and link your shaders
  await initProgram();

}

window.onload = init;