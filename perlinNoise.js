/**
 * Generate Perlin Noise using the Improved Perlin Noise Algorithm (2002)
 * As explained by Adrian Biagioli in this blogpost https://adrianb.io/2014/08/09/perlinnoise.html 
 * 
 * @author Audrey Fuller <alf9310@rit.edu>
 * @author Gabe Frahm
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

       /*
        const a = this.permutation[X] + this.permutation[Y];
        const b = this.permutation[X] + this.permutation[Y + 1];
        const c = this.permutation[X + 1] + this.permutation[Y];
        const d = this.permutation[X + 1] + this.permutation[Y + 1];
        */

        // Blend contributions from each corner
        const x1 = this.lerp(this.grad(a, xf, yf), this.grad(c, xf - 1, yf), u);
        const x2 = this.lerp(this.grad(b, xf, yf - 1), this.grad(d, xf - 1, yf - 1), u);
        
        //return this.lerp(x1, x2, v); // Final noise value
        return (this.lerp(x1, x2, v) + 1) / 2; // Final noise value normalized to [0, 1]
    }
}


/**
 * Generate an elevation for every (x,y) coordinate on the plane
 * @param {Int}     gridResolution   Tesselation of the plane (level of detail)
 * @param {Number}  size             Size of plane to generate
 * @param {Number}  frequency        Frequency of perlin noise. Higher = more peaks
 * @param {Int}     octaves          Adding octaves of perlin noise. Higher = more small hills
 * @param {Number}  redist           Pushes or pulls middle elevations. Lower = more valleys
 */
function generatePerlinNoise(gridResolution, size, frequency, octaves, redist) {
    // Create an instance of the PerlinNoise class (which creates a new permutation table)
    //const perlin = new PerlinNoise();

    // Grid parameters
    const min = -size/2; // Minimum value for x and z
    const max = size/2;  // Maximum value for x and z
    const step = (max - min) / (gridResolution); // Step size for each grid cell

    // Iterate over the grid to generate triangles
    for (let x = 0; x < gridResolution; x++) {
        // Calculate normalized z coordinates
        const x0 = min + x * step;
        const x1 = x0 + step;
        for (let z = 0; z < gridResolution; z++) {
            // Calculate normalized (x, z) coordinates
            const z0 = min + z * step;
            const z1 = z0 + step;

            // Calculate heights (y values) using Perlin noise
            let y0 = perlin.noise(x0 * frequency, z0 * frequency); // Bottom-left
            let y1 = perlin.noise(x1 * frequency, z0 * frequency); // Bottom-right
            let y2 = perlin.noise(x0 * frequency, z1 * frequency); // Top-left
            let y3 = perlin.noise(x1 * frequency, z1 * frequency); // Top-right

            let amplitudeSum = 0;

            // TODO: current octave implementation is less than ideal since values are correlated. Rework perlin noise to use seeds.
            for(let oct = octaves; oct > 1; oct--) {
                y0 += 1/oct * perlin.noise(x0 * frequency * oct, z0 * frequency * oct);
                y1 += 1/oct * perlin.noise(x1 * frequency * oct, z0 * frequency * oct);
                y2 += 1/oct * perlin.noise(x0 * frequency * oct, z1 * frequency * oct);
                y3 += 1/oct * perlin.noise(x1 * frequency * oct, z1 * frequency * oct);

                amplitudeSum += 1/oct;
            };
            // keep y values in bounds
            y0 /= amplitudeSum;
            y1 /= amplitudeSum;
            y2 /= amplitudeSum;
            y3 /= amplitudeSum;
            
            // redistribution
            y0 **= redist;
            y1 **= redist;
            y2 **= redist;
            y3 **= redist;

            // more bounds stuff (keeping below .5)
            y0 *= 0.5;
            y1 *= 0.5;
            y2 *= 0.5;
            y3 *= 0.5;

            // correct bounds from [0, 1] to [-1, 1]
            y0 = y0 * 2 - 1;
            y1 = y1 * 2 - 1;
            y2 = y2 * 2 - 1;
            y3 = y3 * 2 - 1;

            // Add triangles for the current grid cell
            // Triangle 1: Bottom-left, Bottom-right, Top-left
            addTriangle(x0, y0, z0, x1, y1, z0, x0, y2, z1);

            // Triangle 2: Bottom-right, Top-right, Top-left
            addTriangle(x1, y1, z0, x1, y3, z1, x0, y2, z1);
        }
    }

    // Polynomial tile function (Noise function): 
    // N(x,z) = fᵢⱼ(x,z) (i,j)=[x,z]
    // fᵢⱼ(x,z) =   aᵢⱼ + 
    //              (bᵢⱼ-aᵢⱼ) * S(x-i) + 
    //              (cᵢⱼ-aᵢⱼ) * S(z-j) +
    //              (aᵢⱼ-bᵢⱼ-cᵢⱼ+dᵢⱼ) * S(z-j) * S(z-j)
    // Smoothstep function:
    // S(λ) = 3λ² - 2λ³
    // a, b, c & d is the y value at each corner
    // Ensures connectivity (bᵢ-₁,ⱼ = cᵢ,ⱼ-₁ = dᵢ-₁,ⱼ-₁ = aᵢ,ⱼ)
    // Also forces edges to be smooth (same dirivatives)

    // Hash x,y,z into a table index to access the table
    // Evaluate a wavelet with a randomized gradient at each point:
    //  Get the distance from the current location to each grid coordinate of the cell it’s in
    //  Calculate the dot products of the distance and gradient vectors
    //  Interpolate (blend) the dot products using a function
    //  that has a zero first derivative and possibly second derivative at both endpoints.
}