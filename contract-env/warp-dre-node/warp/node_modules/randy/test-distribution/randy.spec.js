/* -*- js-indent-level: 4; -*- */

/* These tests check that the RNG distribution falls within the
 * expected range.
 *
 * As they are statistical in nature, they are slow to run, and will
 * occasionally FAIL EVEN IF the random number generator works
 * perfectly.  Therefore they are in their own test system instead of
 * in the unit tests. */

if (typeof randy == "undefined") {
    // Predefined in browser mode, so assume nodejs context.
    var randy = require("../lib/randy");
    var assert = require("assert");
}

describe("randy distributions", function () {
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
        assert.ok(randy);
        done();
    });

    it("randInt has even distribution", function (done) {
        this.timeout(10000);
        var h = mkHistogram([0,1,2,3,4,5,6,7,8,9]);
        rep(function () {
            h.insert(randy.randInt(0, 10));
        });
        var dist = function (x) { return 0.1; };
        h.check(dist);
        done();
    });

    it("good.randInt has even distribution", function (done) {
        // Will fail massively if using 32-bit precision.
        this.timeout(10000);
        var h = mkHistogram([
            0x00000000,
            0x20000000,
            0x40000000,
            0x60000000,
            0x80000000
        ]);
        rep(function () {
            h.insert(randy.good.randInt(0, 0xa0000000));
        });
        var dist = function (x) { return 0.2; };
        h.check(dist);
        done();
    });

    it("best.randInt has uniform distribution", function (done) {
        // Will fail massively if using modulo based capping
        this.timeout(10000);
        var h = mkHistogram([
            0x00000000000000,
            0x04000000000000,
            0x08000000000000,
            0x0c000000000000,
            0x10000000000000
        ]);
        rep(function () {
            h.insert(randy.best.randInt(0, 0x14000000000000));
        });
        var dist = function (x) { return 0.2; };
        h.check(dist);
        done();
    });

    it("randInt has even distribution for 34-bit values", function (done) {
        this.timeout(10000);
        var h = mkHistogram([
            0x0000000000,
            0x2000000000,
            0x4000000000,
            0x6000000000,
            0x8000000000
        ]);
        rep(function () {
            h.insert(randy.randInt(0, 0xa000000000));
        });
        var dist = function (x) { return 0.2; };
        h.check(dist);
        done();
    });

    it("random has even distribution", function (done) {
        this.timeout(10000);
        var h = mkHistogram([0.0, 0.2, 0.4, 0.6, 0.8]);
        rep(function () {
            h.insert(randy.random());
        });
        var dist = function (x) { return 0.2; };
        h.check(dist);
        done();
    });

    it("uniform has even distribution", function (done) {
        this.timeout(10000);
        var h = mkHistogram([4.5, 4.6, 4.7, 4.8, 4.9]);
        rep(function () {
            h.insert(randy.uniform(4.5, 5.0));
        });
        var dist = function (x) { return 0.2; };
        h.check(dist);
        done();
    });

    it("choice has even distribution", function (done) {
        this.timeout(10000);
        var h = mkHistogram([1, 2, 3, 4]);
        rep(function () {
            h.insert(randy.choice([1, 2, 3, 4]));
        });
        var dist = function (x) { return 0.25; };
        h.check(dist);
        done();
    });

    it("triangular has triangular distribution", function (done) {
        this.timeout(10000);
        var h = mkHistogram([0, 1, 2, 3, 4]);
        rep(function () {
            h.insert(randy.triangular(0, 5, 2.5));
        });
        var dist = function (x) {
            if (x == 0) return 0.08;
            if (x == 1) return 0.24;
            if (x == 2) return 0.36;
            if (x == 3) return 0.24;
            if (x == 4) return 0.08;
        };
        h.check(dist);
        done();
    });
    
    it("shuffle puts anything anywhere", function (done) {
        // For each item in the original list, check that it has equal
        // chance to end up in each index position after a shuffle.
        this.timeout(10000);
        var list = [1, 2, 3, 4, 5];
        var hs = {};
        for (var i = 0; i < list.length; i++)
            hs[list[i]] = mkHistogram([0, 1, 2, 3, 4]);
        rep(function () {
            var shuffled = randy.shuffle(list);
            for (var i = 0; i < shuffled.length; i++)
                hs[shuffled[i]].insert(i);
        });
        for (var i = 1; i < 6; i++)
            hs[i].check(function (x) { return 0.2; } );
        done();
    });

    it("sample has an even distribution", function (done) {
        this.timeout(10000);
        var list = [1, 2, 3, 4, 5];
        var h = mkHistogram(list);
        rep(function () {
            var samples = randy.sample(list, 3);
            for (var i = 0; i < samples.length; i++)
                h.insert(samples[i]);
        });
        h.check(function (x) { return 0.2; } );
        done();
    });
});
