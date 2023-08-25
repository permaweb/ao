const { getAllContracts } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const { nodeDb } = ctx;

  const allContracts = await getAllContracts(nodeDb);

  try {
    ctx.body = {
      cachedContracts: allContracts.length,
      ids: allContracts
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
