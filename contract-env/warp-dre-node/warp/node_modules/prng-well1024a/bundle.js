var fs = require('fs');

function cut(src) {
  var cutter = /---- IF BROWSER, CUT ALONG LINE ----\n/;
  var srcStr = src.toString();
  var match = cutter.exec(srcStr);
  return srcStr.substr(match.index + match[0].length);
}

var src = cut(fs.readFileSync(__dirname + '/well1024a.js'));

fs.writeFileSync(__dirname + '/browser/well1024a.js', src);
