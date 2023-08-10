/* -*- js-indent-level: 4; -*- */

/* These tests check that the RNG distribution falls within the
 * expected range.
 *
 * As they are statistical in nature, they are slow to run, and will
 * occasionally FAIL EVEN IF the random number generator works
 * perfectly.  Therefore they are in their own test system instead of
 * in the unit tests. */

if (typeof well1024a == "undefined") {
    // Predefined in browser mode, so assume nodejs context.
    var well1024a = require("../well1024a");
    var assert = require("assert");
}

describe("well1024a distributions", function () {
    function mkHistogram (bucketsMins) {
        var buckets = [];
        for (var i = 0; i < bucketsMins.length; i++)
            buckets.push({x: bucketsMins[i], n: 0});
        
        function insert (val) {
            for (var i = buckets.length - 1; i >= 0; i--) {
                if (buckets[i].x <= val) {
                    buckets[i].n += 1;
                    return;
                }
            }
        }

        // Use to get a visual representation of distribution if there
        // are problems.
        function log () {
            var max = 0;
            var sum = 0;
            var labelWidth = buckets[buckets.length - 1].x.toString().length;
            for (var i = 0; i < buckets.length; i++) {
                if (buckets[i].n > max)
                    max = buckets[i].n;
                sum += buckets[i].n;
            }
            var barWidth = 75 - labelWidth;
            console.log();
            for (var i = 0; i < buckets.length; i++) {
                var label = buckets[i].x.toString();
                while (label.length < labelWidth)
                    label = " " + label;
                var w = Math.floor(barWidth * (buckets[i].n / max));
                var bar = "";
                for (var j = 0; j < w; j++)
                    bar += "#";
                console.log(label + ": " + bar);
            }
            for (var i = 0; i < buckets.length; i++) {
                var label = buckets[i].x.toString();
                while (label.length < labelWidth)
                    label = " " + label;
                console.log(label + ": " + buckets[i].n / sum);
            }
        }

        // distFun(x) - how many values should bucket at x ideally
        // have, given as a scalar of the sum of all buckets.
        function check (distFun) {
            var sum = 0;
            for (var i = 0; i < buckets.length; i++)
                sum += buckets[i].n;
            for (var i = 0; i < buckets.length; i++) {
                var x = buckets[i].x;
                var expected = distFun(x) * sum;
                var tolerance = expected * 0.01;
                var loThreshold = expected - tolerance;
                var hiThreshold = expected + tolerance;
                assert.ok(loThreshold < buckets[i].n);
                assert.ok(buckets[i].n < hiThreshold);
            }
        }

        return {
            insert: insert,
            check: check,
            log: log
        };
    }

    function rep (f) {
        for (var i = 0; i < 1000 * 1000 * 10; i++)
            f();
    };

    it("can be imported by the tests", function (done) {
        assert.ok(well1024a);
        done();
    });

    it("getUInt32 has even distribution", function (done) {
        this.timeout(10000);
        var w = well1024a();
        var h = mkHistogram([
            0x00000000,
            0x20000000,
            0x40000000,
            0x60000000,
            0x80000000,
            0xa0000000,
            0xc0000000,
            0xe0000000
        ]);
        rep(function () {
            h.insert(w.getUInt32());
        });
        var dist = function (x) { return 1.0 / 8; };
        h.check(dist);
        done();
    });
});
