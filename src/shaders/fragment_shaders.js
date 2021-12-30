let evalFunc = ``;

let colorFunc = ``;

const binarySearchForZero = `
// requires that evaluate(rayOrigin + tMin * rayDir) * evaluate(rayOrigin + tMax * rayDir) < 0.
// vMin is evaluate(rayOrigin + tMin * rayDir)
// vMax is evaluate(rayOrigin + tMax * rayDir)
float binarySearchForZero(vec3 rayOrigin, vec3 rayDir, float tMin, float tMax, float vMin, float vMax){
    if(vMin == 0.0){
        return tMin;
    }
    for(int i = 0; i < BINARY_SEARCH_ITER; i++){
        float tMid = (tMin + tMax) / 2.0;
        float vMid = evaluate(rayOrigin + tMid * rayDir);
        if(vMin * vMid <= 0.0){
            tMax = tMid;
            vMax = vMid;
        }
        else {
            tMin = tMid;
            vMin = vMid;
        }
    }
    float finalT = (tMin + tMax) / 2.0;
    float finalV = evaluate(rayOrigin + finalT * rayDir);
    if(abs(finalV) < ZERO_EPS){
        return finalT;
    }
    return -1.0;
}`

const rayIntersectBounds = `
// -1.0 means no hit, otherwise returns a t s.t. rayOrigin + t rayDir is the first hit of the boundary of the bounds.
// returns [minT, maxT]
vec2 rayIntersectBounds(vec3 rayOrigin, vec3 rayDir){
    float t1 = (VIEW_BOUNDS_MIN.x - rayOrigin.x) / rayDir.x;
    float t2 = (VIEW_BOUNDS_MAX.x - rayOrigin.x) / rayDir.x;

    if(rayDir.x == 0.0){
        if(rayOrigin.x >= VIEW_BOUNDS_MIN.x && rayOrigin.x <= VIEW_BOUNDS_MAX.x){
            t1 = -1000000.0;
            t2 = 1000000.0;
        } else {
            t1 = 0.0;
            t2 = 0.0;
        }
    }

    float minT = min(t1, t2);
    float maxT = max(t1, t2);

    t1 = (VIEW_BOUNDS_MIN.y - rayOrigin.y) / rayDir.y;
    t2 = (VIEW_BOUNDS_MAX.y - rayOrigin.y) / rayDir.y;

    if(rayDir.y == 0.0){
        if(rayOrigin.y >= VIEW_BOUNDS_MIN.y && rayOrigin.y <= VIEW_BOUNDS_MAX.y){
            t1 = -1000000.0;
            t2 = 1000000.0;
        } else {
            t1 = 0.0;
            t2 = 0.0;
        }
    }

    float mint = min(t1, t2);
    float maxt = max(t1, t2);

    minT = max(minT, mint);
    maxT = min(maxT, maxt);

    t1 = (VIEW_BOUNDS_MIN.z - rayOrigin.z) / rayDir.z;
    t2 = (VIEW_BOUNDS_MAX.z - rayOrigin.z) / rayDir.z;

    if(rayDir.z == 0.0){
        if(rayOrigin.z >= VIEW_BOUNDS_MIN.z && rayOrigin.z <= VIEW_BOUNDS_MAX.z){
            t1 = -1000000.0;
            t2 = 1000000.0;
        } else {
            t1 = 0.0;
            t2 = 0.0;
        }
    }

    mint = min(t1, t2);
    maxt = max(t1, t2);

    minT = max(minT, mint);
    maxT = min(maxT, maxt);

    if(maxT > minT && maxT > 0.0){
        return vec2(max(minT, 0.0), maxT);
    }

    return vec2(-1.0);
}
`

const voxCoordToTexCoord = `
vec2 voxCoordToTexCoord(ivec3 voxCoord){
    // 16384 = 128^2
    int index = voxCoord.x * 16384 + voxCoord.y * 128 + voxCoord.z;

    ivec2 texIndex = ivec2(0);
    int texWidth = 1450;
    texIndex.x = index / texWidth;
    index %= texWidth;
    texIndex.y = index;

    float invTexWidth = 1.0 / float(texWidth);
    float eps = 0.5 * invTexWidth;
    return vec2(float(texIndex.x) * invTexWidth + eps, float(texIndex.y) * invTexWidth + eps);
}
`;

const texCoordToVoxCoord = `
ivec3 texCoordToVoxCoord(vec2 texCoord){
    ivec2 intTexCoord = ivec2(
        int(floor(texCoord.x * 1450.0)), 
        int(floor(texCoord.y * 1450.0))
    );
    int index = intTexCoord.x * 1450 + intTexCoord.y;

    ivec3 voxelIndex = ivec3(0.0);
    int voxelLayerSize = 16384;
    voxelIndex.x = index / voxelLayerSize;
    index %= voxelLayerSize;

    voxelIndex.y = index / 128;
    index %= 128;

    voxelIndex.z = index;

    return voxelIndex;
}
`;

const floatPtToVoxPt = `
ivec3 floatPtToVoxPt(vec3 floatPt){
    return ivec3(
        int(floor((floatPt.x + 1.0) * 64.0)),
        int(floor((floatPt.y + 1.0) * 64.0)),
        int(floor((floatPt.z + 1.0) * 64.0))
    );
}
`;

const voxPtToFloatPt = `
vec3 voxPtToFloatPt(ivec3 voxPt){
    float a = 0.015625; // 1.0 / 64.0;
    return vec3(
        float(voxPt.x) * a - 1.0,
        float(voxPt.y) * a - 1.0,
        float(voxPt.z) * a - 1.0
    );
}
`;

// http://amindforeverprogramming.blogspot.com/2013/07/random-floats-in-glsl-330.html
const rand = `
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}
float rand(float f) {
    const uint mantissaMask = 0x007FFFFFu;
    const uint one          = 0x3F800000u;
   
    uint h = hash( floatBitsToUint( f ) );
    h &= mantissaMask;
    h |= one;
    
    float  r2 = uintBitsToFloat( h );
    return r2 - 1.0;
}`

const getPerp = `
vec3 getPerp(vec3 v){
    if(abs(v.x) < .7){
        return normalize(cross(v, vec3(1.0, 0.0, 0.0)));
    } else if(abs(v.y) < .7){
        return normalize(cross(v, vec3(0.0, 1.0, 0.0)));
    }
    return normalize(cross(v, vec3(0.0, 0.0, 1.0)));
}
`

const halfSphereSampling = `
// seed should start at 0 and count upward for best results
vec3 lowDiscrepancyHalfSphere(int seed){
    // basic arithmetic low discrepancy sequence on square 
    float sqrt2 = 1.41421356237;
    float sqrt3 = 1.73205080757;
    float sqrt5 = 2.2360679775;
    float pi2 = 6.28318530718;
    float theta = mod(sqrt5 + 2.0 * float(seed) * sqrt2, pi2);
    float z = mod(sqrt5 + 2.0 * float(seed) * sqrt3, 1.0);
    
    // equal area projection 
    float xyDist = sqrt(1.0 - z*z);
    float x = xyDist * cos(theta);
    float y = xyDist * sin(theta);

    return vec3(x,y,z);
}

vec3 lowDiscrepancyHalfSphereCosineBiased(int seed){
    // sample unit disk and project upward
    float sqrt2 = 1.41421356237;
    float sqrt3 = 1.73205080757;
    float sqrt5 = 2.2360679775;
    float pi2 = 6.28318530718;
    float r = sqrt(mod(sqrt5 + 2.0 * float(seed) * sqrt2, 1.0));
    float theta = mod(sqrt5 + 2.0 * float(seed) * sqrt3, pi2);
    
    float x = r * cos(theta);
    float y = r * sin(theta);
    float z = sqrt(1.0- x*x - y*y);
    return vec3(x,y,z);
}
`

