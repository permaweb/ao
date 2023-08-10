"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _errorsJs = require("../util/errors.js");
var TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;
var _default = {
    /**
   * The order that this parser will run, in relation to other parsers.
   *
   * @type {number}
   */ order: 300,
    /**
   * Whether to allow "empty" files (zero bytes).
   *
   * @type {boolean}
   */ allowEmpty: true,
    /**
   * The encoding that the text is expected to be in.
   *
   * @type {string}
   */ encoding: "utf8",
    /**
   * Determines whether this parser can parse a given file reference.
   * Parsers that return true will be tried, in order, until one successfully parses the file.
   * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
   * every parser will be tried.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
   * @returns {boolean}
   */ canParse: function canParse(file) {
        // Use this parser if the file is a string or Buffer, and has a known text-based extension
        return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
    },
    /**
   * Parses the given file as text
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
   * @returns {string}
   */ parse: function parse(file) {
        if (typeof file.data === "string") {
            return file.data;
        } else if (Buffer.isBuffer(file.data)) {
            return file.data.toString(this.encoding);
        } else {
            throw new _errorsJs.ParserError("data is not text", file.url);
        }
    }
};
