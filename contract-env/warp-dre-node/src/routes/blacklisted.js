const { getAllBlacklisted } = require('../db/nodeDb');

module.exports = async (ctx) => {
  try {
    ctx.body = await getAllBlacklisted(ctx.nodeDb);
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
