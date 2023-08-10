var fs = require('fs');

function cut(src) {
  var cutter = /---- IF BROWSER, CUT ALONG LINE ----\n/;
  var srcStr = src.toString();
  var match = cutter.exec(srcStr);
  return srcStr.substr(match.index + match[0].length);
}

var wellInsert = /^.*---- IF BROWSER, INSERT WELL-1024A HERE ----$/m;

var randySrc = cut(fs.readFileSync(__dirname + '/lib/randy.js'));
var well1024aSrc = fs.readFileSync(__dirname + '/node_modules/prng-well1024a/browser/well1024a.js');

var result = randySrc.replace(wellInsert, well1024aSrc);

fs.writeFileSync(__dirname + '/browser/randy.js', result);
