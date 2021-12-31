async function plotClicked(){
    // scrape info:
    evalFunc = evalEditor.getValue();
    colorFunc = colorEditor.getValue();
    raycast_max_steps = parseFloat(document.getElementById('settings-max-step-count').value);
    denseVoxelInitRandomSamples = parseFloat(document.getElementById('settings-spv').value);
    userSuppliedNormalFunc = normalEditor.getValue();

    pauseClicked();

    for(let i = 0; i < 3; i++){
        const idLetter = i == 0 ? 'f' : (i == 1 ? 'b' : 's');
        const lightPos = document.getElementById(idLetter + 'light-position').value.trim();
        const lightColor = document.getElementById(idLetter + 'light-color').value.trim();
        const lightInt = document.getElementById(idLetter + 'light-intensity').value.trim();
        const posValue = lightPos.substring(1, lightPos.length - 1).split(',').map(x => parseFloat(x.trim()));
        const intValue = lightColor.substring(4, lightColor.length - 1).split(',').map(x => parseFloat(lightInt) * parseFloat(x.trim()));
        if(i == 0){
            lightData.fLightPos = posValue;
            lightData.fLightIntensity = intValue;
        } else if(i == 1){
            lightData.bLightPos = posValue;
            lightData.bLightIntensity = intValue;
        } else if(i == 2){
            lightData.sLightPos = posValue;
            lightData.sLightIntensity = intValue;
        }
    }

    const plotButton = document.getElementById('plot-button');
    plotButton.classList.remove('plot-error');
    clearAnnotations();

    setFragShaders();

    refinementIter = 0;

    currentError = null;
    currentErrorSource = null;

    await initWebGL();

    if(currentError !== null){
        // there was an error
        plotButton.classList.add('plot-error');
        handleError(currentError, currentErrorSource);
        return;
    }

    resumeClicked();

    window.requestAnimationFrame(renderRayCast);
}

function handleError(errorMsg, errorSource){
    // determine line numbers of color input and evaluation input
    const evalStart = errorSource.indexOf(evalEditor.getValue());
    const colorStart = errorSource.indexOf(colorEditor.getValue());
    const normalStart = errorSource.indexOf(normalEditor.getValue());

    // start and end are both inclusive
    const evalLineStart = errorSource.substring(0, evalStart).split('\n').length;
    const evalLineEnd = evalLineStart + evalEditor.getValue().split('\n').length - 1;

    const colorLineStart = errorSource.substring(0, colorStart).split('\n').length;
    const colorLineEnd = colorLineStart + colorEditor.getValue().split('\n').length - 1;

    const normalLineStart = errorSource.substring(0, normalStart).split('\n').length;
    const normalLineEnd = normalLineStart + normalEditor.getValue().split('\n').length - 1;

    const evalAnnotations = [];
    const colorAnnotations = [];
    const normalAnnotations = [];

    for(let line of errorMsg.split('\n')){
        // line is of form "ERROR: 0:40: 'k' : undeclared identifier"
        if(line.indexOf('ERROR') === -1){
            continue;
        }

        // remove "ERROR 0:"
        line = line.substring(9, line.length);
        // get line number 
        const lineNumberStr = line.split(':')[0];
        const lineNumber = parseInt(lineNumberStr);
        const content = line.substring(lineNumberStr.length + 1, line.length);

        // check which editor it is 
        let offendingEditor = null;
        let relativeLineNum = 0;
        if(lineNumber >= evalLineStart && lineNumber <= evalLineEnd){
            offendingEditor = evalEditor;
            relativeLineNum = lineNumber - evalLineStart;
        } else if(lineNumber >= colorLineStart && lineNumber <= colorLineEnd){
            offendingEditor = colorEditor;
            relativeLineNum = lineNumber - colorLineStart;
        } else if(lineNumber >= normalLineStart && lineNumber <= normalLineEnd){
            offendingEditor = normalEditor;
            relativeLineNum = lineNumber - normalLineStart;
        }

        if(!offendingEditor){
            continue;
        }
        let annotationList = null;
        if(offendingEditor == evalEditor){
            annotationList = evalAnnotations;
        } else if(offendingEditor == colorEditor){
            annotationList = colorAnnotations;
        } else if(offendingEditor == normalEditor){
            annotationList = normalAnnotations;
        }
        annotationList.push({
            row: relativeLineNum,
            column: 0,
            text: content,
            type: "error"
        });
    }

    evalEditor.getSession().setAnnotations(evalAnnotations);
    colorEditor.getSession().setAnnotations(colorAnnotations);
    normalEditor.getSession().setAnnotations(normalAnnotations);
}

function clearAnnotations(){
    evalEditor.getSession().setAnnotations([]);
    colorEditor.getSession().setAnnotations([]);
}

function pauseClicked(){
    renderingPaused = true;
}

function resumeClicked(){
    renderingPaused = false;
    window.requestAnimationFrame(renderRayCast);
}

let evalEditor = null;
let colorEditor = null;
let normalEditor = null;

