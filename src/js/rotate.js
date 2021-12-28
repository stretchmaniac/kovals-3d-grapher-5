const xhat = [1, 0, 0];
const yhat = [0, 1, 0];
const zhat = [0, 0, 1];

const xhatInv = [1, 0, 0];
const yhatInv = [0, 1, 0];
const zhatInv = [0, 0, 1];

/*
    Rotates the vertex buffer by the specified (unit imaginary) quaternion
*/
function rotate(quat){
    rotatePt(xhat, quat);
    rotatePt(yhat, quat);
    rotatePt(zhat, quat);

    const inv = quatInv(quat);
    rotatePt(xhatInv, inv);
    rotatePt(yhatInv, inv);
    rotatePt(zhatInv, inv);
}

function rotatePt(pt, q){
    const x = 2*pt[1]*(q[1]*q[2] - q[0]*q[3]) + 2*pt[2]*(q[0]*q[2] + q[1]*q[3]) + 
        pt[0]*(q[0]*q[0] + q[1]*q[1] - q[2]*q[2] - q[3]*q[3]);
    const y = 2*pt[0]*(q[1]*q[2] + q[0]*q[3]) + 2*pt[2]*(-q[0]*q[1] + q[2]*q[3]) + 
        pt[1]*(q[0]*q[0] - q[1]*q[1] + q[2]*q[2] - q[3]*q[3]);
    const z = 2*pt[0]*(-q[0]*q[2] + q[1]*q[3]) + 2*pt[1]*(q[0]*q[1] + q[2]*q[3]) + 
        pt[2]*(q[0]*q[0] - q[1]*q[1] - q[2]*q[2] + q[3]*q[3]);
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
}

function quatToPt(a){
    return [a[1],a[2],a[3]];
}
function ptToQuat(a){
    return [0,a[0],a[1],a[2]];
}

function quatMult(a, b){
    return [
        a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3],
        a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
        a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1],
        a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0]
    ];
}
function quatConj(a){
    return [a[0], -a[1], -a[2], -a[3]];
}
function quatInv(a){
    const lengthSquared = a[0]*a[0] + a[1]*a[1] + a[2]*a[2] + a[3]*a[3];
    return [a[0]/lengthSquared, -a[1]/lengthSquared, -a[2]/lengthSquared, -a[3]/lengthSquared];
}

/*
    mouse events for rotation
*/
function rotateInit(){
    let canvas = document.getElementById("plot_canvas");
    let mouseDown = false;
    let mousePos = [0, 0];
    canvas.addEventListener("mousedown", e => {
        mouseDown = true;
        mousePos = [e.clientX, e.clientY];
        globalRayCastProgram.uniforms.uMultisamples.value = 1;
    });
    canvas.addEventListener("mouseup", e => {
        mouseDown = false;
        globalRayCastProgram.uniforms.uMultisamples.value = 4;
        refinementIter = 0;
        window.requestAnimationFrame(renderRayCast);
    });
    canvas.addEventListener("mousemove", e => {
        if(mouseDown){
            let newMousePos = [e.clientX, e.clientY];
            let dx = newMousePos[0] - mousePos[0];
            let dy = newMousePos[1] - mousePos[1];
            refinementIter = maxRefinement + 1;
            rotateDxDy(-dx, -dy);
            mousePos = newMousePos;
            if(!hasQueuedFrame && !rendering){
                window.requestAnimationFrame(renderRayCast);
            } else if(!hasQueuedFrame && rendering){
                hasQueuedFrame = true;
            }            
        }
    });
}

/*
    transforming dx/dy screen movements into quaternion rotations
*/
let screenAxisHorizontal = [0,0,-1];
let screenAxisVertical = [0,-1,0];
function rotateDxDy(dx, dy){
    const baseAngle = 0.002;

    // now rotate by something proportional to dx around the vertical screen axis
    const sineTerm = Math.sin(baseAngle * dx);
    let vertQuat = [Math.cos(baseAngle * dx), sineTerm * screenAxisVertical[0], sineTerm * screenAxisVertical[1], sineTerm * screenAxisVertical[2]];

    // now rotate by something proportional to dy around the horizontal screen axis
    const sineTerm2 = Math.sin(baseAngle * dy);
    let horizQuat = [Math.cos(baseAngle * dy), sineTerm2 * screenAxisHorizontal[0], sineTerm2 * screenAxisHorizontal[1], sineTerm2 * screenAxisHorizontal[2]];

    rotate(vertQuat);
    rotate(horizQuat);

    rotatePt(screenAxisHorizontal, vertQuat);
    rotatePt(screenAxisHorizontal, horizQuat);
    rotatePt(screenAxisVertical, vertQuat);
    rotatePt(screenAxisVertical, horizQuat);
}