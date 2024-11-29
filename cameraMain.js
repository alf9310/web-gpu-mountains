/**
 * cameraMain.js
 * 
 * @summary Controls scene camera & draws mountains
 * Adapted from Tesselation code by Prof. Bayliss
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm
 */
'use strict';

// Global variables that are set and used
// across the application
let verticesSize,
  vertices,
  adapter,
  context,
  colorAttachment,
  colorTextureView,
  colorTexture,
  depthTexture,
  code,
  computeCode,
  shaderDesc,
  colorState,
  shaderModule,
  pipeline,
  renderPassDesc,
  commandEncoder,
  passEncoder,
  device,
  drawingTop,
  drawingLeft,
  canvas,
  bary,
  points,
  uniformValues,
  uniformBindGroup,
  indices;

// buffers
let myVertexBuffer = null;
let myBaryBuffer = null;
let myIndexBuffer = null;
let uniformBuffer;

// Other globals with default values;
var division1 = 3;
var division2 = 1;
var updateDisplay = true;
var anglesReset = [30.0, 30.0, 0.0, 0.0];
var angles = [30.0, 30.0, 0.0, 0.0];
var angleInc = 5.0;

// Shapes we can draw
// TODO, set up different parameters for thr mountain generation code
var CUBE = 1;
var CYLINDER = 2;
var CONE = 3;
var COMPUTECUBE = 4;
var curShape = CUBE;

/**
 * Set up shader variables
 */
function setShaderInfo() {
  // set up the shader code var's
  code = document.getElementById('shader').innerText;
  shaderDesc = { code: code };
  shaderModule = device.createShaderModule(shaderDesc);
  colorState = {
      format: 'bgra8unorm'
  };

  // set up depth
  // depth shading will be needed for 3d objects in the future
  depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

/**
 * Create a program with the appropriate vertex and fragment shaders
 */
async function initProgram() {

    // Check to see if WebGPU can run
    if (!navigator.gpu) {
        console.error("WebGPU not supported on this browser.");
        return;
    }

    // get webgpu browser software layer for graphics device
    adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("No appropriate GPUAdapter found.");
        return;
    }

    // get the instantiation of webgpu on this device
    device = await adapter.requestDevice();
    if (!device) {
        console.error("Failed to request Device.");
        return;
    }

    // configure the canvas
    context = canvas.getContext('webgpu');
    const canvasConfig = {
        device: device,
        // format is the pixel format
        format: navigator.gpu.getPreferredCanvasFormat(),
        // usage is set up for rendering to the canvas
        usage:
            GPUTextureUsage.RENDER_ATTACHMENT,
        alphaMode: 'opaque'
    };
    context.configure(canvasConfig);
}

/**
 * Create and bind a new mountain object based on current settings
 * Mountain code defined in mountains.js
 */
