import PouchDb from "pouchdb";
import PouchDbFind from "pouchdb-find";
import NodeWebSql from "pouchdb-adapter-node-websql";

PouchDb.plugin(NodeWebSql);
PouchDb.plugin(PouchDbFind);
const internalPouchDb = new PouchDb("ao-cache", { adapter: "websql" });

export { internalPouchDb as pouchDb };


