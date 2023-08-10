/* -*- js-indent-level: 4; -*- */

if (typeof well1024a == "undefined") {
    // Predefined in browser mode, so assume nodejs context.
    var well1024a = require("../well1024a");
    var assert = require("assert");
}

describe("well1024a", function () {
    function rep (f) {
        for (var i = 0; i < 1000; i++)
            f();
    }

    it("accepts entropy values on instantiation", function (done) {
        well1024a([1, 2, 3]);
        done();
    });

    it("can be instantiated without parameters", function (done) {
        well1024a();
        done();
    });

    it("can be imported by the tests", function (done) {
        assert.ok(well1024a);
        done();
    });

    it("getUInt32() returns numbers in 32-bit range", function (done) {
        var w = well1024a();
        rep(function () {
            assert.ok(w.getUInt32() > 0);
            assert.ok(w.getUInt32() < 0x100000000);
        });
        done();
    });

    it("can save state", function (done) {
        var w = well1024a();
        assert.ok(w.getState());
        done();
    });

    it("can load state", function (done) {
        var w = well1024a();
        w.setState(w.getState());
        done();
    });

    it("respects loaded state", function (done) {
        var w = well1024a();
        var s = w.getState();
        var fasit = [ w.getUInt32(),
                      w.getUInt32(),
                      w.getUInt32() ];
        rep(function () {
            w.setState(s);
            var output = [ w.getUInt32(),
                           w.getUInt32(),
                           w.getUInt32() ];
            assert.deepEqual(fasit, output);
        });
        done();
    });

    it("instances have divergent state", function (done) {
        var w1 = well1024a();
        var w2 = well1024a();
        var w1Values = [];
        var w2Values = [];
        for (var i = 0; i < 10; i++) {
            w1Values.push(w1.getUInt32());
            w2Values.push(w2.getUInt32());
        }
        assert.notDeepEqual(w1Values, w2Values);
        done();
    });
});
