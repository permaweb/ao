"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appData = void 0;
const path_1 = __importDefault(require("path"));
function appData(...app) {
    let dataFolder = '';
    if (process.platform === 'win32') {
        dataFolder = path_1.default.join(process.env.APPDATA, ...app);
    }
    else if (process.platform === 'darwin') {
        dataFolder = path_1.default.join(process.env.HOME, 'Library', 'Application Support', ...app);
    }
    else {
        dataFolder = path_1.default.join(process.env.HOME, ...prependDot(...app));
    }
    return dataFolder;
}
exports.appData = appData;
function prependDot(...app) {
    return app.map((item, i) => {
        if (i === 0) {
            return `.${item}`;
        }
        else {
            return item;
        }
    });
}
//# sourceMappingURL=appdata.js.map