let globalGL = null;
let globalRayCastProgram = null;
let globalOuterVoxelConstrProgram = null;
let globalOuterVoxelAdjProgram = null;
let globalDenseVoxelProgram = null;
let framebufferDrawProgram = null;
let outerVoxelSSBO = null;
let voxelTex = null;
let voxelTexDense = null;
const voxelTexWidth = 1450;
const denseVoxelTexWidth = voxelTexWidth * 2;
let mainCanvasWidth = 0;
let mainCanvasHeight = 0;
let refinementIter = 0;
let renderingPaused = false;
const maxRefinement = 100000;
let currentError = null;
let currentErrorSource = null;
let renderLoopActive = false;
let newFrameFlag = false;
const lightData = {
    fLightPos: null,
    fLightIntensity: null,
    bLightPos: null,
    bLightIntensity: null,
    sLightPos: null,
    sLightIntensity: null
};

async function initWebGL(){
    // clear the canvas and init webgl 
    const canvasContainer = document.getElementById('canvas-container');
    const canvas = document.getElementById('plot_canvas');
    mainCanvasWidth = canvasContainer.clientWidth;
    mainCanvasHeight = canvasContainer.clientHeight;

    console.log('width:', mainCanvasWidth);
    console.log('height:', mainCanvasHeight);

    canvas.width = mainCanvasWidth;
    canvas.height = mainCanvasHeight;

    await emitWaitingMessage('Acquiring webgl2 context', 0);

    const gl = canvas.getContext('webgl2');
    console.log('webgl2 context acquired.');

    // Set clear color to white, fully opaque
    await emitWaitingMessage('Clearing canvas', .1);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.finish();

    const overallIntensity = 500;

    await emitWaitingMessage('Compiling ray cast shaders', .2);

    const shaderProgram = loadAndLinkGenericShader(gl, raycast_vert, raycast_frag);
    if(!shaderProgram){
        return;
    }
    const rayCastProgram = {
        program: shaderProgram,
        uniforms: {
            uRayTransform: {
                location: gl.getUniformLocation(shaderProgram, 'uRayTransform'),
                value: null
            },
            uCamLocation: {
                location: gl.getUniformLocation(shaderProgram, 'uCamLocation'),
                value: null
            },
            uScreenSize: {
                location: gl.getUniformLocation(shaderProgram, 'uScreenSize'),
                value: [mainCanvasWidth, mainCanvasHeight]
            },
            uMultisamples: {
                location: gl.getUniformLocation(shaderProgram, 'uMultisamples'),
                value: 1
            },
            uFrontLightPos: {
                location: gl.getUniformLocation(shaderProgram, 'uFrontLightPos'),
                value: lightData.fLightPos
            },
            uBackLightPos: {
                location: gl.getUniformLocation(shaderProgram, 'uBackLightPos'),
                value: lightData.bLightPos
            },
            uSideLightPos: {
                location: gl.getUniformLocation(shaderProgram, 'uSideLightPos'),
                value: lightData.sLightPos
            },
            uFrontLightIntensity: {
                location: gl.getUniformLocation(shaderProgram, 'uFrontLightIntensity'),
                value: lightData.fLightIntensity
            },
            uBackLightIntensity: {
                location: gl.getUniformLocation(shaderProgram, 'uBackLightIntensity'),
                value: lightData.bLightIntensity
            },
            uSideLightIntensity: {
                location: gl.getUniformLocation(shaderProgram, 'uSideLightIntensity'),
                value: lightData.sLightIntensity
            },
            dataTex: {
                location: gl.getUniformLocation(shaderProgram, 'dataTex'),
                value: null
            },
            denseTex : {
                location: gl.getUniformLocation(shaderProgram, 'denseTex'),
                value: null
            },
            accumulationBufferCount: {
                location: gl.getUniformLocation(shaderProgram, 'accumulationBufferCount'),
                value: 0
            },
            accumulationBuffer: {
                location: gl.getUniformLocation(shaderProgram, 'accumulationBuffer'),
                value: null
            }
        },
        attributes: {
            aVertexPosition: {
                location: gl.getAttribLocation(shaderProgram, 'aVertexPosition')
            }
        },
        fbs: {
            fbA: createFramebufferWithTexture(gl, mainCanvasWidth, mainCanvasHeight), 
            fbB: createFramebufferWithTexture(gl, mainCanvasWidth, mainCanvasHeight),
            fbASetToRender: true
        }
    };
    console.log('\tray cast program linked.');
    globalGL = gl;
    globalRayCastProgram = rayCastProgram;

    await emitWaitingMessage('Compiling voxel shaders', .4);

    const voxelInitProgram = loadAndLinkGenericShader(gl, passthrough_vert, voxelInit_frag);
    globalOuterVoxelConstrProgram = {
        program: voxelInitProgram,
        uniforms: {
            denseTex: {
                location: gl.getUniformLocation(voxelInitProgram, 'denseTex'),
                value: null
            }
        },
        attributes: {
            aVertexPosition: {
                location: gl.getAttribLocation(voxelInitProgram, 'aVertexPosition')
            }
        }
    };
    console.log('\tvoxel init program linked.');

    const voxelAdjProgram = loadAndLinkGenericShader(gl, passthrough_vert, voxelAdj_frag);
    globalOuterVoxelAdjProgram = {
        program: voxelAdjProgram,
        uniforms: {
            uOctantHalfWidth: {
                location: gl.getUniformLocation(voxelAdjProgram, 'uOctantHalfWidth'),
                value: 1
            },
            dataTex: {
                location: gl.getUniformLocation(voxelAdjProgram, 'dataTex'),
                value: null
            }
        },
        attributes: {
            aVertexPosition: {
                location: gl.getAttribLocation(voxelAdjProgram, 'aVertexPosition')
            }
        }
    };
    console.log('\tvoxel processing program linked');

    const denseProgram = loadAndLinkGenericShader(gl, passthrough_vert, denseVoxelInit_frag);
    globalDenseVoxelProgram = {
        program: denseProgram, 
        attributes: {
            aVertexPosition: {
                location: gl.getAttribLocation(denseProgram, 'aVertexPosition')
            }
        }
    }

    await emitWaitingMessage('Compiling extra shaders', .6);

    const fbDraw = loadAndLinkGenericShader(gl, passthrough_with_pix_vert, framebuffer_copy_frag);
    framebufferDrawProgram = {
        program: fbDraw,
        attributes: {
            aVertexPosition: {
                location: gl.getAttribLocation(fbDraw, 'aVertexPosition')
            }
        },
        uniforms: {
            copyTex: {
                location: gl.getUniformLocation(fbDraw, 'copyTex'),
                value: null
            }
        }
    }
    console.log('All shaders linked successfully');

    bindFullScreenQuad(gl);

    const startTime = Date.now();
    await emitWaitingMessage('Initializing voxel textures', .8);

    initVoxelTextures(gl);
    console.log('Texture init time: ' + (Date.now() - startTime));

    closeWaitingMessage();
}

