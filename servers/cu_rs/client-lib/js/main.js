var qt = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function ir(o) {
  return o && o.__esModule && Object.prototype.hasOwnProperty.call(o, "default") ? o.default : o;
}
var Oe = {}, zt = {}, ce = {}, ke = { exports: {} };
(function(o) {
  (function(a) {
    var f, p = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i, m = Math.ceil, E = Math.floor, l = "[BigNumber Error] ", c = l + "Number primitive has more than 15 significant digits: ", b = 1e14, S = 14, d = 9007199254740991, $ = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13], F = 1e7, C = 1e9;
    function K(O) {
      var P, q, J, M = N.prototype = { constructor: N, toString: null, valueOf: null }, rt = new N(1), et = 20, nt = 4, ht = -7, dt = 21, mt = -1e7, yt = 1e7, Bt = !1, It = 1, bt = 0, ut = {
        prefix: "",
        groupSize: 3,
        secondaryGroupSize: 0,
        groupSeparator: ",",
        decimalSeparator: ".",
        fractionGroupSize: 0,
        fractionGroupSeparator: " ",
        // non-breaking space
        suffix: ""
      }, ft = "0123456789abcdefghijklmnopqrstuvwxyz", Ot = !0;
      function N(h, g) {
        var y, v, A, I, L, B, x, R, U = this;
        if (!(U instanceof N))
          return new N(h, g);
        if (g == null) {
          if (h && h._isBigNumber === !0) {
            U.s = h.s, !h.c || h.e > yt ? U.c = U.e = null : h.e < mt ? U.c = [U.e = 0] : (U.e = h.e, U.c = h.c.slice());
            return;
          }
          if ((B = typeof h == "number") && h * 0 == 0) {
            if (U.s = 1 / h < 0 ? (h = -h, -1) : 1, h === ~~h) {
              for (I = 0, L = h; L >= 10; L /= 10, I++)
                ;
              I > yt ? U.c = U.e = null : (U.e = I, U.c = [h]);
              return;
            }
            R = String(h);
          } else {
            if (!p.test(R = String(h)))
              return J(U, R, B);
            U.s = R.charCodeAt(0) == 45 ? (R = R.slice(1), -1) : 1;
          }
          (I = R.indexOf(".")) > -1 && (R = R.replace(".", "")), (L = R.search(/e/i)) > 0 ? (I < 0 && (I = L), I += +R.slice(L + 1), R = R.substring(0, L)) : I < 0 && (I = R.length);
        } else {
          if (Y(g, 2, ft.length, "Base"), g == 10 && Ot)
            return U = new N(h), lt(U, et + U.e + 1, nt);
          if (R = String(h), B = typeof h == "number") {
            if (h * 0 != 0)
              return J(U, R, B, g);
            if (U.s = 1 / h < 0 ? (R = R.slice(1), -1) : 1, N.DEBUG && R.replace(/^0\.0*|\./, "").length > 15)
              throw Error(c + h);
          } else
            U.s = R.charCodeAt(0) === 45 ? (R = R.slice(1), -1) : 1;
          for (y = ft.slice(0, g), I = L = 0, x = R.length; L < x; L++)
            if (y.indexOf(v = R.charAt(L)) < 0) {
              if (v == ".") {
                if (L > I) {
                  I = x;
                  continue;
                }
              } else if (!A && (R == R.toUpperCase() && (R = R.toLowerCase()) || R == R.toLowerCase() && (R = R.toUpperCase()))) {
                A = !0, L = -1, I = 0;
                continue;
              }
              return J(U, String(h), B, g);
            }
          B = !1, R = q(R, g, 10, U.s), (I = R.indexOf(".")) > -1 ? R = R.replace(".", "") : I = R.length;
        }
        for (L = 0; R.charCodeAt(L) === 48; L++)
          ;
        for (x = R.length; R.charCodeAt(--x) === 48; )
          ;
        if (R = R.slice(L, ++x)) {
          if (x -= L, B && N.DEBUG && x > 15 && (h > d || h !== E(h)))
            throw Error(c + U.s * h);
          if ((I = I - L - 1) > yt)
            U.c = U.e = null;
          else if (I < mt)
            U.c = [U.e = 0];
          else {
            if (U.e = I, U.c = [], L = (I + 1) % S, I < 0 && (L += S), L < x) {
              for (L && U.c.push(+R.slice(0, L)), x -= S; L < x; )
                U.c.push(+R.slice(L, L += S));
              L = S - (R = R.slice(L)).length;
            } else
              L -= x;
            for (; L--; R += "0")
              ;
            U.c.push(+R);
          }
        } else
          U.c = [U.e = 0];
      }
      N.clone = K, N.ROUND_UP = 0, N.ROUND_DOWN = 1, N.ROUND_CEIL = 2, N.ROUND_FLOOR = 3, N.ROUND_HALF_UP = 4, N.ROUND_HALF_DOWN = 5, N.ROUND_HALF_EVEN = 6, N.ROUND_HALF_CEIL = 7, N.ROUND_HALF_FLOOR = 8, N.EUCLID = 9, N.config = N.set = function(h) {
        var g, y;
        if (h != null)
          if (typeof h == "object") {
            if (h.hasOwnProperty(g = "DECIMAL_PLACES") && (y = h[g], Y(y, 0, C, g), et = y), h.hasOwnProperty(g = "ROUNDING_MODE") && (y = h[g], Y(y, 0, 8, g), nt = y), h.hasOwnProperty(g = "EXPONENTIAL_AT") && (y = h[g], y && y.pop ? (Y(y[0], -C, 0, g), Y(y[1], 0, C, g), ht = y[0], dt = y[1]) : (Y(y, -C, C, g), ht = -(dt = y < 0 ? -y : y))), h.hasOwnProperty(g = "RANGE"))
              if (y = h[g], y && y.pop)
                Y(y[0], -C, -1, g), Y(y[1], 1, C, g), mt = y[0], yt = y[1];
              else if (Y(y, -C, C, g), y)
                mt = -(yt = y < 0 ? -y : y);
              else
                throw Error(l + g + " cannot be zero: " + y);
            if (h.hasOwnProperty(g = "CRYPTO"))
              if (y = h[g], y === !!y)
                if (y)
                  if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
                    Bt = y;
                  else
                    throw Bt = !y, Error(l + "crypto unavailable");
                else
                  Bt = y;
              else
                throw Error(l + g + " not true or false: " + y);
            if (h.hasOwnProperty(g = "MODULO_MODE") && (y = h[g], Y(y, 0, 9, g), It = y), h.hasOwnProperty(g = "POW_PRECISION") && (y = h[g], Y(y, 0, C, g), bt = y), h.hasOwnProperty(g = "FORMAT"))
              if (y = h[g], typeof y == "object")
                ut = y;
              else
                throw Error(l + g + " not an object: " + y);
            if (h.hasOwnProperty(g = "ALPHABET"))
              if (y = h[g], typeof y == "string" && !/^.?$|[+\-.\s]|(.).*\1/.test(y))
                Ot = y.slice(0, 10) == "0123456789", ft = y;
              else
                throw Error(l + g + " invalid: " + y);
          } else
            throw Error(l + "Object expected: " + h);
        return {
          DECIMAL_PLACES: et,
          ROUNDING_MODE: nt,
          EXPONENTIAL_AT: [ht, dt],
          RANGE: [mt, yt],
          CRYPTO: Bt,
          MODULO_MODE: It,
          POW_PRECISION: bt,
          FORMAT: ut,
          ALPHABET: ft
        };
      }, N.isBigNumber = function(h) {
        if (!h || h._isBigNumber !== !0)
          return !1;
        if (!N.DEBUG)
          return !0;
        var g, y, v = h.c, A = h.e, I = h.s;
        t:
          if ({}.toString.call(v) == "[object Array]") {
            if ((I === 1 || I === -1) && A >= -C && A <= C && A === E(A)) {
              if (v[0] === 0) {
                if (A === 0 && v.length === 1)
                  return !0;
                break t;
              }
              if (g = (A + 1) % S, g < 1 && (g += S), String(v[0]).length == g) {
                for (g = 0; g < v.length; g++)
                  if (y = v[g], y < 0 || y >= b || y !== E(y))
                    break t;
                if (y !== 0)
                  return !0;
              }
            }
          } else if (v === null && A === null && (I === null || I === 1 || I === -1))
            return !0;
        throw Error(l + "Invalid BigNumber: " + h);
      }, N.maximum = N.max = function() {
        return kt(arguments, -1);
      }, N.minimum = N.min = function() {
        return kt(arguments, 1);
      }, N.random = function() {
        var h = 9007199254740992, g = Math.random() * h & 2097151 ? function() {
          return E(Math.random() * h);
        } : function() {
          return (Math.random() * 1073741824 | 0) * 8388608 + (Math.random() * 8388608 | 0);
        };
        return function(y) {
          var v, A, I, L, B, x = 0, R = [], U = new N(rt);
          if (y == null ? y = et : Y(y, 0, C), L = m(y / S), Bt)
            if (crypto.getRandomValues) {
              for (v = crypto.getRandomValues(new Uint32Array(L *= 2)); x < L; )
                B = v[x] * 131072 + (v[x + 1] >>> 11), B >= 9e15 ? (A = crypto.getRandomValues(new Uint32Array(2)), v[x] = A[0], v[x + 1] = A[1]) : (R.push(B % 1e14), x += 2);
              x = L / 2;
            } else if (crypto.randomBytes) {
              for (v = crypto.randomBytes(L *= 7); x < L; )
                B = (v[x] & 31) * 281474976710656 + v[x + 1] * 1099511627776 + v[x + 2] * 4294967296 + v[x + 3] * 16777216 + (v[x + 4] << 16) + (v[x + 5] << 8) + v[x + 6], B >= 9e15 ? crypto.randomBytes(7).copy(v, x) : (R.push(B % 1e14), x += 7);
              x = L / 7;
            } else
              throw Bt = !1, Error(l + "crypto unavailable");
          if (!Bt)
            for (; x < L; )
              B = g(), B < 9e15 && (R[x++] = B % 1e14);
          for (L = R[--x], y %= S, L && y && (B = $[S - y], R[x] = E(L / B) * B); R[x] === 0; R.pop(), x--)
            ;
          if (x < 0)
            R = [I = 0];
          else {
            for (I = -1; R[0] === 0; R.splice(0, 1), I -= S)
              ;
            for (x = 1, B = R[0]; B >= 10; B /= 10, x++)
              ;
            x < S && (I -= S - x);
          }
          return U.e = I, U.c = R, U;
        };
      }(), N.sum = function() {
        for (var h = 1, g = arguments, y = new N(g[0]); h < g.length; )
          y = y.plus(g[h++]);
        return y;
      }, q = /* @__PURE__ */ function() {
        var h = "0123456789";
        function g(y, v, A, I) {
          for (var L, B = [0], x, R = 0, U = y.length; R < U; ) {
            for (x = B.length; x--; B[x] *= v)
              ;
            for (B[0] += I.indexOf(y.charAt(R++)), L = 0; L < B.length; L++)
              B[L] > A - 1 && (B[L + 1] == null && (B[L + 1] = 0), B[L + 1] += B[L] / A | 0, B[L] %= A);
          }
          return B.reverse();
        }
        return function(y, v, A, I, L) {
          var B, x, R, U, k, W, z, tt, V = y.indexOf("."), st = et, e = nt;
          for (V >= 0 && (U = bt, bt = 0, y = y.replace(".", ""), tt = new N(v), W = tt.pow(y.length - V), bt = U, tt.c = g(
            j(G(W.c), W.e, "0"),
            10,
            A,
            h
          ), tt.e = tt.c.length), z = g(y, v, A, L ? (B = ft, h) : (B = h, ft)), R = U = z.length; z[--U] == 0; z.pop())
            ;
          if (!z[0])
            return B.charAt(0);
          if (V < 0 ? --R : (W.c = z, W.e = R, W.s = I, W = P(W, tt, st, e, A), z = W.c, k = W.r, R = W.e), x = R + st + 1, V = z[x], U = A / 2, k = k || x < 0 || z[x + 1] != null, k = e < 4 ? (V != null || k) && (e == 0 || e == (W.s < 0 ? 3 : 2)) : V > U || V == U && (e == 4 || k || e == 6 && z[x - 1] & 1 || e == (W.s < 0 ? 8 : 7)), x < 1 || !z[0])
            y = k ? j(B.charAt(1), -st, B.charAt(0)) : B.charAt(0);
          else {
            if (z.length = x, k)
              for (--A; ++z[--x] > A; )
                z[x] = 0, x || (++R, z = [1].concat(z));
            for (U = z.length; !z[--U]; )
              ;
            for (V = 0, y = ""; V <= U; y += B.charAt(z[V++]))
              ;
            y = j(y, R, B.charAt(0));
          }
          return y;
        };
      }(), P = /* @__PURE__ */ function() {
        function h(v, A, I) {
          var L, B, x, R, U = 0, k = v.length, W = A % F, z = A / F | 0;
          for (v = v.slice(); k--; )
            x = v[k] % F, R = v[k] / F | 0, L = z * x + R * W, B = W * x + L % F * F + U, U = (B / I | 0) + (L / F | 0) + z * R, v[k] = B % I;
          return U && (v = [U].concat(v)), v;
        }
        function g(v, A, I, L) {
          var B, x;
          if (I != L)
            x = I > L ? 1 : -1;
          else
            for (B = x = 0; B < I; B++)
              if (v[B] != A[B]) {
                x = v[B] > A[B] ? 1 : -1;
                break;
              }
          return x;
        }
        function y(v, A, I, L) {
          for (var B = 0; I--; )
            v[I] -= B, B = v[I] < A[I] ? 1 : 0, v[I] = B * L + v[I] - A[I];
          for (; !v[0] && v.length > 1; v.splice(0, 1))
            ;
        }
        return function(v, A, I, L, B) {
          var x, R, U, k, W, z, tt, V, st, e, i, s, n, t, r, u, w, T = v.s == A.s ? 1 : -1, _ = v.c, H = A.c;
          if (!_ || !_[0] || !H || !H[0])
            return new N(
              // Return NaN if either NaN, or both Infinity or 0.
              !v.s || !A.s || (_ ? H && _[0] == H[0] : !H) ? NaN : (
                // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
                _ && _[0] == 0 || !H ? T * 0 : T / 0
              )
            );
          for (V = new N(T), st = V.c = [], R = v.e - A.e, T = I + R + 1, B || (B = b, R = D(v.e / S) - D(A.e / S), T = T / S | 0), U = 0; H[U] == (_[U] || 0); U++)
            ;
          if (H[U] > (_[U] || 0) && R--, T < 0)
            st.push(1), k = !0;
          else {
            for (t = _.length, u = H.length, U = 0, T += 2, W = E(B / (H[0] + 1)), W > 1 && (H = h(H, W, B), _ = h(_, W, B), u = H.length, t = _.length), n = u, e = _.slice(0, u), i = e.length; i < u; e[i++] = 0)
              ;
            w = H.slice(), w = [0].concat(w), r = H[0], H[1] >= B / 2 && r++;
            do {
              if (W = 0, x = g(H, e, u, i), x < 0) {
                if (s = e[0], u != i && (s = s * B + (e[1] || 0)), W = E(s / r), W > 1)
                  for (W >= B && (W = B - 1), z = h(H, W, B), tt = z.length, i = e.length; g(z, e, tt, i) == 1; )
                    W--, y(z, u < tt ? w : H, tt, B), tt = z.length, x = 1;
                else
                  W == 0 && (x = W = 1), z = H.slice(), tt = z.length;
                if (tt < i && (z = [0].concat(z)), y(e, z, i, B), i = e.length, x == -1)
                  for (; g(H, e, u, i) < 1; )
                    W++, y(e, u < i ? w : H, i, B), i = e.length;
              } else
                x === 0 && (W++, e = [0]);
              st[U++] = W, e[0] ? e[i++] = _[n] || 0 : (e = [_[n]], i = 1);
            } while ((n++ < t || e[0] != null) && T--);
            k = e[0] != null, st[0] || st.splice(0, 1);
          }
          if (B == b) {
            for (U = 1, T = st[0]; T >= 10; T /= 10, U++)
              ;
            lt(V, I + (V.e = U + R * S - 1) + 1, L, k);
          } else
            V.e = R, V.r = +k;
          return V;
        };
      }();
      function gt(h, g, y, v) {
        var A, I, L, B, x;
        if (y == null ? y = nt : Y(y, 0, 8), !h.c)
          return h.toString();
        if (A = h.c[0], L = h.e, g == null)
          x = G(h.c), x = v == 1 || v == 2 && (L <= ht || L >= dt) ? at(x, L) : j(x, L, "0");
        else if (h = lt(new N(h), g, y), I = h.e, x = G(h.c), B = x.length, v == 1 || v == 2 && (g <= I || I <= ht)) {
          for (; B < g; x += "0", B++)
            ;
          x = at(x, I);
        } else if (g -= L, x = j(x, I, "0"), I + 1 > B) {
          if (--g > 0)
            for (x += "."; g--; x += "0")
              ;
        } else if (g += I - B, g > 0)
          for (I + 1 == B && (x += "."); g--; x += "0")
            ;
        return h.s < 0 && A ? "-" + x : x;
      }
      function kt(h, g) {
        for (var y, v, A = 1, I = new N(h[0]); A < h.length; A++)
          v = new N(h[A]), (!v.s || (y = Z(I, v)) === g || y === 0 && I.s === g) && (I = v);
        return I;
      }
      function Rt(h, g, y) {
        for (var v = 1, A = g.length; !g[--A]; g.pop())
          ;
        for (A = g[0]; A >= 10; A /= 10, v++)
          ;
        return (y = v + y * S - 1) > yt ? h.c = h.e = null : y < mt ? h.c = [h.e = 0] : (h.e = y, h.c = g), h;
      }
      J = /* @__PURE__ */ function() {
        var h = /^(-?)0([xbo])(?=\w[\w.]*$)/i, g = /^([^.]+)\.$/, y = /^\.([^.]+)$/, v = /^-?(Infinity|NaN)$/, A = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
        return function(I, L, B, x) {
          var R, U = B ? L : L.replace(A, "");
          if (v.test(U))
            I.s = isNaN(U) ? null : U < 0 ? -1 : 1;
          else {
            if (!B && (U = U.replace(h, function(k, W, z) {
              return R = (z = z.toLowerCase()) == "x" ? 16 : z == "b" ? 2 : 8, !x || x == R ? W : k;
            }), x && (R = x, U = U.replace(g, "$1").replace(y, "0.$1")), L != U))
              return new N(U, R);
            if (N.DEBUG)
              throw Error(l + "Not a" + (x ? " base " + x : "") + " number: " + L);
            I.s = null;
          }
          I.c = I.e = null;
        };
      }();
      function lt(h, g, y, v) {
        var A, I, L, B, x, R, U, k = h.c, W = $;
        if (k) {
          t: {
            for (A = 1, B = k[0]; B >= 10; B /= 10, A++)
              ;
            if (I = g - A, I < 0)
              I += S, L = g, x = k[R = 0], U = E(x / W[A - L - 1] % 10);
            else if (R = m((I + 1) / S), R >= k.length)
              if (v) {
                for (; k.length <= R; k.push(0))
                  ;
                x = U = 0, A = 1, I %= S, L = I - S + 1;
              } else
                break t;
            else {
              for (x = B = k[R], A = 1; B >= 10; B /= 10, A++)
                ;
              I %= S, L = I - S + A, U = L < 0 ? 0 : E(x / W[A - L - 1] % 10);
            }
            if (v = v || g < 0 || // Are there any non-zero digits after the rounding digit?
            // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
            // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
            k[R + 1] != null || (L < 0 ? x : x % W[A - L - 1]), v = y < 4 ? (U || v) && (y == 0 || y == (h.s < 0 ? 3 : 2)) : U > 5 || U == 5 && (y == 4 || v || y == 6 && // Check whether the digit to the left of the rounding digit is odd.
            (I > 0 ? L > 0 ? x / W[A - L] : 0 : k[R - 1]) % 10 & 1 || y == (h.s < 0 ? 8 : 7)), g < 1 || !k[0])
              return k.length = 0, v ? (g -= h.e + 1, k[0] = W[(S - g % S) % S], h.e = -g || 0) : k[0] = h.e = 0, h;
            if (I == 0 ? (k.length = R, B = 1, R--) : (k.length = R + 1, B = W[S - I], k[R] = L > 0 ? E(x / W[A - L] % W[L]) * B : 0), v)
              for (; ; )
                if (R == 0) {
                  for (I = 1, L = k[0]; L >= 10; L /= 10, I++)
                    ;
                  for (L = k[0] += B, B = 1; L >= 10; L /= 10, B++)
                    ;
                  I != B && (h.e++, k[0] == b && (k[0] = 1));
                  break;
                } else {
                  if (k[R] += B, k[R] != b)
                    break;
                  k[R--] = 0, B = 1;
                }
            for (I = k.length; k[--I] === 0; k.pop())
              ;
          }
          h.e > yt ? h.c = h.e = null : h.e < mt && (h.c = [h.e = 0]);
        }
        return h;
      }
      function wt(h) {
        var g, y = h.e;
        return y === null ? h.toString() : (g = G(h.c), g = y <= ht || y >= dt ? at(g, y) : j(g, y, "0"), h.s < 0 ? "-" + g : g);
      }
      return M.absoluteValue = M.abs = function() {
        var h = new N(this);
        return h.s < 0 && (h.s = 1), h;
      }, M.comparedTo = function(h, g) {
        return Z(this, new N(h, g));
      }, M.decimalPlaces = M.dp = function(h, g) {
        var y, v, A, I = this;
        if (h != null)
          return Y(h, 0, C), g == null ? g = nt : Y(g, 0, 8), lt(new N(I), h + I.e + 1, g);
        if (!(y = I.c))
          return null;
        if (v = ((A = y.length - 1) - D(this.e / S)) * S, A = y[A])
          for (; A % 10 == 0; A /= 10, v--)
            ;
        return v < 0 && (v = 0), v;
      }, M.dividedBy = M.div = function(h, g) {
        return P(this, new N(h, g), et, nt);
      }, M.dividedToIntegerBy = M.idiv = function(h, g) {
        return P(this, new N(h, g), 0, 1);
      }, M.exponentiatedBy = M.pow = function(h, g) {
        var y, v, A, I, L, B, x, R, U, k = this;
        if (h = new N(h), h.c && !h.isInteger())
          throw Error(l + "Exponent not an integer: " + wt(h));
        if (g != null && (g = new N(g)), B = h.e > 14, !k.c || !k.c[0] || k.c[0] == 1 && !k.e && k.c.length == 1 || !h.c || !h.c[0])
          return U = new N(Math.pow(+wt(k), B ? h.s * (2 - Q(h)) : +wt(h))), g ? U.mod(g) : U;
        if (x = h.s < 0, g) {
          if (g.c ? !g.c[0] : !g.s)
            return new N(NaN);
          v = !x && k.isInteger() && g.isInteger(), v && (k = k.mod(g));
        } else {
          if (h.e > 9 && (k.e > 0 || k.e < -1 || (k.e == 0 ? k.c[0] > 1 || B && k.c[1] >= 24e7 : k.c[0] < 8e13 || B && k.c[0] <= 9999975e7)))
            return I = k.s < 0 && Q(h) ? -0 : 0, k.e > -1 && (I = 1 / I), new N(x ? 1 / I : I);
          bt && (I = m(bt / S + 2));
        }
        for (B ? (y = new N(0.5), x && (h.s = 1), R = Q(h)) : (A = Math.abs(+wt(h)), R = A % 2), U = new N(rt); ; ) {
          if (R) {
            if (U = U.times(k), !U.c)
              break;
            I ? U.c.length > I && (U.c.length = I) : v && (U = U.mod(g));
          }
          if (A) {
            if (A = E(A / 2), A === 0)
              break;
            R = A % 2;
          } else if (h = h.times(y), lt(h, h.e + 1, 1), h.e > 14)
            R = Q(h);
          else {
            if (A = +wt(h), A === 0)
              break;
            R = A % 2;
          }
          k = k.times(k), I ? k.c && k.c.length > I && (k.c.length = I) : v && (k = k.mod(g));
        }
        return v ? U : (x && (U = rt.div(U)), g ? U.mod(g) : I ? lt(U, bt, nt, L) : U);
      }, M.integerValue = function(h) {
        var g = new N(this);
        return h == null ? h = nt : Y(h, 0, 8), lt(g, g.e + 1, h);
      }, M.isEqualTo = M.eq = function(h, g) {
        return Z(this, new N(h, g)) === 0;
      }, M.isFinite = function() {
        return !!this.c;
      }, M.isGreaterThan = M.gt = function(h, g) {
        return Z(this, new N(h, g)) > 0;
      }, M.isGreaterThanOrEqualTo = M.gte = function(h, g) {
        return (g = Z(this, new N(h, g))) === 1 || g === 0;
      }, M.isInteger = function() {
        return !!this.c && D(this.e / S) > this.c.length - 2;
      }, M.isLessThan = M.lt = function(h, g) {
        return Z(this, new N(h, g)) < 0;
      }, M.isLessThanOrEqualTo = M.lte = function(h, g) {
        return (g = Z(this, new N(h, g))) === -1 || g === 0;
      }, M.isNaN = function() {
        return !this.s;
      }, M.isNegative = function() {
        return this.s < 0;
      }, M.isPositive = function() {
        return this.s > 0;
      }, M.isZero = function() {
        return !!this.c && this.c[0] == 0;
      }, M.minus = function(h, g) {
        var y, v, A, I, L = this, B = L.s;
        if (h = new N(h, g), g = h.s, !B || !g)
          return new N(NaN);
        if (B != g)
          return h.s = -g, L.plus(h);
        var x = L.e / S, R = h.e / S, U = L.c, k = h.c;
        if (!x || !R) {
          if (!U || !k)
            return U ? (h.s = -g, h) : new N(k ? L : NaN);
          if (!U[0] || !k[0])
            return k[0] ? (h.s = -g, h) : new N(U[0] ? L : (
              // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
              nt == 3 ? -0 : 0
            ));
        }
        if (x = D(x), R = D(R), U = U.slice(), B = x - R) {
          for ((I = B < 0) ? (B = -B, A = U) : (R = x, A = k), A.reverse(), g = B; g--; A.push(0))
            ;
          A.reverse();
        } else
          for (v = (I = (B = U.length) < (g = k.length)) ? B : g, B = g = 0; g < v; g++)
            if (U[g] != k[g]) {
              I = U[g] < k[g];
              break;
            }
        if (I && (A = U, U = k, k = A, h.s = -h.s), g = (v = k.length) - (y = U.length), g > 0)
          for (; g--; U[y++] = 0)
            ;
        for (g = b - 1; v > B; ) {
          if (U[--v] < k[v]) {
            for (y = v; y && !U[--y]; U[y] = g)
              ;
            --U[y], U[v] += b;
          }
          U[v] -= k[v];
        }
        for (; U[0] == 0; U.splice(0, 1), --R)
          ;
        return U[0] ? Rt(h, U, R) : (h.s = nt == 3 ? -1 : 1, h.c = [h.e = 0], h);
      }, M.modulo = M.mod = function(h, g) {
        var y, v, A = this;
        return h = new N(h, g), !A.c || !h.s || h.c && !h.c[0] ? new N(NaN) : !h.c || A.c && !A.c[0] ? new N(A) : (It == 9 ? (v = h.s, h.s = 1, y = P(A, h, 0, 3), h.s = v, y.s *= v) : y = P(A, h, 0, It), h = A.minus(y.times(h)), !h.c[0] && It == 1 && (h.s = A.s), h);
      }, M.multipliedBy = M.times = function(h, g) {
        var y, v, A, I, L, B, x, R, U, k, W, z, tt, V, st, e = this, i = e.c, s = (h = new N(h, g)).c;
        if (!i || !s || !i[0] || !s[0])
          return !e.s || !h.s || i && !i[0] && !s || s && !s[0] && !i ? h.c = h.e = h.s = null : (h.s *= e.s, !i || !s ? h.c = h.e = null : (h.c = [0], h.e = 0)), h;
        for (v = D(e.e / S) + D(h.e / S), h.s *= e.s, x = i.length, k = s.length, x < k && (tt = i, i = s, s = tt, A = x, x = k, k = A), A = x + k, tt = []; A--; tt.push(0))
          ;
        for (V = b, st = F, A = k; --A >= 0; ) {
          for (y = 0, W = s[A] % st, z = s[A] / st | 0, L = x, I = A + L; I > A; )
            R = i[--L] % st, U = i[L] / st | 0, B = z * R + U * W, R = W * R + B % st * st + tt[I] + y, y = (R / V | 0) + (B / st | 0) + z * U, tt[I--] = R % V;
          tt[I] = y;
        }
        return y ? ++v : tt.splice(0, 1), Rt(h, tt, v);
      }, M.negated = function() {
        var h = new N(this);
        return h.s = -h.s || null, h;
      }, M.plus = function(h, g) {
        var y, v = this, A = v.s;
        if (h = new N(h, g), g = h.s, !A || !g)
          return new N(NaN);
        if (A != g)
          return h.s = -g, v.minus(h);
        var I = v.e / S, L = h.e / S, B = v.c, x = h.c;
        if (!I || !L) {
          if (!B || !x)
            return new N(A / 0);
          if (!B[0] || !x[0])
            return x[0] ? h : new N(B[0] ? v : A * 0);
        }
        if (I = D(I), L = D(L), B = B.slice(), A = I - L) {
          for (A > 0 ? (L = I, y = x) : (A = -A, y = B), y.reverse(); A--; y.push(0))
            ;
          y.reverse();
        }
        for (A = B.length, g = x.length, A - g < 0 && (y = x, x = B, B = y, g = A), A = 0; g; )
          A = (B[--g] = B[g] + x[g] + A) / b | 0, B[g] = b === B[g] ? 0 : B[g] % b;
        return A && (B = [A].concat(B), ++L), Rt(h, B, L);
      }, M.precision = M.sd = function(h, g) {
        var y, v, A, I = this;
        if (h != null && h !== !!h)
          return Y(h, 1, C), g == null ? g = nt : Y(g, 0, 8), lt(new N(I), h, g);
        if (!(y = I.c))
          return null;
        if (A = y.length - 1, v = A * S + 1, A = y[A]) {
          for (; A % 10 == 0; A /= 10, v--)
            ;
          for (A = y[0]; A >= 10; A /= 10, v++)
            ;
        }
        return h && I.e + 1 > v && (v = I.e + 1), v;
      }, M.shiftedBy = function(h) {
        return Y(h, -d, d), this.times("1e" + h);
      }, M.squareRoot = M.sqrt = function() {
        var h, g, y, v, A, I = this, L = I.c, B = I.s, x = I.e, R = et + 4, U = new N("0.5");
        if (B !== 1 || !L || !L[0])
          return new N(!B || B < 0 && (!L || L[0]) ? NaN : L ? I : 1 / 0);
        if (B = Math.sqrt(+wt(I)), B == 0 || B == 1 / 0 ? (g = G(L), (g.length + x) % 2 == 0 && (g += "0"), B = Math.sqrt(+g), x = D((x + 1) / 2) - (x < 0 || x % 2), B == 1 / 0 ? g = "5e" + x : (g = B.toExponential(), g = g.slice(0, g.indexOf("e") + 1) + x), y = new N(g)) : y = new N(B + ""), y.c[0]) {
          for (x = y.e, B = x + R, B < 3 && (B = 0); ; )
            if (A = y, y = U.times(A.plus(P(I, A, R, 1))), G(A.c).slice(0, B) === (g = G(y.c)).slice(0, B))
              if (y.e < x && --B, g = g.slice(B - 3, B + 1), g == "9999" || !v && g == "4999") {
                if (!v && (lt(A, A.e + et + 2, 0), A.times(A).eq(I))) {
                  y = A;
                  break;
                }
                R += 4, B += 4, v = 1;
              } else {
                (!+g || !+g.slice(1) && g.charAt(0) == "5") && (lt(y, y.e + et + 2, 1), h = !y.times(y).eq(I));
                break;
              }
        }
        return lt(y, y.e + et + 1, nt, h);
      }, M.toExponential = function(h, g) {
        return h != null && (Y(h, 0, C), h++), gt(this, h, g, 1);
      }, M.toFixed = function(h, g) {
        return h != null && (Y(h, 0, C), h = h + this.e + 1), gt(this, h, g);
      }, M.toFormat = function(h, g, y) {
        var v, A = this;
        if (y == null)
          h != null && g && typeof g == "object" ? (y = g, g = null) : h && typeof h == "object" ? (y = h, h = g = null) : y = ut;
        else if (typeof y != "object")
          throw Error(l + "Argument not an object: " + y);
        if (v = A.toFixed(h, g), A.c) {
          var I, L = v.split("."), B = +y.groupSize, x = +y.secondaryGroupSize, R = y.groupSeparator || "", U = L[0], k = L[1], W = A.s < 0, z = W ? U.slice(1) : U, tt = z.length;
          if (x && (I = B, B = x, x = I, tt -= I), B > 0 && tt > 0) {
            for (I = tt % B || B, U = z.substr(0, I); I < tt; I += B)
              U += R + z.substr(I, B);
            x > 0 && (U += R + z.slice(I)), W && (U = "-" + U);
          }
          v = k ? U + (y.decimalSeparator || "") + ((x = +y.fractionGroupSize) ? k.replace(
            new RegExp("\\d{" + x + "}\\B", "g"),
            "$&" + (y.fractionGroupSeparator || "")
          ) : k) : U;
        }
        return (y.prefix || "") + v + (y.suffix || "");
      }, M.toFraction = function(h) {
        var g, y, v, A, I, L, B, x, R, U, k, W, z = this, tt = z.c;
        if (h != null && (B = new N(h), !B.isInteger() && (B.c || B.s !== 1) || B.lt(rt)))
          throw Error(l + "Argument " + (B.isInteger() ? "out of range: " : "not an integer: ") + wt(B));
        if (!tt)
          return new N(z);
        for (g = new N(rt), R = y = new N(rt), v = x = new N(rt), W = G(tt), I = g.e = W.length - z.e - 1, g.c[0] = $[(L = I % S) < 0 ? S + L : L], h = !h || B.comparedTo(g) > 0 ? I > 0 ? g : R : B, L = yt, yt = 1 / 0, B = new N(W), x.c[0] = 0; U = P(B, g, 0, 1), A = y.plus(U.times(v)), A.comparedTo(h) != 1; )
          y = v, v = A, R = x.plus(U.times(A = R)), x = A, g = B.minus(U.times(A = g)), B = A;
        return A = P(h.minus(y), v, 0, 1), x = x.plus(A.times(R)), y = y.plus(A.times(v)), x.s = R.s = z.s, I = I * 2, k = P(R, v, I, nt).minus(z).abs().comparedTo(
          P(x, y, I, nt).minus(z).abs()
        ) < 1 ? [R, v] : [x, y], yt = L, k;
      }, M.toNumber = function() {
        return +wt(this);
      }, M.toPrecision = function(h, g) {
        return h != null && Y(h, 1, C), gt(this, h, g, 2);
      }, M.toString = function(h) {
        var g, y = this, v = y.s, A = y.e;
        return A === null ? v ? (g = "Infinity", v < 0 && (g = "-" + g)) : g = "NaN" : (h == null ? g = A <= ht || A >= dt ? at(G(y.c), A) : j(G(y.c), A, "0") : h === 10 && Ot ? (y = lt(new N(y), et + A + 1, nt), g = j(G(y.c), y.e, "0")) : (Y(h, 2, ft.length, "Base"), g = q(j(G(y.c), A, "0"), 10, h, v, !0)), v < 0 && y.c[0] && (g = "-" + g)), g;
      }, M.valueOf = M.toJSON = function() {
        return wt(this);
      }, M._isBigNumber = !0, O != null && N.set(O), N;
    }
    function D(O) {
      var P = O | 0;
      return O > 0 || O === P ? P : P - 1;
    }
    function G(O) {
      for (var P, q, J = 1, M = O.length, rt = O[0] + ""; J < M; ) {
        for (P = O[J++] + "", q = S - P.length; q--; P = "0" + P)
          ;
        rt += P;
      }
      for (M = rt.length; rt.charCodeAt(--M) === 48; )
        ;
      return rt.slice(0, M + 1 || 1);
    }
    function Z(O, P) {
      var q, J, M = O.c, rt = P.c, et = O.s, nt = P.s, ht = O.e, dt = P.e;
      if (!et || !nt)
        return null;
      if (q = M && !M[0], J = rt && !rt[0], q || J)
        return q ? J ? 0 : -nt : et;
      if (et != nt)
        return et;
      if (q = et < 0, J = ht == dt, !M || !rt)
        return J ? 0 : !M ^ q ? 1 : -1;
      if (!J)
        return ht > dt ^ q ? 1 : -1;
      for (nt = (ht = M.length) < (dt = rt.length) ? ht : dt, et = 0; et < nt; et++)
        if (M[et] != rt[et])
          return M[et] > rt[et] ^ q ? 1 : -1;
      return ht == dt ? 0 : ht > dt ^ q ? 1 : -1;
    }
    function Y(O, P, q, J) {
      if (O < P || O > q || O !== E(O))
        throw Error(l + (J || "Argument") + (typeof O == "number" ? O < P || O > q ? " out of range: " : " not an integer: " : " not a primitive number: ") + String(O));
    }
    function Q(O) {
      var P = O.c.length - 1;
      return D(O.e / S) == P && O.c[P] % 2 != 0;
    }
    function at(O, P) {
      return (O.length > 1 ? O.charAt(0) + "." + O.slice(1) : O) + (P < 0 ? "e" : "e+") + P;
    }
    function j(O, P, q) {
      var J, M;
      if (P < 0) {
        for (M = q + "."; ++P; M += q)
          ;
        O = M + O;
      } else if (J = O.length, ++P > J) {
        for (M = q, P -= J; --P; M += q)
          ;
        O += M;
      } else
        P < J && (O = O.slice(0, P) + "." + O.slice(P));
      return O;
    }
    f = K(), f.default = f.BigNumber = f, o.exports ? o.exports = f : (a || (a = typeof self < "u" && self ? self : window), a.BigNumber = f);
  })(qt);
})(ke);
var or = ke.exports;
Object.defineProperty(ce, "__esModule", { value: !0 });
const ar = or;
let sr = class {
  /**
   * Method to take a string value and return a bignumber object.
   *
   * @protected
   * @type {Function}
   * @memberof Arweave
   */
  BigNum;
  constructor() {
    this.BigNum = (a, f) => {
      let p = ar.BigNumber.clone({ DECIMAL_PLACES: f });
      return new p(a);
    };
  }
  winstonToAr(a, { formatted: f = !1, decimals: p = 12, trim: m = !0 } = {}) {
    let E = this.stringToBigNum(a, p).shiftedBy(-12);
    return f ? E.toFormat(p) : E.toFixed(p);
  }
  arToWinston(a, { formatted: f = !1 } = {}) {
    let p = this.stringToBigNum(a).shiftedBy(12);
    return f ? p.toFormat() : p.toFixed(0);
  }
  compare(a, f) {
    let p = this.stringToBigNum(a), m = this.stringToBigNum(f);
    return p.comparedTo(m);
  }
  isEqual(a, f) {
    return this.compare(a, f) === 0;
  }
  isLessThan(a, f) {
    let p = this.stringToBigNum(a), m = this.stringToBigNum(f);
    return p.isLessThan(m);
  }
  isGreaterThan(a, f) {
    let p = this.stringToBigNum(a), m = this.stringToBigNum(f);
    return p.isGreaterThan(m);
  }
  add(a, f) {
    let p = this.stringToBigNum(a);
    return this.stringToBigNum(f), p.plus(f).toFixed(0);
  }
  sub(a, f) {
    let p = this.stringToBigNum(a);
    return this.stringToBigNum(f), p.minus(f).toFixed(0);
  }
  stringToBigNum(a, f = 12) {
    return this.BigNum(a, f);
  }
};
ce.default = sr;
var he = {};
Object.defineProperty(he, "__esModule", { value: !0 });
class ur {
  METHOD_GET = "GET";
  METHOD_POST = "POST";
  config;
  constructor(a) {
    this.applyConfig(a);
  }
  applyConfig(a) {
    this.config = this.mergeDefaults(a);
  }
  getConfig() {
    return this.config;
  }
  mergeDefaults(a) {
    const f = a.protocol || "http", p = a.port || (f === "https" ? 443 : 80);
    return {
      host: a.host || "127.0.0.1",
      protocol: f,
      port: p,
      timeout: a.timeout || 2e4,
      logging: a.logging || !1,
      logger: a.logger || console.log,
      network: a.network
    };
  }
  async get(a, f) {
    return await this.request(a, { ...f, method: this.METHOD_GET });
  }
  async post(a, f, p) {
    const m = new Headers(p?.headers || {});
    return m.get("content-type")?.includes("application/json") || m.append("content-type", "application/json"), m.append("accept", "application/json, text/plain, */*"), await this.request(a, {
      ...p,
      method: this.METHOD_POST,
      body: typeof f != "string" ? JSON.stringify(f) : f,
      headers: m
    });
  }
  async request(a, f) {
    const p = new Headers(f?.headers || {}), m = `${this.config.protocol}://${this.config.host}:${this.config.port}`, E = f?.responseType;
    delete f?.responseType, a.startsWith("/") && (a = a.slice(1)), this.config.network && p.append("x-network", this.config.network), this.config.logging && this.config.logger(`Requesting: ${m}/${a}`);
    let l = await fetch(`${m}/${a}`, {
      ...f || {},
      headers: p
    });
    this.config.logging && this.config.logger(`Response:   ${l.url} - ${l.status}`);
    const b = l.headers.get("content-type")?.match(/charset=([^()<>@,;:\"/[\]?.=\s]*)/i)?.[1], S = l, d = async () => {
      if (b)
        try {
          S.data = new TextDecoder(b).decode(await l.arrayBuffer());
        } catch {
          S.data = await l.text();
        }
      else
        S.data = await l.text();
    };
    if (E === "arraybuffer")
      S.data = await l.arrayBuffer();
    else if (E === "text")
      await d();
    else if (E === "webstream")
      S.data = fr(l.body);
    else
      try {
        let $ = await l.clone().json();
        typeof $ != "object" ? await d() : S.data = await l.json(), $ = null;
      } catch {
        await d();
      }
    return S;
  }
}
he.default = ur;
const fr = (o) => {
  const a = o;
  return typeof a[Symbol.asyncIterator] > "u" ? (a[Symbol.asyncIterator] = cr(o), a) : o;
}, cr = function(o) {
  return async function* () {
    const f = o.getReader();
    try {
      for (; ; ) {
        const { done: p, value: m } = await f.read();
        if (p)
          return;
        yield m;
      }
    } finally {
      f.releaseLock();
    }
  };
};
var le = {}, it = {}, Qt = {};
Qt.byteLength = pr;
Qt.toByteArray = dr;
Qt.fromByteArray = mr;
var Ut = [], At = [], hr = typeof Uint8Array < "u" ? Uint8Array : Array, ne = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var Mt = 0, lr = ne.length; Mt < lr; ++Mt)
  Ut[Mt] = ne[Mt], At[ne.charCodeAt(Mt)] = Mt;
At[45] = 62;
At[95] = 63;
function Ne(o) {
  var a = o.length;
  if (a % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var f = o.indexOf("=");
  f === -1 && (f = a);
  var p = f === a ? 0 : 4 - f % 4;
  return [f, p];
}
function pr(o) {
  var a = Ne(o), f = a[0], p = a[1];
  return (f + p) * 3 / 4 - p;
}
function gr(o, a, f) {
  return (a + f) * 3 / 4 - f;
}
function dr(o) {
  var a, f = Ne(o), p = f[0], m = f[1], E = new hr(gr(o, p, m)), l = 0, c = m > 0 ? p - 4 : p, b;
  for (b = 0; b < c; b += 4)
    a = At[o.charCodeAt(b)] << 18 | At[o.charCodeAt(b + 1)] << 12 | At[o.charCodeAt(b + 2)] << 6 | At[o.charCodeAt(b + 3)], E[l++] = a >> 16 & 255, E[l++] = a >> 8 & 255, E[l++] = a & 255;
  return m === 2 && (a = At[o.charCodeAt(b)] << 2 | At[o.charCodeAt(b + 1)] >> 4, E[l++] = a & 255), m === 1 && (a = At[o.charCodeAt(b)] << 10 | At[o.charCodeAt(b + 1)] << 4 | At[o.charCodeAt(b + 2)] >> 2, E[l++] = a >> 8 & 255, E[l++] = a & 255), E;
}
function yr(o) {
  return Ut[o >> 18 & 63] + Ut[o >> 12 & 63] + Ut[o >> 6 & 63] + Ut[o & 63];
}
function wr(o, a, f) {
  for (var p, m = [], E = a; E < f; E += 3)
    p = (o[E] << 16 & 16711680) + (o[E + 1] << 8 & 65280) + (o[E + 2] & 255), m.push(yr(p));
  return m.join("");
}
function mr(o) {
  for (var a, f = o.length, p = f % 3, m = [], E = 16383, l = 0, c = f - p; l < c; l += E)
    m.push(wr(o, l, l + E > c ? c : l + E));
  return p === 1 ? (a = o[f - 1], m.push(
    Ut[a >> 2] + Ut[a << 4 & 63] + "=="
  )) : p === 2 && (a = (o[f - 2] << 8) + o[f - 1], m.push(
    Ut[a >> 10] + Ut[a >> 4 & 63] + Ut[a << 2 & 63] + "="
  )), m.join("");
}
Object.defineProperty(it, "__esModule", { value: !0 });
it.b64UrlDecode = it.b64UrlEncode = it.bufferTob64Url = it.bufferTob64 = it.b64UrlToBuffer = it.stringToB64Url = it.stringToBuffer = it.bufferToString = it.b64UrlToString = it.concatBuffers = void 0;
const Fe = Qt;
function Er(o) {
  let a = 0;
  for (let m = 0; m < o.length; m++)
    a += o[m].byteLength;
  let f = new Uint8Array(a), p = 0;
  f.set(new Uint8Array(o[0]), p), p += o[0].byteLength;
  for (let m = 1; m < o.length; m++)
    f.set(new Uint8Array(o[m]), p), p += o[m].byteLength;
  return f;
}
it.concatBuffers = Er;
function Br(o) {
  let a = Me(o);
  return Pe(a);
}
it.b64UrlToString = Br;
function Pe(o) {
  return new TextDecoder("utf-8", { fatal: !0 }).decode(o);
}
it.bufferToString = Pe;
function De(o) {
  return new TextEncoder().encode(o);
}
it.stringToBuffer = De;
function br(o) {
  return He(De(o));
}
it.stringToB64Url = br;
function Me(o) {
  return new Uint8Array(Fe.toByteArray(Ke(o)));
}
it.b64UrlToBuffer = Me;
function $e(o) {
  return Fe.fromByteArray(new Uint8Array(o));
}
it.bufferTob64 = $e;
function He(o) {
  return je($e(o));
}
it.bufferTob64Url = He;
function je(o) {
  return o.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
}
it.b64UrlEncode = je;
function Ke(o) {
  o = o.replace(/\-/g, "+").replace(/\_/g, "/");
  let a;
  return o.length % 4 == 0 ? a = 0 : a = 4 - o.length % 4, o.concat("=".repeat(a));
}
it.b64UrlDecode = Ke;
Object.defineProperty(le, "__esModule", { value: !0 });
const Nt = it;
class Ar {
  keyLength = 4096;
  publicExponent = 65537;
  hashAlgorithm = "sha256";
  driver;
  constructor() {
    if (!this.detectWebCrypto())
      throw new Error("SubtleCrypto not available!");
    this.driver = crypto.subtle;
  }
  async generateJWK() {
    let a = await this.driver.generateKey({
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: {
        name: "SHA-256"
      }
    }, !0, ["sign"]), f = await this.driver.exportKey("jwk", a.privateKey);
    return {
      kty: f.kty,
      e: f.e,
      n: f.n,
      d: f.d,
      p: f.p,
      q: f.q,
      dp: f.dp,
      dq: f.dq,
      qi: f.qi
    };
  }
  async sign(a, f, { saltLength: p } = {}) {
    let m = await this.driver.sign({
      name: "RSA-PSS",
      saltLength: 32
    }, await this.jwkToCryptoKey(a), f);
    return new Uint8Array(m);
  }
  async hash(a, f = "SHA-256") {
    let p = await this.driver.digest(f, a);
    return new Uint8Array(p);
  }
  async verify(a, f, p) {
    const m = {
      kty: "RSA",
      e: "AQAB",
      n: a
    }, E = await this.jwkToPublicCryptoKey(m), l = await this.driver.digest("SHA-256", f), c = await this.driver.verify({
      name: "RSA-PSS",
      saltLength: 0
    }, E, p, f), b = await this.driver.verify({
      name: "RSA-PSS",
      saltLength: 32
    }, E, p, f), S = await this.driver.verify({
      name: "RSA-PSS",
      saltLength: Math.ceil((E.algorithm.modulusLength - 1) / 8) - l.byteLength - 2
    }, E, p, f);
    return c || b || S;
  }
  async jwkToCryptoKey(a) {
    return this.driver.importKey("jwk", a, {
      name: "RSA-PSS",
      hash: {
        name: "SHA-256"
      }
    }, !1, ["sign"]);
  }
  async jwkToPublicCryptoKey(a) {
    return this.driver.importKey("jwk", a, {
      name: "RSA-PSS",
      hash: {
        name: "SHA-256"
      }
    }, !1, ["verify"]);
  }
  detectWebCrypto() {
    if (typeof crypto > "u")
      return !1;
    const a = crypto?.subtle;
    return a === void 0 ? !1 : [
      "generateKey",
      "importKey",
      "exportKey",
      "digest",
      "sign"
    ].every((p) => typeof a[p] == "function");
  }
  async encrypt(a, f, p) {
    const m = await this.driver.importKey("raw", typeof f == "string" ? Nt.stringToBuffer(f) : f, {
      name: "PBKDF2",
      length: 32
    }, !1, ["deriveKey"]), E = await this.driver.deriveKey({
      name: "PBKDF2",
      salt: p ? Nt.stringToBuffer(p) : Nt.stringToBuffer("salt"),
      iterations: 1e5,
      hash: "SHA-256"
    }, m, {
      name: "AES-CBC",
      length: 256
    }, !1, ["encrypt", "decrypt"]), l = new Uint8Array(16);
    crypto.getRandomValues(l);
    const c = await this.driver.encrypt({
      name: "AES-CBC",
      iv: l
    }, E, a);
    return Nt.concatBuffers([l, c]);
  }
  async decrypt(a, f, p) {
    const m = await this.driver.importKey("raw", typeof f == "string" ? Nt.stringToBuffer(f) : f, {
      name: "PBKDF2",
      length: 32
    }, !1, ["deriveKey"]), E = await this.driver.deriveKey({
      name: "PBKDF2",
      salt: p ? Nt.stringToBuffer(p) : Nt.stringToBuffer("salt"),
      iterations: 1e5,
      hash: "SHA-256"
    }, m, {
      name: "AES-CBC",
      length: 256
    }, !1, ["encrypt", "decrypt"]), l = a.slice(0, 16), c = await this.driver.decrypt({
      name: "AES-CBC",
      iv: l
    }, E, a.slice(16));
    return Nt.concatBuffers([c]);
  }
}
le.default = Ar;
var pe = {};
Object.defineProperty(pe, "__esModule", { value: !0 });
class Tr {
  api;
  constructor(a) {
    this.api = a;
  }
  getInfo() {
    return this.api.get("info").then((a) => a.data);
  }
  getPeers() {
    return this.api.get("peers").then((a) => a.data);
  }
}
pe.default = Tr;
var Yt = {}, Pt = {};
Object.defineProperty(Pt, "__esModule", { value: !0 });
Pt.getError = void 0;
class xr extends Error {
  type;
  response;
  constructor(a, f = {}) {
    f.message ? super(f.message) : super(), this.type = a, this.response = f.response;
  }
  getType() {
    return this.type;
  }
}
Pt.default = xr;
function Sr(o) {
  let a = o.data;
  if (typeof o.data == "string")
    try {
      a = JSON.parse(o.data);
    } catch {
    }
  if (o.data instanceof ArrayBuffer || o.data instanceof Uint8Array)
    try {
      a = JSON.parse(a.toString());
    } catch {
    }
  return a ? a.error || a : o.statusText || "unknown";
}
Pt.getError = Sr;
var $t = {}, Jt = {}, Ae;
function Ir() {
  if (Ae)
    return Jt;
  Ae = 1, Object.defineProperty(Jt, "__esModule", { value: !0 });
  const o = Vt();
  async function a(p) {
    if (Array.isArray(p)) {
      const l = o.default.utils.concatBuffers([
        o.default.utils.stringToBuffer("list"),
        o.default.utils.stringToBuffer(p.length.toString())
      ]);
      return await f(p, await o.default.crypto.hash(l, "SHA-384"));
    }
    const m = o.default.utils.concatBuffers([
      o.default.utils.stringToBuffer("blob"),
      o.default.utils.stringToBuffer(p.byteLength.toString())
    ]), E = o.default.utils.concatBuffers([
      await o.default.crypto.hash(m, "SHA-384"),
      await o.default.crypto.hash(p, "SHA-384")
    ]);
    return await o.default.crypto.hash(E, "SHA-384");
  }
  Jt.default = a;
  async function f(p, m) {
    if (p.length < 1)
      return m;
    const E = o.default.utils.concatBuffers([
      m,
      await a(p[0])
    ]), l = await o.default.crypto.hash(E, "SHA-384");
    return await f(p.slice(1), l);
  }
  return Jt;
}
var qe = {}, te = {};
te.byteLength = _r;
te.toByteArray = Lr;
te.fromByteArray = kr;
var _t = [], Tt = [], vr = typeof Uint8Array < "u" ? Uint8Array : Array, ie = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var Ht = 0, Ur = ie.length; Ht < Ur; ++Ht)
  _t[Ht] = ie[Ht], Tt[ie.charCodeAt(Ht)] = Ht;
Tt[45] = 62;
Tt[95] = 63;
function Ge(o) {
  var a = o.length;
  if (a % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var f = o.indexOf("=");
  f === -1 && (f = a);
  var p = f === a ? 0 : 4 - f % 4;
  return [f, p];
}
function _r(o) {
  var a = Ge(o), f = a[0], p = a[1];
  return (f + p) * 3 / 4 - p;
}
function Rr(o, a, f) {
  return (a + f) * 3 / 4 - f;
}
function Lr(o) {
  var a, f = Ge(o), p = f[0], m = f[1], E = new vr(Rr(o, p, m)), l = 0, c = m > 0 ? p - 4 : p, b;
  for (b = 0; b < c; b += 4)
    a = Tt[o.charCodeAt(b)] << 18 | Tt[o.charCodeAt(b + 1)] << 12 | Tt[o.charCodeAt(b + 2)] << 6 | Tt[o.charCodeAt(b + 3)], E[l++] = a >> 16 & 255, E[l++] = a >> 8 & 255, E[l++] = a & 255;
  return m === 2 && (a = Tt[o.charCodeAt(b)] << 2 | Tt[o.charCodeAt(b + 1)] >> 4, E[l++] = a & 255), m === 1 && (a = Tt[o.charCodeAt(b)] << 10 | Tt[o.charCodeAt(b + 1)] << 4 | Tt[o.charCodeAt(b + 2)] >> 2, E[l++] = a >> 8 & 255, E[l++] = a & 255), E;
}
function Cr(o) {
  return _t[o >> 18 & 63] + _t[o >> 12 & 63] + _t[o >> 6 & 63] + _t[o & 63];
}
function Or(o, a, f) {
  for (var p, m = [], E = a; E < f; E += 3)
    p = (o[E] << 16 & 16711680) + (o[E + 1] << 8 & 65280) + (o[E + 2] & 255), m.push(Cr(p));
  return m.join("");
}
function kr(o) {
  for (var a, f = o.length, p = f % 3, m = [], E = 16383, l = 0, c = f - p; l < c; l += E)
    m.push(Or(o, l, l + E > c ? c : l + E));
  return p === 1 ? (a = o[f - 1], m.push(
    _t[a >> 2] + _t[a << 4 & 63] + "=="
  )) : p === 2 && (a = (o[f - 2] << 8) + o[f - 1], m.push(
    _t[a >> 10] + _t[a >> 4 & 63] + _t[a << 2 & 63] + "="
  )), m.join("");
}
var ge = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
ge.read = function(o, a, f, p, m) {
  var E, l, c = m * 8 - p - 1, b = (1 << c) - 1, S = b >> 1, d = -7, $ = f ? m - 1 : 0, F = f ? -1 : 1, C = o[a + $];
  for ($ += F, E = C & (1 << -d) - 1, C >>= -d, d += c; d > 0; E = E * 256 + o[a + $], $ += F, d -= 8)
    ;
  for (l = E & (1 << -d) - 1, E >>= -d, d += p; d > 0; l = l * 256 + o[a + $], $ += F, d -= 8)
    ;
  if (E === 0)
    E = 1 - S;
  else {
    if (E === b)
      return l ? NaN : (C ? -1 : 1) * (1 / 0);
    l = l + Math.pow(2, p), E = E - S;
  }
  return (C ? -1 : 1) * l * Math.pow(2, E - p);
};
ge.write = function(o, a, f, p, m, E) {
  var l, c, b, S = E * 8 - m - 1, d = (1 << S) - 1, $ = d >> 1, F = m === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, C = p ? 0 : E - 1, K = p ? 1 : -1, D = a < 0 || a === 0 && 1 / a < 0 ? 1 : 0;
  for (a = Math.abs(a), isNaN(a) || a === 1 / 0 ? (c = isNaN(a) ? 1 : 0, l = d) : (l = Math.floor(Math.log(a) / Math.LN2), a * (b = Math.pow(2, -l)) < 1 && (l--, b *= 2), l + $ >= 1 ? a += F / b : a += F * Math.pow(2, 1 - $), a * b >= 2 && (l++, b /= 2), l + $ >= d ? (c = 0, l = d) : l + $ >= 1 ? (c = (a * b - 1) * Math.pow(2, m), l = l + $) : (c = a * Math.pow(2, $ - 1) * Math.pow(2, m), l = 0)); m >= 8; o[f + C] = c & 255, C += K, c /= 256, m -= 8)
    ;
  for (l = l << m | c, S += m; S > 0; o[f + C] = l & 255, C += K, l /= 256, S -= 8)
    ;
  o[f + C - K] |= D * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(o) {
  const a = te, f = ge, p = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  o.Buffer = d, o.SlowBuffer = j, o.INSPECT_MAX_BYTES = 50;
  const m = 2147483647;
  o.kMaxLength = m;
  const { Uint8Array: E, ArrayBuffer: l, SharedArrayBuffer: c } = globalThis;
  d.TYPED_ARRAY_SUPPORT = b(), !d.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
    "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
  );
  function b() {
    try {
      const n = new E(1), t = { foo: function() {
        return 42;
      } };
      return Object.setPrototypeOf(t, E.prototype), Object.setPrototypeOf(n, t), n.foo() === 42;
    } catch {
      return !1;
    }
  }
  Object.defineProperty(d.prototype, "parent", {
    enumerable: !0,
    get: function() {
      if (d.isBuffer(this))
        return this.buffer;
    }
  }), Object.defineProperty(d.prototype, "offset", {
    enumerable: !0,
    get: function() {
      if (d.isBuffer(this))
        return this.byteOffset;
    }
  });
  function S(n) {
    if (n > m)
      throw new RangeError('The value "' + n + '" is invalid for option "size"');
    const t = new E(n);
    return Object.setPrototypeOf(t, d.prototype), t;
  }
  function d(n, t, r) {
    if (typeof n == "number") {
      if (typeof t == "string")
        throw new TypeError(
          'The "string" argument must be of type string. Received type number'
        );
      return K(n);
    }
    return $(n, t, r);
  }
  d.poolSize = 8192;
  function $(n, t, r) {
    if (typeof n == "string")
      return D(n, t);
    if (l.isView(n))
      return Z(n);
    if (n == null)
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof n
      );
    if (V(n, l) || n && V(n.buffer, l) || typeof c < "u" && (V(n, c) || n && V(n.buffer, c)))
      return Y(n, t, r);
    if (typeof n == "number")
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    const u = n.valueOf && n.valueOf();
    if (u != null && u !== n)
      return d.from(u, t, r);
    const w = Q(n);
    if (w)
      return w;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof n[Symbol.toPrimitive] == "function")
      return d.from(n[Symbol.toPrimitive]("string"), t, r);
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof n
    );
  }
  d.from = function(n, t, r) {
    return $(n, t, r);
  }, Object.setPrototypeOf(d.prototype, E.prototype), Object.setPrototypeOf(d, E);
  function F(n) {
    if (typeof n != "number")
      throw new TypeError('"size" argument must be of type number');
    if (n < 0)
      throw new RangeError('The value "' + n + '" is invalid for option "size"');
  }
  function C(n, t, r) {
    return F(n), n <= 0 ? S(n) : t !== void 0 ? typeof r == "string" ? S(n).fill(t, r) : S(n).fill(t) : S(n);
  }
  d.alloc = function(n, t, r) {
    return C(n, t, r);
  };
  function K(n) {
    return F(n), S(n < 0 ? 0 : at(n) | 0);
  }
  d.allocUnsafe = function(n) {
    return K(n);
  }, d.allocUnsafeSlow = function(n) {
    return K(n);
  };
  function D(n, t) {
    if ((typeof t != "string" || t === "") && (t = "utf8"), !d.isEncoding(t))
      throw new TypeError("Unknown encoding: " + t);
    const r = O(n, t) | 0;
    let u = S(r);
    const w = u.write(n, t);
    return w !== r && (u = u.slice(0, w)), u;
  }
  function G(n) {
    const t = n.length < 0 ? 0 : at(n.length) | 0, r = S(t);
    for (let u = 0; u < t; u += 1)
      r[u] = n[u] & 255;
    return r;
  }
  function Z(n) {
    if (V(n, E)) {
      const t = new E(n);
      return Y(t.buffer, t.byteOffset, t.byteLength);
    }
    return G(n);
  }
  function Y(n, t, r) {
    if (t < 0 || n.byteLength < t)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (n.byteLength < t + (r || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let u;
    return t === void 0 && r === void 0 ? u = new E(n) : r === void 0 ? u = new E(n, t) : u = new E(n, t, r), Object.setPrototypeOf(u, d.prototype), u;
  }
  function Q(n) {
    if (d.isBuffer(n)) {
      const t = at(n.length) | 0, r = S(t);
      return r.length === 0 || n.copy(r, 0, 0, t), r;
    }
    if (n.length !== void 0)
      return typeof n.length != "number" || st(n.length) ? S(0) : G(n);
    if (n.type === "Buffer" && Array.isArray(n.data))
      return G(n.data);
  }
  function at(n) {
    if (n >= m)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + m.toString(16) + " bytes");
    return n | 0;
  }
  function j(n) {
    return +n != n && (n = 0), d.alloc(+n);
  }
  d.isBuffer = function(t) {
    return t != null && t._isBuffer === !0 && t !== d.prototype;
  }, d.compare = function(t, r) {
    if (V(t, E) && (t = d.from(t, t.offset, t.byteLength)), V(r, E) && (r = d.from(r, r.offset, r.byteLength)), !d.isBuffer(t) || !d.isBuffer(r))
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    if (t === r)
      return 0;
    let u = t.length, w = r.length;
    for (let T = 0, _ = Math.min(u, w); T < _; ++T)
      if (t[T] !== r[T]) {
        u = t[T], w = r[T];
        break;
      }
    return u < w ? -1 : w < u ? 1 : 0;
  }, d.isEncoding = function(t) {
    switch (String(t).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return !0;
      default:
        return !1;
    }
  }, d.concat = function(t, r) {
    if (!Array.isArray(t))
      throw new TypeError('"list" argument must be an Array of Buffers');
    if (t.length === 0)
      return d.alloc(0);
    let u;
    if (r === void 0)
      for (r = 0, u = 0; u < t.length; ++u)
        r += t[u].length;
    const w = d.allocUnsafe(r);
    let T = 0;
    for (u = 0; u < t.length; ++u) {
      let _ = t[u];
      if (V(_, E))
        T + _.length > w.length ? (d.isBuffer(_) || (_ = d.from(_)), _.copy(w, T)) : E.prototype.set.call(
          w,
          _,
          T
        );
      else if (d.isBuffer(_))
        _.copy(w, T);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      T += _.length;
    }
    return w;
  };
  function O(n, t) {
    if (d.isBuffer(n))
      return n.length;
    if (l.isView(n) || V(n, l))
      return n.byteLength;
    if (typeof n != "string")
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof n
      );
    const r = n.length, u = arguments.length > 2 && arguments[2] === !0;
    if (!u && r === 0)
      return 0;
    let w = !1;
    for (; ; )
      switch (t) {
        case "ascii":
        case "latin1":
        case "binary":
          return r;
        case "utf8":
        case "utf-8":
          return U(n).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return r * 2;
        case "hex":
          return r >>> 1;
        case "base64":
          return z(n).length;
        default:
          if (w)
            return u ? -1 : U(n).length;
          t = ("" + t).toLowerCase(), w = !0;
      }
  }
  d.byteLength = O;
  function P(n, t, r) {
    let u = !1;
    if ((t === void 0 || t < 0) && (t = 0), t > this.length || ((r === void 0 || r > this.length) && (r = this.length), r <= 0) || (r >>>= 0, t >>>= 0, r <= t))
      return "";
    for (n || (n = "utf8"); ; )
      switch (n) {
        case "hex":
          return ft(this, t, r);
        case "utf8":
        case "utf-8":
          return yt(this, t, r);
        case "ascii":
          return bt(this, t, r);
        case "latin1":
        case "binary":
          return ut(this, t, r);
        case "base64":
          return mt(this, t, r);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return Ot(this, t, r);
        default:
          if (u)
            throw new TypeError("Unknown encoding: " + n);
          n = (n + "").toLowerCase(), u = !0;
      }
  }
  d.prototype._isBuffer = !0;
  function q(n, t, r) {
    const u = n[t];
    n[t] = n[r], n[r] = u;
  }
  d.prototype.swap16 = function() {
    const t = this.length;
    if (t % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let r = 0; r < t; r += 2)
      q(this, r, r + 1);
    return this;
  }, d.prototype.swap32 = function() {
    const t = this.length;
    if (t % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let r = 0; r < t; r += 4)
      q(this, r, r + 3), q(this, r + 1, r + 2);
    return this;
  }, d.prototype.swap64 = function() {
    const t = this.length;
    if (t % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let r = 0; r < t; r += 8)
      q(this, r, r + 7), q(this, r + 1, r + 6), q(this, r + 2, r + 5), q(this, r + 3, r + 4);
    return this;
  }, d.prototype.toString = function() {
    const t = this.length;
    return t === 0 ? "" : arguments.length === 0 ? yt(this, 0, t) : P.apply(this, arguments);
  }, d.prototype.toLocaleString = d.prototype.toString, d.prototype.equals = function(t) {
    if (!d.isBuffer(t))
      throw new TypeError("Argument must be a Buffer");
    return this === t ? !0 : d.compare(this, t) === 0;
  }, d.prototype.inspect = function() {
    let t = "";
    const r = o.INSPECT_MAX_BYTES;
    return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">";
  }, p && (d.prototype[p] = d.prototype.inspect), d.prototype.compare = function(t, r, u, w, T) {
    if (V(t, E) && (t = d.from(t, t.offset, t.byteLength)), !d.isBuffer(t))
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t
      );
    if (r === void 0 && (r = 0), u === void 0 && (u = t ? t.length : 0), w === void 0 && (w = 0), T === void 0 && (T = this.length), r < 0 || u > t.length || w < 0 || T > this.length)
      throw new RangeError("out of range index");
    if (w >= T && r >= u)
      return 0;
    if (w >= T)
      return -1;
    if (r >= u)
      return 1;
    if (r >>>= 0, u >>>= 0, w >>>= 0, T >>>= 0, this === t)
      return 0;
    let _ = T - w, H = u - r;
    const X = Math.min(_, H), ct = this.slice(w, T), pt = t.slice(r, u);
    for (let ot = 0; ot < X; ++ot)
      if (ct[ot] !== pt[ot]) {
        _ = ct[ot], H = pt[ot];
        break;
      }
    return _ < H ? -1 : H < _ ? 1 : 0;
  };
  function J(n, t, r, u, w) {
    if (n.length === 0)
      return -1;
    if (typeof r == "string" ? (u = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, st(r) && (r = w ? 0 : n.length - 1), r < 0 && (r = n.length + r), r >= n.length) {
      if (w)
        return -1;
      r = n.length - 1;
    } else if (r < 0)
      if (w)
        r = 0;
      else
        return -1;
    if (typeof t == "string" && (t = d.from(t, u)), d.isBuffer(t))
      return t.length === 0 ? -1 : M(n, t, r, u, w);
    if (typeof t == "number")
      return t = t & 255, typeof E.prototype.indexOf == "function" ? w ? E.prototype.indexOf.call(n, t, r) : E.prototype.lastIndexOf.call(n, t, r) : M(n, [t], r, u, w);
    throw new TypeError("val must be string, number or Buffer");
  }
  function M(n, t, r, u, w) {
    let T = 1, _ = n.length, H = t.length;
    if (u !== void 0 && (u = String(u).toLowerCase(), u === "ucs2" || u === "ucs-2" || u === "utf16le" || u === "utf-16le")) {
      if (n.length < 2 || t.length < 2)
        return -1;
      T = 2, _ /= 2, H /= 2, r /= 2;
    }
    function X(pt, ot) {
      return T === 1 ? pt[ot] : pt.readUInt16BE(ot * T);
    }
    let ct;
    if (w) {
      let pt = -1;
      for (ct = r; ct < _; ct++)
        if (X(n, ct) === X(t, pt === -1 ? 0 : ct - pt)) {
          if (pt === -1 && (pt = ct), ct - pt + 1 === H)
            return pt * T;
        } else
          pt !== -1 && (ct -= ct - pt), pt = -1;
    } else
      for (r + H > _ && (r = _ - H), ct = r; ct >= 0; ct--) {
        let pt = !0;
        for (let ot = 0; ot < H; ot++)
          if (X(n, ct + ot) !== X(t, ot)) {
            pt = !1;
            break;
          }
        if (pt)
          return ct;
      }
    return -1;
  }
  d.prototype.includes = function(t, r, u) {
    return this.indexOf(t, r, u) !== -1;
  }, d.prototype.indexOf = function(t, r, u) {
    return J(this, t, r, u, !0);
  }, d.prototype.lastIndexOf = function(t, r, u) {
    return J(this, t, r, u, !1);
  };
  function rt(n, t, r, u) {
    r = Number(r) || 0;
    const w = n.length - r;
    u ? (u = Number(u), u > w && (u = w)) : u = w;
    const T = t.length;
    u > T / 2 && (u = T / 2);
    let _;
    for (_ = 0; _ < u; ++_) {
      const H = parseInt(t.substr(_ * 2, 2), 16);
      if (st(H))
        return _;
      n[r + _] = H;
    }
    return _;
  }
  function et(n, t, r, u) {
    return tt(U(t, n.length - r), n, r, u);
  }
  function nt(n, t, r, u) {
    return tt(k(t), n, r, u);
  }
  function ht(n, t, r, u) {
    return tt(z(t), n, r, u);
  }
  function dt(n, t, r, u) {
    return tt(W(t, n.length - r), n, r, u);
  }
  d.prototype.write = function(t, r, u, w) {
    if (r === void 0)
      w = "utf8", u = this.length, r = 0;
    else if (u === void 0 && typeof r == "string")
      w = r, u = this.length, r = 0;
    else if (isFinite(r))
      r = r >>> 0, isFinite(u) ? (u = u >>> 0, w === void 0 && (w = "utf8")) : (w = u, u = void 0);
    else
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    const T = this.length - r;
    if ((u === void 0 || u > T) && (u = T), t.length > 0 && (u < 0 || r < 0) || r > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    w || (w = "utf8");
    let _ = !1;
    for (; ; )
      switch (w) {
        case "hex":
          return rt(this, t, r, u);
        case "utf8":
        case "utf-8":
          return et(this, t, r, u);
        case "ascii":
        case "latin1":
        case "binary":
          return nt(this, t, r, u);
        case "base64":
          return ht(this, t, r, u);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return dt(this, t, r, u);
        default:
          if (_)
            throw new TypeError("Unknown encoding: " + w);
          w = ("" + w).toLowerCase(), _ = !0;
      }
  }, d.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function mt(n, t, r) {
    return t === 0 && r === n.length ? a.fromByteArray(n) : a.fromByteArray(n.slice(t, r));
  }
  function yt(n, t, r) {
    r = Math.min(n.length, r);
    const u = [];
    let w = t;
    for (; w < r; ) {
      const T = n[w];
      let _ = null, H = T > 239 ? 4 : T > 223 ? 3 : T > 191 ? 2 : 1;
      if (w + H <= r) {
        let X, ct, pt, ot;
        switch (H) {
          case 1:
            T < 128 && (_ = T);
            break;
          case 2:
            X = n[w + 1], (X & 192) === 128 && (ot = (T & 31) << 6 | X & 63, ot > 127 && (_ = ot));
            break;
          case 3:
            X = n[w + 1], ct = n[w + 2], (X & 192) === 128 && (ct & 192) === 128 && (ot = (T & 15) << 12 | (X & 63) << 6 | ct & 63, ot > 2047 && (ot < 55296 || ot > 57343) && (_ = ot));
            break;
          case 4:
            X = n[w + 1], ct = n[w + 2], pt = n[w + 3], (X & 192) === 128 && (ct & 192) === 128 && (pt & 192) === 128 && (ot = (T & 15) << 18 | (X & 63) << 12 | (ct & 63) << 6 | pt & 63, ot > 65535 && ot < 1114112 && (_ = ot));
        }
      }
      _ === null ? (_ = 65533, H = 1) : _ > 65535 && (_ -= 65536, u.push(_ >>> 10 & 1023 | 55296), _ = 56320 | _ & 1023), u.push(_), w += H;
    }
    return It(u);
  }
  const Bt = 4096;
  function It(n) {
    const t = n.length;
    if (t <= Bt)
      return String.fromCharCode.apply(String, n);
    let r = "", u = 0;
    for (; u < t; )
      r += String.fromCharCode.apply(
        String,
        n.slice(u, u += Bt)
      );
    return r;
  }
  function bt(n, t, r) {
    let u = "";
    r = Math.min(n.length, r);
    for (let w = t; w < r; ++w)
      u += String.fromCharCode(n[w] & 127);
    return u;
  }
  function ut(n, t, r) {
    let u = "";
    r = Math.min(n.length, r);
    for (let w = t; w < r; ++w)
      u += String.fromCharCode(n[w]);
    return u;
  }
  function ft(n, t, r) {
    const u = n.length;
    (!t || t < 0) && (t = 0), (!r || r < 0 || r > u) && (r = u);
    let w = "";
    for (let T = t; T < r; ++T)
      w += e[n[T]];
    return w;
  }
  function Ot(n, t, r) {
    const u = n.slice(t, r);
    let w = "";
    for (let T = 0; T < u.length - 1; T += 2)
      w += String.fromCharCode(u[T] + u[T + 1] * 256);
    return w;
  }
  d.prototype.slice = function(t, r) {
    const u = this.length;
    t = ~~t, r = r === void 0 ? u : ~~r, t < 0 ? (t += u, t < 0 && (t = 0)) : t > u && (t = u), r < 0 ? (r += u, r < 0 && (r = 0)) : r > u && (r = u), r < t && (r = t);
    const w = this.subarray(t, r);
    return Object.setPrototypeOf(w, d.prototype), w;
  };
  function N(n, t, r) {
    if (n % 1 !== 0 || n < 0)
      throw new RangeError("offset is not uint");
    if (n + t > r)
      throw new RangeError("Trying to access beyond buffer length");
  }
  d.prototype.readUintLE = d.prototype.readUIntLE = function(t, r, u) {
    t = t >>> 0, r = r >>> 0, u || N(t, r, this.length);
    let w = this[t], T = 1, _ = 0;
    for (; ++_ < r && (T *= 256); )
      w += this[t + _] * T;
    return w;
  }, d.prototype.readUintBE = d.prototype.readUIntBE = function(t, r, u) {
    t = t >>> 0, r = r >>> 0, u || N(t, r, this.length);
    let w = this[t + --r], T = 1;
    for (; r > 0 && (T *= 256); )
      w += this[t + --r] * T;
    return w;
  }, d.prototype.readUint8 = d.prototype.readUInt8 = function(t, r) {
    return t = t >>> 0, r || N(t, 1, this.length), this[t];
  }, d.prototype.readUint16LE = d.prototype.readUInt16LE = function(t, r) {
    return t = t >>> 0, r || N(t, 2, this.length), this[t] | this[t + 1] << 8;
  }, d.prototype.readUint16BE = d.prototype.readUInt16BE = function(t, r) {
    return t = t >>> 0, r || N(t, 2, this.length), this[t] << 8 | this[t + 1];
  }, d.prototype.readUint32LE = d.prototype.readUInt32LE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + this[t + 3] * 16777216;
  }, d.prototype.readUint32BE = d.prototype.readUInt32BE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), this[t] * 16777216 + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]);
  }, d.prototype.readBigUInt64LE = i(function(t) {
    t = t >>> 0, L(t, "offset");
    const r = this[t], u = this[t + 7];
    (r === void 0 || u === void 0) && B(t, this.length - 8);
    const w = r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24, T = this[++t] + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + u * 2 ** 24;
    return BigInt(w) + (BigInt(T) << BigInt(32));
  }), d.prototype.readBigUInt64BE = i(function(t) {
    t = t >>> 0, L(t, "offset");
    const r = this[t], u = this[t + 7];
    (r === void 0 || u === void 0) && B(t, this.length - 8);
    const w = r * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t], T = this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + u;
    return (BigInt(w) << BigInt(32)) + BigInt(T);
  }), d.prototype.readIntLE = function(t, r, u) {
    t = t >>> 0, r = r >>> 0, u || N(t, r, this.length);
    let w = this[t], T = 1, _ = 0;
    for (; ++_ < r && (T *= 256); )
      w += this[t + _] * T;
    return T *= 128, w >= T && (w -= Math.pow(2, 8 * r)), w;
  }, d.prototype.readIntBE = function(t, r, u) {
    t = t >>> 0, r = r >>> 0, u || N(t, r, this.length);
    let w = r, T = 1, _ = this[t + --w];
    for (; w > 0 && (T *= 256); )
      _ += this[t + --w] * T;
    return T *= 128, _ >= T && (_ -= Math.pow(2, 8 * r)), _;
  }, d.prototype.readInt8 = function(t, r) {
    return t = t >>> 0, r || N(t, 1, this.length), this[t] & 128 ? (255 - this[t] + 1) * -1 : this[t];
  }, d.prototype.readInt16LE = function(t, r) {
    t = t >>> 0, r || N(t, 2, this.length);
    const u = this[t] | this[t + 1] << 8;
    return u & 32768 ? u | 4294901760 : u;
  }, d.prototype.readInt16BE = function(t, r) {
    t = t >>> 0, r || N(t, 2, this.length);
    const u = this[t + 1] | this[t] << 8;
    return u & 32768 ? u | 4294901760 : u;
  }, d.prototype.readInt32LE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24;
  }, d.prototype.readInt32BE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3];
  }, d.prototype.readBigInt64LE = i(function(t) {
    t = t >>> 0, L(t, "offset");
    const r = this[t], u = this[t + 7];
    (r === void 0 || u === void 0) && B(t, this.length - 8);
    const w = this[t + 4] + this[t + 5] * 2 ** 8 + this[t + 6] * 2 ** 16 + (u << 24);
    return (BigInt(w) << BigInt(32)) + BigInt(r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24);
  }), d.prototype.readBigInt64BE = i(function(t) {
    t = t >>> 0, L(t, "offset");
    const r = this[t], u = this[t + 7];
    (r === void 0 || u === void 0) && B(t, this.length - 8);
    const w = (r << 24) + // Overflow
    this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t];
    return (BigInt(w) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + u);
  }), d.prototype.readFloatLE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), f.read(this, t, !0, 23, 4);
  }, d.prototype.readFloatBE = function(t, r) {
    return t = t >>> 0, r || N(t, 4, this.length), f.read(this, t, !1, 23, 4);
  }, d.prototype.readDoubleLE = function(t, r) {
    return t = t >>> 0, r || N(t, 8, this.length), f.read(this, t, !0, 52, 8);
  }, d.prototype.readDoubleBE = function(t, r) {
    return t = t >>> 0, r || N(t, 8, this.length), f.read(this, t, !1, 52, 8);
  };
  function gt(n, t, r, u, w, T) {
    if (!d.isBuffer(n))
      throw new TypeError('"buffer" argument must be a Buffer instance');
    if (t > w || t < T)
      throw new RangeError('"value" argument is out of bounds');
    if (r + u > n.length)
      throw new RangeError("Index out of range");
  }
  d.prototype.writeUintLE = d.prototype.writeUIntLE = function(t, r, u, w) {
    if (t = +t, r = r >>> 0, u = u >>> 0, !w) {
      const H = Math.pow(2, 8 * u) - 1;
      gt(this, t, r, u, H, 0);
    }
    let T = 1, _ = 0;
    for (this[r] = t & 255; ++_ < u && (T *= 256); )
      this[r + _] = t / T & 255;
    return r + u;
  }, d.prototype.writeUintBE = d.prototype.writeUIntBE = function(t, r, u, w) {
    if (t = +t, r = r >>> 0, u = u >>> 0, !w) {
      const H = Math.pow(2, 8 * u) - 1;
      gt(this, t, r, u, H, 0);
    }
    let T = u - 1, _ = 1;
    for (this[r + T] = t & 255; --T >= 0 && (_ *= 256); )
      this[r + T] = t / _ & 255;
    return r + u;
  }, d.prototype.writeUint8 = d.prototype.writeUInt8 = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 1, 255, 0), this[r] = t & 255, r + 1;
  }, d.prototype.writeUint16LE = d.prototype.writeUInt16LE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 2, 65535, 0), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, d.prototype.writeUint16BE = d.prototype.writeUInt16BE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 2, 65535, 0), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, d.prototype.writeUint32LE = d.prototype.writeUInt32LE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 4, 4294967295, 0), this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = t & 255, r + 4;
  }, d.prototype.writeUint32BE = d.prototype.writeUInt32BE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 4, 4294967295, 0), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  };
  function kt(n, t, r, u, w) {
    I(t, u, w, n, r, 7);
    let T = Number(t & BigInt(4294967295));
    n[r++] = T, T = T >> 8, n[r++] = T, T = T >> 8, n[r++] = T, T = T >> 8, n[r++] = T;
    let _ = Number(t >> BigInt(32) & BigInt(4294967295));
    return n[r++] = _, _ = _ >> 8, n[r++] = _, _ = _ >> 8, n[r++] = _, _ = _ >> 8, n[r++] = _, r;
  }
  function Rt(n, t, r, u, w) {
    I(t, u, w, n, r, 7);
    let T = Number(t & BigInt(4294967295));
    n[r + 7] = T, T = T >> 8, n[r + 6] = T, T = T >> 8, n[r + 5] = T, T = T >> 8, n[r + 4] = T;
    let _ = Number(t >> BigInt(32) & BigInt(4294967295));
    return n[r + 3] = _, _ = _ >> 8, n[r + 2] = _, _ = _ >> 8, n[r + 1] = _, _ = _ >> 8, n[r] = _, r + 8;
  }
  d.prototype.writeBigUInt64LE = i(function(t, r = 0) {
    return kt(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), d.prototype.writeBigUInt64BE = i(function(t, r = 0) {
    return Rt(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), d.prototype.writeIntLE = function(t, r, u, w) {
    if (t = +t, r = r >>> 0, !w) {
      const X = Math.pow(2, 8 * u - 1);
      gt(this, t, r, u, X - 1, -X);
    }
    let T = 0, _ = 1, H = 0;
    for (this[r] = t & 255; ++T < u && (_ *= 256); )
      t < 0 && H === 0 && this[r + T - 1] !== 0 && (H = 1), this[r + T] = (t / _ >> 0) - H & 255;
    return r + u;
  }, d.prototype.writeIntBE = function(t, r, u, w) {
    if (t = +t, r = r >>> 0, !w) {
      const X = Math.pow(2, 8 * u - 1);
      gt(this, t, r, u, X - 1, -X);
    }
    let T = u - 1, _ = 1, H = 0;
    for (this[r + T] = t & 255; --T >= 0 && (_ *= 256); )
      t < 0 && H === 0 && this[r + T + 1] !== 0 && (H = 1), this[r + T] = (t / _ >> 0) - H & 255;
    return r + u;
  }, d.prototype.writeInt8 = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[r] = t & 255, r + 1;
  }, d.prototype.writeInt16LE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 2, 32767, -32768), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, d.prototype.writeInt16BE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 2, 32767, -32768), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, d.prototype.writeInt32LE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 4, 2147483647, -2147483648), this[r] = t & 255, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24, r + 4;
  }, d.prototype.writeInt32BE = function(t, r, u) {
    return t = +t, r = r >>> 0, u || gt(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  }, d.prototype.writeBigInt64LE = i(function(t, r = 0) {
    return kt(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }), d.prototype.writeBigInt64BE = i(function(t, r = 0) {
    return Rt(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function lt(n, t, r, u, w, T) {
    if (r + u > n.length)
      throw new RangeError("Index out of range");
    if (r < 0)
      throw new RangeError("Index out of range");
  }
  function wt(n, t, r, u, w) {
    return t = +t, r = r >>> 0, w || lt(n, t, r, 4), f.write(n, t, r, u, 23, 4), r + 4;
  }
  d.prototype.writeFloatLE = function(t, r, u) {
    return wt(this, t, r, !0, u);
  }, d.prototype.writeFloatBE = function(t, r, u) {
    return wt(this, t, r, !1, u);
  };
  function h(n, t, r, u, w) {
    return t = +t, r = r >>> 0, w || lt(n, t, r, 8), f.write(n, t, r, u, 52, 8), r + 8;
  }
  d.prototype.writeDoubleLE = function(t, r, u) {
    return h(this, t, r, !0, u);
  }, d.prototype.writeDoubleBE = function(t, r, u) {
    return h(this, t, r, !1, u);
  }, d.prototype.copy = function(t, r, u, w) {
    if (!d.isBuffer(t))
      throw new TypeError("argument should be a Buffer");
    if (u || (u = 0), !w && w !== 0 && (w = this.length), r >= t.length && (r = t.length), r || (r = 0), w > 0 && w < u && (w = u), w === u || t.length === 0 || this.length === 0)
      return 0;
    if (r < 0)
      throw new RangeError("targetStart out of bounds");
    if (u < 0 || u >= this.length)
      throw new RangeError("Index out of range");
    if (w < 0)
      throw new RangeError("sourceEnd out of bounds");
    w > this.length && (w = this.length), t.length - r < w - u && (w = t.length - r + u);
    const T = w - u;
    return this === t && typeof E.prototype.copyWithin == "function" ? this.copyWithin(r, u, w) : E.prototype.set.call(
      t,
      this.subarray(u, w),
      r
    ), T;
  }, d.prototype.fill = function(t, r, u, w) {
    if (typeof t == "string") {
      if (typeof r == "string" ? (w = r, r = 0, u = this.length) : typeof u == "string" && (w = u, u = this.length), w !== void 0 && typeof w != "string")
        throw new TypeError("encoding must be a string");
      if (typeof w == "string" && !d.isEncoding(w))
        throw new TypeError("Unknown encoding: " + w);
      if (t.length === 1) {
        const _ = t.charCodeAt(0);
        (w === "utf8" && _ < 128 || w === "latin1") && (t = _);
      }
    } else
      typeof t == "number" ? t = t & 255 : typeof t == "boolean" && (t = Number(t));
    if (r < 0 || this.length < r || this.length < u)
      throw new RangeError("Out of range index");
    if (u <= r)
      return this;
    r = r >>> 0, u = u === void 0 ? this.length : u >>> 0, t || (t = 0);
    let T;
    if (typeof t == "number")
      for (T = r; T < u; ++T)
        this[T] = t;
    else {
      const _ = d.isBuffer(t) ? t : d.from(t, w), H = _.length;
      if (H === 0)
        throw new TypeError('The value "' + t + '" is invalid for argument "value"');
      for (T = 0; T < u - r; ++T)
        this[T + r] = _[T % H];
    }
    return this;
  };
  const g = {};
  function y(n, t, r) {
    g[n] = class extends r {
      constructor() {
        super(), Object.defineProperty(this, "message", {
          value: t.apply(this, arguments),
          writable: !0,
          configurable: !0
        }), this.name = `${this.name} [${n}]`, this.stack, delete this.name;
      }
      get code() {
        return n;
      }
      set code(w) {
        Object.defineProperty(this, "code", {
          configurable: !0,
          enumerable: !0,
          value: w,
          writable: !0
        });
      }
      toString() {
        return `${this.name} [${n}]: ${this.message}`;
      }
    };
  }
  y(
    "ERR_BUFFER_OUT_OF_BOUNDS",
    function(n) {
      return n ? `${n} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
    },
    RangeError
  ), y(
    "ERR_INVALID_ARG_TYPE",
    function(n, t) {
      return `The "${n}" argument must be of type number. Received type ${typeof t}`;
    },
    TypeError
  ), y(
    "ERR_OUT_OF_RANGE",
    function(n, t, r) {
      let u = `The value of "${n}" is out of range.`, w = r;
      return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? w = v(String(r)) : typeof r == "bigint" && (w = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (w = v(w)), w += "n"), u += ` It must be ${t}. Received ${w}`, u;
    },
    RangeError
  );
  function v(n) {
    let t = "", r = n.length;
    const u = n[0] === "-" ? 1 : 0;
    for (; r >= u + 4; r -= 3)
      t = `_${n.slice(r - 3, r)}${t}`;
    return `${n.slice(0, r)}${t}`;
  }
  function A(n, t, r) {
    L(t, "offset"), (n[t] === void 0 || n[t + r] === void 0) && B(t, n.length - (r + 1));
  }
  function I(n, t, r, u, w, T) {
    if (n > r || n < t) {
      const _ = typeof t == "bigint" ? "n" : "";
      let H;
      throw T > 3 ? t === 0 || t === BigInt(0) ? H = `>= 0${_} and < 2${_} ** ${(T + 1) * 8}${_}` : H = `>= -(2${_} ** ${(T + 1) * 8 - 1}${_}) and < 2 ** ${(T + 1) * 8 - 1}${_}` : H = `>= ${t}${_} and <= ${r}${_}`, new g.ERR_OUT_OF_RANGE("value", H, n);
    }
    A(u, w, T);
  }
  function L(n, t) {
    if (typeof n != "number")
      throw new g.ERR_INVALID_ARG_TYPE(t, "number", n);
  }
  function B(n, t, r) {
    throw Math.floor(n) !== n ? (L(n, r), new g.ERR_OUT_OF_RANGE(r || "offset", "an integer", n)) : t < 0 ? new g.ERR_BUFFER_OUT_OF_BOUNDS() : new g.ERR_OUT_OF_RANGE(
      r || "offset",
      `>= ${r ? 1 : 0} and <= ${t}`,
      n
    );
  }
  const x = /[^+/0-9A-Za-z-_]/g;
  function R(n) {
    if (n = n.split("=")[0], n = n.trim().replace(x, ""), n.length < 2)
      return "";
    for (; n.length % 4 !== 0; )
      n = n + "=";
    return n;
  }
  function U(n, t) {
    t = t || 1 / 0;
    let r;
    const u = n.length;
    let w = null;
    const T = [];
    for (let _ = 0; _ < u; ++_) {
      if (r = n.charCodeAt(_), r > 55295 && r < 57344) {
        if (!w) {
          if (r > 56319) {
            (t -= 3) > -1 && T.push(239, 191, 189);
            continue;
          } else if (_ + 1 === u) {
            (t -= 3) > -1 && T.push(239, 191, 189);
            continue;
          }
          w = r;
          continue;
        }
        if (r < 56320) {
          (t -= 3) > -1 && T.push(239, 191, 189), w = r;
          continue;
        }
        r = (w - 55296 << 10 | r - 56320) + 65536;
      } else
        w && (t -= 3) > -1 && T.push(239, 191, 189);
      if (w = null, r < 128) {
        if ((t -= 1) < 0)
          break;
        T.push(r);
      } else if (r < 2048) {
        if ((t -= 2) < 0)
          break;
        T.push(
          r >> 6 | 192,
          r & 63 | 128
        );
      } else if (r < 65536) {
        if ((t -= 3) < 0)
          break;
        T.push(
          r >> 12 | 224,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else if (r < 1114112) {
        if ((t -= 4) < 0)
          break;
        T.push(
          r >> 18 | 240,
          r >> 12 & 63 | 128,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else
        throw new Error("Invalid code point");
    }
    return T;
  }
  function k(n) {
    const t = [];
    for (let r = 0; r < n.length; ++r)
      t.push(n.charCodeAt(r) & 255);
    return t;
  }
  function W(n, t) {
    let r, u, w;
    const T = [];
    for (let _ = 0; _ < n.length && !((t -= 2) < 0); ++_)
      r = n.charCodeAt(_), u = r >> 8, w = r % 256, T.push(w), T.push(u);
    return T;
  }
  function z(n) {
    return a.toByteArray(R(n));
  }
  function tt(n, t, r, u) {
    let w;
    for (w = 0; w < u && !(w + r >= t.length || w >= n.length); ++w)
      t[w + r] = n[w];
    return w;
  }
  function V(n, t) {
    return n instanceof t || n != null && n.constructor != null && n.constructor.name != null && n.constructor.name === t.name;
  }
  function st(n) {
    return n !== n;
  }
  const e = function() {
    const n = "0123456789abcdef", t = new Array(256);
    for (let r = 0; r < 16; ++r) {
      const u = r * 16;
      for (let w = 0; w < 16; ++w)
        t[u + w] = n[r] + n[w];
    }
    return t;
  }();
  function i(n) {
    return typeof BigInt > "u" ? s : n;
  }
  function s() {
    throw new Error("BigInt not supported");
  }
})(qe);
const Et = qe.Buffer;
var oe = {}, Te;
function We() {
  return Te || (Te = 1, function(o) {
    Object.defineProperty(o, "__esModule", { value: !0 }), o.debug = o.validatePath = o.arrayCompare = o.bufferToInt = o.intToBuffer = o.arrayFlatten = o.generateProofs = o.buildLayers = o.generateTransactionChunks = o.generateTree = o.computeRootHash = o.generateLeaves = o.chunkData = o.MIN_CHUNK_SIZE = o.MAX_CHUNK_SIZE = void 0;
    const a = Vt(), f = it;
    o.MAX_CHUNK_SIZE = 256 * 1024, o.MIN_CHUNK_SIZE = 32 * 1024;
    const p = 32, m = 32;
    async function E(j) {
      let O = [], P = j, q = 0;
      for (; P.byteLength >= o.MAX_CHUNK_SIZE; ) {
        let J = o.MAX_CHUNK_SIZE, M = P.byteLength - o.MAX_CHUNK_SIZE;
        M > 0 && M < o.MIN_CHUNK_SIZE && (J = Math.ceil(P.byteLength / 2));
        const rt = P.slice(0, J), et = await a.default.crypto.hash(rt);
        q += rt.byteLength, O.push({
          dataHash: et,
          minByteRange: q - rt.byteLength,
          maxByteRange: q
        }), P = P.slice(J);
      }
      return O.push({
        dataHash: await a.default.crypto.hash(P),
        minByteRange: q,
        maxByteRange: q + P.byteLength
      }), O;
    }
    o.chunkData = E;
    async function l(j) {
      return Promise.all(j.map(async ({ dataHash: O, minByteRange: P, maxByteRange: q }) => ({
        type: "leaf",
        id: await D(await Promise.all([D(O), D(G(q))])),
        dataHash: O,
        minByteRange: P,
        maxByteRange: q
      })));
    }
    o.generateLeaves = l;
    async function c(j) {
      return (await b(j)).id;
    }
    o.computeRootHash = c;
    async function b(j) {
      return await d(await l(await E(j)));
    }
    o.generateTree = b;
    async function S(j) {
      const O = await E(j), P = await l(O), q = await d(P), J = await $(q), M = O.slice(-1)[0];
      return M.maxByteRange - M.minByteRange === 0 && (O.splice(O.length - 1, 1), J.splice(J.length - 1, 1)), {
        data_root: q.id,
        chunks: O,
        proofs: J
      };
    }
    o.generateTransactionChunks = S;
    async function d(j, O = 0) {
      if (j.length < 2)
        return j[0];
      const P = [];
      for (let q = 0; q < j.length; q += 2)
        P.push(await K(j[q], j[q + 1]));
      return d(P, O + 1);
    }
    o.buildLayers = d;
    function $(j) {
      const O = F(j);
      return Array.isArray(O) ? C(O) : [O];
    }
    o.generateProofs = $;
    function F(j, O = new Uint8Array(), P = 0) {
      if (j.type == "leaf")
        return {
          offset: j.maxByteRange - 1,
          proof: (0, f.concatBuffers)([
            O,
            j.dataHash,
            G(j.maxByteRange)
          ])
        };
      if (j.type == "branch") {
        const q = (0, f.concatBuffers)([
          O,
          j.leftChild.id,
          j.rightChild.id,
          G(j.byteRange)
        ]);
        return [
          F(j.leftChild, q, P + 1),
          F(j.rightChild, q, P + 1)
        ];
      }
      throw new Error("Unexpected node type");
    }
    function C(j) {
      const O = [];
      return j.forEach((P) => {
        Array.isArray(P) ? O.push(...C(P)) : O.push(P);
      }), O;
    }
    o.arrayFlatten = C;
    async function K(j, O) {
      return O ? {
        type: "branch",
        id: await D([
          await D(j.id),
          await D(O.id),
          await D(G(j.maxByteRange))
        ]),
        byteRange: j.maxByteRange,
        maxByteRange: O.maxByteRange,
        leftChild: j,
        rightChild: O
      } : j;
    }
    async function D(j) {
      return Array.isArray(j) && (j = a.default.utils.concatBuffers(j)), new Uint8Array(await a.default.crypto.hash(j));
    }
    function G(j) {
      const O = new Uint8Array(p);
      for (var P = O.length - 1; P >= 0; P--) {
        var q = j % 256;
        O[P] = q, j = (j - q) / 256;
      }
      return O;
    }
    o.intToBuffer = G;
    function Z(j) {
      let O = 0;
      for (var P = 0; P < j.length; P++)
        O *= 256, O += j[P];
      return O;
    }
    o.bufferToInt = Z;
    const Y = (j, O) => j.every((P, q) => O[q] === P);
    o.arrayCompare = Y;
    async function Q(j, O, P, q, J) {
      if (q <= 0)
        return !1;
      if (O >= q)
        return Q(j, 0, q - 1, q, J);
      if (O < 0)
        return Q(j, 0, 0, q, J);
      if (J.length == m + p) {
        const mt = J.slice(0, m), yt = J.slice(mt.length, mt.length + p), Bt = await D([
          await D(mt),
          await D(yt)
        ]);
        return (0, o.arrayCompare)(j, Bt) ? {
          offset: q - 1,
          leftBound: P,
          rightBound: q,
          chunkSize: q - P
        } : !1;
      }
      const M = J.slice(0, m), rt = J.slice(M.length, M.length + m), et = J.slice(M.length + rt.length, M.length + rt.length + p), nt = Z(et), ht = J.slice(M.length + rt.length + et.length), dt = await D([
        await D(M),
        await D(rt),
        await D(et)
      ]);
      return (0, o.arrayCompare)(j, dt) ? O < nt ? await Q(M, O, P, Math.min(q, nt), ht) : await Q(rt, O, Math.max(P, nt), q, ht) : !1;
    }
    o.validatePath = Q;
    async function at(j, O = "") {
      if (j.byteLength < 1)
        return O;
      const P = j.slice(0, m), q = j.slice(P.length, P.length + m), J = j.slice(P.length + q.length, P.length + q.length + p), M = Z(J), rt = j.slice(P.length + q.length + J.length), et = await D([
        await D(P),
        await D(q),
        await D(J)
      ]), nt = `${O}
${JSON.stringify(Et.from(P))},${JSON.stringify(Et.from(q))},${M} => ${JSON.stringify(et)}`;
      return at(rt, nt);
    }
    o.debug = at;
  }(oe)), oe;
}
var xe;
function de() {
  if (xe)
    return $t;
  xe = 1, Object.defineProperty($t, "__esModule", { value: !0 }), $t.Tag = void 0;
  const o = it, a = Ir(), f = We();
  class p {
    get(c, b) {
      if (!Object.getOwnPropertyNames(this).includes(c))
        throw new Error(`Field "${c}" is not a property of the Arweave Transaction class.`);
      if (this[c] instanceof Uint8Array)
        return b && b.decode && b.string ? o.bufferToString(this[c]) : b && b.decode && !b.string ? this[c] : o.bufferTob64Url(this[c]);
      if (this[c] instanceof Array) {
        if (b?.decode !== void 0 || b?.string !== void 0)
          throw c === "tags" && console.warn(`Did you mean to use 'transaction["tags"]' ?`), new Error("Cannot decode or stringify an array.");
        return this[c];
      }
      return b && b.decode == !0 ? b && b.string ? o.b64UrlToString(this[c]) : o.b64UrlToBuffer(this[c]) : this[c];
    }
  }
  class m extends p {
    name;
    value;
    constructor(c, b, S = !1) {
      super(), this.name = c, this.value = b;
    }
  }
  $t.Tag = m;
  class E extends p {
    format = 2;
    id = "";
    last_tx = "";
    owner = "";
    tags = [];
    target = "";
    quantity = "0";
    data_size = "0";
    data = new Uint8Array();
    data_root = "";
    reward = "0";
    signature = "";
    // Computed when needed.
    chunks;
    constructor(c = {}) {
      super(), Object.assign(this, c), typeof this.data == "string" && (this.data = o.b64UrlToBuffer(this.data)), c.tags && (this.tags = c.tags.map((b) => new m(b.name, b.value)));
    }
    addTag(c, b) {
      this.tags.push(new m(o.stringToB64Url(c), o.stringToB64Url(b)));
    }
    toJSON() {
      return {
        format: this.format,
        id: this.id,
        last_tx: this.last_tx,
        owner: this.owner,
        tags: this.tags,
        target: this.target,
        quantity: this.quantity,
        data: o.bufferTob64Url(this.data),
        data_size: this.data_size,
        data_root: this.data_root,
        data_tree: this.data_tree,
        reward: this.reward,
        signature: this.signature
      };
    }
    setOwner(c) {
      this.owner = c;
    }
    setSignature({ id: c, owner: b, reward: S, tags: d, signature: $ }) {
      this.id = c, this.owner = b, S && (this.reward = S), d && (this.tags = d), this.signature = $;
    }
    async prepareChunks(c) {
      !this.chunks && c.byteLength > 0 && (this.chunks = await (0, f.generateTransactionChunks)(c), this.data_root = o.bufferTob64Url(this.chunks.data_root)), !this.chunks && c.byteLength === 0 && (this.chunks = {
        chunks: [],
        data_root: new Uint8Array(),
        proofs: []
      }, this.data_root = "");
    }
    // Returns a chunk in a format suitable for posting to /chunk.
    // Similar to `prepareChunks()` this does not operate `this.data`,
    // instead using the data passed in.
    getChunk(c, b) {
      if (!this.chunks)
        throw new Error("Chunks have not been prepared");
      const S = this.chunks.proofs[c], d = this.chunks.chunks[c];
      return {
        data_root: this.data_root,
        data_size: this.data_size,
        data_path: o.bufferTob64Url(S.proof),
        offset: S.offset.toString(),
        chunk: o.bufferTob64Url(b.slice(d.minByteRange, d.maxByteRange))
      };
    }
    async getSignatureData() {
      switch (this.format) {
        case 1:
          let c = this.tags.reduce((S, d) => o.concatBuffers([
            S,
            d.get("name", { decode: !0, string: !1 }),
            d.get("value", { decode: !0, string: !1 })
          ]), new Uint8Array());
          return o.concatBuffers([
            this.get("owner", { decode: !0, string: !1 }),
            this.get("target", { decode: !0, string: !1 }),
            this.get("data", { decode: !0, string: !1 }),
            o.stringToBuffer(this.quantity),
            o.stringToBuffer(this.reward),
            this.get("last_tx", { decode: !0, string: !1 }),
            c
          ]);
        case 2:
          this.data_root || await this.prepareChunks(this.data);
          const b = this.tags.map((S) => [
            S.get("name", { decode: !0, string: !1 }),
            S.get("value", { decode: !0, string: !1 })
          ]);
          return await (0, a.default)([
            o.stringToBuffer(this.format.toString()),
            this.get("owner", { decode: !0, string: !1 }),
            this.get("target", { decode: !0, string: !1 }),
            o.stringToBuffer(this.quantity),
            o.stringToBuffer(this.reward),
            this.get("last_tx", { decode: !0, string: !1 }),
            b,
            o.stringToBuffer(this.data_size),
            this.get("data_root", { decode: !0, string: !1 })
          ]);
        default:
          throw new Error(`Unexpected transaction format: ${this.format}`);
      }
    }
  }
  return $t.default = E, $t;
}
var Kt = {}, Se;
function Nr() {
  if (Se)
    return Kt;
  Se = 1, Object.defineProperty(Kt, "__esModule", { value: !0 }), Kt.TransactionUploader = void 0;
  const o = de(), a = it, f = Pt, p = We(), m = 1, E = [
    "invalid_json",
    "chunk_too_big",
    "data_path_too_big",
    "offset_too_big",
    "data_size_too_big",
    "chunk_proof_ratio_not_attractive",
    "invalid_proof"
  ], l = 1e3 * 40;
  class c {
    api;
    chunkIndex = 0;
    txPosted = !1;
    transaction;
    lastRequestTimeEnd = 0;
    totalErrors = 0;
    // Not serialized.
    data;
    lastResponseStatus = 0;
    lastResponseError = "";
    get isComplete() {
      return this.txPosted && this.chunkIndex === this.transaction.chunks.chunks.length;
    }
    get totalChunks() {
      return this.transaction.chunks.chunks.length;
    }
    get uploadedChunks() {
      return this.chunkIndex;
    }
    get pctComplete() {
      return Math.trunc(this.uploadedChunks / this.totalChunks * 100);
    }
    constructor(S, d) {
      if (this.api = S, !d.id)
        throw new Error("Transaction is not signed");
      if (!d.chunks)
        throw new Error("Transaction chunks not prepared");
      this.data = d.data, this.transaction = new o.default(Object.assign({}, d, { data: new Uint8Array(0) }));
    }
    /**
     * Uploads the next part of the transaction.
     * On the first call this posts the transaction
     * itself and on any subsequent calls uploads the
     * next chunk until it completes.
     */
    async uploadChunk(S) {
      if (this.isComplete)
        throw new Error("Upload is already complete");
      if (this.lastResponseError !== "" ? this.totalErrors++ : this.totalErrors = 0, this.totalErrors === 100)
        throw new Error(`Unable to complete upload: ${this.lastResponseStatus}: ${this.lastResponseError}`);
      let d = this.lastResponseError === "" ? 0 : Math.max(this.lastRequestTimeEnd + l - Date.now(), l);
      if (d > 0 && (d = d - d * Math.random() * 0.3, await new Promise((K) => setTimeout(K, d))), this.lastResponseError = "", !this.txPosted) {
        await this.postTransaction();
        return;
      }
      S && (this.chunkIndex = S);
      const $ = this.transaction.getChunk(S || this.chunkIndex, this.data);
      if (!await (0, p.validatePath)(this.transaction.chunks.data_root, parseInt($.offset), 0, parseInt($.data_size), a.b64UrlToBuffer($.data_path)))
        throw new Error(`Unable to validate chunk ${this.chunkIndex}`);
      const C = await this.api.post("chunk", this.transaction.getChunk(this.chunkIndex, this.data)).catch((K) => (console.error(K.message), { status: -1, data: { error: K.message } }));
      if (this.lastRequestTimeEnd = Date.now(), this.lastResponseStatus = C.status, this.lastResponseStatus == 200)
        this.chunkIndex++;
      else if (this.lastResponseError = (0, f.getError)(C), E.includes(this.lastResponseError))
        throw new Error(`Fatal error uploading chunk ${this.chunkIndex}: ${this.lastResponseError}`);
    }
    /**
     * Reconstructs an upload from its serialized state and data.
     * Checks if data matches the expected data_root.
     *
     * @param serialized
     * @param data
     */
    static async fromSerialized(S, d, $) {
      if (!d || typeof d.chunkIndex != "number" || typeof d.transaction != "object")
        throw new Error("Serialized object does not match expected format.");
      var F = new o.default(d.transaction);
      F.chunks || await F.prepareChunks($);
      const C = new c(S, F);
      if (C.chunkIndex = d.chunkIndex, C.lastRequestTimeEnd = d.lastRequestTimeEnd, C.lastResponseError = d.lastResponseError, C.lastResponseStatus = d.lastResponseStatus, C.txPosted = d.txPosted, C.data = $, C.transaction.data_root !== d.transaction.data_root)
        throw new Error("Data mismatch: Uploader doesn't match provided data.");
      return C;
    }
    /**
     * Reconstruct an upload from the tx metadata, ie /tx/<id>.
     *
     * @param api
     * @param id
     * @param data
     */
    static async fromTransactionId(S, d) {
      const $ = await S.get(`tx/${d}`);
      if ($.status !== 200)
        throw new Error(`Tx ${d} not found: ${$.status}`);
      const F = $.data;
      return F.data = new Uint8Array(0), {
        txPosted: !0,
        chunkIndex: 0,
        lastResponseError: "",
        lastRequestTimeEnd: 0,
        lastResponseStatus: 0,
        transaction: F
      };
    }
    toJSON() {
      return {
        chunkIndex: this.chunkIndex,
        transaction: this.transaction,
        lastRequestTimeEnd: this.lastRequestTimeEnd,
        lastResponseStatus: this.lastResponseStatus,
        lastResponseError: this.lastResponseError,
        txPosted: this.txPosted
      };
    }
    // POST to /tx
    async postTransaction() {
      if (this.totalChunks <= m) {
        this.transaction.data = this.data;
        const $ = await this.api.post("tx", this.transaction).catch((F) => (console.error(F), { status: -1, data: { error: F.message } }));
        if (this.lastRequestTimeEnd = Date.now(), this.lastResponseStatus = $.status, this.transaction.data = new Uint8Array(0), $.status >= 200 && $.status < 300) {
          this.txPosted = !0, this.chunkIndex = m;
          return;
        }
        throw this.lastResponseError = (0, f.getError)($), new Error(`Unable to upload transaction: ${$.status}, ${this.lastResponseError}`);
      }
      const d = await this.api.post("tx", this.transaction);
      if (this.lastRequestTimeEnd = Date.now(), this.lastResponseStatus = d.status, !(d.status >= 200 && d.status < 300))
        throw this.lastResponseError = (0, f.getError)(d), new Error(`Unable to upload transaction: ${d.status}, ${this.lastResponseError}`);
      this.txPosted = !0;
    }
  }
  return Kt.TransactionUploader = c, Kt;
}
var Ie;
function Fr() {
  if (Ie)
    return Yt;
  Ie = 1, Object.defineProperty(Yt, "__esModule", { value: !0 });
  const o = Pt, a = de(), f = it, p = Nr();
  class m {
    api;
    crypto;
    chunks;
    constructor(l, c, b) {
      this.api = l, this.crypto = c, this.chunks = b;
    }
    async getTransactionAnchor() {
      const l = await this.api.get("tx_anchor");
      if (!l.data.match(/^[a-z0-9_-]{43,}/i) || !l.ok)
        throw new Error(`Could not getTransactionAnchor. Received: ${l.data}. Status: ${l.status}, ${l.statusText}`);
      return l.data;
    }
    async getPrice(l, c) {
      let b = c ? `price/${l}/${c}` : `price/${l}`;
      const S = await this.api.get(b);
      if (!/^\d+$/.test(S.data) || !S.ok)
        throw new Error(`Could not getPrice. Received: ${S.data}. Status: ${S.status}, ${S.statusText}`);
      return S.data;
    }
    async get(l) {
      const c = await this.api.get(`tx/${l}`);
      if (c.status == 200) {
        const b = parseInt(c.data.data_size);
        if (c.data.format >= 2 && b > 0 && b <= 1024 * 1024 * 12) {
          const S = await this.getData(l);
          return new a.default({
            ...c.data,
            data: S
          });
        }
        return new a.default({
          ...c.data,
          format: c.data.format || 1
        });
      }
      throw c.status == 404 ? new o.default(
        "TX_NOT_FOUND"
        /* ArweaveErrorType.TX_NOT_FOUND */
      ) : c.status == 410 ? new o.default(
        "TX_FAILED"
        /* ArweaveErrorType.TX_FAILED */
      ) : new o.default(
        "TX_INVALID"
        /* ArweaveErrorType.TX_INVALID */
      );
    }
    fromRaw(l) {
      return new a.default(l);
    }
    async search(l, c) {
      return this.api.post("arql", {
        op: "equals",
        expr1: l,
        expr2: c
      }).then((b) => b.data ? b.data : []);
    }
    getStatus(l) {
      return this.api.get(`tx/${l}/status`).then((c) => c.status == 200 ? {
        status: 200,
        confirmed: c.data
      } : {
        status: c.status,
        confirmed: null
      });
    }
    async getData(l, c) {
      let b;
      try {
        b = await this.chunks.downloadChunkedData(l);
      } catch (S) {
        console.error(`Error while trying to download chunked data for ${l}`), console.error(S);
      }
      if (!b) {
        console.warn(`Falling back to gateway cache for ${l}`);
        try {
          const { data: S, ok: d, status: $, statusText: F } = await this.api.get(`/${l}`, { responseType: "arraybuffer" });
          if (!d)
            throw new Error("Bad http status code", {
              cause: { status: $, statusText: F }
            });
          b = S;
        } catch (S) {
          console.error(`Error while trying to download contiguous data from gateway cache for ${l}`), console.error(S);
        }
      }
      if (!b)
        throw new Error(`${l} data was not found!`);
      return c && c.decode && !c.string ? b : c && c.decode && c.string ? f.bufferToString(b) : f.bufferTob64Url(b);
    }
    async sign(l, c, b) {
      const d = typeof c == "object" && ((F) => {
        let C = !0;
        return ["n", "e", "d", "p", "q", "dp", "dq", "qi"].map((K) => !(K in F) && (C = !1)), C;
      })(c), $ = typeof arweaveWallet == "object";
      if (!d && !$)
        throw new Error("No valid JWK or external wallet found to sign transaction.");
      if (d) {
        l.setOwner(c.n);
        let F = await l.getSignatureData(), C = await this.crypto.sign(c, F, b), K = await this.crypto.hash(C);
        l.setSignature({
          id: f.bufferTob64Url(K),
          owner: c.n,
          signature: f.bufferTob64Url(C)
        });
      } else if ($) {
        try {
          (await arweaveWallet.getPermissions()).includes("SIGN_TRANSACTION") || await arweaveWallet.connect(["SIGN_TRANSACTION"]);
        } catch {
        }
        const F = await arweaveWallet.sign(l, b);
        l.setSignature({
          id: F.id,
          owner: F.owner,
          reward: F.reward,
          tags: F.tags,
          signature: F.signature
        });
      } else
        throw new Error("An error occurred while signing. Check wallet is valid");
    }
    async verify(l) {
      const c = await l.getSignatureData(), b = l.get("signature", {
        decode: !0,
        string: !1
      }), S = f.bufferTob64Url(await this.crypto.hash(b));
      if (l.id !== S)
        throw new Error("Invalid transaction signature or ID! The transaction ID doesn't match the expected SHA-256 hash of the signature.");
      return this.crypto.verify(l.owner, c, b);
    }
    async post(l) {
      if (typeof l == "string" ? l = new a.default(JSON.parse(l)) : typeof l.readInt32BE == "function" ? l = new a.default(JSON.parse(l.toString())) : typeof l == "object" && !(l instanceof a.default) && (l = new a.default(l)), !(l instanceof a.default))
        throw new Error("Must be Transaction object");
      l.chunks || await l.prepareChunks(l.data);
      const c = await this.getUploader(l, l.data);
      try {
        for (; !c.isComplete; )
          await c.uploadChunk();
      } catch (b) {
        if (c.lastResponseStatus > 0)
          return {
            status: c.lastResponseStatus,
            statusText: c.lastResponseError,
            data: {
              error: c.lastResponseError
            }
          };
        throw b;
      }
      return {
        status: 200,
        statusText: "OK",
        data: {}
      };
    }
    /**
     * Gets an uploader than can be used to upload a transaction chunk by chunk, giving progress
     * and the ability to resume.
     *
     * Usage example:
     *
     * ```
     * const uploader = arweave.transactions.getUploader(transaction);
     * while (!uploader.isComplete) {
     *   await uploader.uploadChunk();
     *   console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save progress object, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    async getUploader(l, c) {
      let b;
      if (c instanceof ArrayBuffer && (c = new Uint8Array(c)), l instanceof a.default) {
        if (c || (c = l.data), !(c instanceof Uint8Array))
          throw new Error("Data format is invalid");
        l.chunks || await l.prepareChunks(c), b = new p.TransactionUploader(this.api, l), (!b.data || b.data.length === 0) && (b.data = c);
      } else {
        if (typeof l == "string" && (l = await p.TransactionUploader.fromTransactionId(this.api, l)), !c || !(c instanceof Uint8Array))
          throw new Error("Must provide data when resuming upload");
        b = await p.TransactionUploader.fromSerialized(this.api, l, c);
      }
      return b;
    }
    /**
     * Async generator version of uploader
     *
     * Usage example:
     *
     * ```
     * for await (const uploader of arweave.transactions.upload(tx)) {
     *  console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save uploader, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    async *upload(l, c) {
      const b = await this.getUploader(l, c);
      for (; !b.isComplete; )
        await b.uploadChunk(), yield b;
      return b;
    }
  }
  return Yt.default = m, Yt;
}
var ye = {};
Object.defineProperty(ye, "__esModule", { value: !0 });
const ve = it;
class Pr {
  api;
  crypto;
  constructor(a, f) {
    this.api = a, this.crypto = f;
  }
  /**
   * Get the wallet balance for the given address.
   *
   * @param {string} address - The arweave address to get the balance for.
   *
   * @returns {Promise<string>} - Promise which resolves with a winston string balance.
   */
  getBalance(a) {
    return this.api.get(`wallet/${a}/balance`).then((f) => f.data);
  }
  /**
   * Get the last transaction ID for the given wallet address.
   *
   * @param {string} address - The arweave address to get the transaction for.
   *
   * @returns {Promise<string>} - Promise which resolves with a transaction ID.
   */
  getLastTransactionID(a) {
    return this.api.get(`wallet/${a}/last_tx`).then((f) => f.data);
  }
  generate() {
    return this.crypto.generateJWK();
  }
  async jwkToAddress(a) {
    return !a || a === "use_wallet" ? this.getAddress() : this.getAddress(a);
  }
  async getAddress(a) {
    if (!a || a === "use_wallet") {
      try {
        await arweaveWallet.connect(["ACCESS_ADDRESS"]);
      } catch {
      }
      return arweaveWallet.getActiveAddress();
    } else
      return this.ownerToAddress(a.n);
  }
  async ownerToAddress(a) {
    return ve.bufferTob64Url(await this.crypto.hash(ve.b64UrlToBuffer(a)));
  }
}
ye.default = Pr;
var Wt = {};
Object.defineProperty(Wt, "__esModule", { value: !0 });
Wt.SiloResource = void 0;
const Ue = it;
class Dr {
  api;
  crypto;
  transactions;
  constructor(a, f, p) {
    this.api = a, this.crypto = f, this.transactions = p;
  }
  async get(a) {
    if (!a)
      throw new Error("No Silo URI specified");
    const f = await this.parseUri(a), p = await this.transactions.search("Silo-Name", f.getAccessKey());
    if (p.length == 0)
      throw new Error(`No data could be found for the Silo URI: ${a}`);
    const m = await this.transactions.get(p[0]);
    if (!m)
      throw new Error(`No data could be found for the Silo URI: ${a}`);
    const E = m.get("data", { decode: !0, string: !1 });
    return this.crypto.decrypt(E, f.getEncryptionKey());
  }
  async readTransactionData(a, f) {
    if (!f)
      throw new Error("No Silo URI specified");
    const p = await this.parseUri(f), m = a.get("data", { decode: !0, string: !1 });
    return this.crypto.decrypt(m, p.getEncryptionKey());
  }
  async parseUri(a) {
    const f = a.match(/^([a-z0-9-_]+)\.([0-9]+)/i);
    if (!f)
      throw new Error("Invalid Silo name, must be a name in the format of [a-z0-9]+.[0-9]+, e.g. 'bubble.7'");
    const p = f[1], m = Math.pow(2, parseInt(f[2])), E = await this.hash(Ue.stringToBuffer(p), m), l = Ue.bufferTob64(E.slice(0, 15)), c = await this.hash(E.slice(16, 31), 1);
    return new ze(a, l, c);
  }
  async hash(a, f) {
    let p = await this.crypto.hash(a);
    for (let m = 0; m < f - 1; m++)
      p = await this.crypto.hash(p);
    return p;
  }
}
Wt.default = Dr;
class ze {
  uri;
  accessKey;
  encryptionKey;
  constructor(a, f, p) {
    this.uri = a, this.accessKey = f, this.encryptionKey = p;
  }
  getUri() {
    return this.uri;
  }
  getAccessKey() {
    return this.accessKey;
  }
  getEncryptionKey() {
    return this.encryptionKey;
  }
}
Wt.SiloResource = ze;
var we = {};
Object.defineProperty(we, "__esModule", { value: !0 });
const _e = Pt, Mr = it;
class $r {
  api;
  constructor(a) {
    this.api = a;
  }
  async getTransactionOffset(a) {
    const f = await this.api.get(`tx/${a}/offset`);
    if (f.status === 200)
      return f.data;
    throw new Error(`Unable to get transaction offset: ${(0, _e.getError)(f)}`);
  }
  async getChunk(a) {
    const f = await this.api.get(`chunk/${a}`);
    if (f.status === 200)
      return f.data;
    throw new Error(`Unable to get chunk: ${(0, _e.getError)(f)}`);
  }
  async getChunkData(a) {
    const f = await this.getChunk(a);
    return Mr.b64UrlToBuffer(f.chunk);
  }
  firstChunkOffset(a) {
    return parseInt(a.offset) - parseInt(a.size) + 1;
  }
  async downloadChunkedData(a) {
    const f = await this.getTransactionOffset(a), p = parseInt(f.size), E = parseInt(f.offset) - p + 1, l = new Uint8Array(p);
    let c = 0;
    for (; c < p; ) {
      this.api.config.logging && console.log(`[chunk] ${c}/${p}`);
      let b;
      try {
        b = await this.getChunkData(E + c);
      } catch {
        console.error(`[chunk] Failed to fetch chunk at offset ${E + c}`), console.error("[chunk] This could indicate that the chunk wasn't uploaded or hasn't yet seeded properly to a particular gateway/node");
      }
      if (b)
        l.set(b, c), c += b.length;
      else
        throw new Error(`Couldn't complete data download at ${c}/${p}`);
    }
    return l;
  }
}
we.default = $r;
var me = {};
Object.defineProperty(me, "__esModule", { value: !0 });
const Re = Pt;
class Xt {
  api;
  network;
  static HASH_ENDPOINT = "block/hash/";
  static HEIGHT_ENDPOINT = "block/height/";
  constructor(a, f) {
    this.api = a, this.network = f;
  }
  /**
   * Gets a block by its "indep_hash"
   */
  async get(a) {
    const f = await this.api.get(`${Xt.HASH_ENDPOINT}${a}`);
    if (f.status === 200)
      return f.data;
    throw f.status === 404 ? new Re.default(
      "BLOCK_NOT_FOUND"
      /* ArweaveErrorType.BLOCK_NOT_FOUND */
    ) : new Error(`Error while loading block data: ${f}`);
  }
  /**
   * Gets a block by its "height"
   */
  async getByHeight(a) {
    const f = await this.api.get(`${Xt.HEIGHT_ENDPOINT}${a}`);
    if (f.status === 200)
      return f.data;
    throw f.status === 404 ? new Re.default(
      "BLOCK_NOT_FOUND"
      /* ArweaveErrorType.BLOCK_NOT_FOUND */
    ) : new Error(`Error while loading block data: ${f}`);
  }
  /**
   * Gets current block data (ie. block with indep_hash = Network.getInfo().current)
   */
  async getCurrent() {
    const { current: a } = await this.network.getInfo();
    return await this.get(a);
  }
}
me.default = Xt;
var Le;
function Vt() {
  if (Le)
    return zt;
  Le = 1, Object.defineProperty(zt, "__esModule", { value: !0 });
  const o = ce, a = he, f = le, p = pe, m = Fr(), E = ye, l = de(), c = it, b = Wt, S = we, d = me;
  class $ {
    api;
    wallets;
    transactions;
    network;
    blocks;
    ar;
    silo;
    chunks;
    static init;
    static crypto = new f.default();
    static utils = c;
    constructor(C) {
      this.api = new a.default(C), this.wallets = new E.default(this.api, $.crypto), this.chunks = new S.default(this.api), this.transactions = new m.default(this.api, $.crypto, this.chunks), this.silo = new b.default(this.api, this.crypto, this.transactions), this.network = new p.default(this.api), this.blocks = new d.default(this.api, this.network), this.ar = new o.default();
    }
    /** @deprecated */
    get crypto() {
      return $.crypto;
    }
    /** @deprecated */
    get utils() {
      return $.utils;
    }
    getConfig() {
      return {
        api: this.api.getConfig(),
        crypto: null
      };
    }
    async createTransaction(C, K) {
      const D = {};
      if (Object.assign(D, C), !C.data && !(C.target && C.quantity))
        throw new Error("A new Arweave transaction must have a 'data' value, or 'target' and 'quantity' values.");
      if (C.owner == null && K && K !== "use_wallet" && (D.owner = K.n), C.last_tx == null && (D.last_tx = await this.transactions.getTransactionAnchor()), typeof C.data == "string" && (C.data = c.stringToBuffer(C.data)), C.data instanceof ArrayBuffer && (C.data = new Uint8Array(C.data)), C.data && !(C.data instanceof Uint8Array))
        throw new Error("Expected data to be a string, Uint8Array or ArrayBuffer");
      if (C.reward == null) {
        const Z = C.data ? C.data.byteLength : 0;
        D.reward = await this.transactions.getPrice(Z, D.target);
      }
      D.data_root = "", D.data_size = C.data ? C.data.byteLength.toString() : "0", D.data = C.data || new Uint8Array(0);
      const G = new l.default(D);
      return await G.getSignatureData(), G;
    }
    async createSiloTransaction(C, K, D) {
      const G = {};
      if (Object.assign(G, C), !C.data)
        throw new Error("Silo transactions must have a 'data' value");
      if (!D)
        throw new Error("No Silo URI specified.");
      if (C.target || C.quantity)
        throw new Error("Silo transactions can only be used for storing data, sending AR to other wallets isn't supported.");
      if (C.owner == null) {
        if (!K || !K.n)
          throw new Error("A new Arweave transaction must either have an 'owner' attribute, or you must provide the jwk parameter.");
        G.owner = K.n;
      }
      C.last_tx == null && (G.last_tx = await this.transactions.getTransactionAnchor());
      const Z = await this.silo.parseUri(D);
      if (typeof C.data == "string") {
        const Q = await this.crypto.encrypt(c.stringToBuffer(C.data), Z.getEncryptionKey());
        G.reward = await this.transactions.getPrice(Q.byteLength), G.data = c.bufferTob64Url(Q);
      }
      if (C.data instanceof Uint8Array) {
        const Q = await this.crypto.encrypt(C.data, Z.getEncryptionKey());
        G.reward = await this.transactions.getPrice(Q.byteLength), G.data = c.bufferTob64Url(Q);
      }
      const Y = new l.default(G);
      return Y.addTag("Silo-Name", Z.getAccessKey()), Y.addTag("Silo-Version", "0.1.0"), Y;
    }
    arql(C) {
      return this.api.post("/arql", C).then((K) => K.data || []);
    }
  }
  return zt.default = $, zt;
}
var ee = {};
Object.defineProperty(ee, "__esModule", { value: !0 });
ee.getDefaultConfig = void 0;
const Hr = (o, a) => {
  const f = /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/, p = a.split("."), m = p[p.length - 1], E = ["localhost", "[::1]"];
  return E.includes(a) || o == "file" || E.includes(m) || !!a.match(f) || !!m.match(f);
}, jr = (o) => {
  const a = o.charAt(0) === "[", f = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  return !!o.match(f) || a;
}, Kr = (o, a) => {
  if (Hr(o, a))
    return {
      protocol: "https",
      host: "arweave.net",
      port: 443
    };
  if (!jr(a)) {
    let f = a.split(".");
    if (f.length >= 3) {
      f.shift();
      const p = f.join(".");
      return {
        protocol: o,
        host: p
      };
    }
  }
  return {
    protocol: o,
    host: a
  };
};
ee.getDefaultConfig = Kr;
(function(o) {
  var a = qt && qt.__createBinding || (Object.create ? function(E, l, c, b) {
    b === void 0 && (b = c);
    var S = Object.getOwnPropertyDescriptor(l, c);
    (!S || ("get" in S ? !l.__esModule : S.writable || S.configurable)) && (S = { enumerable: !0, get: function() {
      return l[c];
    } }), Object.defineProperty(E, b, S);
  } : function(E, l, c, b) {
    b === void 0 && (b = c), E[b] = l[c];
  }), f = qt && qt.__exportStar || function(E, l) {
    for (var c in E)
      c !== "default" && !Object.prototype.hasOwnProperty.call(l, c) && a(l, E, c);
  };
  Object.defineProperty(o, "__esModule", { value: !0 });
  const p = Vt(), m = ee;
  p.default.init = function(E = {}) {
    const l = {
      host: "arweave.net",
      port: 443,
      protocol: "https"
    };
    if (typeof location != "object" || !location.protocol || !location.hostname)
      return new p.default({
        ...E,
        ...l
      });
    const c = location.protocol.replace(":", ""), b = location.hostname, S = location.port ? parseInt(location.port) : c == "https" ? 443 : 80, d = (0, m.getDefaultConfig)(c, b), $ = E.protocol || d.protocol, F = E.host || d.host, C = E.port || d.port || S;
    return new p.default({
      ...E,
      host: F,
      protocol: $,
      port: C
    });
  }, typeof globalThis == "object" ? globalThis.Arweave = p.default : typeof self == "object" && (self.Arweave = p.default), f(Vt(), o), o.default = p.default;
})(Oe);
const qr = /* @__PURE__ */ ir(Oe), Gr = globalThis || void 0 || self;
var Wr = Object.create, Ee = Object.defineProperty, zr = Object.getOwnPropertyDescriptor, Yr = Object.getOwnPropertyNames, Jr = Object.getPrototypeOf, Xr = Object.prototype.hasOwnProperty, Ct = (o, a) => () => (a || o((a = { exports: {} }).exports, a), a.exports), Vr = (o, a) => {
  for (var f in a)
    Ee(o, f, { get: a[f], enumerable: !0 });
}, Zr = (o, a, f, p) => {
  if (a && typeof a == "object" || typeof a == "function")
    for (let m of Yr(a))
      !Xr.call(o, m) && m !== f && Ee(o, m, { get: () => a[m], enumerable: !(p = zr(a, m)) || p.enumerable });
  return o;
}, Dt = (o, a, f) => (f = o != null ? Wr(Jr(o)) : {}, Zr(a || !o || !o.__esModule ? Ee(f, "default", { value: o, enumerable: !0 }) : f, o)), Qr = Ct((o) => {
  Object.defineProperty(o, "__esModule", { value: !0 });
  function a(f) {
    var p = 4, m = f.length, E = m % p;
    if (!E)
      return f;
    var l = m, c = p - E, b = m + c, S = Et.alloc(b);
    for (S.write(f); c--; )
      S.write("=", l++);
    return S.toString();
  }
  o.default = a;
}), tn = Ct((o) => {
  Object.defineProperty(o, "__esModule", { value: !0 });
  var a = Qr();
  function f(b, S) {
    return S === void 0 && (S = "utf8"), Et.isBuffer(b) ? E(b.toString("base64")) : E(Et.from(b, S).toString("base64"));
  }
  function p(b, S) {
    return S === void 0 && (S = "utf8"), Et.from(m(b), "base64").toString(S);
  }
  function m(b) {
    return b = b.toString(), a.default(b).replace(/\-/g, "+").replace(/_/g, "/");
  }
  function E(b) {
    return b.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function l(b) {
    return Et.from(m(b), "base64");
  }
  var c = f;
  c.encode = f, c.decode = p, c.toBase64 = m, c.fromBase64 = E, c.toBuffer = l, o.default = c;
}), Be = Ct((o, a) => {
  a.exports = tn().default, a.exports.default = a.exports;
}), Ye = Ct((o) => {
  o.byteLength = b, o.toByteArray = d, o.fromByteArray = C;
  var a = [], f = [], p = typeof Uint8Array < "u" ? Uint8Array : Array, m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (E = 0, l = m.length; E < l; ++E)
    a[E] = m[E], f[m.charCodeAt(E)] = E;
  var E, l;
  f[45] = 62, f[95] = 63;
  function c(K) {
    var D = K.length;
    if (D % 4 > 0)
      throw new Error("Invalid string. Length must be a multiple of 4");
    var G = K.indexOf("=");
    G === -1 && (G = D);
    var Z = G === D ? 0 : 4 - G % 4;
    return [G, Z];
  }
  function b(K) {
    var D = c(K), G = D[0], Z = D[1];
    return (G + Z) * 3 / 4 - Z;
  }
  function S(K, D, G) {
    return (D + G) * 3 / 4 - G;
  }
  function d(K) {
    var D, G = c(K), Z = G[0], Y = G[1], Q = new p(S(K, Z, Y)), at = 0, j = Y > 0 ? Z - 4 : Z, O;
    for (O = 0; O < j; O += 4)
      D = f[K.charCodeAt(O)] << 18 | f[K.charCodeAt(O + 1)] << 12 | f[K.charCodeAt(O + 2)] << 6 | f[K.charCodeAt(O + 3)], Q[at++] = D >> 16 & 255, Q[at++] = D >> 8 & 255, Q[at++] = D & 255;
    return Y === 2 && (D = f[K.charCodeAt(O)] << 2 | f[K.charCodeAt(O + 1)] >> 4, Q[at++] = D & 255), Y === 1 && (D = f[K.charCodeAt(O)] << 10 | f[K.charCodeAt(O + 1)] << 4 | f[K.charCodeAt(O + 2)] >> 2, Q[at++] = D >> 8 & 255, Q[at++] = D & 255), Q;
  }
  function $(K) {
    return a[K >> 18 & 63] + a[K >> 12 & 63] + a[K >> 6 & 63] + a[K & 63];
  }
  function F(K, D, G) {
    for (var Z, Y = [], Q = D; Q < G; Q += 3)
      Z = (K[Q] << 16 & 16711680) + (K[Q + 1] << 8 & 65280) + (K[Q + 2] & 255), Y.push($(Z));
    return Y.join("");
  }
  function C(K) {
    for (var D, G = K.length, Z = G % 3, Y = [], Q = 16383, at = 0, j = G - Z; at < j; at += Q)
      Y.push(F(K, at, at + Q > j ? j : at + Q));
    return Z === 1 ? (D = K[G - 1], Y.push(a[D >> 2] + a[D << 4 & 63] + "==")) : Z === 2 && (D = (K[G - 2] << 8) + K[G - 1], Y.push(a[D >> 10] + a[D >> 4 & 63] + a[D << 2 & 63] + "=")), Y.join("");
  }
}), Je = Ct((o) => {
  Object.defineProperty(o, "__esModule", { value: !0 }), o.b64UrlDecode = o.b64UrlEncode = o.bufferTob64Url = o.bufferTob64 = o.b64UrlToBuffer = o.stringToB64Url = o.stringToBuffer = o.bufferToString = o.b64UrlToString = o.concatBuffers = void 0;
  var a = Ye();
  function f(F) {
    let C = 0;
    for (let G = 0; G < F.length; G++)
      C += F[G].byteLength;
    let K = new Uint8Array(C), D = 0;
    K.set(new Uint8Array(F[0]), D), D += F[0].byteLength;
    for (let G = 1; G < F.length; G++)
      K.set(new Uint8Array(F[G]), D), D += F[G].byteLength;
    return K;
  }
  o.concatBuffers = f;
  function p(F) {
    let C = c(F);
    return m(C);
  }
  o.b64UrlToString = p;
  function m(F) {
    return new TextDecoder("utf-8", { fatal: !0 }).decode(F);
  }
  o.bufferToString = m;
  function E(F) {
    return new TextEncoder().encode(F);
  }
  o.stringToBuffer = E;
  function l(F) {
    return S(E(F));
  }
  o.stringToB64Url = l;
  function c(F) {
    return new Uint8Array(a.toByteArray($(F)));
  }
  o.b64UrlToBuffer = c;
  function b(F) {
    return a.fromByteArray(new Uint8Array(F));
  }
  o.bufferTob64 = b;
  function S(F) {
    return d(b(F));
  }
  o.bufferTob64Url = S;
  function d(F) {
    return F.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
  }
  o.b64UrlEncode = d;
  function $(F) {
    F = F.replace(/\-/g, "+").replace(/\_/g, "/");
    let C;
    return F.length % 4 == 0 ? C = 0 : C = 4 - F.length % 4, F.concat("=".repeat(C));
  }
  o.b64UrlDecode = $;
}), en = Ct((o) => {
  Object.defineProperty(o, "__esModule", { value: !0 });
  var a = Je(), f = class {
    keyLength = 4096;
    publicExponent = 65537;
    hashAlgorithm = "sha256";
    driver;
    constructor() {
      if (!this.detectWebCrypto())
        throw new Error("SubtleCrypto not available!");
      this.driver = crypto.subtle;
    }
    async generateJWK() {
      let p = await this.driver.generateKey({ name: "RSA-PSS", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: { name: "SHA-256" } }, !0, ["sign"]), m = await this.driver.exportKey("jwk", p.privateKey);
      return { kty: m.kty, e: m.e, n: m.n, d: m.d, p: m.p, q: m.q, dp: m.dp, dq: m.dq, qi: m.qi };
    }
    async sign(p, m, { saltLength: E } = {}) {
      let l = await this.driver.sign({ name: "RSA-PSS", saltLength: 32 }, await this.jwkToCryptoKey(p), m);
      return new Uint8Array(l);
    }
    async hash(p, m = "SHA-256") {
      let E = await this.driver.digest(m, p);
      return new Uint8Array(E);
    }
    async verify(p, m, E) {
      let l = { kty: "RSA", e: "AQAB", n: p }, c = await this.jwkToPublicCryptoKey(l), b = await this.driver.digest("SHA-256", m), S = await this.driver.verify({ name: "RSA-PSS", saltLength: 0 }, c, E, m), d = await this.driver.verify({ name: "RSA-PSS", saltLength: 32 }, c, E, m), $ = await this.driver.verify({ name: "RSA-PSS", saltLength: Math.ceil((c.algorithm.modulusLength - 1) / 8) - b.byteLength - 2 }, c, E, m);
      return S || d || $;
    }
    async jwkToCryptoKey(p) {
      return this.driver.importKey("jwk", p, { name: "RSA-PSS", hash: { name: "SHA-256" } }, !1, ["sign"]);
    }
    async jwkToPublicCryptoKey(p) {
      return this.driver.importKey("jwk", p, { name: "RSA-PSS", hash: { name: "SHA-256" } }, !1, ["verify"]);
    }
    detectWebCrypto() {
      if (typeof crypto > "u")
        return !1;
      let p = crypto?.subtle;
      return p === void 0 ? !1 : ["generateKey", "importKey", "exportKey", "digest", "sign"].every((m) => typeof p[m] == "function");
    }
    async encrypt(p, m, E) {
      let l = await this.driver.importKey("raw", typeof m == "string" ? a.stringToBuffer(m) : m, { name: "PBKDF2", length: 32 }, !1, ["deriveKey"]), c = await this.driver.deriveKey({ name: "PBKDF2", salt: E ? a.stringToBuffer(E) : a.stringToBuffer("salt"), iterations: 1e5, hash: "SHA-256" }, l, { name: "AES-CBC", length: 256 }, !1, ["encrypt", "decrypt"]), b = new Uint8Array(16);
      crypto.getRandomValues(b);
      let S = await this.driver.encrypt({ name: "AES-CBC", iv: b }, c, p);
      return a.concatBuffers([b, S]);
    }
    async decrypt(p, m, E) {
      let l = await this.driver.importKey("raw", typeof m == "string" ? a.stringToBuffer(m) : m, { name: "PBKDF2", length: 32 }, !1, ["deriveKey"]), c = await this.driver.deriveKey({ name: "PBKDF2", salt: E ? a.stringToBuffer(E) : a.stringToBuffer("salt"), iterations: 1e5, hash: "SHA-256" }, l, { name: "AES-CBC", length: 256 }, !1, ["encrypt", "decrypt"]), b = p.slice(0, 16), S = await this.driver.decrypt({ name: "AES-CBC", iv: b }, c, p.slice(16));
      return a.concatBuffers([S]);
    }
  };
  o.default = f;
}), rn = Ct((o) => {
  o.read = function(a, f, p, m, E) {
    var l, c, b = E * 8 - m - 1, S = (1 << b) - 1, d = S >> 1, $ = -7, F = p ? E - 1 : 0, C = p ? -1 : 1, K = a[f + F];
    for (F += C, l = K & (1 << -$) - 1, K >>= -$, $ += b; $ > 0; l = l * 256 + a[f + F], F += C, $ -= 8)
      ;
    for (c = l & (1 << -$) - 1, l >>= -$, $ += m; $ > 0; c = c * 256 + a[f + F], F += C, $ -= 8)
      ;
    if (l === 0)
      l = 1 - d;
    else {
      if (l === S)
        return c ? NaN : (K ? -1 : 1) * (1 / 0);
      c = c + Math.pow(2, m), l = l - d;
    }
    return (K ? -1 : 1) * c * Math.pow(2, l - m);
  }, o.write = function(a, f, p, m, E, l) {
    var c, b, S, d = l * 8 - E - 1, $ = (1 << d) - 1, F = $ >> 1, C = E === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, K = m ? 0 : l - 1, D = m ? 1 : -1, G = f < 0 || f === 0 && 1 / f < 0 ? 1 : 0;
    for (f = Math.abs(f), isNaN(f) || f === 1 / 0 ? (b = isNaN(f) ? 1 : 0, c = $) : (c = Math.floor(Math.log(f) / Math.LN2), f * (S = Math.pow(2, -c)) < 1 && (c--, S *= 2), c + F >= 1 ? f += C / S : f += C * Math.pow(2, 1 - F), f * S >= 2 && (c++, S /= 2), c + F >= $ ? (b = 0, c = $) : c + F >= 1 ? (b = (f * S - 1) * Math.pow(2, E), c = c + F) : (b = f * Math.pow(2, F - 1) * Math.pow(2, E), c = 0)); E >= 8; a[p + K] = b & 255, K += D, b /= 256, E -= 8)
      ;
    for (c = c << E | b, d += E; d > 0; a[p + K] = c & 255, K += D, c /= 256, d -= 8)
      ;
    a[p + K - D] |= G * 128;
  };
}), se = Ct((o) => {
  var a = Ye(), f = rn(), p = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  o.Buffer = c, o.SlowBuffer = Y, o.INSPECT_MAX_BYTES = 50;
  var m = 2147483647;
  o.kMaxLength = m, c.TYPED_ARRAY_SUPPORT = E(), !c.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
  function E() {
    try {
      let e = new Uint8Array(1), i = { foo: function() {
        return 42;
      } };
      return Object.setPrototypeOf(i, Uint8Array.prototype), Object.setPrototypeOf(e, i), e.foo() === 42;
    } catch {
      return !1;
    }
  }
  Object.defineProperty(c.prototype, "parent", { enumerable: !0, get: function() {
    if (c.isBuffer(this))
      return this.buffer;
  } }), Object.defineProperty(c.prototype, "offset", { enumerable: !0, get: function() {
    if (c.isBuffer(this))
      return this.byteOffset;
  } });
  function l(e) {
    if (e > m)
      throw new RangeError('The value "' + e + '" is invalid for option "size"');
    let i = new Uint8Array(e);
    return Object.setPrototypeOf(i, c.prototype), i;
  }
  function c(e, i, s) {
    if (typeof e == "number") {
      if (typeof i == "string")
        throw new TypeError('The "string" argument must be of type string. Received type number');
      return $(e);
    }
    return b(e, i, s);
  }
  c.poolSize = 8192;
  function b(e, i, s) {
    if (typeof e == "string")
      return F(e, i);
    if (ArrayBuffer.isView(e))
      return K(e);
    if (e == null)
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
    if (W(e, ArrayBuffer) || e && W(e.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (W(e, SharedArrayBuffer) || e && W(e.buffer, SharedArrayBuffer)))
      return D(e, i, s);
    if (typeof e == "number")
      throw new TypeError('The "value" argument must not be of type number. Received type number');
    let n = e.valueOf && e.valueOf();
    if (n != null && n !== e)
      return c.from(n, i, s);
    let t = G(e);
    if (t)
      return t;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof e[Symbol.toPrimitive] == "function")
      return c.from(e[Symbol.toPrimitive]("string"), i, s);
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
  }
  c.from = function(e, i, s) {
    return b(e, i, s);
  }, Object.setPrototypeOf(c.prototype, Uint8Array.prototype), Object.setPrototypeOf(c, Uint8Array);
  function S(e) {
    if (typeof e != "number")
      throw new TypeError('"size" argument must be of type number');
    if (e < 0)
      throw new RangeError('The value "' + e + '" is invalid for option "size"');
  }
  function d(e, i, s) {
    return S(e), e <= 0 ? l(e) : i !== void 0 ? typeof s == "string" ? l(e).fill(i, s) : l(e).fill(i) : l(e);
  }
  c.alloc = function(e, i, s) {
    return d(e, i, s);
  };
  function $(e) {
    return S(e), l(e < 0 ? 0 : Z(e) | 0);
  }
  c.allocUnsafe = function(e) {
    return $(e);
  }, c.allocUnsafeSlow = function(e) {
    return $(e);
  };
  function F(e, i) {
    if ((typeof i != "string" || i === "") && (i = "utf8"), !c.isEncoding(i))
      throw new TypeError("Unknown encoding: " + i);
    let s = Q(e, i) | 0, n = l(s), t = n.write(e, i);
    return t !== s && (n = n.slice(0, t)), n;
  }
  function C(e) {
    let i = e.length < 0 ? 0 : Z(e.length) | 0, s = l(i);
    for (let n = 0; n < i; n += 1)
      s[n] = e[n] & 255;
    return s;
  }
  function K(e) {
    if (W(e, Uint8Array)) {
      let i = new Uint8Array(e);
      return D(i.buffer, i.byteOffset, i.byteLength);
    }
    return C(e);
  }
  function D(e, i, s) {
    if (i < 0 || e.byteLength < i)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (e.byteLength < i + (s || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let n;
    return i === void 0 && s === void 0 ? n = new Uint8Array(e) : s === void 0 ? n = new Uint8Array(e, i) : n = new Uint8Array(e, i, s), Object.setPrototypeOf(n, c.prototype), n;
  }
  function G(e) {
    if (c.isBuffer(e)) {
      let i = Z(e.length) | 0, s = l(i);
      return s.length === 0 || e.copy(s, 0, 0, i), s;
    }
    if (e.length !== void 0)
      return typeof e.length != "number" || z(e.length) ? l(0) : C(e);
    if (e.type === "Buffer" && Array.isArray(e.data))
      return C(e.data);
  }
  function Z(e) {
    if (e >= m)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + m.toString(16) + " bytes");
    return e | 0;
  }
  function Y(e) {
    return +e != e && (e = 0), c.alloc(+e);
  }
  c.isBuffer = function(e) {
    return e != null && e._isBuffer === !0 && e !== c.prototype;
  }, c.compare = function(e, i) {
    if (W(e, Uint8Array) && (e = c.from(e, e.offset, e.byteLength)), W(i, Uint8Array) && (i = c.from(i, i.offset, i.byteLength)), !c.isBuffer(e) || !c.isBuffer(i))
      throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    if (e === i)
      return 0;
    let s = e.length, n = i.length;
    for (let t = 0, r = Math.min(s, n); t < r; ++t)
      if (e[t] !== i[t]) {
        s = e[t], n = i[t];
        break;
      }
    return s < n ? -1 : n < s ? 1 : 0;
  }, c.isEncoding = function(e) {
    switch (String(e).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return !0;
      default:
        return !1;
    }
  }, c.concat = function(e, i) {
    if (!Array.isArray(e))
      throw new TypeError('"list" argument must be an Array of Buffers');
    if (e.length === 0)
      return c.alloc(0);
    let s;
    if (i === void 0)
      for (i = 0, s = 0; s < e.length; ++s)
        i += e[s].length;
    let n = c.allocUnsafe(i), t = 0;
    for (s = 0; s < e.length; ++s) {
      let r = e[s];
      if (W(r, Uint8Array))
        t + r.length > n.length ? (c.isBuffer(r) || (r = c.from(r)), r.copy(n, t)) : Uint8Array.prototype.set.call(n, r, t);
      else if (c.isBuffer(r))
        r.copy(n, t);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      t += r.length;
    }
    return n;
  };
  function Q(e, i) {
    if (c.isBuffer(e))
      return e.length;
    if (ArrayBuffer.isView(e) || W(e, ArrayBuffer))
      return e.byteLength;
    if (typeof e != "string")
      throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof e);
    let s = e.length, n = arguments.length > 2 && arguments[2] === !0;
    if (!n && s === 0)
      return 0;
    let t = !1;
    for (; ; )
      switch (i) {
        case "ascii":
        case "latin1":
        case "binary":
          return s;
        case "utf8":
        case "utf-8":
          return B(e).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return s * 2;
        case "hex":
          return s >>> 1;
        case "base64":
          return U(e).length;
        default:
          if (t)
            return n ? -1 : B(e).length;
          i = ("" + i).toLowerCase(), t = !0;
      }
  }
  c.byteLength = Q;
  function at(e, i, s) {
    let n = !1;
    if ((i === void 0 || i < 0) && (i = 0), i > this.length || ((s === void 0 || s > this.length) && (s = this.length), s <= 0) || (s >>>= 0, i >>>= 0, s <= i))
      return "";
    for (e || (e = "utf8"); ; )
      switch (e) {
        case "hex":
          return It(this, i, s);
        case "utf8":
        case "utf-8":
          return ht(this, i, s);
        case "ascii":
          return yt(this, i, s);
        case "latin1":
        case "binary":
          return Bt(this, i, s);
        case "base64":
          return nt(this, i, s);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return bt(this, i, s);
        default:
          if (n)
            throw new TypeError("Unknown encoding: " + e);
          e = (e + "").toLowerCase(), n = !0;
      }
  }
  c.prototype._isBuffer = !0;
  function j(e, i, s) {
    let n = e[i];
    e[i] = e[s], e[s] = n;
  }
  c.prototype.swap16 = function() {
    let e = this.length;
    if (e % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let i = 0; i < e; i += 2)
      j(this, i, i + 1);
    return this;
  }, c.prototype.swap32 = function() {
    let e = this.length;
    if (e % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let i = 0; i < e; i += 4)
      j(this, i, i + 3), j(this, i + 1, i + 2);
    return this;
  }, c.prototype.swap64 = function() {
    let e = this.length;
    if (e % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let i = 0; i < e; i += 8)
      j(this, i, i + 7), j(this, i + 1, i + 6), j(this, i + 2, i + 5), j(this, i + 3, i + 4);
    return this;
  }, c.prototype.toString = function() {
    let e = this.length;
    return e === 0 ? "" : arguments.length === 0 ? ht(this, 0, e) : at.apply(this, arguments);
  }, c.prototype.toLocaleString = c.prototype.toString, c.prototype.equals = function(e) {
    if (!c.isBuffer(e))
      throw new TypeError("Argument must be a Buffer");
    return this === e ? !0 : c.compare(this, e) === 0;
  }, c.prototype.inspect = function() {
    let e = "", i = o.INSPECT_MAX_BYTES;
    return e = this.toString("hex", 0, i).replace(/(.{2})/g, "$1 ").trim(), this.length > i && (e += " ... "), "<Buffer " + e + ">";
  }, p && (c.prototype[p] = c.prototype.inspect), c.prototype.compare = function(e, i, s, n, t) {
    if (W(e, Uint8Array) && (e = c.from(e, e.offset, e.byteLength)), !c.isBuffer(e))
      throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
    if (i === void 0 && (i = 0), s === void 0 && (s = e ? e.length : 0), n === void 0 && (n = 0), t === void 0 && (t = this.length), i < 0 || s > e.length || n < 0 || t > this.length)
      throw new RangeError("out of range index");
    if (n >= t && i >= s)
      return 0;
    if (n >= t)
      return -1;
    if (i >= s)
      return 1;
    if (i >>>= 0, s >>>= 0, n >>>= 0, t >>>= 0, this === e)
      return 0;
    let r = t - n, u = s - i, w = Math.min(r, u), T = this.slice(n, t), _ = e.slice(i, s);
    for (let H = 0; H < w; ++H)
      if (T[H] !== _[H]) {
        r = T[H], u = _[H];
        break;
      }
    return r < u ? -1 : u < r ? 1 : 0;
  };
  function O(e, i, s, n, t) {
    if (e.length === 0)
      return -1;
    if (typeof s == "string" ? (n = s, s = 0) : s > 2147483647 ? s = 2147483647 : s < -2147483648 && (s = -2147483648), s = +s, z(s) && (s = t ? 0 : e.length - 1), s < 0 && (s = e.length + s), s >= e.length) {
      if (t)
        return -1;
      s = e.length - 1;
    } else if (s < 0)
      if (t)
        s = 0;
      else
        return -1;
    if (typeof i == "string" && (i = c.from(i, n)), c.isBuffer(i))
      return i.length === 0 ? -1 : P(e, i, s, n, t);
    if (typeof i == "number")
      return i = i & 255, typeof Uint8Array.prototype.indexOf == "function" ? t ? Uint8Array.prototype.indexOf.call(e, i, s) : Uint8Array.prototype.lastIndexOf.call(e, i, s) : P(e, [i], s, n, t);
    throw new TypeError("val must be string, number or Buffer");
  }
  function P(e, i, s, n, t) {
    let r = 1, u = e.length, w = i.length;
    if (n !== void 0 && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
      if (e.length < 2 || i.length < 2)
        return -1;
      r = 2, u /= 2, w /= 2, s /= 2;
    }
    function T(H, X) {
      return r === 1 ? H[X] : H.readUInt16BE(X * r);
    }
    let _;
    if (t) {
      let H = -1;
      for (_ = s; _ < u; _++)
        if (T(e, _) === T(i, H === -1 ? 0 : _ - H)) {
          if (H === -1 && (H = _), _ - H + 1 === w)
            return H * r;
        } else
          H !== -1 && (_ -= _ - H), H = -1;
    } else
      for (s + w > u && (s = u - w), _ = s; _ >= 0; _--) {
        let H = !0;
        for (let X = 0; X < w; X++)
          if (T(e, _ + X) !== T(i, X)) {
            H = !1;
            break;
          }
        if (H)
          return _;
      }
    return -1;
  }
  c.prototype.includes = function(e, i, s) {
    return this.indexOf(e, i, s) !== -1;
  }, c.prototype.indexOf = function(e, i, s) {
    return O(this, e, i, s, !0);
  }, c.prototype.lastIndexOf = function(e, i, s) {
    return O(this, e, i, s, !1);
  };
  function q(e, i, s, n) {
    s = Number(s) || 0;
    let t = e.length - s;
    n ? (n = Number(n), n > t && (n = t)) : n = t;
    let r = i.length;
    n > r / 2 && (n = r / 2);
    let u;
    for (u = 0; u < n; ++u) {
      let w = parseInt(i.substr(u * 2, 2), 16);
      if (z(w))
        return u;
      e[s + u] = w;
    }
    return u;
  }
  function J(e, i, s, n) {
    return k(B(i, e.length - s), e, s, n);
  }
  function M(e, i, s, n) {
    return k(x(i), e, s, n);
  }
  function rt(e, i, s, n) {
    return k(U(i), e, s, n);
  }
  function et(e, i, s, n) {
    return k(R(i, e.length - s), e, s, n);
  }
  c.prototype.write = function(e, i, s, n) {
    if (i === void 0)
      n = "utf8", s = this.length, i = 0;
    else if (s === void 0 && typeof i == "string")
      n = i, s = this.length, i = 0;
    else if (isFinite(i))
      i = i >>> 0, isFinite(s) ? (s = s >>> 0, n === void 0 && (n = "utf8")) : (n = s, s = void 0);
    else
      throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    let t = this.length - i;
    if ((s === void 0 || s > t) && (s = t), e.length > 0 && (s < 0 || i < 0) || i > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    n || (n = "utf8");
    let r = !1;
    for (; ; )
      switch (n) {
        case "hex":
          return q(this, e, i, s);
        case "utf8":
        case "utf-8":
          return J(this, e, i, s);
        case "ascii":
        case "latin1":
        case "binary":
          return M(this, e, i, s);
        case "base64":
          return rt(this, e, i, s);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return et(this, e, i, s);
        default:
          if (r)
            throw new TypeError("Unknown encoding: " + n);
          n = ("" + n).toLowerCase(), r = !0;
      }
  }, c.prototype.toJSON = function() {
    return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
  };
  function nt(e, i, s) {
    return i === 0 && s === e.length ? a.fromByteArray(e) : a.fromByteArray(e.slice(i, s));
  }
  function ht(e, i, s) {
    s = Math.min(e.length, s);
    let n = [], t = i;
    for (; t < s; ) {
      let r = e[t], u = null, w = r > 239 ? 4 : r > 223 ? 3 : r > 191 ? 2 : 1;
      if (t + w <= s) {
        let T, _, H, X;
        switch (w) {
          case 1:
            r < 128 && (u = r);
            break;
          case 2:
            T = e[t + 1], (T & 192) === 128 && (X = (r & 31) << 6 | T & 63, X > 127 && (u = X));
            break;
          case 3:
            T = e[t + 1], _ = e[t + 2], (T & 192) === 128 && (_ & 192) === 128 && (X = (r & 15) << 12 | (T & 63) << 6 | _ & 63, X > 2047 && (X < 55296 || X > 57343) && (u = X));
            break;
          case 4:
            T = e[t + 1], _ = e[t + 2], H = e[t + 3], (T & 192) === 128 && (_ & 192) === 128 && (H & 192) === 128 && (X = (r & 15) << 18 | (T & 63) << 12 | (_ & 63) << 6 | H & 63, X > 65535 && X < 1114112 && (u = X));
        }
      }
      u === null ? (u = 65533, w = 1) : u > 65535 && (u -= 65536, n.push(u >>> 10 & 1023 | 55296), u = 56320 | u & 1023), n.push(u), t += w;
    }
    return mt(n);
  }
  var dt = 4096;
  function mt(e) {
    let i = e.length;
    if (i <= dt)
      return String.fromCharCode.apply(String, e);
    let s = "", n = 0;
    for (; n < i; )
      s += String.fromCharCode.apply(String, e.slice(n, n += dt));
    return s;
  }
  function yt(e, i, s) {
    let n = "";
    s = Math.min(e.length, s);
    for (let t = i; t < s; ++t)
      n += String.fromCharCode(e[t] & 127);
    return n;
  }
  function Bt(e, i, s) {
    let n = "";
    s = Math.min(e.length, s);
    for (let t = i; t < s; ++t)
      n += String.fromCharCode(e[t]);
    return n;
  }
  function It(e, i, s) {
    let n = e.length;
    (!i || i < 0) && (i = 0), (!s || s < 0 || s > n) && (s = n);
    let t = "";
    for (let r = i; r < s; ++r)
      t += tt[e[r]];
    return t;
  }
  function bt(e, i, s) {
    let n = e.slice(i, s), t = "";
    for (let r = 0; r < n.length - 1; r += 2)
      t += String.fromCharCode(n[r] + n[r + 1] * 256);
    return t;
  }
  c.prototype.slice = function(e, i) {
    let s = this.length;
    e = ~~e, i = i === void 0 ? s : ~~i, e < 0 ? (e += s, e < 0 && (e = 0)) : e > s && (e = s), i < 0 ? (i += s, i < 0 && (i = 0)) : i > s && (i = s), i < e && (i = e);
    let n = this.subarray(e, i);
    return Object.setPrototypeOf(n, c.prototype), n;
  };
  function ut(e, i, s) {
    if (e % 1 !== 0 || e < 0)
      throw new RangeError("offset is not uint");
    if (e + i > s)
      throw new RangeError("Trying to access beyond buffer length");
  }
  c.prototype.readUintLE = c.prototype.readUIntLE = function(e, i, s) {
    e = e >>> 0, i = i >>> 0, s || ut(e, i, this.length);
    let n = this[e], t = 1, r = 0;
    for (; ++r < i && (t *= 256); )
      n += this[e + r] * t;
    return n;
  }, c.prototype.readUintBE = c.prototype.readUIntBE = function(e, i, s) {
    e = e >>> 0, i = i >>> 0, s || ut(e, i, this.length);
    let n = this[e + --i], t = 1;
    for (; i > 0 && (t *= 256); )
      n += this[e + --i] * t;
    return n;
  }, c.prototype.readUint8 = c.prototype.readUInt8 = function(e, i) {
    return e = e >>> 0, i || ut(e, 1, this.length), this[e];
  }, c.prototype.readUint16LE = c.prototype.readUInt16LE = function(e, i) {
    return e = e >>> 0, i || ut(e, 2, this.length), this[e] | this[e + 1] << 8;
  }, c.prototype.readUint16BE = c.prototype.readUInt16BE = function(e, i) {
    return e = e >>> 0, i || ut(e, 2, this.length), this[e] << 8 | this[e + 1];
  }, c.prototype.readUint32LE = c.prototype.readUInt32LE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
  }, c.prototype.readUint32BE = c.prototype.readUInt32BE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
  }, c.prototype.readBigUInt64LE = V(function(e) {
    e = e >>> 0, v(e, "offset");
    let i = this[e], s = this[e + 7];
    (i === void 0 || s === void 0) && A(e, this.length - 8);
    let n = i + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, t = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + s * 2 ** 24;
    return BigInt(n) + (BigInt(t) << BigInt(32));
  }), c.prototype.readBigUInt64BE = V(function(e) {
    e = e >>> 0, v(e, "offset");
    let i = this[e], s = this[e + 7];
    (i === void 0 || s === void 0) && A(e, this.length - 8);
    let n = i * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], t = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + s;
    return (BigInt(n) << BigInt(32)) + BigInt(t);
  }), c.prototype.readIntLE = function(e, i, s) {
    e = e >>> 0, i = i >>> 0, s || ut(e, i, this.length);
    let n = this[e], t = 1, r = 0;
    for (; ++r < i && (t *= 256); )
      n += this[e + r] * t;
    return t *= 128, n >= t && (n -= Math.pow(2, 8 * i)), n;
  }, c.prototype.readIntBE = function(e, i, s) {
    e = e >>> 0, i = i >>> 0, s || ut(e, i, this.length);
    let n = i, t = 1, r = this[e + --n];
    for (; n > 0 && (t *= 256); )
      r += this[e + --n] * t;
    return t *= 128, r >= t && (r -= Math.pow(2, 8 * i)), r;
  }, c.prototype.readInt8 = function(e, i) {
    return e = e >>> 0, i || ut(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
  }, c.prototype.readInt16LE = function(e, i) {
    e = e >>> 0, i || ut(e, 2, this.length);
    let s = this[e] | this[e + 1] << 8;
    return s & 32768 ? s | 4294901760 : s;
  }, c.prototype.readInt16BE = function(e, i) {
    e = e >>> 0, i || ut(e, 2, this.length);
    let s = this[e + 1] | this[e] << 8;
    return s & 32768 ? s | 4294901760 : s;
  }, c.prototype.readInt32LE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
  }, c.prototype.readInt32BE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
  }, c.prototype.readBigInt64LE = V(function(e) {
    e = e >>> 0, v(e, "offset");
    let i = this[e], s = this[e + 7];
    (i === void 0 || s === void 0) && A(e, this.length - 8);
    let n = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (s << 24);
    return (BigInt(n) << BigInt(32)) + BigInt(i + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
  }), c.prototype.readBigInt64BE = V(function(e) {
    e = e >>> 0, v(e, "offset");
    let i = this[e], s = this[e + 7];
    (i === void 0 || s === void 0) && A(e, this.length - 8);
    let n = (i << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
    return (BigInt(n) << BigInt(32)) + BigInt(this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + s);
  }), c.prototype.readFloatLE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), f.read(this, e, !0, 23, 4);
  }, c.prototype.readFloatBE = function(e, i) {
    return e = e >>> 0, i || ut(e, 4, this.length), f.read(this, e, !1, 23, 4);
  }, c.prototype.readDoubleLE = function(e, i) {
    return e = e >>> 0, i || ut(e, 8, this.length), f.read(this, e, !0, 52, 8);
  }, c.prototype.readDoubleBE = function(e, i) {
    return e = e >>> 0, i || ut(e, 8, this.length), f.read(this, e, !1, 52, 8);
  };
  function ft(e, i, s, n, t, r) {
    if (!c.isBuffer(e))
      throw new TypeError('"buffer" argument must be a Buffer instance');
    if (i > t || i < r)
      throw new RangeError('"value" argument is out of bounds');
    if (s + n > e.length)
      throw new RangeError("Index out of range");
  }
  c.prototype.writeUintLE = c.prototype.writeUIntLE = function(e, i, s, n) {
    if (e = +e, i = i >>> 0, s = s >>> 0, !n) {
      let u = Math.pow(2, 8 * s) - 1;
      ft(this, e, i, s, u, 0);
    }
    let t = 1, r = 0;
    for (this[i] = e & 255; ++r < s && (t *= 256); )
      this[i + r] = e / t & 255;
    return i + s;
  }, c.prototype.writeUintBE = c.prototype.writeUIntBE = function(e, i, s, n) {
    if (e = +e, i = i >>> 0, s = s >>> 0, !n) {
      let u = Math.pow(2, 8 * s) - 1;
      ft(this, e, i, s, u, 0);
    }
    let t = s - 1, r = 1;
    for (this[i + t] = e & 255; --t >= 0 && (r *= 256); )
      this[i + t] = e / r & 255;
    return i + s;
  }, c.prototype.writeUint8 = c.prototype.writeUInt8 = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 1, 255, 0), this[i] = e & 255, i + 1;
  }, c.prototype.writeUint16LE = c.prototype.writeUInt16LE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 2, 65535, 0), this[i] = e & 255, this[i + 1] = e >>> 8, i + 2;
  }, c.prototype.writeUint16BE = c.prototype.writeUInt16BE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 2, 65535, 0), this[i] = e >>> 8, this[i + 1] = e & 255, i + 2;
  }, c.prototype.writeUint32LE = c.prototype.writeUInt32LE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 4, 4294967295, 0), this[i + 3] = e >>> 24, this[i + 2] = e >>> 16, this[i + 1] = e >>> 8, this[i] = e & 255, i + 4;
  }, c.prototype.writeUint32BE = c.prototype.writeUInt32BE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 4, 4294967295, 0), this[i] = e >>> 24, this[i + 1] = e >>> 16, this[i + 2] = e >>> 8, this[i + 3] = e & 255, i + 4;
  };
  function Ot(e, i, s, n, t) {
    y(i, n, t, e, s, 7);
    let r = Number(i & BigInt(4294967295));
    e[s++] = r, r = r >> 8, e[s++] = r, r = r >> 8, e[s++] = r, r = r >> 8, e[s++] = r;
    let u = Number(i >> BigInt(32) & BigInt(4294967295));
    return e[s++] = u, u = u >> 8, e[s++] = u, u = u >> 8, e[s++] = u, u = u >> 8, e[s++] = u, s;
  }
  function N(e, i, s, n, t) {
    y(i, n, t, e, s, 7);
    let r = Number(i & BigInt(4294967295));
    e[s + 7] = r, r = r >> 8, e[s + 6] = r, r = r >> 8, e[s + 5] = r, r = r >> 8, e[s + 4] = r;
    let u = Number(i >> BigInt(32) & BigInt(4294967295));
    return e[s + 3] = u, u = u >> 8, e[s + 2] = u, u = u >> 8, e[s + 1] = u, u = u >> 8, e[s] = u, s + 8;
  }
  c.prototype.writeBigUInt64LE = V(function(e, i = 0) {
    return Ot(this, e, i, BigInt(0), BigInt("0xffffffffffffffff"));
  }), c.prototype.writeBigUInt64BE = V(function(e, i = 0) {
    return N(this, e, i, BigInt(0), BigInt("0xffffffffffffffff"));
  }), c.prototype.writeIntLE = function(e, i, s, n) {
    if (e = +e, i = i >>> 0, !n) {
      let w = Math.pow(2, 8 * s - 1);
      ft(this, e, i, s, w - 1, -w);
    }
    let t = 0, r = 1, u = 0;
    for (this[i] = e & 255; ++t < s && (r *= 256); )
      e < 0 && u === 0 && this[i + t - 1] !== 0 && (u = 1), this[i + t] = (e / r >> 0) - u & 255;
    return i + s;
  }, c.prototype.writeIntBE = function(e, i, s, n) {
    if (e = +e, i = i >>> 0, !n) {
      let w = Math.pow(2, 8 * s - 1);
      ft(this, e, i, s, w - 1, -w);
    }
    let t = s - 1, r = 1, u = 0;
    for (this[i + t] = e & 255; --t >= 0 && (r *= 256); )
      e < 0 && u === 0 && this[i + t + 1] !== 0 && (u = 1), this[i + t] = (e / r >> 0) - u & 255;
    return i + s;
  }, c.prototype.writeInt8 = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[i] = e & 255, i + 1;
  }, c.prototype.writeInt16LE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 2, 32767, -32768), this[i] = e & 255, this[i + 1] = e >>> 8, i + 2;
  }, c.prototype.writeInt16BE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 2, 32767, -32768), this[i] = e >>> 8, this[i + 1] = e & 255, i + 2;
  }, c.prototype.writeInt32LE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 4, 2147483647, -2147483648), this[i] = e & 255, this[i + 1] = e >>> 8, this[i + 2] = e >>> 16, this[i + 3] = e >>> 24, i + 4;
  }, c.prototype.writeInt32BE = function(e, i, s) {
    return e = +e, i = i >>> 0, s || ft(this, e, i, 4, 2147483647, -2147483648), e < 0 && (e = 4294967295 + e + 1), this[i] = e >>> 24, this[i + 1] = e >>> 16, this[i + 2] = e >>> 8, this[i + 3] = e & 255, i + 4;
  }, c.prototype.writeBigInt64LE = V(function(e, i = 0) {
    return Ot(this, e, i, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }), c.prototype.writeBigInt64BE = V(function(e, i = 0) {
    return N(this, e, i, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function gt(e, i, s, n, t, r) {
    if (s + n > e.length)
      throw new RangeError("Index out of range");
    if (s < 0)
      throw new RangeError("Index out of range");
  }
  function kt(e, i, s, n, t) {
    return i = +i, s = s >>> 0, t || gt(e, i, s, 4), f.write(e, i, s, n, 23, 4), s + 4;
  }
  c.prototype.writeFloatLE = function(e, i, s) {
    return kt(this, e, i, !0, s);
  }, c.prototype.writeFloatBE = function(e, i, s) {
    return kt(this, e, i, !1, s);
  };
  function Rt(e, i, s, n, t) {
    return i = +i, s = s >>> 0, t || gt(e, i, s, 8), f.write(e, i, s, n, 52, 8), s + 8;
  }
  c.prototype.writeDoubleLE = function(e, i, s) {
    return Rt(this, e, i, !0, s);
  }, c.prototype.writeDoubleBE = function(e, i, s) {
    return Rt(this, e, i, !1, s);
  }, c.prototype.copy = function(e, i, s, n) {
    if (!c.isBuffer(e))
      throw new TypeError("argument should be a Buffer");
    if (s || (s = 0), !n && n !== 0 && (n = this.length), i >= e.length && (i = e.length), i || (i = 0), n > 0 && n < s && (n = s), n === s || e.length === 0 || this.length === 0)
      return 0;
    if (i < 0)
      throw new RangeError("targetStart out of bounds");
    if (s < 0 || s >= this.length)
      throw new RangeError("Index out of range");
    if (n < 0)
      throw new RangeError("sourceEnd out of bounds");
    n > this.length && (n = this.length), e.length - i < n - s && (n = e.length - i + s);
    let t = n - s;
    return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(i, s, n) : Uint8Array.prototype.set.call(e, this.subarray(s, n), i), t;
  }, c.prototype.fill = function(e, i, s, n) {
    if (typeof e == "string") {
      if (typeof i == "string" ? (n = i, i = 0, s = this.length) : typeof s == "string" && (n = s, s = this.length), n !== void 0 && typeof n != "string")
        throw new TypeError("encoding must be a string");
      if (typeof n == "string" && !c.isEncoding(n))
        throw new TypeError("Unknown encoding: " + n);
      if (e.length === 1) {
        let r = e.charCodeAt(0);
        (n === "utf8" && r < 128 || n === "latin1") && (e = r);
      }
    } else
      typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
    if (i < 0 || this.length < i || this.length < s)
      throw new RangeError("Out of range index");
    if (s <= i)
      return this;
    i = i >>> 0, s = s === void 0 ? this.length : s >>> 0, e || (e = 0);
    let t;
    if (typeof e == "number")
      for (t = i; t < s; ++t)
        this[t] = e;
    else {
      let r = c.isBuffer(e) ? e : c.from(e, n), u = r.length;
      if (u === 0)
        throw new TypeError('The value "' + e + '" is invalid for argument "value"');
      for (t = 0; t < s - i; ++t)
        this[t + i] = r[t % u];
    }
    return this;
  };
  var lt = {};
  function wt(e, i, s) {
    lt[e] = class extends s {
      constructor() {
        super(), Object.defineProperty(this, "message", { value: i.apply(this, arguments), writable: !0, configurable: !0 }), this.name = `${this.name} [${e}]`, this.stack, delete this.name;
      }
      get code() {
        return e;
      }
      set code(n) {
        Object.defineProperty(this, "code", { configurable: !0, enumerable: !0, value: n, writable: !0 });
      }
      toString() {
        return `${this.name} [${e}]: ${this.message}`;
      }
    };
  }
  wt("ERR_BUFFER_OUT_OF_BOUNDS", function(e) {
    return e ? `${e} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
  }, RangeError), wt("ERR_INVALID_ARG_TYPE", function(e, i) {
    return `The "${e}" argument must be of type number. Received type ${typeof i}`;
  }, TypeError), wt("ERR_OUT_OF_RANGE", function(e, i, s) {
    let n = `The value of "${e}" is out of range.`, t = s;
    return Number.isInteger(s) && Math.abs(s) > 2 ** 32 ? t = h(String(s)) : typeof s == "bigint" && (t = String(s), (s > BigInt(2) ** BigInt(32) || s < -(BigInt(2) ** BigInt(32))) && (t = h(t)), t += "n"), n += ` It must be ${i}. Received ${t}`, n;
  }, RangeError);
  function h(e) {
    let i = "", s = e.length, n = e[0] === "-" ? 1 : 0;
    for (; s >= n + 4; s -= 3)
      i = `_${e.slice(s - 3, s)}${i}`;
    return `${e.slice(0, s)}${i}`;
  }
  function g(e, i, s) {
    v(i, "offset"), (e[i] === void 0 || e[i + s] === void 0) && A(i, e.length - (s + 1));
  }
  function y(e, i, s, n, t, r) {
    if (e > s || e < i) {
      let u = typeof i == "bigint" ? "n" : "", w;
      throw r > 3 ? i === 0 || i === BigInt(0) ? w = `>= 0${u} and < 2${u} ** ${(r + 1) * 8}${u}` : w = `>= -(2${u} ** ${(r + 1) * 8 - 1}${u}) and < 2 ** ${(r + 1) * 8 - 1}${u}` : w = `>= ${i}${u} and <= ${s}${u}`, new lt.ERR_OUT_OF_RANGE("value", w, e);
    }
    g(n, t, r);
  }
  function v(e, i) {
    if (typeof e != "number")
      throw new lt.ERR_INVALID_ARG_TYPE(i, "number", e);
  }
  function A(e, i, s) {
    throw Math.floor(e) !== e ? (v(e, s), new lt.ERR_OUT_OF_RANGE(s || "offset", "an integer", e)) : i < 0 ? new lt.ERR_BUFFER_OUT_OF_BOUNDS() : new lt.ERR_OUT_OF_RANGE(s || "offset", `>= ${s ? 1 : 0} and <= ${i}`, e);
  }
  var I = /[^+/0-9A-Za-z-_]/g;
  function L(e) {
    if (e = e.split("=")[0], e = e.trim().replace(I, ""), e.length < 2)
      return "";
    for (; e.length % 4 !== 0; )
      e = e + "=";
    return e;
  }
  function B(e, i) {
    i = i || 1 / 0;
    let s, n = e.length, t = null, r = [];
    for (let u = 0; u < n; ++u) {
      if (s = e.charCodeAt(u), s > 55295 && s < 57344) {
        if (!t) {
          if (s > 56319) {
            (i -= 3) > -1 && r.push(239, 191, 189);
            continue;
          } else if (u + 1 === n) {
            (i -= 3) > -1 && r.push(239, 191, 189);
            continue;
          }
          t = s;
          continue;
        }
        if (s < 56320) {
          (i -= 3) > -1 && r.push(239, 191, 189), t = s;
          continue;
        }
        s = (t - 55296 << 10 | s - 56320) + 65536;
      } else
        t && (i -= 3) > -1 && r.push(239, 191, 189);
      if (t = null, s < 128) {
        if ((i -= 1) < 0)
          break;
        r.push(s);
      } else if (s < 2048) {
        if ((i -= 2) < 0)
          break;
        r.push(s >> 6 | 192, s & 63 | 128);
      } else if (s < 65536) {
        if ((i -= 3) < 0)
          break;
        r.push(s >> 12 | 224, s >> 6 & 63 | 128, s & 63 | 128);
      } else if (s < 1114112) {
        if ((i -= 4) < 0)
          break;
        r.push(s >> 18 | 240, s >> 12 & 63 | 128, s >> 6 & 63 | 128, s & 63 | 128);
      } else
        throw new Error("Invalid code point");
    }
    return r;
  }
  function x(e) {
    let i = [];
    for (let s = 0; s < e.length; ++s)
      i.push(e.charCodeAt(s) & 255);
    return i;
  }
  function R(e, i) {
    let s, n, t, r = [];
    for (let u = 0; u < e.length && !((i -= 2) < 0); ++u)
      s = e.charCodeAt(u), n = s >> 8, t = s % 256, r.push(t), r.push(n);
    return r;
  }
  function U(e) {
    return a.toByteArray(L(e));
  }
  function k(e, i, s, n) {
    let t;
    for (t = 0; t < n && !(t + s >= i.length || t >= e.length); ++t)
      i[t + s] = e[t];
    return t;
  }
  function W(e, i) {
    return e instanceof i || e != null && e.constructor != null && e.constructor.name != null && e.constructor.name === i.name;
  }
  function z(e) {
    return e !== e;
  }
  var tt = function() {
    let e = "0123456789abcdef", i = new Array(256);
    for (let s = 0; s < 16; ++s) {
      let n = s * 16;
      for (let t = 0; t < 16; ++t)
        i[n + t] = e[s] + e[t];
    }
    return i;
  }();
  function V(e) {
    return typeof BigInt > "u" ? st : e;
  }
  function st() {
    throw new Error("BigInt not supported");
  }
}), nn = Ct((o, a) => {
  typeof window < "u" ? (window.global = window, Gr.fetch = window.fetch, a.exports = { Buffer: se().Buffer, Crypto: window.crypto }) : a.exports = { Buffer: se().Buffer, Crypto: crypto };
}), Xe = {};
Vr(Xe, { AVSCTap: () => re, ArweaveSigner: () => Qe, DataItem: () => Zt, MAX_TAG_BYTES: () => be, MIN_BINARY_SIZE: () => rr, SIG_CONFIG: () => Gt, SignatureConfig: () => St, Signer: () => on, createData: () => yn, deserializeTags: () => fe, indexToType: () => tr, serializeTags: () => er, tagsExceedLimit: () => ln });
var on = class {
  signer;
  publicKey;
  signatureType;
  signatureLength;
  ownerLength;
  pem;
  static verify(o, a, f, p) {
    throw new Error("You must implement verify method on child");
  }
}, an = Dt(Be(), 1), xt = Dt(Je(), 1);
async function Ve(o) {
  if (Array.isArray(o)) {
    let m = (0, xt.concatBuffers)([(0, xt.stringToBuffer)("list"), (0, xt.stringToBuffer)(o.length.toString())]);
    return await Ze(o, await Lt().hash(m, "SHA-384"));
  }
  let a = o, f = (0, xt.concatBuffers)([(0, xt.stringToBuffer)("blob"), (0, xt.stringToBuffer)(a.byteLength.toString())]), p = (0, xt.concatBuffers)([await Lt().hash(f, "SHA-384"), await Lt().hash(a, "SHA-384")]);
  return await Lt().hash(p, "SHA-384");
}
async function Ze(o, a) {
  if (o.length < 1)
    return a;
  let f = (0, xt.concatBuffers)([a, await Ve(o[0])]), p = await Lt().hash(f, "SHA-384");
  return await Ze(o.slice(1), p);
}
var ae = Dt(en(), 1), sn = ae.default.default ? ae.default.default : ae.default, un = class extends sn {
  getPublicKey(o) {
    throw new Error("Unimplemented");
  }
}, fn;
function Lt() {
  return fn ??= new un();
}
var St;
(function(o) {
  o[o.ARWEAVE = 1] = "ARWEAVE", o[o.ED25519 = 2] = "ED25519", o[o.ETHEREUM = 3] = "ETHEREUM", o[o.SOLANA = 4] = "SOLANA", o[o.INJECTEDAPTOS = 5] = "INJECTEDAPTOS", o[o.MULTIAPTOS = 6] = "MULTIAPTOS", o[o.TYPEDETHEREUM = 7] = "TYPEDETHEREUM";
})(St || (St = {}));
var Gt = { [St.ARWEAVE]: { sigLength: 512, pubLength: 512, sigName: "arweave" }, [St.ED25519]: { sigLength: 64, pubLength: 32, sigName: "ed25519" }, [St.ETHEREUM]: { sigLength: 65, pubLength: 65, sigName: "ethereum" }, [St.SOLANA]: { sigLength: 64, pubLength: 32, sigName: "solana" }, [St.INJECTEDAPTOS]: { sigLength: 64, pubLength: 32, sigName: "injectedAptos" }, [St.MULTIAPTOS]: { sigLength: 64 * 32 + 4, pubLength: 32 * 32 + 1, sigName: "multiAptos" }, [St.TYPEDETHEREUM]: { sigLength: 65, pubLength: 42, sigName: "typedEthereum" } }, Qe = class {
  signatureType = 1;
  ownerLength = Gt[1].pubLength;
  signatureLength = Gt[1].sigLength;
  jwk;
  pk;
  constructor(o) {
    this.pk = o.n, this.jwk = o;
  }
  get publicKey() {
    return an.default.toBuffer(this.pk);
  }
  sign(o) {
    return Lt().sign(this.jwk, o);
  }
  static async verify(o, a, f) {
    return await Lt().verify(o, a, f);
  }
}, tr = { 1: Qe }, vt = Dt(Be(), 1);
async function ue(o) {
  return Ve([(0, xt.stringToBuffer)("dataitem"), (0, xt.stringToBuffer)("1"), (0, xt.stringToBuffer)(o.signatureType.toString()), o.rawOwner, o.rawTarget, o.rawAnchor, o.rawTags, o.rawData]);
}
async function cn(o, a) {
  let f = await ue(o), p = await a.sign(f), m = await Lt().hash(p);
  return { signature: Et.from(p), id: Et.from(m) };
}
async function hn(o, a) {
  let { signature: f, id: p } = await cn(o, a);
  return o.getRaw().set(f, 2), p;
}
var re = class {
  buf;
  pos;
  constructor(o = Et.alloc(be), a = 0) {
    this.buf = o, this.pos = a;
  }
  writeTags(o) {
    if (!Array.isArray(o))
      throw new Error("input must be array");
    let a = o.length, f;
    if (a)
      for (this.writeLong(a), f = 0; f < a; f++) {
        let p = o[f];
        if (p?.name === void 0 || p?.value === void 0)
          throw new Error(`Invalid tag format for ${p}, expected {name:string, value: string}`);
        this.writeString(p.name), this.writeString(p.value);
      }
    this.writeLong(0);
  }
  toBuffer() {
    let o = Et.alloc(this.pos);
    if (this.pos > this.buf.length)
      throw new Error(`Too many tag bytes (${this.pos} > ${this.buf.length})`);
    return this.buf.copy(o, 0, 0, this.pos), o;
  }
  tagsExceedLimit() {
    return this.pos > this.buf.length;
  }
  writeLong(o) {
    let a = this.buf, f, p;
    if (o >= -1073741824 && o < 1073741824) {
      p = o >= 0 ? o << 1 : ~o << 1 | 1;
      do
        a[this.pos] = p & 127, p >>= 7;
      while (p && (a[this.pos++] |= 128));
    } else {
      f = o >= 0 ? o * 2 : -o * 2 - 1;
      do
        a[this.pos] = f & 127, f /= 128;
      while (f >= 1 && (a[this.pos++] |= 128));
    }
    this.pos++, this.buf = a;
  }
  writeString(o) {
    let a = Et.byteLength(o), f = this.buf;
    this.writeLong(a);
    let p = this.pos;
    if (this.pos += a, !(this.pos > f.length)) {
      if (a > 64)
        this.buf.write(o, this.pos - a, a, "utf8");
      else {
        let m, E, l, c;
        for (m = 0, E = a; m < E; m++)
          l = o.charCodeAt(m), l < 128 ? f[p++] = l : l < 2048 ? (f[p++] = l >> 6 | 192, f[p++] = l & 63 | 128) : (l & 64512) === 55296 && ((c = o.charCodeAt(m + 1)) & 64512) === 56320 ? (l = 65536 + ((l & 1023) << 10) + (c & 1023), m++, f[p++] = l >> 18 | 240, f[p++] = l >> 12 & 63 | 128, f[p++] = l >> 6 & 63 | 128, f[p++] = l & 63 | 128) : (f[p++] = l >> 12 | 224, f[p++] = l >> 6 & 63 | 128, f[p++] = l & 63 | 128);
      }
      this.buf = f;
    }
  }
  readLong() {
    let o = 0, a = 0, f = this.buf, p, m, E, l;
    do
      p = f[this.pos++], m = p & 128, o |= (p & 127) << a, a += 7;
    while (m && a < 28);
    if (m) {
      E = o, l = 268435456;
      do
        p = f[this.pos++], E += (p & 127) * l, l *= 128;
      while (p & 128);
      return (E % 2 ? -(E + 1) : E) / 2;
    }
    return o >> 1 ^ -(o & 1);
  }
  skipLong() {
    let o = this.buf;
    for (; o[this.pos++] & 128; )
      ;
  }
  readTags() {
    let o = [], a;
    for (; a = this.readLong(); )
      for (a < 0 && (a = -a, this.skipLong()); a--; ) {
        let f = this.readString(), p = this.readString();
        o.push({ name: f, value: p });
      }
    return o;
  }
  readString() {
    let o = this.readLong(), a = this.pos, f = this.buf;
    if (this.pos += o, !(this.pos > f.length))
      return this.buf.slice(a, a + o).toString();
  }
};
function er(o) {
  let a = new re();
  return a.writeTags(o), a.toBuffer();
}
function ln(o) {
  let a = new re();
  return a.writeTags(o), a.tagsExceedLimit();
}
function fe(o) {
  return new re(o).readTags();
}
function Ft(o) {
  let a = 0;
  for (let f = o.length - 1; f >= 0; f--)
    a = a * 256 + o[f];
  return a;
}
function pn(o) {
  if (o > 29)
    throw new Error("Short too long");
  let a = [0, 0];
  for (let f = 0; f < a.length; f++) {
    let p = o & 255;
    a[f] = p, o = (o - p) / 256;
  }
  return Uint8Array.from(a);
}
function Ce(o) {
  let a = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let f = 0; f < a.length; f++) {
    let p = o & 255;
    a[f] = p, o = (o - p) / 256;
  }
  return Uint8Array.from(a);
}
var gn = Dt(nn(), 1), jt = Dt(se(), 1), be = 4096, rr = 80, Zt = class {
  binary;
  _id;
  constructor(o) {
    this.binary = o;
  }
  static isDataItem(o) {
    return o.binary !== void 0;
  }
  get signatureType() {
    let o = Ft(this.binary.subarray(0, 2));
    if (St?.[o] !== void 0)
      return o;
    throw new Error("Unknown signature type: " + o);
  }
  async isValid() {
    return Zt.verify(this.binary);
  }
  get id() {
    return (async () => vt.default.encode(await this.rawId))();
  }
  set id(o) {
    this._id = vt.default.toBuffer(o);
  }
  get rawId() {
    return (async () => jt.Buffer.from(await gn.Crypto.subtle.digest("SHA-256", this.rawSignature)))();
  }
  set rawId(o) {
    this._id = o;
  }
  get rawSignature() {
    return this.binary.subarray(2, 2 + this.signatureLength);
  }
  get signature() {
    return vt.default.encode(this.rawSignature);
  }
  set rawOwner(o) {
    if (o.byteLength != this.ownerLength)
      throw new Error(`Expected raw owner (pubkey) to be ${this.ownerLength} bytes, got ${o.byteLength} bytes.`);
    this.binary.set(o, 2 + this.signatureLength);
  }
  get rawOwner() {
    return this.binary.subarray(2 + this.signatureLength, 2 + this.signatureLength + this.ownerLength);
  }
  get signatureLength() {
    return Gt[this.signatureType].sigLength;
  }
  get owner() {
    return vt.default.encode(this.rawOwner);
  }
  get ownerLength() {
    return Gt[this.signatureType].pubLength;
  }
  get rawTarget() {
    let o = this.getTargetStart();
    return this.binary[o] == 1 ? this.binary.subarray(o + 1, o + 33) : jt.Buffer.alloc(0);
  }
  get target() {
    return vt.default.encode(this.rawTarget);
  }
  get rawAnchor() {
    let o = this.getAnchorStart();
    return this.binary[o] == 1 ? this.binary.subarray(o + 1, o + 33) : jt.Buffer.alloc(0);
  }
  get anchor() {
    return this.rawAnchor.toString();
  }
  get rawTags() {
    let o = this.getTagsStart(), a = Ft(this.binary.subarray(o + 8, o + 16));
    return this.binary.subarray(o + 16, o + 16 + a);
  }
  get tags() {
    let o = this.getTagsStart();
    if (Ft(this.binary.subarray(o, o + 8)) == 0)
      return [];
    let a = Ft(this.binary.subarray(o + 8, o + 16));
    return fe(jt.Buffer.from(this.binary.subarray(o + 16, o + 16 + a)));
  }
  get tagsB64Url() {
    return this.tags.map((o) => ({ name: vt.default.encode(o.name), value: vt.default.encode(o.value) }));
  }
  getStartOfData() {
    let o = this.getTagsStart(), a = this.binary.subarray(o + 8, o + 16), f = Ft(a);
    return o + 16 + f;
  }
  get rawData() {
    let o = this.getTagsStart(), a = this.binary.subarray(o + 8, o + 16), f = Ft(a), p = o + 16 + f;
    return this.binary.subarray(p, this.binary.length);
  }
  get data() {
    return vt.default.encode(this.rawData);
  }
  getRaw() {
    return this.binary;
  }
  async sign(o) {
    return this._id = await hn(this, o), this.rawId;
  }
  async setSignature(o) {
    this.binary.set(o, 2), this._id = jt.Buffer.from(await Lt().hash(o));
  }
  isSigned() {
    return (this._id?.length ?? 0) > 0;
  }
  toJSON() {
    return { signature: this.signature, owner: this.owner, target: this.target, tags: this.tags.map((o) => ({ name: vt.default.encode(o.name), value: vt.default.encode(o.value) })), data: this.data };
  }
  static async verify(o) {
    if (o.byteLength < rr)
      return !1;
    let a = new Zt(o), f = a.signatureType, p = a.getTagsStart(), m = Ft(o.subarray(p, p + 8)), E = o.subarray(p + 8, p + 16), l = Ft(E);
    if (l > be)
      return !1;
    if (m > 0)
      try {
        if (fe(jt.Buffer.from(o.subarray(p + 16, p + 16 + l))).length !== m)
          return !1;
      } catch {
        return !1;
      }
    let c = tr[f], b = await ue(a);
    return await c.verify(a.rawOwner, b, a.rawSignature);
  }
  async getSignatureData() {
    return ue(this);
  }
  getTagsStart() {
    let o = this.getTargetStart(), a = this.binary[o] == 1, f = o + (a ? 33 : 1), p = this.binary[f] == 1;
    return f += p ? 33 : 1, f;
  }
  getTargetStart() {
    return 2 + this.signatureLength + this.ownerLength;
  }
  getAnchorStart() {
    let o = this.getTargetStart() + 1, a = this.binary[this.getTargetStart()] == 1;
    return o += a ? 32 : 0, o;
  }
}, dn = Dt(Be(), 1);
function yn(o, a, f) {
  let p = a.publicKey, m = f?.target ? dn.default.toBuffer(f.target) : null, E = 1 + (m?.byteLength ?? 0), l = f?.anchor ? Et.from(f.anchor) : null, c = 1 + (l?.byteLength ?? 0), b = (f?.tags?.length ?? 0) > 0 ? er(f.tags) : null, S = 16 + (b ? b.byteLength : 0), d = Et.from(o), $ = d.byteLength, F = 2 + a.signatureLength + a.ownerLength + E + c + S + $, C = Et.alloc(F);
  if (C.set(pn(a.signatureType), 0), C.set(new Uint8Array(a.signatureLength).fill(0), 2), p.byteLength !== a.ownerLength)
    throw new Error(`Owner must be ${a.ownerLength} bytes, but was incorrectly ${p.byteLength}`);
  C.set(p, 2 + a.signatureLength);
  let K = 2 + a.signatureLength + a.ownerLength;
  if (C[K] = m ? 1 : 0, m) {
    if (m.byteLength !== 32)
      throw new Error(`Target must be 32 bytes but was incorrectly ${m.byteLength}`);
    C.set(m, K + 1);
  }
  let D = K + E, G = D + 1;
  if (C[D] = l ? 1 : 0, l) {
    if (G += l.byteLength, l.byteLength !== 32)
      throw new Error("Anchor must be 32 bytes");
    C.set(l, D + 1);
  }
  C.set(Ce(f?.tags?.length ?? 0), G);
  let Z = Ce(b?.byteLength ?? 0);
  C.set(Z, G + 8), b && C.set(b, G + 16);
  let Y = G + S;
  return C.set(d, Y), new Zt(C);
}
var nr = { ...Xe };
globalThis.arbundles ??= nr;
var En = nr;
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/
function Bn() {
  return qr.init({});
}
export {
  qr as Arweave,
  En as WarpArBundles,
  Bn as init
};
