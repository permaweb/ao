"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const path_1 = require("path");
const knex_1 = require("knex");
const connect = (dbPath) => {
    return (0, knex_1.knex)({
        client: 'sqlite3',
        connection: {
            filename: (0, path_1.join)(dbPath, 'db.sqlite'),
        },
        useNullAsDefault: true,
    });
};
exports.connect = connect;
//# sourceMappingURL=connect.js.map