// progress is float [0,1]
async function emitWaitingMessage(html, progress){
    document.getElementById('canvas-message').style.display = 'block';
    const messageDiv = document.getElementById('canvas-progress-description');
    const messageProgress = document.getElementById('canvas-progress-value');

    messageDiv.innerHTML = html;
    messageProgress.value = '' + Math.floor(progress * 100);

    // sleep so the message shows up...
    await new Promise(r => setTimeout(r, 300));
}

function closeWaitingMessage(){
    document.getElementById('canvas-message').style.display = 'none';
}

function signalRender(){
    if(!renderLoopActive){
        renderLoopActive = true;
        window.requestAnimationFrame(renderRayCast);
    } else {
        newFrameFlag = true;
    }
}

const { mat4, mat3, vec3, vec4 } = glMatrix;
function renderRayCast(timestep){
    gl = globalGL;
    rayCastProgram = globalRayCastProgram;
    // do a ping-pong frame buffer switcheroo
    const fbToRender = rayCastProgram.fbs.fbASetToRender ? rayCastProgram.fbs.fbA : rayCastProgram.fbs.fbB;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbToRender.buffer);
    
    gl.viewport(0, 0, mainCanvasWidth, mainCanvasHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT); // don't need depth testing
    
    gl.vertexAttribPointer(
        rayCastProgram.attributes.aVertexPosition.location,
        2, // num components
        gl.FLOAT, // type
        false, // normalize
        0, // stride (0 means use num components and type above)
        0); // offset
    gl.enableVertexAttribArray(rayCastProgram.attributes.aVertexPosition.location);

    gl.useProgram(rayCastProgram.program);

    // our camera will always be pointing toward the origin (for now)
    // initial camera position is (1, 0, 0)
    // xhat, yhat and zhat are the images of (1,0,0), (0,1,0) and (0,0,1) under the current rotation.
    const camPos = mult(xhat, 10);
    const focalDist = 1;
    const camWidth = .3;
    // We're looking for a transform first rotating the xy plane to have normal facing in the direction of camPos, 
    // then scaling so that it is the size of camWidth, then translating to right in front of the camera 
    const rayTransform = mat4.create();
    // rotation that faces the xy plane toward the +x axis
    const preRot = mat4.fromRotation(mat4.create(), -Math.PI / 2, vec3.fromValues(0, 1, 0));
    const mainRot = mat4.fromValues(
        xhat[0], yhat[0], zhat[0], 0,
        xhat[1], yhat[1], zhat[1], 0,
        xhat[2], yhat[2], zhat[2], 0,
        0,       0,       0,       1
    );
    // matrices are specified in column major order (ugh)
    mat4.transpose(mainRot, mainRot);
    const scaleF = camWidth * .5;
    const scale = mat4.fromValues(
        scaleF, 0, 0, 0,
        0, scaleF, 0, 0,
        0, 0, scaleF, 0,
        0, 0, 0,      1
    );
    const translateF = add(camPos, mult(normalize(camPos), -focalDist));
    const translate = mat4.fromValues(
        1, 0, 0, translateF[0],
        0, 1, 0, translateF[1],
        0, 0, 1, translateF[2],
        0, 0, 0, 1
    );
    mat4.transpose(translate, translate);
    mat4.multiply(rayTransform, preRot, rayTransform);
    mat4.multiply(rayTransform, mainRot, rayTransform);
    mat4.multiply(rayTransform, scale, rayTransform);
    mat4.multiply(rayTransform, translate, rayTransform);

    let v = vec4.fromValues(0,0,0,1);
    vec4.transformMat4(v, v, rayTransform);
    const v2 = vec4.fromValues(1.0, 1.0, 0.0, 1);
    vec4.transformMat4(v2,v2, rayTransform);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        rayCastProgram.uniforms.uRayTransform.location,
        false, // transpose, must be false (apparently)
        rayTransform);
    gl.uniform3f(rayCastProgram.uniforms.uCamLocation.location, camPos[0], camPos[1], camPos[2]);
    const uScreenSize = rayCastProgram.uniforms.uScreenSize;
    gl.uniform2f(uScreenSize.location, uScreenSize.value[0], uScreenSize.value[1]);
    const uMultisamples = rayCastProgram.uniforms.uMultisamples;
    gl.uniform1f(uMultisamples.location, uMultisamples.value);

    // camera is at (10, 0, 0)
    const uFLP = rayCastProgram.uniforms.uFrontLightPos;
    const frontPos = add(add(mult(xhat, uFLP.value[0]), mult(yhat, uFLP.value[1])), mult(zhat, uFLP.value[2]));
    const uBLP = rayCastProgram.uniforms.uBackLightPos;
    const backPos = add(add(mult(xhat, uBLP.value[0]), mult(yhat, uBLP.value[1])), mult(zhat, uBLP.value[2]));
    const uSLP = rayCastProgram.uniforms.uSideLightPos;
    const sidePos = add(add(mult(xhat, uSLP.value[0]), mult(yhat, uSLP.value[1])), mult(zhat, uSLP.value[2]));
    
    gl.uniform3f(uFLP.location, frontPos[0], frontPos[1], frontPos[2]);
    gl.uniform3f(uBLP.location, backPos[0], backPos[1], backPos[2]);
    gl.uniform3f(uSLP.location, sidePos[0], sidePos[1], sidePos[2]);

    const uFLI = rayCastProgram.uniforms.uFrontLightIntensity;
    gl.uniform3f(uFLI.location, uFLI.value[0], uFLI.value[1], uFLI.value[2]);
    const uFBI = rayCastProgram.uniforms.uBackLightIntensity;
    gl.uniform3f(uFBI.location, uFBI.value[0], uFBI.value[1], uFBI.value[2]);
    const uFSI = rayCastProgram.uniforms.uSideLightIntensity;
    gl.uniform3f(uFSI.location, uFSI.value[0], uFSI.value[1], uFSI.value[2]);

    gl.uniform1i(rayCastProgram.uniforms.dataTex.location, 0);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, voxelTex);

    gl.uniform1i(rayCastProgram.uniforms.denseTex.location, 1);
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, voxelTexDense);

    const fbAsRef = rayCastProgram.fbs.fbASetToRender ? rayCastProgram.fbs.fbB : rayCastProgram.fbs.fbA;
    const accumulationBufferCount = refinementIter > maxRefinement ? 0 : refinementIter;
    gl.uniform1i(rayCastProgram.uniforms.accumulationBufferCount.location, accumulationBufferCount);
    gl.uniform1i(rayCastProgram.uniforms.accumulationBuffer.location, 2);
    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_2D, fbAsRef.texture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // render the target frame buffer to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    gl.viewport(0, 0, mainCanvasWidth, mainCanvasHeight);
    gl.vertexAttribPointer(
        framebufferDrawProgram.attributes.aVertexPosition.location,
        2, // num components
        gl.FLOAT, // type
        false, // normalize
        0, // stride (0 means use num components and type above)
        0); // offset
    gl.enableVertexAttribArray(framebufferDrawProgram.attributes.aVertexPosition.location);

    gl.useProgram(framebufferDrawProgram.program);

    gl.uniform1i(framebufferDrawProgram.uniforms.copyTex.location, 0);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, fbToRender.texture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // swap render and target buffers
    rayCastProgram.fbs.fbASetToRender = !rayCastProgram.fbs.fbASetToRender;
    document.getElementById('ssp-stat').innerText = 'samples per pixel: ' + ((accumulationBufferCount + 1) * uMultisamples.value);

    if(refinementIter < maxRefinement && !renderingPaused){
        if(refinementIter < maxRefinement){
            refinementIter++;
            window.requestAnimationFrame(renderRayCast);
        }
    } else if(newFrameFlag && refinementIter === maxRefinement + 1){
        newFrameFlag = false;
        window.requestAnimationFrame(renderRayCast);
    } else {
        renderLoopActive = false;
    }
}

