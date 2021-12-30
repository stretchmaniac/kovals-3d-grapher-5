function plotClicked(){
    // get evaluation function:
    evalFunc = document.getElementById('evaluation-input').value;
    colorFunc = document.getElementById('color-input').value;

    setFragShaders();

    resumeClicked();
    refinementIter = 0;

    initWebGL();
    window.requestAnimationFrame(renderRayCast);
}

function pauseClicked(){
    renderingPaused = true;
}

function resumeClicked(){
    renderingPaused = false;
    window.requestAnimationFrame(renderRayCast);
}

function exampleSelected(){
    const selectionEl = document.getElementById('example-plot-select');
    const evalInput = document.getElementById('evaluation-input');
    const colorInput = document.getElementById('color-input');
    colorInput.value = 
`vec3 getColor(vec3 p, vec3 inDir){
    // the width of a voxel
    float eps = 0.002;
    bool insideSurface = evaluate(p - eps * inDir) < 0.0;

    if(insideSurface){
        // yellow
        return vec3(1.0, 0.9725, 0.4314);
    } else {
        // white 
        return vec3(1.0, 1.0, 1.0);
    }
}`;
    const value = selectionEl.value;
    if(value === 'moms-favorite'){
        evalInput.value = 
`float evaluate(vec3 p){
    float x = 3.0 * p.x;
    float y = 3.0 * p.y;
    float z = 3.0 * p.z;
    p *= 1.05;
    float r = sqrt(x*x + y*y) - sqrt(z*z);
    if(r < 0.05){
        return 1.0;
    }
    float theta = atan(x,y);
    vec3 outer = vec3(x,y,0) / r;
    vec3 target = outer*0.5 + 0.3 * cos(5.0 * theta)*outer + 0.3 * vec3(0.0,0.0,sin(5.0 * theta));
    return distance(p, target) - 0.1;
}`;
    } else if(value === 'menger'){
        evalInput.value = 
`float evaluate(vec3 p){
    float cubeSideLength = 2.0;
    vec3 cubeOrigin = vec3(-1.0);
    if(p.x < -1.0 || p.y < -1.0 || p.z < -1.0 || p.x > 1.0 || p.y > 1.0 || p.z > 1.0){
        return 1.0;
    }
    for(int iter = 0; iter < 5; iter++){
        // find position in cube... 
        int i = int(3.0 * (p.x - cubeOrigin.x) / cubeSideLength);
        int j = int(3.0 * (p.y - cubeOrigin.y) / cubeSideLength);
        int k = int(3.0 * (p.z - cubeOrigin.z) / cubeSideLength);
        if((i == 1 && j == 1) || (i == 1 && k == 1) || (j == 1 && k == 1)){
            return 1.0;
        }

        cubeSideLength /= 3.0;
        cubeOrigin += vec3(float(i), float(j), float(k)) * cubeSideLength;
    }
    return 0.0;
}`;
    } else if(value === '1'){
        evalInput.value = 
`float evaluate(vec3 p){
    return 0.8 - length(p) - 1.0 + abs(p.x) + abs(p.y) + abs(p.z);
}`;
    } else if(value === '2'){
        evalInput.value = 
`float evaluate(vec3 p){
    return cos(p.x*10.0) + cos(p.y * 10.0) + cos(p.z * 10.0);
}`;
    } else if(value === '3'){
        evalInput.value = 
`float evaluate(vec3 p){
    float x = p.x;
    float y = p.y;
    float z = p.z;

    return 0.6 - length(p) + 0.1*cos(x*10.0)+0.1*cos(y*10.0)+0.1*cos(z*10.0) + 0.2*cos(9.0 * length(p)) + 0.01*cos(50.0 * length(p)) - abs(0.01/x);
}`;
    } else if(value === 'multiple-surface'){
        evalInput.value = 
`float evalSurface1(vec3 p){
    float x = p.x;
    float y = p.y;
    float z = p.z;

    return z - 0.2 * cos(x*5.0) - 0.2*cos(y*5.0);
}

float evalSurface2(vec3 p){
    float x = p.x;
    float y = p.y;
    float z = p.z;

    return 0.5 - x*x - z*z;
}

float evaluate(vec3 p){    
    float s1 = evalSurface1(p);
    float s2 = evalSurface2(p);
    if(abs(s1) > abs(s2)){
        return s2;
    }
    return s1;
}`;
        colorInput.value = 
`vec3 getColor(vec3 p, vec3 inDir){
    float s1 = evalSurface1(p);
    float s2 = evalSurface2(p);

    if(abs(s1) < abs(s2)){
        return vec3(1.0, 0.0, 0.0);
    }
    return vec3(0.0, 1.0, 0.0);
}`;
    }
}

function UIInit(){

}