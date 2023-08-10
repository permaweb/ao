const path = require("path");

const fs = require('fs'),
    archiver = require('archiver'),
    streamBuffers = require('stream-buffers');

const outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
    initialSize: (1000 * 1024),   // start at 1000 kilobytes.
    incrementAmount: (1000 * 1024) // grow by 1000 kilobytes each time buffer overflows.
});
const archive = archiver('zip', {
    zlib: {level: 9} // Sets the compression level.
});
archive.pipe(outputStreamBuffer);
archive.directory(path.basename("."), path.basename("."));
archive.finalize().then(() => {
    outputStreamBuffer.end();
    fs.writeFile('output3.zip', outputStreamBuffer.getContents(), function () {
        console.log('done!');
    });
})

// good practice to catch this error explicitly
archive.on('error', function(err) {
    throw err;
});

archive.on('finish', function() {

});