// for ping-pong rendering
function createFramebufferWithTexture(gl, width, height){
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D,
        0,
        gl.RGBA32UI,
        width,
        height,
        0,
        gl.RGBA_INTEGER,
        gl.UNSIGNED_INT,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    return {
        buffer: fb,
        texture: tex
    };
}

function initVoxelTextures(gl){
    const createVoxTex = (w) => {
        const voxTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, voxTex);
        gl.texImage2D(gl.TEXTURE_2D, 
            0, // level
            gl.RGBA32UI, // internal format
            w, // width 
            w, // height
            0, // border
            gl.RGBA_INTEGER, // format
            gl.UNSIGNED_INT, // type
            null // data
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return voxTex;
    }

    voxelTexDense = createVoxTex(denseVoxelTexWidth);
    const voxelTexA = createVoxTex(voxelTexWidth);
    const voxelTexB = createVoxTex(voxelTexWidth);

    const voxelTexDenseFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, voxelTexDenseFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, voxelTexDense, 0 /* level*/ );

    const voxelTexAFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, voxelTexAFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, voxelTexA, 0 /* level*/ );

    const voxelTexBFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, voxelTexBFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, voxelTexB, 0);

    initDenseTex(gl, voxelTexDenseFB);

    // run init fragment shader 
    runVoxelInit(gl, voxelTexAFB, voxelTexDense);
    // ping pong textures
    runVoxelAdj(gl, voxelTexA, voxelTexBFB, 1);
    runVoxelAdj(gl, voxelTexB, voxelTexAFB, 2);
    runVoxelAdj(gl, voxelTexA, voxelTexBFB, 4);
    runVoxelAdj(gl, voxelTexB, voxelTexAFB, 8);
    runVoxelAdj(gl, voxelTexA, voxelTexBFB, 16);
    runVoxelAdj(gl, voxelTexB, voxelTexAFB, 32);
    // make representation on 8 bits is 255
    runVoxelAdj(gl, voxelTexA, voxelTexBFB, 64); 

    voxelTex = voxelTexB;
}

