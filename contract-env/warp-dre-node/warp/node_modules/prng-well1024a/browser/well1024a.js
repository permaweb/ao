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
