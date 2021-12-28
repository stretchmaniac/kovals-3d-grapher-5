function normalizeLocal(a){
    const mag = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
    a[0] /= mag;
    a[1] /= mag;
    a[2] /= mag;
    return a;
}
function normalize(a){
    const mag = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
    return [a[0] / mag, a[1] / mag, a[2] / mag];
}
function normalize2d(a){
    const mag = Math.sqrt(a[0]*a[0] + a[1]*a[1]);
    return [a[0] / mag, a[1] / mag];
}
function normalize2dLocal(a){
    const mag = Math.sqrt(a[0]*a[0] + a[1]*a[1]);
    a[0] /= mag;
    a[1] /= mag;
    return a;
}
function lengthSquared(a){
    return a[0]*a[0]+a[1]*a[1]+a[2]*a[2];
}

function add(a,b){
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function add2d(a,b){
    return [a[0] + b[0], a[1] + b[1]];
}
function add2dLocal(a,b){
    a[0] += b[0];
    a[1] += b[1];
    return a;
}
function copy(a){
    return [a[0], a[1], a[2]];
}
function copy2d(a){
    return [a[0], a[1]];
}
function subtract(a,b){
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function subtract2d(a,b){
    return [a[0] - b[0], a[1] - b[1]];
}
function multLocal(a, v){
    a[0] *= v;
    a[1] *= v;
    a[2] *= v;
}
function mult(a,v){
    return [a[0]*v, a[1]*v, a[2]*v];
}
function mult2d(a,v){
    return [a[0]*v, a[1]*v];
}
function mult2dLocal(a,v){
    a[0] *= v;
    a[1] *= v;
    return a;
}
function project2d(a, b){
    return mult2d(b, dot2d(a,b)/dot2d(b,b));
}
function distSquared(a,b){
    return (a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] - b[2])**2;
}
function distSquared2d(a,b){
    return (a[0] - b[0])**2 + (a[1] - b[1])**2;
}
function distance(a,b){
    return Math.sqrt(distSquared(a,b));
}
function distance2d(a,b){
    return Math.sqrt(distSquared2d(a,b));
}
function cross(a,b){
    return [
        a[1]*b[2]-a[2]*b[1],
        a[2]*b[0]-a[0]*b[2],
        a[0]*b[1]-a[1]*b[0]
    ];
}
function dot(a,b){
    return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
}
function dot2d(a,b){
    return a[0]*b[0] + a[1]*b[1];
}
function getBasis(n){
    const perp1 = perpendicular(n);
    const perp2 = cross(n, perp1);
    return [perp1, perp2, n];
}
function perpendicular(n){
    // find a component > 1/2 
    for(let i = 0; i < 3; i++){
        if(Math.abs(n[i]) > 1/2){
            const v2 = [0, 0, 0];
            v2[(i+1)%3] = 1;
            return normalizeLocal(cross(n, v2));
        }
    }
}
function nearestPtOnLineSegment2D(pt, lineP1, lineP2){
    // project onto line
    const off = subtract2d(pt, lineP1);
    const projected = add2d(lineP1, project2d(off, subtract2d(lineP2, lineP1)));

    // check if in line segment 
    const sub1 = subtract2d(projected, lineP1);
    const sub2 = subtract2d(projected, lineP2);
    if(dot2d(sub1, sub2) <= 0){
        return projected;
    }
    // pick the nearest endpoint 
    if(distance2d(pt, lineP1) < distance2d(pt, lineP2)){
        return copy2d(lineP1);
    }
    return copy2d(lineP2);
}