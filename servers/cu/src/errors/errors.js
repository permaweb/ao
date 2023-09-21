function error(err, req, res, next) {
    console.error(err.stack);
  
    res.status(500);
    res.send(`${err.message}`);
}

module.exports = error;