async function createMountain(division1) {

  console.log("inside create new mountain");
  // Call the functions in an appropriate order
  setShaderInfo();

  // clear your points and elements
  points = [];
  indices = [];
  bary = [];
  
  // generate mountains (later based on parameters)
  gradiantTrick(division1);

  // create and bind vertex buffer

  // set up the attribute we'll use for the vertices
  const vertexAttribDesc = {
      shaderLocation: 0, // @location(0) in vertex shader
      offset: 0,
      format: 'float32x3' // 3 floats: x,y,z
  };

  // this sets up our buffer layout
  const vertexBufferLayoutDesc = {
      attributes: [vertexAttribDesc],
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 3, // sizeof(float) * 3 floats
      stepMode: 'vertex'
  };

  // buffer layout and filling
  const vertexBufferDesc = {
      size: points.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
  };
  myVertexBuffer = device.createBuffer(vertexBufferDesc);
  let writeArray =
      new Float32Array(myVertexBuffer.getMappedRange());

  writeArray.set(points); // this copies the buffer
  myVertexBuffer.unmap();

  // create and bind bary buffer
  const baryAttribDesc = {
      shaderLocation: 1, // @location(1) in vertex shader
      offset: 0,
      format: 'float32x3' // 3 floats: x,y,z
  };

  // this sets up our buffer layout
  const myBaryBufferLayoutDesc = {
      attributes: [baryAttribDesc],
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 3, // 3 bary's
      stepMode: 'vertex'
  };

  // buffer layout and filling
  const myBaryBufferDesc = {
      size: bary.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
  };
  myBaryBuffer = device.createBuffer(myBaryBufferDesc);
  let writeBaryArray =
      new Float32Array(myBaryBuffer.getMappedRange());

  writeBaryArray.set(bary); // this copies the buffer
  myBaryBuffer.unmap();

  // setup index buffer

  // first guarantee our mapped range is a multiple of 4
  // mainly necessary becauses uint16 is only 2 and not 4 bytes
  if (indices.length % 2 != 0) {
      indices.push(indices[indices.length-1]);
  }
  const myIndexBufferDesc = {
      size: indices.length * Uint16Array.BYTES_PER_ELEMENT,  
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
  };
  myIndexBuffer = device.createBuffer(myIndexBufferDesc);
  let writeIndexArray =
      new Uint16Array(myIndexBuffer.getMappedRange());

  writeIndexArray.set(indices); // this copies the buffer
  myIndexBuffer.unmap();

  // Set up the uniform var
  let uniformBindGroupLayout = device.createBindGroupLayout({
      entries: [
          {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {}
          }
      ]
  });

  // set up the pipeline layout
  const pipelineLayoutDesc = { bindGroupLayouts: [uniformBindGroupLayout] };
  const layout = device.createPipelineLayout(pipelineLayoutDesc);

  // pipeline desc
  const pipelineDesc = {
      layout,
      vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [vertexBufferLayoutDesc, myBaryBufferLayoutDesc]
      },
      fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [colorState]
      },
      depthStencil: {
          depthWriteEnabled: true,
          depthCompare: 'less',
          format: 'depth24plus',
      },
      primitive: {
          topology: 'triangle-list', //<- MUST change to draw lines! 
          frontFace: 'cw', // this doesn't matter for lines
          cullMode: 'none' // TODO might want to change this back to 'back' after debugging
      }
  };

  pipeline = device.createRenderPipeline(pipelineDesc);

  uniformValues = new Float32Array(angles);
  uniformBuffer = device.createBuffer({
      size: uniformValues.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // copy the values from JavaScript to the GPU
  device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

  uniformBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
          {
              binding: 0,
              resource: {
                  buffer: uniformBuffer,
              },
          },
      ],
  });

  // indicate a redraw is required.
  updateDisplay = true;
}

/**
 * Render our canvas
 */
function draw() {
  //console.log("inside draw");
  //console.log("angles: " + angles[0] + " " +angles[1] + " " + angles[2]);

  // set up color info
  colorTexture = context.getCurrentTexture();
  colorTextureView = colorTexture.createView();

  // a color attachment ia like a buffer to hold color info
  colorAttachment = {
      view: colorTextureView,
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
  };
  renderPassDesc = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
      },
  };

  // convert to radians before sending to shader
  uniformValues[0] = radians(angles[0]);
  uniformValues[1] = radians(angles[1]);
  uniformValues[2] = radians(angles[2]);

  // copy the values from JavaScript to the GPU
  device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

  // create the render pass
  commandEncoder = device.createCommandEncoder();
  passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
  passEncoder.setViewport(0, 0,canvas.width, canvas.height, 0, 1);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, myVertexBuffer);
  passEncoder.setVertexBuffer(1, myBaryBuffer);
  passEncoder.setIndexBuffer(myIndexBuffer, "uint16");
  passEncoder.drawIndexed(indices.length, 1);
  passEncoder.end();

  // submit the pass to the device
  device.queue.submit([commandEncoder.finish()]);
}

/**
 * Entry point to our application
 */
async function init() {
  // Retrieve the canvas
  canvas = document.querySelector("canvas");

  // deal with keypress
  window.addEventListener('keydown', gotKey, false);

  // Read, compile, and link your shaders
  await initProgram();

  // create and bind your current object
  await createMountain();

  // do a draw
  draw();
}
