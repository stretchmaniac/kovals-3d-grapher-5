raytrace_src_diffuse = `
vec3 getNewDir(int seed, vec3 normal){
    vec3 dir1B = lowDiscrepancyHalfSphereCosineBiased(seed);
    vec3 b11 = getPerp(normal);
    vec3 b12 = cross(normal, b11);
    return b11 * dir1B.x + b12 * dir1B.y + normal * dir1B.z;
}

vec3 sampleSphere(vec3 center, float radius, vec3 viewOrigin, int seed){
    vec3 dir = normalize(center - viewOrigin);
    vec3 basis1 = getPerp(dir);
    vec3 basis2 = cross(dir, basis1);
    float r = sqrt(rand(float(seed)));
    float theta = 3.141592654 * 2.0 * rand(float(seed) * 0.18943689);
    return center + basis1 * r * cos(theta) + basis2 * r * sin(theta);
}

vec3 getLightPos(int index){
    return index == 0 ? uFrontLightPos : 
        (index == 1 ? uBackLightPos : uSideLightPos);
}

vec3 getLightRadiance(int index){
    return index == 0 ? uFrontLightIntensity : 
        (index == 1 ? uBackLightIntensity : uSideLightIntensity);
}

int getRandZeroOneTwo(int seed){
    return int(floor(rand(sin(float(seed) * 0.97634578624)) * 3.0));
}

vec4 getIlluminationRayTrace(vec3 rayOrigin, vec3 normal, int seed){
    int numSamples = 1;
    vec3 total = vec3(0.0);
    for(int nSample = 0; nSample < numSamples; nSample++){
        // We're doing diffuse, 3 bounce path tracing with a single light source (sphere)
        // render equation has three terms: cosine term, bsdf term, incoming radius term.
        // L_out(w) = int_v bsdf(v -> w)*L_in(v)*(v.n) dv

        // separate this into light coming from the light sources vs coming from other surfaces:
        // L_out(w) = 
        //    int_{v st line connects light src and point} bsdf(v -> w)L_in(v)*v.n dv +
        //    int_{v st line doesn't connect light source and pt} bsdf(v -> w)L_in(v)*v.n dv
        
        // We integrate these separately through light sampling (the first integral) and sampling the dot product term 
        // (second integral)

        // in practice, this means we need a path with 2 additional nodes in it
        int totalSampleCount = 8;
        int startSeed = seed * totalSampleCount;

        vec3 lightPos = uCamLocation + vec3(4.0, 0.0, 0.0);
        vec3 lightRadiance = vec3(5.0, 10.0, 15.0) * 100.0;
        float lightRadius = 0.5;

        float denseVoxWidth = 2.0 / 1024.0;
        float defaultOffset = 12.0 * denseVoxWidth;

        vec3 dir1 = getNewDir(startSeed++, normal);
        vec3 pt1 = rayOrigin + normal * defaultOffset;
        int lightIndex1 = getRandZeroOneTwo(startSeed++);
        vec3 lightPos1 = sampleSphere(getLightPos(lightIndex1), lightRadius, pt1, startSeed++);
        vec3 offset1 = lightPos1 - pt1;
        vec3 lightDir1 = normalize(offset1);
        bool lightVisible1 = dot(lightDir1, normal) > 0.0 && getAccRayCastPt(pt1, lightDir1).x == -2.0;
        vec3 lightContribution1 = lightVisible1 ? 
            dot(lightDir1, normal) * vec3(getLightRadiance(lightIndex1)) / dot(offset1, offset1)
            : vec3(0.0);
        vec3 neighborContribution1 = vec3(0.0);

        vec3 pt2 = getAccRayCastPtRough(pt1, dir1);
        if(pt2.x != -2.0){
            vec3 normal2 = getNormal(pt2, dir1);
            pt2 += normal2 * defaultOffset;
            vec3 dir2 = getNewDir(startSeed++, normal2);
            int lightIndex2 = getRandZeroOneTwo(startSeed++);
            vec3 lightPos2 = sampleSphere(getLightPos(lightIndex2), lightRadius, pt2, startSeed++);
            vec3 offset2 = lightPos2 - pt2;
            vec3 lightDir2 = normalize(offset2);
            bool lightVisible2 = dot(lightDir2, normal) > 0.0 && getAccRayCastPtRough(pt2, lightDir2).x == -2.0;
            vec3 lightContribution2 = lightVisible2 ? 
                dot(lightDir2, normal2) * vec3(getLightRadiance(lightIndex2)) / dot(offset2, offset2) 
                : vec3(0.0);
            vec3 neighborContribution2 = vec3(0.0);

            vec3 pt3 = getAccRayCastPtRough(pt2, dir2);
            if(pt3.x != -2.0){
                vec3 normal3 = getNormal(pt3, dir2);
                pt3 += normal3 * defaultOffset;
                int lightIndex3 = getRandZeroOneTwo(startSeed++);
                vec3 lightPos3 = sampleSphere(getLightPos(lightIndex3), lightRadius, pt3, startSeed++);
                vec3 offset3 = lightPos3 - pt3;
                vec3 lightDir3 = normalize(offset3);
                bool lightVisible3 = dot(lightDir3, normal3) > 0.0 && getAccRayCastPtRough(pt3, lightDir3).x == -2.0;
                vec3 totalRadiance = lightVisible3 ? 
                    dot(lightDir3, normal3) * vec3(getLightRadiance(lightIndex3)) / dot(offset3, offset3) 
                    : vec3(0.0);

                neighborContribution2 = totalRadiance * getColor(pt3);
            }

            neighborContribution1 = (lightContribution2 + neighborContribution2) * getColor(pt2);
        }
        total += (lightContribution1 + neighborContribution1) * getColor(pt1);
    }
    total /= float(numSamples);
    return vec4(total, 1.0);
}
`