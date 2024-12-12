/**
 * Generate Perlin Noise using the Improved Perlin Noise Algorithm (2002)
 * As explained by Adrian Biagioli in this blogpost https://adrianb.io/2014/08/09/perlinnoise.html 
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm <gjf9639@rit.edu>
 */

class PerlinNoise {
    constructor() {
        this.permutation = this.generatePermutation();
    }

    // Take a set number of random variables that are a wavelet gradient 
    // of unit length in 3-dimensions & create a randomized permutation table of them
    generatePermutation() {
        const p = new Array(256).fill(0).map((_, i) => i);
        for (let i = p.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        return [...p, ...p]; // Double for overflow handling
    }

    // Create a smoother transition between gradients for each point
    // fade(t) = 6t^5-15t^4+10t^3
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Linear Interpolation:
    // Blends two values (a & b) based on weight t 
    // (with t=0 returning a and t=1 returning b)
    lerp(a, b, t) {
        return a + t * (b - a);
    }

    // Gradient Function:
    // Calculates the dot products of the distance (x & y) 
    // and gradient vectors (determined by the psudo-random hash)
    grad(hash, x, y) {
        const h = hash & 3; // Use only the last 2 bits
        const u = h < 2 ? x : -x;
        const v = h & 1 ? y : -y;
        return u + v;
    }

    // Perlin Noise 
    // Generates noise for a given (x, y) coordinate
    noise(x, y) {
        const X = Math.floor(x) & 255; // Grid cell coordinates
        const Y = Math.floor(y) & 255;

        const xf = x - Math.floor(x); // Local x coordinate in cell
        const yf = y - Math.floor(y); // Local y coordinate in cell

        const u = this.fade(xf);
        const v = this.fade(yf);

        // Hash grid corners
        const a = this.permutation[X + this.permutation[Y]];
        const b = this.permutation[X + this.permutation[Y + 1]];
        const c = this.permutation[X + 1 + this.permutation[Y]];
        const d = this.permutation[X + 1 + this.permutation[Y + 1]];

        // Blend contributions from each corner
        const x1 = this.lerp(this.grad(a, xf, yf), this.grad(c, xf - 1, yf), u);
        const x2 = this.lerp(this.grad(b, xf, yf - 1), this.grad(d, xf - 1, yf - 1), u);

        return (this.lerp(x1, x2, v) + 1) / 2; // Final noise value normalized to [0, 1]
    }
}


/**
 * Generate an elevation for every (x,y) coordinate on the plane
 * @param {Int}             gridResolution   Tesselation of the plane (level of detail)
 * @param {Number}          size             Size of plane to generate
 * @param {Number}          frequency        Frequency of perlin noise. Higher = more peaks
 * @param {Int}             octaves          Adding octaves of perlin noise. Higher = more small hills
 * @param {Number}          redist           Pushes or pulls middle elevations. Lower = more valleys
 * @param {PerlinNoise}     perlin           The permutation table of noise (acts as the 'seed')
 */
function generateNoiseLayer(gridResolution, size, frequency, perlin) {
    // A 2d array to store the perlin noise y values (z values are rows and x values are columns)
    let noise = [];

    // Grid parameters
    const min = -size/2; // Minimum value for x and z
    const max = size/2;  // Maximum value for x and z
    const step = (max - min) / (gridResolution); // Step size for each grid cell

    // Iterate over the grid to generate noise
    for (let z = 0; z < gridResolution; z++) {
        // Calculate normalized z coordinates
        const z0 = min + z * step;
        let noisez = [];
        for (let x = 0; x < gridResolution; x++) {
            // Calculate normalized (x, z) coordinates
            const x0 = min + x * step;

            // Calculate heights (y values) using Perlin noise
            let y0 = perlin.noise(x0 * frequency, z0 * frequency);

            noisez.push(y0);
        }
        // Append a row for each z value
        noise.push(noisez);
    }
    return noise;
}