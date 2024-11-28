/**
 * mountains.js
 * 
 * @summary Generates mountainous terrain using Fractional Perlin Noise and the Gradiant Method, 
 * as defined by Inigo Quilez in this article: https://iquilezles.org/articles/morenoise/
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm
 */

/**
 * Generate an elevation for every (x,y) coordinate on the plane
 */
function perlinNoise () {

}

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
function gradiantTrick () {
    // Generate intitial layer of perlin noise

    // Find gradient at all points using gradient descent
    // Calculate influence of layer based on slope (1 / (1 + k * m)) (k controls pointyness, can use different formulas)

    // Generate second layer of noise and it's gradients
    // Sum gradients with prevous layer's gradients ( keep running sum ) to calculate influence of layer
    // Combine with previous layer 
    // Repeat 

    makeCube(3);

}

/**
 * Creates the triangles for a cube with dimensions 0.5 x 0.5 x 0.5 on each side 
 * (and the origin in the center of the cube)
 * @param {Integer} subdivisions Number of subdivisions along each cube face
 */
function makeCube (subdivisions)  {
    var size = 0.5;
    // For each face of the cube, tessellate 
    // Front face
    makeFace(subdivisions, size, 'z', -size / 2);
    // Back face
    makeFace(subdivisions, size, 'z', size / 2);
    // Right face
    makeFace(subdivisions, size, 'x', size / 2);
    // Left face
    makeFace(subdivisions, size, 'x', -size / 2);
    // Top face
    makeFace(subdivisions, size, 'y', size / 2);
    // Bottom face
    makeFace(subdivisions, size, 'y', -size / 2);
}


/**
 * Helper function for makeCube() to tessellate a single face
 * @param {Integer} subdivisions Number of subdivisions along each cube face
 * @param {Float}   size    Diamater of the cube 
 * @param {String}  axis    What plane the face is on ('x', 'y' or 'z')
 * @param {Float}   value   The fixed value of the plane (can be + or -) 
 */
function makeFace(subdivisions, size, axis, value){
    // Subdivide face into smaller equal-sized squares based on subdivisions
    for (let y = 0; y < subdivisions; y++) {
        let pointY1 = -(size / 2) + (y / subdivisions) * size;
        let pointY2 = -(size / 2) + ((y + 1) / subdivisions) * size;
        for (let x = 0; x < subdivisions; x++) {
            let pointX1 = -(size / 2) + (x / subdivisions) * size;
            let pointX2 = -(size / 2) + ((x + 1) / subdivisions) * size;

            // Split each resulting square into two triangles
            // Modify points depending on face (axis and value)
            // Needs a conditional for each face to keep them in the clockwise order
            // (There's probably a more efficient way to do this...)
            if (axis === 'z') { // Front or Back face
                if (value < 0) { // Front face
                    addTriangle(pointX1, pointY1, value,
                                pointX2, pointY1, value,
                                pointX2, pointY2, value);
                    addTriangle(pointX2, pointY2, value,
                                pointX1, pointY2, value,
                                pointX1, pointY1, value);
                } else { // Back face
                    addTriangle(pointX1, pointY1, value,
                                pointX1, pointY2, value,
                                pointX2, pointY2, value);
                    addTriangle(pointX2, pointY2, value,
                                pointX2, pointY1, value,
                                pointX1, pointY1, value);
                }
            } else if (axis === 'x') { // Right or Left face
                if (value > 0) { // Right face
                    addTriangle(value, pointY1, pointX1,
                                value, pointY1, pointX2,
                                value, pointY2, pointX2);
                    addTriangle(value, pointY2, pointX2,
                                value, pointY2, pointX1,
                                value, pointY1, pointX1);
                } else { // Left face
                    addTriangle(value, pointY1, pointX1,
                                value, pointY2, pointX1,
                                value, pointY2, pointX2);
                    addTriangle(value, pointY2, pointX2,
                                value, pointY1, pointX2,
                                value, pointY1, pointX1);
                }
            } else if (axis === 'y') { // Top or Bottom face
                if (value > 0) { // Top face
                    addTriangle(pointX1, value, pointY1,
                                pointX2, value, pointY1,
                                pointX2, value, pointY2);
                    addTriangle(pointX2, value, pointY2,
                                pointX1, value, pointY2,
                                pointX1, value, pointY1);
                } else { // Bottom face
                    addTriangle(pointX1, value, pointY1,
                                pointX1, value, pointY2,
                                pointX2, value, pointY2);
                    addTriangle(pointX2, value, pointY2,
                                pointX2, value, pointY1,
                                pointX1, value, pointY1);
                }
            }
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

