var randy = (function () {
function well1024a (entropy_) {
    var entropy = entropy_ || [];
    var m1 = 3, m2 = 24, m3 = 10;
    var state = [ 0, 0, 0, 0, 0, 0, 0, 0,
                  0, 0, 0, 0, 0, 0, 0, 0,
                  0, 0, 0, 0, 0, 0, 0, 0,
                  0, 0, 0, 0, 0, 0, 0, 0 ];
    var state_i = 0;
    var z0, z1, z2;
    function maToPos (t, v) { return v ^ (v >>> t); }
    function maToNeg (t, v) { return v ^ (v << -t); }
    
    function init (entropy) {
        for (var i = 0; i < state.length; i++)
            state[i] = ~(Math.random() * 4294967296);
        var s_i = 0;
        for (var i = 0; i < entropy.length; i++) {
            state[s_i] = (state[s_i] + Math.floor(entropy[i])) & 0xffffffff;
            s_i = (s_i + 1) & 0x1f;
        }
        for (var i = 0; i < 31; i++)
            getUInt32();
    }

    function getState () {
        return { seed: state.slice(0),
                 idx: state_i };
    }

    function setState (s) {
        if (s.seed.length != 32)
            throw new Error("Seed not 32-length array of 32-bit UINTs");
        if (s.idx < 0 || s.idx > 31 || Math.floor(s.idx) != s.idx)
            throw new Error("Idx out of range [0, 31]");
        for (var i = 0; i < s.seed.length; i++) {
            if (s.seed[i] != s.seed[i] & 0xffffffff)
                throw new Error("Seed not 32-length array of 32-bit UINTs");
        }
        state = s.seed.slice(0);
        state_i = s.idx;
    }
    
    function getUInt32 () {
        z0 = state[(state_i + 31) & 0x1f];
        z1 = state[state_i] ^ maToPos(8, state[(state_i + m1) & 0x1f]);
        z2 = maToNeg(-19, state[(state_i + m2) & 0x1f]) ^ maToNeg(-14, state[(state_i + m3) & 0x1f]);
        state[state_i] = z1 ^ z2;
        state[(state_i + 31) & 0x1f] = maToNeg(-11, z0) ^ maToNeg(-7, z1) ^ maToNeg(-13, z2);
        state_i = (state_i + 31) & 0x1f;
        return state[state_i] + 0x80000000;
    }
    
    init(entropy);
    return { getState: getState,
             setState: setState,
             getUInt32: getUInt32 };
}


    function instantiate (initState) {
        var entropy;
        if (typeof window == "undefined") {
            // NodeJs mode
            var os = require("os");
            var crypto = require("crypto");
            var mu = process.memoryUsage();
            var la = os.loadavg();
            var crb = crypto.randomBytes(4);
            var cryptoRand =
                0x01000000 * crb[0] +
                0x00010000 * crb[1] +
                0x00000100 * crb[2] +
                0x00000001 * crb[3];
            var osUptime = os.uptime ? os.uptime() : 0;
            var processUptime = process.uptime ? process.uptime() : osUptime;
            entropy = [
                cryptoRand,
                (new Date()).getTime(),
                process.pid,
                Math.floor(processUptime * 16777216),
                mu.rss,
                mu.heapTotal,
                mu.heapUsed,
                Math.floor(osUptime * 16777216),
                Math.floor(la[0] * 4294967296),
                Math.floor(la[1] * 4294967296),
                Math.floor(la[2] * 4294967296),
                os.totalmem(),
                os.freemem()
            ];
        } else {
            // Browser mode
            entropy = [
                (new Date()).getTime() % 4294967296,
                window.history.length,
                window.outerHeight,
                window.outerWidth,
                window.screenX,
                window.screenY,
                window.screen.availWidth,
                window.screen.availHeight,
                window.screen.height,
                window.screen.width
            ];
        }

        var generator = well1024a(entropy);
        var instance = attachFunctions(generator);
        instance.instance = instantiate;

        if (initState)
            instance.setState(initState);
        
        return instance;
    }
        
    /* Parameter getUInt32 must be a PRNG returning a random unsigned
     * 32-bit integer. */
    function attachFunctions (generator) {
        var getUInt32 = generator.getUInt32;

        /* Use _randInt32 if max < 2^32, _randInt53 otherwise.  If max
         * is not specified, assume 2^32. */
        function _randInt (max) {
            if (max > 0xffffffff) // false for max=undefined|function
                return _randInt53(max);
            return _randInt32(max);
        }
        _randInt.defaultPrecision = 32;
        
        /* Use 53-bit precision.  If max is not specified, assume 2^53. */
        function _randInt53 (max) {
            var r = getUInt32() + (getUInt32() >>> 11) * 0x100000000;
            if (typeof max === 'undefined')
                return r;
            return r % max;
        }
        _randInt53.defaultPrecision = 53;

        /* Use 32-bit precision.  If max is not specified, assume 2^32. */
        function _randInt32 (max) {
            var r = getUInt32();
            if (typeof max === 'undefined')
                return r;
            return r % max;
        }
        _randInt32.defaultPrecision = 32;

        /* Use as little precision as is needed to generate a
         * completely uniform distribution from the PRNG to the target
         * range.  Can be very slow to execute.  If max is not
         * specified, assume 2^53. */
        function _randIntUniform (max) {
            if (typeof max === 'undefined')
                return _randInt53();
            if (max == 0)
                return 0;
            var log2 = 0;
            var mult = 1;
            while (mult < max) {
                log2 += 1;
                mult *= 2;
            }
            for (var r = max; r >= max; r = getRandBits(log2));
            return r;
        }

        /* Returns a random integer with precision 2^n, where n <= 53. */
        function getRandBits (n) {
            if (n === 0)
                return 0;
            function getBits32 () {
                var r = _randInt32();
                return r >>> (32 - n);
            }
            function getBits53 () {
                var r1 = _randInt32() >>> (53 - n);
                var r2 = _randInt32();
                return r2 + (r1 >>> 11) * 0x100000000;
            }
            if (n > 32)
                return getBits53();
            return getBits32();
        }

        function wrapWithPrecision (baseRandInt) {
            // Smallest float > 0 that we can uniformly generate with
            // the random generator's precision.
            var MIN_FLOAT = 1 / Math.pow(2, baseRandInt.defaultPrecision);

            /* Returns a random integer i, such that min <= i < max.
             *
             * If only one parameter is supplied, it is assumed to be max,
             * and min will be 0.
             *
             * If no parameters are supplied, min is assumed to be 0, and
             * max is assumed to be 2^53.  I.e. bounded by largest
             * possible integer value. */
            function randInt (min, max, step) {
                if (typeof(min) == 'undefined')
                    return baseRandInt();
                if (typeof(max) == 'undefined') {
                    max = min;
                    min = 0;
                }
                if (typeof step === 'undefined') {
                    return min + baseRandInt(max - min);
                }
                var span = Math.ceil((max - min) / step);
                return min + baseRandInt(span) * step;
            }

            /* Returns a random element from the array arr.  If arr is
             * empty, throws an exception. */
            function choice (arr) {
                if (!arr.length)
                    throw "arr not an array of length > 0";
                return arr[baseRandInt(arr.length)];
            }

            /* Returns a shuffled copy of the array arr.  For
             * algorithm details, see shuffleInplace. */
            function shuffle (arr) {
                var arrCopy = arr.slice();
                shuffleInplace(arrCopy);
                return arrCopy;
            }

            /* Shuffle the array arr in place.  Uses the Fisher-Yates
             * shuffle, aka the Knuth shuffle. */
            function shuffleInplace (arr) {
                var j, tmp;
                for (var i = arr.length - 1; i > 0; i--) {
                    j = baseRandInt(i + 1);
                    tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }

            /* Returns an array of length count, containing unique
             * elements chosen from the array population.  Like a
             * raffle draw.
             *
             * Mathematically equivalent to
             * shuffle(population).slice(0, count), but more
             * efficient.  Catches fire if count >
             * population.length. */
            function sample (population, count) {
                var arr = population.slice();
                var j, tmp, ln = arr.length;
                for (var i = ln - 1; i > (ln - count - 1); i--) {
                    j = baseRandInt(i + 1);
                    tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
                return arr.slice(ln - count);
            }
            
            /* Returns a floating point number f such that 0.0 <= f < 1.0 */
            function random () {
                return MIN_FLOAT * baseRandInt();
            }

            /* Returns a floating point number f such that min <= f < max. */
            function uniform (min, max) {
                if (typeof min == 'undefined')
                    min = 0;
                if (typeof max == 'undefined') {
                    max = min;
                    min = 0;
                }
                return min + (random() * (max - min));
            }

            /* The triangular distribution is typically used as a
             * subjective description of a population for which there
             * is only limited sample data, and especially in cases
             * where the relationship between variables is known but
             * data is scarce (possibly because of the high cost of
             * collection). It is based on a knowledge of the minimum
             * and maximum and an "inspired guess" as to the modal
             * value.
             *
             * http://en.wikipedia.org/wiki/Triangular_distribution */
            function triangular (min, max, mode) {
                if (typeof(min) == 'undefined')
                    min = 0;
                if (typeof(max) == 'undefined') {
                    max = min;
                    min = 0;
                }
                if (typeof(mode) == 'undefined')
                    mode = min + (max - min) / 2;
                var u = random();
                if (u < (mode - min) / (max - min)) {
                    return min + Math.sqrt(u * (max - min) * (mode - min));
                } else {
                    return max - Math.sqrt((1 - u) *
                                           (max - min) * (max - mode));
                }
            }

            return {
                'randInt'       : randInt,
                'choice'        : choice,
                'shuffle'       : shuffle,
                'shuffleInplace': shuffleInplace,
                'sample'        : sample,
                'random'        : random,
                'uniform'       : uniform,
                'triangular'    : triangular,
                'getRandBits'   : getRandBits
            };
        }
        
        var fastFuns = wrapWithPrecision(_randInt, 0x100000000);
        var goodFuns = wrapWithPrecision(_randInt53, 0x20000000000000);
        var bestFuns = wrapWithPrecision(_randIntUniform, 0x20000000000000);
        fastFuns.good = goodFuns;
        fastFuns.best = bestFuns;
        fastFuns.getState = generator.getState;
        fastFuns.setState = generator.setState;
        return fastFuns;
    }

    if (typeof module !== "undefined") {
        module.exports = instantiate();
    } else {
        return instantiate();
    }
})();
