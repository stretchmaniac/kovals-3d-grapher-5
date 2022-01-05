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

// returns (lightIndex, probability of choosing the light), or (-1.0, -1.0) for no lights visible
vec2 getLightChoice(vec3 pt, vec3 normal, int seed){
    float lightRadius = 0.5;
    vec3 fPt = uFrontLightPos + normal * lightRadius;
    vec3 bPt = uBackLightPos + normal * lightRadius;
    vec3 sPt = uSideLightPos + normal * lightRadius;

    float fDot = max(0.05, dot(normalize(fPt - pt), normal));
    float bDot = max(0.05, dot(normalize(bPt - pt), normal));
    float sDot = max(0.05, dot(normalize(sPt - pt), normal));

    float fTotal = dot(uFrontLightIntensity, vec3(1.0)) * fDot;
    float bTotal = dot(uBackLightIntensity, vec3(1.0)) * bDot;
    float sTotal = dot(uSideLightIntensity, vec3(1.0)) * sDot;

    bool fVisible = (fTotal != 0.0);
    bool bVisible = (bTotal != 0.0);
    bool sVisible = (sTotal != 0.0);

    if(!fVisible && !bVisible && !sVisible){
        return vec2(-1.0);
    }

    float visibleIntensity = fTotal + bTotal + sTotal;

    // Let X = C1 + C2 + C3 be the total contribution of the three light sources.
    // Pick one of {C1, C2, C3} with weights w1, w2, w3 (by intensity). 
    // Setting one of these weights (say w3) to zero resets the weights to w1 / (w1 + w2)
    // and w2 / (w1 + w2), respectively.
    
    float rn = rand(float(seed));
    float r = visibleIntensity * rn;

    if(fVisible){
        if(r <= fTotal){
            // we've chosen the front light 
            return vec2(0.0, fTotal / visibleIntensity);
        }
        if(bVisible && r <= fTotal + bTotal){
            return vec2(1.0, bTotal / visibleIntensity);
        }
        // only other option is side light
        return vec2(2.0, sTotal / visibleIntensity);
    }
    // front light is not visible 
    if(bVisible && r <= bTotal){
        return vec2(1.0, bTotal / visibleIntensity);
    }
    return vec2(2.0, sTotal / visibleIntensity);
}

vec3 getLightContribution(vec3 pt, vec3 ptRaw, vec3 normal, int seed){
    vec2 lightChoice = getLightChoice(ptRaw, normal, seed++);
    int lightIndex = int(lightChoice.x);
    if(lightIndex == -1){
        return vec3(0.0);
    }
    float lightProbability = lightChoice.y;
    float lightRadius = 0.5;

    vec3 lightPos = sampleSphere(getLightPos(lightIndex), lightRadius, pt, seed++);
    vec3 lightDir = normalize(lightPos - pt);
    bool lightVisible = getAccRayCastPt(pt, lightDir).x == -2.0;
    // use offset to real point for dot product attenuation 
    float dotAtten = max(dot(normalize(lightPos - ptRaw), normal), 0.0);
    float dist = dot(lightPos - ptRaw, lightPos - ptRaw);

    vec3 rad = getLightRadiance(lightIndex);
    float pDistAtten = max(0.0, 1.0 / (lightProbability * dist));

    return lightVisible ?  pDistAtten * dotAtten * rad : vec3(0.0);
}

vec4 getIlluminationRayTrace(vec3 rayOrigin, vec3 normal, vec3 inDir, int seed, bool fast){
    // We're doing diffuse, 3 bounce path tracing with a single light source (sphere)
    // render equation has three terms: cosine term, bsdf term, incoming radius term.
    // L_out(w) = int_v bsdf(v -> w)*L_in(v)*(v.n) dv

    // separate this into light coming from the light sources vs coming from other surfaces:
    // L_out(w) = 
    //    int_{v st line connects light src and point} bsdf(v -> w)L_in(v)*v.n dv +
    //    int_{v st line doesn't connect light source and pt} bsdf(v -> w)L_in(v)*v.n dv
    
    // We integrate these separately through light sampling (the first integral) and sampling the dot product term 
    // (second integral)

    // the first integral, we sample v from points on a light source. With three light sources, the probably distribution 
    // (for importance sampling) is 
    //   P(v \in light1) = intensity_light1 / totalIntensity
    //   P(v \in light2) = intensity_light2 / totalIntensity
    //   P(v \in light3) = intensity_light3 / totalIntensity
    // with uniform distribution inside each light source. Lights pointing away from the normal will have intensity equal to zero.

    // For the second integral, we sample the v.n term

    // in practice, this means we need a path with 2 additional nodes in it
    int totalSampleCount = 8;
    int startSeed = seed * totalSampleCount;        

    float denseVoxWidth = 2.0 / 1024.0;
    float defaultOffset = 4.0 * denseVoxWidth;

    vec3 dir1 = getNewDir(startSeed++, normal);
    vec3 pt1Raw = rayOrigin;
    vec3 pt1 = rayOrigin + normal * defaultOffset;
    vec3 lightContribution1 = getLightContribution(pt1, pt1Raw, normal, startSeed);
    startSeed += 2;
    vec3 neighborContribution1 = vec3(0.0);

    vec3 pt2Raw = getAccRayCastPt(pt1, dir1);
    vec3 pt2 = vec3(pt2Raw.xyz);
    if(pt2.x != -2.0 && !fast){
        vec3 normal2 = getNormal(pt2Raw, pt1, dir1);
        pt2 += normal2 * defaultOffset;
        vec3 dir2 = getNewDir(startSeed++, normal2);
        vec3 lightContribution2 = getLightContribution(pt2, pt2Raw, normal2, startSeed);
        startSeed += 2;
        vec3 neighborContribution2 = vec3(0.0);

        vec3 pt3Raw = getAccRayCastPt(pt2, dir2);
        vec3 pt3 = vec3(pt3Raw.xyz);
        if(pt3.x != -2.0){
            vec3 normal3 = getNormal(pt3Raw, pt2, dir2);
            pt3 += normal3 * defaultOffset;
            vec3 totalRadiance = getLightContribution(pt3, pt3Raw, normal3, startSeed);
            startSeed += 2;

            neighborContribution2 = totalRadiance * getColor(pt3Raw, dir2);
        }

        neighborContribution1 = (lightContribution2 + neighborContribution2) * getColor(pt2Raw, dir1);
    }

    vec3 total = (lightContribution1 + neighborContribution1) * getColor(pt1Raw, inDir);
    return vec4(total, 1.0);
}
`