const lowDiscrepancySquare = `
vec2 lowDiscrepancySquare(int seed){
    float sqrt2 = 1.41421356237;
    float sqrt3 = 1.73205080757;
    float sqrt5 = 2.2360679775;
    float x = mod(sqrt5 + float(seed) * sqrt2, 1.0);
    float y = mod(sqrt5 + float(seed) * sqrt3, 1.0);

    return vec2(x, y);
}
`;

// dense texture is 1024 x 1024
const denseVoxPtToFloatPt = `
vec3 denseVoxPtToFloatPt(ivec3 voxPt){
    float a = 0.001953125; // 1.0 / 512.0;
    return vec3(
        float(voxPt.x) * a - 1.0,
        float(voxPt.y) * a - 1.0,
        float(voxPt.z) * a - 1.0
    );
}`;

const floatPtToDenseVoxPt = `
ivec3 floatPtToDenseVoxPt(vec3 floatPt){
    return ivec3(
        int(floor(floatPt.x * 512.0)) + 512,
        int(floor(floatPt.y * 512.0)) + 512,
        int(floor(floatPt.z * 512.0)) + 512
    );
}
`

const densePixToVox = `
ivec3 densePixToVox(ivec3 pixCoord){
    // The pixCoord is (pixel x, pixel y, bit index), with bit index from 0 - 127.
    // For better caching, we want one pixel to be two adjacent 4x4x4 blocks.
    // There are 256 x 256 x 256 4x4x4 blocks in the dense voxel grid
    int blockIndex = (pixCoord.x * 2900 + pixCoord.y) << 1;
    int bitIndex = pixCoord.z;

    int diff = bitIndex >> 6;
    blockIndex += diff;
    bitIndex -= 64 * diff;

    int blockX = blockIndex >> 16; // 256^2
    blockIndex %= 65536;
    int blockY = blockIndex >> 8;
    blockIndex %= 256;
    int blockZ = blockIndex;

    int subBlockX = bitIndex >> 4;
    bitIndex %= 16;
    int subBlockY = bitIndex >> 2;
    bitIndex %= 4;
    int subBlockZ = bitIndex;

    return ivec3(
        4 * blockX + subBlockX,
        4 * blockY + subBlockY,
        4 * blockZ + subBlockZ
    );
}
`

const denseVoxToPix = `
ivec3 denseVoxToPix(ivec3 voxCoord){
    ivec3 block = ivec3(voxCoord.x >> 2, voxCoord.y >> 2, voxCoord.z >> 2);
    ivec3 subBlock = ivec3(voxCoord.x % 4, voxCoord.y % 4, voxCoord.z % 4);

    int blockIndex = block.x * 65536 + block.y * 256 + block.z;
    int bitIndex = 16 * subBlock.x + 4 * subBlock.y + subBlock.z;

    int diff = blockIndex % 2;
    blockIndex -= diff;
    bitIndex += 64 * diff;

    blockIndex /= 2;
    int pixelX = blockIndex / 2900;
    blockIndex %= 2900;
    int pixelY = blockIndex;
    return ivec3(pixelX, pixelY, bitIndex);
}
`

const setOctantValue = `
uvec4 setOctantValue(uvec4 octantData, int octDx, int octDy, int octDz, uint value){
    int byteIndex = 0;
    if(octDx == 1 && octDy == 1){ byteIndex = (octDz == 1 ? 0 : 1); }
    else if(octDx == 1 && octDy == -1){ byteIndex = (octDz == 1 ? 2 : 3); }
    else if(octDx == -1 && octDy == 1){ byteIndex = (octDz == 1 ? 4 : 5); }
    else { byteIndex = (octDz == 1 ? 6 : 7); }

    uint pos = 0u;
    if(byteIndex > 3){
        byteIndex -= 4;
        pos += 1u;
    }

    uint currentData = octantData[pos];
    uint zeroMask;
    uint dataMask;

    if(byteIndex == 3){
        zeroMask = 4294967040u; // 11111111 11111111 11111111 00000000
        dataMask = value;
    } else if(byteIndex == 2){
        zeroMask = 4294902015u; // 11111111 11111111 00000000 11111111
        dataMask = value << 8u;
    } else if(byteIndex == 1){
        zeroMask = 4278255615u; // 11111111 00000000 11111111 11111111
        dataMask = value << 16u;
    } else {
        zeroMask = 16777215u;   // 00000000 11111111 11111111 11111111
        dataMask = value << 24u;
    }

    octantData[pos] = (currentData & zeroMask) | dataMask;
    return octantData;
}
`;

const getOctantValue = `
uint getOctantValue(usampler2D data, ivec3 voxPos, int octDx, int octDy, int octDz){
    if(voxPos.x < 0 || voxPos.y < 0 || voxPos.z < 0 || voxPos.x > 127 || voxPos.y > 127 || voxPos.z > 127){
        return 128u;
    }

    // ordering
    // dx | dy | dz | 8 bit index
    // 1  | 1  | 1  | 0
    // 1  | 1  | -1 | 1 
    // 1  | -1 | 1  | 2
    // 1  | -1 | -1 | 3
    // -1 | 1  | 1  | 4
    // -1 | 1  | -1 | 5
    // -1 | -1 | 1  | 6
    // -1 | -1 | -1 | 7
    
    int byteIndex = 0;
    if(octDx == 1 && octDy == 1){ byteIndex = (octDz == 1 ? 0 : 1); }
    else if(octDx == 1 && octDy == -1){ byteIndex = (octDz == 1 ? 2 : 3); }
    else if(octDx == -1 && octDy == 1){ byteIndex = (octDz == 1 ? 4 : 5); }
    else { byteIndex = (octDz == 1 ? 6 : 7); }

    uvec4 octantData = texture(data, voxCoordToTexCoord(voxPos));
    uint dataInt = octantData.x;
    if(byteIndex > 3){
        dataInt = octantData.y;
        byteIndex -= 4;
    }

    // now use bit operations to retrieve the data we want
    uint bitMask = 255u; // = 00000000 00000000 00000000 11111111
    if(byteIndex == 0){
        return (dataInt >> 24u) & bitMask;
    }
    else if(byteIndex == 1){
        return (dataInt >> 16u) & bitMask;
    }
    else if(byteIndex == 2){
        return (dataInt >> 8u) & bitMask;
    }
    return dataInt & bitMask;
}`
// ============================== BEGIN DENSE VOXEL INIT ================================================