function initDenseTex(gl, denseTexFB){
    gl.bindFramebuffer(gl.FRAMEBUFFER, denseTexFB); 
    gl.viewport(0, 0, denseVoxelTexWidth, denseVoxelTexWidth);
    gl.vertexAttribPointer(
        globalOuterVoxelConstrProgram.attributes.aVertexPosition.location,
        2, // num components
        gl.FLOAT, // type
        false, // normalize
        0, // stride (0 means use num components and type above)
        0); // offset
    gl.enableVertexAttribArray(globalOuterVoxelConstrProgram.attributes.aVertexPosition.location);

    gl.useProgram(globalDenseVoxelProgram.program);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
}

function runVoxelInit(gl, initVoxFB, denseTex){   
    gl.bindFramebuffer(gl.FRAMEBUFFER, initVoxFB); 
    gl.viewport(0, 0, voxelTexWidth, voxelTexWidth);
    gl.vertexAttribPointer(
        globalOuterVoxelConstrProgram.attributes.aVertexPosition.location,
        2, // num components
        gl.FLOAT, // type
        false, // normalize
        0, // stride (0 means use num components and type above)
        0); // offset
    gl.enableVertexAttribArray(globalOuterVoxelConstrProgram.attributes.aVertexPosition.location);

    gl.useProgram(globalOuterVoxelConstrProgram.program);

    gl.uniform1i(globalOuterVoxelConstrProgram.uniforms.denseTex.location, 0);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, denseTex);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
}

