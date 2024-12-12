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
 * Layer perlin noise with progressively smaller attributes (Fractal Perlin Noise)
 * Also reduce detail in steaper areas with gradient descent calculation
 */
let perlins = []
for (let i = 0; i < 10; i++) {
    perlins.push(new PerlinNoise())
}

export function gradiantTrick(gridResolution, size, frequency, layers, redist, perlin) {
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

    return noise;
}
