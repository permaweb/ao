
function validate(body) {
    const { id, data, cu } = body;

    if(!id) {
        throw new Error(`Please pass an id in the post request`);
    }

    if(!data) {
        throw new Error(`Please pass data in the post request`);
    }

    if(!cu) {
        throw new Error(`Please pass a cu in the post request`);
    }
}

module.exports = validate;