function exampleSelected(){
    const selectionEl = document.getElementById('example-plot-select');
    
    let colorValue = 
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
    let evalValue = '';

    const value = selectionEl.value;
    if(value === 'moms-favorite'){
        evalValue = 
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
        evalValue = 
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
        evalValue = 
`float evaluate(vec3 p){
    return 0.8 - length(p) - 1.0 + abs(p.x) + abs(p.y) + abs(p.z);
}`;
    } else if(value === '2'){
        evalValue = 
`float evaluate(vec3 p){
    return cos(p.x*10.0) + cos(p.y * 10.0) + cos(p.z * 10.0);
}`;
    } else if(value === '3'){
        evalValue = 
`float evaluate(vec3 p){
    float x = p.x;
    float y = p.y;
    float z = p.z;

    return 0.6 - length(p) + 0.1*cos(x*10.0)+0.1*cos(y*10.0)+0.1*cos(z*10.0) + 0.2*cos(9.0 * length(p)) + 0.01*cos(50.0 * length(p)) - abs(0.01/x);
}`;
        colorValue = 
`vec3 getColor(vec3 p, vec3 inDir){
    // the width of a voxel
    float eps = 0.002;
    bool insideSurface = evaluate(p - eps * inDir) < 0.0;

    if(insideSurface && p.x > 0.0){
        // yellow
        return vec3(1.0, 0.9725, 0.4314);
    } else {
        // white 
        return vec3(1.0, 1.0, 1.0);
    }
}`;
    } else if(value === 'multiple-surface'){
        evalValue = 
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
        colorValue = 
`vec3 getColor(vec3 p, vec3 inDir){
    float s1 = evalSurface1(p);
    float s2 = evalSurface2(p);

    if(abs(s1) < abs(s2)){
        return vec3(1.0, 0.0, 0.0);
    }
    return vec3(0.0, 1.0, 0.0);
}`;
    } else if(value === 'thread'){
        evalValue = 
`float evaluate(vec3 p){
    float x = p.x + 0.00001;
    float y = p.y;
    float z = p.z;
    
    // As z -> 0, the surface becomes vanishingly thin. 
    // Until Alan implements double precision arithmetic so 
    // that normal calculations are reliable at sub-voxel levels
    // (and iterative zero-finding methods may be used), we're 
    // going to have to help it out a bit manually.
    
    // (Pro tip: you can implement double precision arithmetic 
    //  yourself if you really need to. The entire contents of
    //  this editor is placed in the GLSL fragment shader, so you 
    //  can write your own helper functions.)
    if(abs(z) < 0.4){
        // 0.002 is about the width of a voxel
        return sqrt(x*x + y*y) - 0.0005;
    }
    
    return sqrt(x*x + y*y) - pow(abs(z), 10.0);
}`;
    } else if(value === 'cylindrical'){
        evalValue = 
`
// This cartesian to cylindrical conversion function is visible
// from the color evaluation function too.
vec3 cylindrical(vec3 p){
    float r = sqrt(p.x*p.x + p.y*p.y);
    float theta = atan(p.y, p.x);
    float z = p.z;
    
    return vec3(r, theta, z);
}

float evaluate(vec3 p){
    vec3 cylinderPt = cylindrical(p);
    float r = cylinderPt.x;
    float theta = cylinderPt.y;
    float z = cylinderPt.z;
    
    float m = 0.6 + 0.3 * sin(theta * 10.0);
    float h = 0.3 * cos(theta * 10.0);
    
    return (r - m)*(r - m) - 3.0 * (0.002 - (z+h)*(z+h)); 
}`;
        colorValue = 
`vec3 getColor(vec3 p, vec3 inDir){
    // color by theta value in cylindrical coordinates
    float theta = cylindrical(p).y;
    return vec3(
        0.5 + 0.5 * cos(theta),
        0.5 + 0.5 * sin(theta),
        1.0
    );
}`;
    } else if(value === 'spherical'){
        evalValue = 
`
// This cartesian to spherical conversion function is visible
// from the color evaluation function too.
vec3 spherical(vec3 p){
    float r = sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
    float theta = atan(p.y, p.x);
    float phi = asin(p.z / r);
    
    return vec3(r, theta, phi);
}

float evaluate(vec3 p){
    vec3 spherePt = spherical(p);
    float r = spherePt.x;
    float theta = spherePt.y;
    float phi = spherePt.z;
    
    // add spike for fun
    vec3 dir = normalize(vec3(1.0));
    float lineDist = distance(
        p,
        dir * dot(p, dir)
    );
    vec3 target = p + dir * (0.01 / lineDist);
    
    return -distance(p, target) + r - (0.6 + 0.1*sin(theta * 5.0)*cos(phi) + 0.1*sin(phi * 10.0)); 
}`;
        colorValue = 
`vec3 getColor(vec3 p, vec3 inDir){
    vec3 dir = normalize(vec3(1.0));
    float lineDist = distance(
        p,
        dir * dot(p, dir)
    );
    
    float v = sqrt(clamp(lineDist, 0.0, 1.0));
    return vec3(1.0, v, v);
}`;
    }

    evalValue = `// A point p lies in the plotted set if evaluate(p) = 0. 
// You write the evaluate function!
// This is GLSL v330. For basic usages, see https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations\n` + evalValue;

    colorEditor.setValue(colorValue, -1);
    evalEditor.setValue(evalValue, -1);
}

function toggleSettings(){
    const settingsDiv = document.getElementById('advanced-settings');
    const button = document.getElementById('advanced-settings-button');
    if(settingsDiv.style.display === 'none'){
        button.innerText = 'Hide advanced settings';
        settingsDiv.style.display = 'block';
    } else {
        button.innerText = 'Show advanced settings';
        settingsDiv.style.display = 'none';
    }
}

function UIInit(){
    colorEditor = ace.edit('color-input');
    evalEditor = ace.edit('evaluation-input');
    normalEditor = ace.edit('normal-override-input');

    const GlslMode = ace.require("ace/mode/glsl").Mode;
    colorEditor.session.setMode(new GlslMode());
    evalEditor.session.setMode(new GlslMode());
    normalEditor.session.setMode(new GlslMode());
}