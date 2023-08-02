const { getAllErrors } = require('../db/nodeDb');

module.exports = async (ctx) => {
  try {
    ctx.body = await getAllErrors(ctx.nodeDb);
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