let denseVoxelInit_frag = '';
let voxelInit_frag = '';
let voxelAdj_frag = '';
let framebuffer_copy_frag = '';
let raycast_frag = '';
function setFragShaders(){
    denseVoxelInit_frag = 
    `#version 300 es
    precision highp float;
    precision highp int;

    layout(location = 0) out uvec4 outColor;
    ` + denseVoxPtToFloatPt + densePixToVox + evalFunc + colorFunc + `
    bool voxelEmpty(vec3 origin, float width);

    void main() {
        // one color value is 4*32 = 128 bits of info
        ivec3 pixCoord = ivec3(floor(gl_FragCoord.x), floor(gl_FragCoord.y), 0);
        float voxWidth = 2.0 / 1024.0;
        uvec4 result = uvec4(0u);
        for(int index = 0; index < 128; index++){
            pixCoord.z = index;
            ivec3 voxCoord = densePixToVox(pixCoord);
            vec3 corner = denseVoxPtToFloatPt(voxCoord);
            if(!voxelEmpty(corner, voxWidth)){
                // write to the requisite bit
                uint indexU = uint(index);
                if(index < 32){
                    // write to first uint
                    result.x |= (1u << indexU);
                } else if(index < 64) {
                    // write to second uint
                    result.y |= (1u << (indexU - 32u));
                } else if(index < 96) {
                    // write to third uint
                    result.z |= (1u << (indexU - 64u));
                } else {
                    // write to last uint
                    result.w |= (1u << (indexU - 96u));
                }
            }
        }

        outColor = result;
    }

    bool intervalEmpty(vec3 origin, vec3 dir){
        float minT = 0.0;
        float maxT = 1.0;
        float minV = evaluate(origin);
        float maxV = evaluate(origin + dir);
        if(minV == 0.0 || maxV == 0.0){
            return false;
        } else if(minV < 0.0 && maxV < 0.0 || minV > 0.0 && maxV > 0.0){
            return true;
        }

        // binary search in interval 
        float vMultiplier = minV > 0.0 ? -1.0 : 1.0;
        minV *= vMultiplier;
        maxV *= vMultiplier;
        for(int i = 0; i < 10; i++){
            if(minV > -0.0001 || maxV < 0.0001){
                return false;
            }
            float midT = (minT + maxT) / 2.0;
            float midV = vMultiplier * evaluate(origin + dir * midT);
            if(midV <= 0.0){
                minT = midT;
                minV = midV;
            } else {
                maxT = midT;
                maxV = midV;
            }
        }
        return true;
    }

    bool voxelEmpty(vec3 origin, float width){
        vec3 xhat = vec3(width, 0.0, 0.0);
        vec3 yhat = vec3(0.0, width, 0.0);
        vec3 zhat = vec3(0.0, 0.0, width);

        for(int i = 0; i < 2; i++){
            for(int j = 0; j < 2; j++){
                float iVal = width * (float(i));
                float jVal = width * (float(j));
                bool nonEmpty = !intervalEmpty(origin + vec3(iVal, jVal, 0.0), zhat) ||
                                !intervalEmpty(origin + vec3(iVal, 0.0, jVal), yhat) ||
                                !intervalEmpty(origin + vec3(0.0, iVal, jVal), xhat);
                if(nonEmpty){
                    return false;
                }
            }
        }
        return true;
    }
    `;

    // ============================== BEGIN OCTANT VOXEL INIT ===============================================

    voxelInit_frag = 
    `#version 300 es
    precision highp float;
    precision highp int;

    // 1 / 128
    const float VOX_WIDTH = 0.0078125; 
    layout(location = 0) out uvec4 outColor;

    uniform highp usampler2D denseTex;

    ` + texCoordToVoxCoord + denseVoxToPix + setOctantValue + `

    void main() {
        // gl_FragCoord is in pixels
        vec2 texCoord = gl_FragCoord.xy / 1450.0;
        ivec3 voxCoord = texCoordToVoxCoord(texCoord);

        ivec3 denseVoxCoord = 8 * voxCoord;
        bool containsSomething = false;
        for(int i = 0; i < 2; i++){
            for(int j = 0; j < 2; j++){
                for(int k = 0; k < 2; k++){
                    ivec3 baseDenseVoxCoord = denseVoxCoord + 4 * ivec3(i, j, k);
                    ivec3 pixCoord = denseVoxToPix(baseDenseVoxCoord);
                    uvec4 value = texelFetch(denseTex, pixCoord.xy, 0);
                    if(!(value.x == 0u && value.y == 0u && value.z == 0u && value.w == 0u)){
                        containsSomething = true;
                    }
                }
            }
        }
        
        uint int1 = 0u;
        uint int2 = 0u;
        uint int3 = 0u;
        if(!containsSomething){
            // put in 1 for every octant. In bit form, this will be 
            // int1                             int2                             int3
            // 00000001000000010000000100000001 00000001000000010000000100000001 <can remain 0>

            // 00000001000000010000000100000001 = 16843009
            int1 = 16843009u;
            int2 = 16843009u;
        }
        
        outColor = uvec4(int1, int2, int3, 0u);
    }
    `;

    // ============================== BEGIN OCTANT VOXEL ADJ ================================================

    voxelAdj_frag = 
    `#version 300 es
    precision highp float;
    precision highp int;

    // should increase by powers of two, starting with 1, 2, 4 and ending with 64
    uniform uint uOctantHalfWidth;
    uniform highp usampler2D dataTex;
    layout(location = 0) out uvec4 outColor;

    ` + texCoordToVoxCoord + voxCoordToTexCoord + getOctantValue + setOctantValue + `

    bool octantVacant(ivec3 voxPos, int octDx, int octDy, int octDz, uint octSize, uint voxCheckSize);
    uint findLargestVacantOctant(ivec3 voxPos, int octDx, int octDy, int octDz, uint minSizeInclusive, uint maxSizeExclusive, uint voxCheckSize);

    void main() {
        // gl_FragCoord is in pixels...
        vec2 texCoord = gl_FragCoord.xy / 1450.0;
        uvec4 currentData = texture(dataTex, texCoord);

        //if(uOctantHalfWidth > 1u){
        //    outColor = currentData;
        //    return;
        //}

        ivec3 voxPos = texCoordToVoxCoord(texCoord);

        if(getOctantValue(dataTex, voxPos, 1, 1, 1) == 0u){
            // this voxel has something in it
            outColor = uvec4(0u);
            return;
        }

        uint octantWidth = 2u * uOctantHalfWidth;
        for(int dx = -1; dx <= 1; dx += 2){
            for(int dy = -1; dy <= 1; dy += 2){
                for(int dz = -1; dz <= 1; dz += 2){
                    // octant has generating vectors (dx, 0, 0), (0, dy, 0), (0, 0, dz)
                    
                    // if octant does not currently have distance uOctantHalfWidth, then the octant is saturated and should be skipped
                    uint octantValue = getOctantValue(dataTex, voxPos, dx, dy, dz);
                    if(octantValue < uOctantHalfWidth){
                        continue;
                    }

                    // check for max octant value
                    if(octantVacant(voxPos, dx, dy, dz, octantWidth, uOctantHalfWidth)){
                        currentData = setOctantValue(currentData, dx, dy, dz, octantWidth);
                    } else {
                        // otherwise binary search for correct size
                        currentData = setOctantValue(currentData, dx, dy, dz, 
                            findLargestVacantOctant(voxPos, dx, dy, dz, uOctantHalfWidth, octantWidth, uOctantHalfWidth)
                        );
                    }
                }
            }
        }

        outColor = currentData;
    }

    uint findLargestVacantOctant(ivec3 voxPos, int octDx, int octDy, int octDz, uint minSizeInclusive, uint maxSizeExclusive, uint voxCheckSize){
        // binary search, with 128 = 2^7 width we need max ~7 iterations, round up to 8 to be safe
        for(int count = 0; count < 8; count++){
            if(maxSizeExclusive == minSizeInclusive + 1u){
                return minSizeInclusive;
            }

            uint halfVal = (minSizeInclusive + maxSizeExclusive) / 2u;
            if(octantVacant(voxPos, octDx, octDy, octDz, halfVal, voxCheckSize)){
                minSizeInclusive = halfVal;
            } else {
                maxSizeExclusive = halfVal;
            }
        }

        return minSizeInclusive;
    }

    // octSize <= voxCheckSize * 2
    bool octantVacant(ivec3 voxPos, int octDx, int octDy, int octDz, uint octSize, uint voxCheckSize){
        int offset = int(octSize) - int(voxCheckSize);
        // check 7 spots
        return getOctantValue(dataTex, voxPos + offset * ivec3(octDx, 0, 0), octDx, octDy, octDz) >= voxCheckSize &&
            getOctantValue(dataTex, voxPos + offset * ivec3(0, octDy, 0), octDx, octDy, octDz) >= voxCheckSize && 
            getOctantValue(dataTex, voxPos + offset * ivec3(0, 0, octDz), octDx, octDy, octDz) >= voxCheckSize &&
            getOctantValue(dataTex, voxPos + offset * ivec3(octDx, octDy, 0), octDx, octDy, octDz) >= voxCheckSize &&
            getOctantValue(dataTex, voxPos + offset * ivec3(octDx, 0, octDz), octDx, octDy, octDz) >= voxCheckSize && 
            getOctantValue(dataTex, voxPos + offset * ivec3(0, octDy, octDz), octDx, octDy, octDz) >= voxCheckSize &&
            getOctantValue(dataTex, voxPos + offset * ivec3(octDx, octDy, octDz), octDx, octDy, octDz) >= voxCheckSize;
    }
    `;

    framebuffer_copy_frag = 
    `#version 300 es
    precision highp float;
    precision highp int;

    in vec2 pixPos;

    uniform highp usampler2D copyTex;
    layout(location = 0) out vec4 outColor;

    vec4 mapToRGB(vec4 radiance);

    void main(){
        uvec4 raw = texture(copyTex, 0.5 * (pixPos + vec2(1.0)), 0.0);

        vec4 unmapped = vec4(
            uintBitsToFloat(raw.x),
            uintBitsToFloat(raw.y),
            uintBitsToFloat(raw.z),
            uintBitsToFloat(raw.w)
        );

        outColor = mapToRGB(unmapped);
    }

    // from here: https://computergraphics.stackexchange.com/questions/11018/how-to-change-a-rgb-value-using-a-radiance-value
    vec3 ACESFilm(vec3 x){
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
    }
    float linearToSRGB(float x){
        return (x < 0.0031308) ?
            x * 12.92 :
            pow(x, 1.0/2.4) * 1.055 - 0.055;
    }
    vec3 linearToSRGB(vec3 x){
        return vec3(
            linearToSRGB(x.r),
            linearToSRGB(x.g),
            linearToSRGB(x.b)
        );
    }

    vec4 mapToRGB(vec4 radiance){
        vec3 hdr = radiance.xyz;
        hdr *= 0.1;

        // Limit saturation to 99% - maps pure colors like (1, 0, 0) to (1, 0.01, 0.01)
        float maxComp = max(hdr.r, max(hdr.g, hdr.b));
        hdr = max(hdr, 0.01 * maxComp);

        // Apply tonemapping curve
        vec3 ldrLinear = ACESFilm(hdr);

        // Convert to sRGB
        vec3 ldrSRGB = linearToSRGB(hdr);
        return vec4(ldrSRGB, radiance.w);
    }
    `;


    // ================================ BEGIN RAYCAST ======================================

    raycast_frag = 
    `#version 300 es
    precision highp float;
    precision highp int;

    uniform vec3 uCamLocation;

    uniform vec3 uFrontLightPos;
    uniform vec3 uBackLightPos;
    uniform vec3 uSideLightPos;
    uniform vec3 uFrontLightIntensity;
    uniform vec3 uBackLightIntensity;
    uniform vec3 uSideLightIntensity;

    uniform float uMultisamples;
    uniform int accumulationBufferCount;

    uniform highp usampler2D accumulationBuffer;
    uniform highp usampler2D dataTex;
    uniform highp usampler2D denseTex;

    layout(location = 0) out uvec4 outColor;

    in vec3 vRayOrigin00;
    in vec3 vRayOrigin10;
    in vec3 vRayOrigin01;
    in vec2 pixPos;

    const vec3 VIEW_BOUNDS_MIN = vec3(-1.0, -1.0, -1.0);
    const vec3 VIEW_BOUNDS_MAX = vec3(1.0, 1.0, 1.0);

    vec3 getAccRayCastPt(vec3 rayOrigin, vec3 rayDir);
    vec3 getAccRayCastPt(vec3 rayOrigin, vec3 rayDir, int maxIter);
    vec3 getAccRayCastPtRough(vec3 rayOrigin, vec3 rayDir);
    vec3 getNormal(vec3 pt, vec3 incomingRayOrigin, vec3 incomingRayDir);
    vec4 getIllumination(vec3 pt, vec3 normal, int seed);

    ` + evalFunc + colorFunc + rayIntersectBounds + voxCoordToTexCoord + getOctantValue + voxPtToFloatPt + 
    floatPtToVoxPt + floatPtToDenseVoxPt + denseVoxToPix + denseVoxPtToFloatPt + rand + getPerp +
    halfSphereSampling + lowDiscrepancySquare + raytrace_src_diffuse +`

    void main(){
        // get previous pixel value, if applicable 
        vec4 prevPixValue = vec4(0.0);
        if(accumulationBufferCount > 0){
            uvec4 uPrevPixValue = texture(accumulationBuffer, 0.5*(pixPos + vec2(1.0)), 0.0);
            prevPixValue = vec4(
                uintBitsToFloat(uPrevPixValue.x),
                uintBitsToFloat(uPrevPixValue.y),
                uintBitsToFloat(uPrevPixValue.z),
                uintBitsToFloat(uPrevPixValue.w)
            );
        }

        vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
        vec3 offset1 = vRayOrigin10 - vRayOrigin00;
        vec3 offset2 = vRayOrigin01 - vRayOrigin00;
        const int maxMultisample = 1;
        for(int i = 0; i < maxMultisample; i++){
            if(float(i) >= uMultisamples){
                break;
            }
            vec2 samplePos = lowDiscrepancySquare(accumulationBufferCount*maxMultisample + i) - vec2(0.5, 0.5);
            vec3 origin = vRayOrigin00 + samplePos.x * offset1 + samplePos.y * offset2;
            vec3 dir = normalize(origin - uCamLocation);

            vec3 rayIntPt = getAccRayCastPt(origin, dir);
            int pixelOffset = int(97.0 * float(accumulationBufferCount + 1) * 
                rand(sin(rayIntPt.x*rayIntPt.y + rayIntPt.y*rayIntPt.z + rayIntPt.z*rayIntPt.x)));
            if(rayIntPt.x == -2.0){
                color += vec4(vec3(10.0).xyz, 1.0);
            }
            else {
                vec3 normal = getNormal(rayIntPt, origin, dir);
                vec4 illumination = getIlluminationRayTrace(rayIntPt, normal, dir, pixelOffset + int(uMultisamples) * accumulationBufferCount + i);

                color += illumination;
            }
        }

        vec4 iterColor = color / uMultisamples;


        // average with previous pixel value 
        vec4 outColorF = prevPixValue + (iterColor - prevPixValue) / float(accumulationBufferCount + 1);
        outColor = uvec4(
            floatBitsToUint(outColorF.x),
            floatBitsToUint(outColorF.y),
            floatBitsToUint(outColorF.z),
            floatBitsToUint(outColorF.w)
        );
    }

    // one of evaluate(p1) and evaluate(p2) must be zero
    vec3 findSolidBoundary(vec3 p1, vec3 p2){
        float v1 = evaluate(p1);
        float v2 = evaluate(p2);
        if(v1 != 0.0){
            // swap...
            vec3 tmp = p2;
            p2 = p1;
            p1 = tmp;
        }

        // binary search
        for(int i = 0; i < 8; i++){
            vec3 mid = (p1 + p2) * 0.5;
            float midV = evaluate(mid);
            if(midV == 0.0){
                p1 = mid;
            } else {
                p2 = mid;
            }
        }

        return (p1 + p2) * 0.5;
    }

    const float NORMAL_SAMPLE_DELTA = 0.0001;

    vec3 findNearbySolidBoundary(vec3 pt, float offset){
        float valAtPt = evaluate(pt);
        vec3 dx2 = vec3(offset, 0.0, 0.0);
        vec3 dy2 = vec3(0.0, offset, 0.0);
        vec3 dz2 = vec3(0.0, 0.0, offset);

        float v1 = evaluate(pt + dx2) - valAtPt;
        float v2 = evaluate(pt - dx2) - valAtPt;
        float v3 = evaluate(pt + dy2) - valAtPt;
        float v4 = evaluate(pt - dy2) - valAtPt;
        float v5 = evaluate(pt + dz2) - valAtPt;
        float v6 = evaluate(pt - dz2) - valAtPt;

        vec3 boundaryPt = vec3(0.0);

        if(v1 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt + dx2);
        } else if(v2 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt - dx2);
        } else if(v3 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt + dy2);
        } else if(v4 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt - dy2);
        } else if(v5 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt + dz2);
        } else if(v6 != 0.0){
            boundaryPt = findSolidBoundary(pt, pt - dz2);
        } else {
            return vec3(-2.0);
        }

        return boundaryPt;
    }

    vec3 getNormal(vec3 pt, vec3 incomingRayOrigin, vec3 incomingRayDir){
        // The surface may not have a normal at the point.
        // What we are really looking for is a direction which points (locally) away from 
        // the surface. 
        vec3 dx = vec3(NORMAL_SAMPLE_DELTA, 0.0, 0.0);
        vec3 dy = vec3(0.0, NORMAL_SAMPLE_DELTA, 0.0);
        vec3 dz = vec3(0.0, 0.0, NORMAL_SAMPLE_DELTA);

        float valAtPt = evaluate(pt);
        float dfdxR = evaluate(pt + dx) - valAtPt;
        float dfdyR = evaluate(pt + dy) - valAtPt;
        float dfdzR = evaluate(pt + dz) - valAtPt;
        float dfdxL = evaluate(pt - dx) - valAtPt;
        float dfdyL = evaluate(pt - dy) - valAtPt;
        float dfdzL = evaluate(pt - dz) - valAtPt;

        vec3 dfR = vec3(dfdxR, dfdyR, dfdzR);
        vec3 dfL = vec3(dfdxL, dfdyL, dfdzL);

        vec3 res = dfR - dfL;
        if(length(res) == 0.0){
            // this might be a solid region instead of a surface... search for a boundary point 
            float voxelLength = 1.5 / 1024.0;
            vec3 boundaryPt = findNearbySolidBoundary(pt, voxelLength);
            
            // now find two other boundary points nearby 
            float delta = NORMAL_SAMPLE_DELTA * 2.0;
            vec3 boundaryPt2 = findNearbySolidBoundary(boundaryPt + vec3(delta, delta, 0.0), delta * 3.0);
            if(boundaryPt2.x == -2.0){
                boundaryPt2 = findNearbySolidBoundary(boundaryPt - vec3(delta, delta, 0.0), delta * 3.0);
            }
            vec3 boundaryPt3 = findNearbySolidBoundary(boundaryPt + vec3(delta, 0.0, delta), delta * 3.0);
            if(boundaryPt3.x == -2.0){
                boundaryPt3 = findNearbySolidBoundary(boundaryPt - vec3(delta, 0.0, delta), delta * 3.0);
            }
            vec3 boundaryPt4 = findNearbySolidBoundary(boundaryPt + vec3(0.0, delta, delta), delta * 3.0);
            if(boundaryPt4.x == -2.0){
                boundaryPt4 = findNearbySolidBoundary(boundaryPt - vec3(0.0, delta, delta), delta * 3.0);
            }

            // throw out boundary point that is closest to the original 
            float d1 = distance(boundaryPt2, boundaryPt);
            float d2 = distance(boundaryPt3, boundaryPt);
            float d3 = distance(boundaryPt4, boundaryPt);
            vec3 b1 = vec3(0.0);
            vec3 b2 = vec3(0.0);
            if(d1 <= d2 && d1 <= d3 || boundaryPt2.x == -2.0){
                b1 = boundaryPt3;
                b2 = boundaryPt4;
            } else if(d2 <= d1 && d2 <= d3 || boundaryPt3.x == -2.0){
                b1 = boundaryPt2;
                b2 = boundaryPt4;
            } else {
                b1 = boundaryPt2;
                b2 = boundaryPt3;
            }

            vec3 offset1 = normalize(b1 - boundaryPt);
            vec3 offset2 = normalize(b2 - boundaryPt);
            vec3 perp = normalize(cross(offset1, offset2));

            float eps = 0.001;
            float nVal = evaluate(pt + eps * perp);

            // project pt onto the ray 
            vec3 off = pt - incomingRayOrigin;
            vec3 proj = incomingRayOrigin + dot(off, incomingRayDir) * incomingRayDir;

            eps = 0.01;
            float vVal = evaluate(proj - eps * incomingRayDir);

            if(nVal == 0.0 && vVal != 0.0 || nVal != 0.0 && vVal == 0.0){
                perp *= -1.0;
            }

            return perp;
        }

        vec3 n = normalize(res);
        // about half a voxel
        float eps = 0.001;
        float nVal = evaluate(pt + eps * n) - valAtPt;

        // project pt onto the ray 
        vec3 off = pt - incomingRayOrigin;
        vec3 proj = incomingRayOrigin + dot(off, incomingRayDir) * incomingRayDir;

        eps = 0.01;
        float vVal = evaluate(proj - eps * incomingRayDir) - evaluate(proj);

        if(nVal * vVal < 0.0){
            n *= -1.0;
        }

        return n;
    }

    vec4 getIllumination(vec3 pt, vec3 normal, int seed){
        vec3 b1 = getPerp(normal);
        vec3 b2 = cross(normal, b1);
        float total = 0.0;
        int numSamples = 4;
        float denseVoxWidth = 2.0 / 1024.0;
        ivec3 denseVox = floatPtToDenseVoxPt(pt);
        int base = int(rand(float(denseVox.x * denseVox.y + denseVox.y * denseVox.z + denseVox.z * denseVox.z)) * 100.0);
        // spam some rays for ambient occlusion measurement
        for(int n = 0; n < numSamples; n++){
            vec3 halfSphere = lowDiscrepancyHalfSphere(base + numSamples * seed + n);

            vec3 rayDir = halfSphere.x * b1 + halfSphere.y * b2 + halfSphere.z * normal;
            if(getAccRayCastPtRough(pt + normal * denseVoxWidth * 8.0, rayDir).x == -2.0){
                total += 1.0 / float(numSamples);
            }
        }

        return vec4(0.5 * total, total, total, 1.0);
    }

    vec3 getAccRayCastPtRough(vec3 rayOrigin, vec3 rayDir){
        vec3 rayDirInv = vec3(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
        float voxWidth = 0.001953125 * 8.0;
        float voxDenseWidth = 0.001953125;
        bool dirXPos = rayDir.x > 0.0;
        bool dirYPos = rayDir.y > 0.0;
        bool dirZPos = rayDir.z > 0.0;

        // get out of the dense voxel grid first
        ivec3 currentVoxDense = floatPtToDenseVoxPt(rayOrigin);
        vec3 currentVoxDenseMin = denseVoxPtToFloatPt(currentVoxDense);
        vec3 currentVoxDenseMax = currentVoxDenseMin + vec3(voxDenseWidth);
        ivec3 currentVox = currentVoxDense / 8;

        // could take as many as 24 iterations to get out :(
        for(int i = 0; i < 24; i++){
            ivec3 currentBigVox = currentVoxDense / 8;
            if(currentBigVox.x != currentVox.x || currentBigVox.y != currentVox.y || currentBigVox.z != currentVox.z){
                currentVox = currentBigVox;
                break;
            }

            ivec3 pix = denseVoxToPix(currentVoxDense);
            uvec4 value = texelFetch(denseTex, pix.xy, 0);

            bool empty = false;
            uint shift = uint(pix.z);
            bool skipToNextBlock = false;
            if(pix.z < 64 && value.x == 0u && value.y == 0u || pix.z >= 64 && value.z == 0u && value.w == 0u){
                empty = true;
                skipToNextBlock = true;
            }
            else if(pix.z < 32){
                empty = ((value.x >> shift) & 1u) == 0u;
            } else if(pix.z < 64){
                shift -= 32u;
                empty = ((value.y >> shift) & 1u) == 0u;
            } else if(pix.z < 96) {
                shift -= 64u;
                empty = ((value.z >> shift) & 1u) == 0u;
            } else {
                shift -= 96u;
                empty = ((value.w >> shift) & 1u) == 0u;
            }
            if(!empty && i != 0){
                // return center of voxel projected onto the ray
                return 0.5 * currentVoxDenseMin + 0.5 * currentVoxDenseMax;
            }

            if(skipToNextBlock){
                ivec3 blockMin = ivec3(
                    4 * (currentVoxDense.x / 4),
                    4 * (currentVoxDense.y / 4),
                    4 * (currentVoxDense.z / 4)
                );
                vec3 bigVoxMin = denseVoxPtToFloatPt(blockMin);
                vec3 bigVoxMax = bigVoxMin + vec3(4.0 * voxDenseWidth);
                float targetX = dirXPos ? bigVoxMax.x : bigVoxMin.x;
                float targetY = dirYPos ? bigVoxMax.y : bigVoxMin.y;
                float targetZ = dirZPos ? bigVoxMax.z : bigVoxMin.z;
                float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                float zT = (targetZ - rayOrigin.z) * rayDirInv.z;
                
                ivec3 ivoxOffset = ivec3(0);
                rayOrigin += rayDir * min(xT, min(yT, zT));
                ivec3 targetLoc = floatPtToDenseVoxPt(rayOrigin);
                targetLoc.x = clamp(targetLoc.x, blockMin.x, blockMin.x + 3);
                targetLoc.y = clamp(targetLoc.y, blockMin.y, blockMin.y + 3);
                targetLoc.z = clamp(targetLoc.z, blockMin.z, blockMin.z + 3);
                if(xT <= yT && xT <= zT){
                    ivoxOffset = ivec3(
                        (dirXPos ? blockMin.x + 4 : blockMin.x - 1) - currentVoxDense.x,
                        targetLoc.y - currentVoxDense.y,
                        targetLoc.z - currentVoxDense.z
                    );
                } else if(yT <= xT && yT <= zT){
                    ivoxOffset = ivec3(
                        targetLoc.x - currentVoxDense.x,
                        (dirYPos ? blockMin.y + 4 : blockMin.y - 1) - currentVoxDense.y,
                        targetLoc.z - currentVoxDense.z
                    );
                } else {
                    ivoxOffset = ivec3(
                        targetLoc.x - currentVoxDense.x,
                        targetLoc.y - currentVoxDense.y,
                        (dirZPos ? blockMin.z + 4 : blockMin.z - 1) - currentVoxDense.z
                    );
                }
                currentVoxDense += ivoxOffset;
                vec3 off = voxDenseWidth * vec3(float(ivoxOffset.x), float(ivoxOffset.y), float(ivoxOffset.z));
                currentVoxDenseMin += off;
                currentVoxDenseMax += off;
            } else {
                // go just to the next voxel 
                float targetX = dirXPos ? currentVoxDenseMax.x : currentVoxDenseMin.x;
                float targetY = dirYPos ? currentVoxDenseMax.y : currentVoxDenseMin.y;
                float targetZ = dirZPos ? currentVoxDenseMax.z : currentVoxDenseMin.z;
                float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                float zT = (targetZ - rayOrigin.z) * rayDirInv.z;
                
                ivec3 ivoxOffset = ivec3(0);
                rayOrigin += rayDir * min(xT, min(yT, zT));
                if(xT <= yT && xT <= zT){
                    ivoxOffset = ivec3(dirXPos ? 1 : -1, 0, 0);
                } else if(yT <= xT && yT <= zT){
                    ivoxOffset = ivec3(0, dirYPos ? 1 : -1, 0);
                } else {
                    ivoxOffset = ivec3(0, 0, dirZPos ? 1 : -1);
                }
                currentVoxDense += ivoxOffset;
                vec3 off = voxDenseWidth * vec3(float(ivoxOffset.x), float(ivoxOffset.y), float(ivoxOffset.z));
                currentVoxDenseMin += off;
                currentVoxDenseMax += off;
            }
        }

        vec3 currentVoxMin = voxPtToFloatPt(currentVox);
        vec3 currentVoxMax = currentVoxMin + vec3(voxWidth);
        if(currentVox.x < 0 || currentVox.y < 0 || currentVox.z < 0 || currentVox.x > 127 || currentVox.y > 127 || currentVox.z > 127){
            // move inside the bounds 
            vec2 bbInt = rayIntersectBounds(rayOrigin, rayDir);
            if(bbInt.x == -1.0){
                return vec3(-2.0);
            }
            float minT = bbInt.x;
            if(minT >= bbInt.y){ return vec3(-2.0); }

            rayOrigin += rayDir * minT;
            currentVox = floatPtToVoxPt(rayOrigin);
            currentVox = clamp(currentVox, 0, 127);
            currentVoxMin = voxPtToFloatPt(currentVox);
            currentVoxMax = currentVoxMin + vec3(voxWidth);
        }
        for(int step = 0; step < 100; step++){
            // check we're still in bounds 
            if(currentVox.x < 0 || currentVox.y < 0 || currentVox.z < 0 || currentVox.x > 127 || currentVox.y > 127 || currentVox.z > 127){
                return vec3(-2.0);
            }
            // else check value 
            uint quadrantVal = getOctantValue(dataTex, currentVox, dirXPos ? 1 : -1, dirYPos ? 1 : -1, dirZPos ? 1 : -1);
            if(quadrantVal != 0u){
                float baseOffset = (float(quadrantVal) - 1.0) * voxWidth;
                float targetX = dirXPos ? currentVoxMax.x + baseOffset : currentVoxMin.x - baseOffset;
                float targetY = dirYPos ? currentVoxMax.y + baseOffset : currentVoxMin.y - baseOffset;
                float targetZ = dirZPos ? currentVoxMax.z + baseOffset : currentVoxMin.z - baseOffset;

                float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                float zT = (targetZ - rayOrigin.z) * rayDirInv.z;

                rayOrigin += rayDir * min(xT, min(yT, zT));

                ivec3 ivecOffset = ivec3(0);
                ivec3 targetLoc = floatPtToVoxPt(rayOrigin);
                int offset = int(quadrantVal);
                ivec3 boxMin = ivec3(
                    dirXPos ? currentVox.x : currentVox.x - offset + 1,
                    dirYPos ? currentVox.y : currentVox.y - offset + 1,
                    dirZPos ? currentVox.z : currentVox.z - offset + 1
                );
                ivec3 boxMax = boxMin + ivec3(offset);
                targetLoc = clamp(targetLoc, boxMin, boxMax);

                if(xT <= yT && xT <= zT){
                    ivecOffset = ivec3(
                        offset * (dirXPos ? 1 : -1), 
                        targetLoc.y - currentVox.y, 
                        targetLoc.z - currentVox.z
                    );
                } else if(yT <= xT && yT <= zT){
                    ivecOffset = ivec3(
                        targetLoc.x - currentVox.x,
                        offset * (dirYPos ? 1 : -1),
                        targetLoc.z - currentVox.z
                    );
                } else {
                    ivecOffset = ivec3(
                        targetLoc.x - currentVox.x,
                        targetLoc.y - currentVox.y,
                        offset * (dirZPos ? 1 : -1)
                    );
                }
                currentVox += ivecOffset;
                vec3 minMaxOff = vec3(float(ivecOffset.x), float(ivecOffset.y), float(ivecOffset.z)) * voxWidth;
                currentVoxMin += minMaxOff;
                currentVoxMax += minMaxOff;
            } else {
                return 0.5 * currentVoxMin + 0.5 * currentVoxMax;
            }
        }
        return vec3(-2.0);
    }

    vec3 getAccRayCastPt(vec3 rayOrigin, vec3 rayDir){
        return getAccRayCastPt(rayOrigin, rayDir, 300);
    }

    // if rayOrigin lies within a voxel, the ray will travel through that voxel unimpeded regardless of occlusion
    vec3 getAccRayCastPt(vec3 rayOrigin, vec3 rayDir, int maxIter) {
        vec3 rayDirInv = vec3(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
        float voxDenseWidth = 0.001953125; // 2 / 1024
        float voxWidth = voxDenseWidth * 8.0;
        bool dirXPos = rayDir.x > 0.0;
        bool dirYPos = rayDir.y > 0.0;
        bool dirZPos = rayDir.z > 0.0;

        // in dense coordinates
        // The voxel we are about to enter
        ivec3 currentVox = floatPtToDenseVoxPt(rayOrigin);
        vec3 currentVoxMin = denseVoxPtToFloatPt(currentVox);
        vec3 currentVoxMax = currentVoxMin + vec3(voxDenseWidth);
        if(currentVox.x < 0 || currentVox.y < 0 || currentVox.z < 0 || currentVox.x > 1023 || currentVox.y > 1023 || currentVox.z > 1023){
            // we are outside the available area, test with the bounds 
            vec2 bbInt = rayIntersectBounds(rayOrigin, rayDir);
            if(bbInt.x == -1.0){
                return vec3(-2.0);
            }
            float minT = bbInt.x;
            if(minT >= bbInt.y){ return vec3(-2.0); }

            rayOrigin += rayDir * minT;
            currentVox = floatPtToDenseVoxPt(rayOrigin);
            currentVox = clamp(currentVox, 0, 1023);
            currentVoxMin = denseVoxPtToFloatPt(currentVox);
            currentVoxMax = currentVoxMin + vec3(voxDenseWidth);
        }

        // now continue with regularly scheduled program
        for(int step = 0; step < 300; step++){
            // check that we're still in bounds 
            if(step > maxIter){
                return rayOrigin + vec3(5.0);
            }
            if(currentVox.x < 0 || currentVox.y < 0 || currentVox.z < 0 || currentVox.x > 1023 || currentVox.y > 1023 || currentVox.z > 1023){
                return vec3(-2.0);
            }

            bool checkBigX = currentVox.x % 8 == (dirXPos ? 0 : 7);
            bool checkBigY = currentVox.y % 8 == (dirYPos ? 0 : 7);
            bool checkBigZ = currentVox.z % 8 == (dirZPos ? 0 : 7);

            if(checkBigX || checkBigY || checkBigZ){
                // check larger voxel grid
                ivec3 bigVox = ivec3(
                    currentVox.x / 8,
                    currentVox.y / 8,
                    currentVox.z / 8
                );
                uint quadrantVal = getOctantValue(dataTex, bigVox, dirXPos ? 1 : -1, dirYPos ? 1 : -1, dirZPos ? 1 : -1);
                if(quadrantVal != 0u){
                    // if it's zero, continue to dense voxel grid check below
                    vec3 bigVoxMin = voxPtToFloatPt(bigVox);
                    vec3 bigVoxMax = bigVoxMin + vec3(voxWidth);
                    float baseOffset = (float(quadrantVal) - 1.0) * voxWidth;
                    float targetX = dirXPos ? bigVoxMax.x + baseOffset : bigVoxMin.x - baseOffset;
                    float targetY = dirYPos ? bigVoxMax.y + baseOffset : bigVoxMin.y - baseOffset;
                    float targetZ = dirZPos ? bigVoxMax.z + baseOffset : bigVoxMin.z - baseOffset;
                    float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                    float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                    float zT = (targetZ - rayOrigin.z) * rayDirInv.z;
                    
                    ivec3 ivoxOffset = ivec3(0);
                    rayOrigin += rayDir * min(xT, min(yT, zT));
                    ivec3 targetLoc = floatPtToDenseVoxPt(rayOrigin);
                    int offset = int(quadrantVal);

                    ivec3 denseRegionMin = ivec3(
                        dirXPos ? 8 * bigVox.x : 8 * bigVox.x - 8 * (offset - 1),
                        dirYPos ? 8 * bigVox.y : 8 * bigVox.y - 8 * (offset - 1),
                        dirZPos ? 8 * bigVox.z : 8 * bigVox.z - 8 * (offset - 1)
                    );
                    ivec3 denseRegionMax = denseRegionMin + ivec3(8*offset - 1);
                    targetLoc = clamp(targetLoc, denseRegionMin, denseRegionMax);

                    if(xT <= yT && xT <= zT){
                        ivoxOffset = ivec3(
                            (dirXPos ? denseRegionMax.x + 1 : denseRegionMin.x - 1) - currentVox.x,
                            targetLoc.y - currentVox.y,
                            targetLoc.z - currentVox.z
                        );
                    } else if(yT <= xT && yT <= zT){
                        ivoxOffset = ivec3(
                            targetLoc.x - currentVox.x,
                            (dirYPos ? denseRegionMax.y + 1 : denseRegionMin.y - 1) - currentVox.y,
                            targetLoc.z - currentVox.z
                        );
                    } else {
                        ivoxOffset = ivec3(
                            targetLoc.x - currentVox.x,
                            targetLoc.y - currentVox.y,
                            (dirZPos ? denseRegionMax.z + 1 : denseRegionMin.z - 1) - currentVox.z
                        );
                    }
                    currentVox += ivoxOffset;
                    vec3 off = voxDenseWidth * vec3(float(ivoxOffset.x), float(ivoxOffset.y), float(ivoxOffset.z));
                    currentVoxMin += off;
                    currentVoxMax += off;

                    // skip dense voxel check
                    continue;
                }
            }

            // check dense voxel grid
            ivec3 pix = denseVoxToPix(currentVox);
            uvec4 value = texelFetch(denseTex, pix.xy, 0);

            bool empty = false;
            uint shift = uint(pix.z);
            bool skipToNextBlock = false;
            if(pix.z < 64 && value.x == 0u && value.y == 0u || pix.z >= 64 && value.z == 0u && value.w == 0u){
                empty = true;
                skipToNextBlock = true;
            }
            else if(pix.z < 32){
                empty = ((value.x >> shift) & 1u) == 0u;
            } else if(pix.z < 64){
                shift -= 32u;
                empty = ((value.y >> shift) & 1u) == 0u;
            } else if(pix.z < 96) {
                shift -= 64u;
                empty = ((value.z >> shift) & 1u) == 0u;
            } else {
                shift -= 96u;
                empty = ((value.w >> shift) & 1u) == 0u;
            }

            if(!empty){
                // return center of voxel
                return 0.5 * currentVoxMin + 0.5 * currentVoxMax;
            }

            if(skipToNextBlock){
                ivec3 blockMin = ivec3(
                    4 * (currentVox.x / 4),
                    4 * (currentVox.y / 4),
                    4 * (currentVox.z / 4)
                );
                vec3 bigVoxMin = denseVoxPtToFloatPt(blockMin);
                vec3 bigVoxMax = bigVoxMin + vec3(4.0 * voxDenseWidth);
                float targetX = dirXPos ? bigVoxMax.x : bigVoxMin.x;
                float targetY = dirYPos ? bigVoxMax.y : bigVoxMin.y;
                float targetZ = dirZPos ? bigVoxMax.z : bigVoxMin.z;
                float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                float zT = (targetZ - rayOrigin.z) * rayDirInv.z;
                
                ivec3 ivoxOffset = ivec3(0);
                rayOrigin += rayDir * min(xT, min(yT, zT));
                ivec3 targetLoc = floatPtToDenseVoxPt(rayOrigin);
                targetLoc.x = clamp(targetLoc.x, blockMin.x, blockMin.x + 3);
                targetLoc.y = clamp(targetLoc.y, blockMin.y, blockMin.y + 3);
                targetLoc.z = clamp(targetLoc.z, blockMin.z, blockMin.z + 3);
                if(xT <= yT && xT <= zT){
                    ivoxOffset = ivec3(
                        (dirXPos ? blockMin.x + 4 : blockMin.x - 1) - currentVox.x,
                        targetLoc.y - currentVox.y,
                        targetLoc.z - currentVox.z
                    );
                } else if(yT <= xT && yT <= zT){
                    ivoxOffset = ivec3(
                        targetLoc.x - currentVox.x,
                        (dirYPos ? blockMin.y + 4 : blockMin.y - 1) - currentVox.y,
                        targetLoc.z - currentVox.z
                    );
                } else {
                    ivoxOffset = ivec3(
                        targetLoc.x - currentVox.x,
                        targetLoc.y - currentVox.y,
                        (dirZPos ? blockMin.z + 4 : blockMin.z - 1) - currentVox.z
                    );
                }
                currentVox += ivoxOffset;
                vec3 off = voxDenseWidth * vec3(float(ivoxOffset.x), float(ivoxOffset.y), float(ivoxOffset.z));
                currentVoxMin += off;
                currentVoxMax += off;
            } else {
                // go just to the next voxel 
                float targetX = dirXPos ? currentVoxMax.x : currentVoxMin.x;
                float targetY = dirYPos ? currentVoxMax.y : currentVoxMin.y;
                float targetZ = dirZPos ? currentVoxMax.z : currentVoxMin.z;
                float xT = (targetX - rayOrigin.x) * rayDirInv.x;
                float yT = (targetY - rayOrigin.y) * rayDirInv.y;
                float zT = (targetZ - rayOrigin.z) * rayDirInv.z;
                
                ivec3 ivoxOffset = ivec3(0);
                rayOrigin += rayDir * min(xT, min(yT, zT));
                if(xT <= yT && xT <= zT){
                    ivoxOffset = ivec3(dirXPos ? 1 : -1, 0, 0);
                } else if(yT <= xT && yT <= zT){
                    ivoxOffset = ivec3(0, dirYPos ? 1 : -1, 0);
                } else {
                    ivoxOffset = ivec3(0, 0, dirZPos ? 1 : -1);
                }
                currentVox += ivoxOffset;
                vec3 off = voxDenseWidth * vec3(float(ivoxOffset.x), float(ivoxOffset.y), float(ivoxOffset.z));
                currentVoxMin += off;
                currentVoxMax += off;
            }
        }

        return vec3(0.0);
    }
    `;
}