/**
 * mountains.js
 * 
 * @summary Generates mountainous terrain using Fractional Brownian Motion with 
 * Perlin Noise and the Gradiant Method, 
 * as defined by Inigo Quilez in this article: https://iquilezles.org/articles/morenoise/
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm
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
function gradiantTrick(gridResolution, size, frequency, octaves, redist, perlin) {
    // Generate intitial layer of perlin noise
    noise = generatePerlinNoise(gridResolution, size, frequency, octaves, redist, perlin);
    console.log(noise);

    // Grid parameters
    const min = -size/2; // Minimum value for x and z
    const max = size/2;  // Maximum value for x and z
    const step = size / (gridResolution - 1); // Step size for each grid cell

    // For every (z (row) & x(column)) value in noise, draw two triangles
    for (let z = 0; z < gridResolution - 1; z++) {
        // Calculate normalized z coordinates
        const z0 = min + z * step;
        const z1 = z0 + step;
        for (let x = 0; x < gridResolution - 1; x++) {
            // Calculate normalized x coordinates
            const x0 = min + x * step;
            const x1 = x0 + step;

            // Get the y value from the noise array
            const y0 = noise[x][z];
            const y1 = noise[x + 1][z];
            const y2 = noise[x][z + 1];
            const y3 = noise[x + 1][z + 1];

            // Add triangles for the current grid cell
            // Triangle 1: Bottom-left, Bottom-right, Top-left
            addTriangle(x0, y0, z0, x1, y1, z0, x0, y2, z1);

            // Triangle 2: Bottom-right, Top-right, Top-left
            addTriangle(x1, y1, z0, x1, y3, z1, x0, y2, z1);
        }
    }

    // TODO
    // Find gradient at all points using gradient descent
    // Calculate influence of layer based on slope (1 / (1 + k * m)) (k controls pointyness, can use different formulas)

    // Generate second layer of noise and it's gradients
    // Sum gradients with prevous layer's gradients ( keep running sum ) to calculate influence of layer
    // Combine with previous layer 
    // Repeat 

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