function runVoxelAdj(gl, srcTex, targetFB, octantHalfWidth){
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);
    gl.viewport(0, 0, voxelTexWidth, voxelTexWidth);
    gl.vertexAttribPointer(
        globalOuterVoxelAdjProgram.attributes.aVertexPosition.location,
        2, // num components
        gl.FLOAT, // type
        false, // normalize
        0, // stride (0 means use num components and type above)
        0); // offset
    gl.enableVertexAttribArray(globalOuterVoxelAdjProgram.attributes.aVertexPosition.location);

    gl.useProgram(globalOuterVoxelAdjProgram.program);

    const uOctantHalfWidth = globalOuterVoxelAdjProgram.uniforms.uOctantHalfWidth;
    gl.uniform1ui(uOctantHalfWidth.location, octantHalfWidth);

    gl.uniform1i(globalOuterVoxelAdjProgram.uniforms.dataTex.location, 0);

    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
}

function bindFullScreenQuad(gl){
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    const positions = [
       -1.0,  1.0,
        1.0,  1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);
}

function loadAndLinkGenericShader(gl, vertSrc, fragSrc){
    const vertShader = loadShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    if(!vertShader || !fragShader){
        return null;
    }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        let c = 1;
        console.log(source.split('\n').map(x => (c++) + ': ' + x).join('\n'));
        const info = gl.getShaderInfoLog(shader);
        console.log('An error occurred compiling the shaders: ' + info);

        currentError = info;
        currentErrorSource = source;

        gl.deleteShader(shader);

        return null;
    }
  
    return shader;
  }