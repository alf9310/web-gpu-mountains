/**
 * mountains.js
 * 
 * @summary Generates mountainous terrain using Fractional Brownian Motion with 
 * Perlin Noise and the Gradiant Method, 
 * as defined by Inigo Quilez in this article: https://iquilezles.org/articles/morenoise/
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm <gjf9639@rit.edu>
 */

/**
 * Calculate the gradient descent of a (x, y) position on our generated perlin noise 
 * Use the derivative of the x and Y vector with either 
 * finite difference approximation or anilitical equation (generally quicker)
 */
function gradiantDescent () {

}

/**
 * Layer perlin noise with progressively smaller attributes (Fractal Perlin Noise)
 * Also reduce detail in steaper areas with gradient descent calculation
 */
let perlins = []
for (let i = 0; i < 10; i++) {
    perlins.push(new PerlinNoise())
}

function gradiantTrick(gridResolution, size, frequency, layers, redist, perlin) {
    // Grid parameters
    //const min = -size/2; // Minimum value for x and z
    //const max = size/2;  // Maximum value for x and z
    const step = size / (gridResolution - 1); // Step size for each grid cell

    // initial constant noise layer
    let noise = generateNoiseLayer(gridResolution, size, frequency, perlin)
    

    const freqStep = 1.3
    // add additional layers
    let ampSum = 1

    for (let l = 1; l < layers; l++) {
        // generate new layer
        //let randPerlin = new PerlinNoise()
        let randPerlin = perlins[l]
        let newLayer = generateNoiseLayer(gridResolution, size, frequency*l, randPerlin)

        // combine with base layer
        let amp = 1/l
        for (let r = 0; r < noise.length; r++) {
            for (let c = 0; c < noise[r].length; c++) {
                let xderiv, zderiv
                if (r != noise.length-1 ) {
                    zderiv = Math.abs(noise[r][c] - noise[r+1][c])/step
                } else { zderiv = 1 /* TODO */}
                if (c != noise.length[r]-1 ) {
                    xderiv = Math.abs(noise[r][c] - noise[r][c+1])/step
                } else { xderiv = 1 /* TODO */}

                let gradient = (xderiv + zderiv) / 2
                let modifier = (1/(1 + gradient))
                if (gradient = 1) {modifier = 1}
                
                noise[r][c] += amp * newLayer[r][c] * modifier
            }
        }
        ampSum += amp
    }

    let min = noise[0][0]
    let max = noise[0][0]
    for (let r = 0; r < noise.length; r++) {
        for (let c = 0; c < noise[r].length; c++) {
            // divide by amplitude sum to keep y values in bounds
            noise[r][c] /= (ampSum * .5)

            // redistribution
            noise[r][c] **= redist

            if (noise[r][c] < min) {min = noise[r][c]}
            if (noise[r][c] > max) {max = noise[r][c]}

            // correct bounds from [0, 1] to [-1, 1]
            noise[r][c] *= 0.5; // (keeping below .5)
            noise[r][c] = noise[r][c] * 2 - 1
        }
    }
    console.log(max)

    /*
    // min-max normalize 
    for (let r = 0; r < noise.length; r++) {
        for (let c = 0; c < noise[r].length; c++) {
            noise[r][c] = ((noise[r][c] - min) * (max - min))
            //console.log(noise[r][c])
        }
    }
        */


    return noise;
}
    // NOISE TO TRIS
    // For every (z (row) & x(column)) value in noise, draw two triangles
    /*
    for (let z = 0; z < gridResolution - 1; z++) {
        // Calculate normalized z coordinates
        const z0 = min + z * step;
        const z1 = z0 + step;
        for (let x = 0; x < gridResolution - 1; x++) {
            // Calculate normalized x coordinates
            const x0 = min + x * step;
            const x1 = x0 + step;

            // Get the y value from the noise array
            const y0 = noise[x    ][z    ];
            const y1 = noise[x + 1][z    ];
            const y2 = noise[x    ][z + 1];
            const y3 = noise[x + 1][z + 1];

            // Add triangles for the current grid cell
            // Triangle 1: Bottom-left, Bottom-right, Top-left
            addTriangle(x0, y0, z0, x1, y1, z0, x0, y2, z1);

            // Triangle 2: Bottom-right, Top-right, Top-left
            addTriangle(x1, y1, z0, x1, y3, z1, x0, y2, z1);
        }
    }
        */

    // TODO
    // Find gradient at all points using gradient descent
    // Calculate influence of layer based on slope (1 / (1 + k * m)) (k controls pointyness, can use different formulas)

    // Generate second layer of noise and it's gradients
    // Sum gradients with prevous layer's gradients ( keep running sum ) to calculate influence of layer
    // Combine with previous layer 
    // Repeat 

function layerToTris(layer) {
    // Grid parameters
    const min = -1/2; // Minimum value for x and z
    const max = 1/2;  // Maximum value for x and z
    const step = 1 / (layer.length - 1); // Step size for each grid cell

    for (let z = 0; z < layer.length - 1; z++) {
        // Calculate normalized z coordinates
        const z0 = min + z * step;
        const z1 = z0 + step;
        for (let x = 0; x < layer.length - 1; x++) {
            // Calculate normalized x coordinates
            const x0 = min + x * step;
            const x1 = x0 + step;

            // Get the y value from the noise array
            const y0 = layer[x    ][z    ];
            const y1 = layer[x + 1][z    ];
            const y2 = layer[x    ][z + 1];
            const y3 = layer[x + 1][z + 1];

            // Add triangles for the current grid cell
            // Triangle 1: Bottom-left, Bottom-right, Top-left
            addTriangle(x0, y0, z0, x1, y1, z0, x0, y2, z1);

            // Triangle 2: Bottom-right, Top-right, Top-left
            addTriangle(x1, y1, z0, x1, y3, z1, x0, y2, z1);
        }
    }
}

function radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

/**
 * Adds a triangle to the scene in a clockwise order
 * @param {*} x0 
 * @param {*} y0 
 * @param {*} z0 
 * @param {*} x1 
 * @param {*} y1 
 * @param {*} z1 
 * @param {*} x2 
 * @param {*} y2 
 * @param {*} z2 
 */
function addTriangle (x0,y0,z0,x1,y1,z1,x2,y2,z2) {
    var nverts = points.length / 3;
    
    // push first vertex
    points.push(x0);  bary.push (1.0);
    points.push(y0);  bary.push (0.0);
    points.push(z0);  bary.push (0.0);
    indices.push(nverts);
    nverts++;
    
    // push second vertex
    points.push(x1); bary.push (0.0);
    points.push(y1); bary.push (1.0);
    points.push(z1); bary.push (0.0);
    indices.push(nverts);
    nverts++
    
    // push third vertex
    points.push(x2); bary.push (0.0);
    points.push(y2); bary.push (0.0);
    points.push(z2); bary.push (1.0);
    indices.push(nverts);
    nverts++;
}

