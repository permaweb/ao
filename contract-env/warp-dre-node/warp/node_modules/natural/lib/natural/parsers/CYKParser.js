/*
    Cocke Younger Kasami (CYK) chart parser
    Copyright (C) 2014 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

var Item = require('./CYK_Item');
var Chart = require('./Chart');
var ChartParser = require('./ChartParser');

// Constructor for parser object
// grammar is an object as defined in CFG.js
function CYK_ChartParser(grammar) {
  logger.debug("Enter CYK_ChartParser: " + JSON.stringify(grammar));
  this.grammar = grammar;
}

CYK_ChartParser.prototype = Object.create(ChartParser.prototype);


CYK_ChartParser.prototype.initialise = function(tagged_sentence) {
  logger.debug("Enter CYK_ChartParser.initialise");
  this.tagged_sentence = tagged_sentence;
  this.N = tagged_sentence.length;
  this.chart = new Chart(this.N);
  for (var i = 0; i < this.N; i++) {
    // Create a terminal item of the form Terminal -> *empty*
    var term_item = new Item({'lhs': tagged_sentence[i][0], 'rhs': []}, i, i+1);
    // Create a tag item of the form Categorie -> Terminal
    for (var j = 1; j < tagged_sentence[i].length; j++) {
      var tag_item = new Item({'lhs': this.tagged_sentence[i][j], 'rhs': [this.tagged_sentence[i][0]]}, i, i + 1);
      tag_item.children.push(term_item);
      this.chart.add_item(tag_item);
      logger.debug("CYK_Parser.initialise: |- " + tag_item.id);
    }
  }
  logger.debug("Exit CYK_ChartParser.initialise");
};

// This is the CYK chart parser
// sentence is a tagged sentence of the form [[word, category], [word, category], ...]
CYK_ChartParser.prototype.parse = function(tagged_sentence) {
  var that = this;

  logger.debug("Enter CYK_ChartParser.parse: " + JSON.stringify(tagged_sentence, null, 2));
  this.initialise(tagged_sentence);
  for (var i = 2; i <= this.N; ++i) { // Length of span
    for (var j = 0; j <= this.N - i; ++j) { // Start of span
      for (var k = i - 1; k >= 0; --k) { // Partition of span
        var items1 = that.chart.get_items_from_to(j, j + k);
        var items2 = that.chart.get_items_from_to(j + k, j + i);
        items1.forEach(function(item1) {
          items2.forEach(function(item2) {
            var matching_rules = that.grammar.get_rules_with_rhs(item1.data.rule.lhs, item2.data.rule.lhs);
            matching_rules.forEach(function(rule) {
              var item = new Item(rule, item1.data.from, item2.data.to);
              item.add_child(item1);
              item.add_child(item2);
              that.chart.add_item(item);
              logger.debug("CYK_ChartParser.parse: " + item1.id + ", " + item2.id + " |- " + item.id);
            });
          });
        });
      }
    }
  }
  logger.debug("Exit CYK_ChartParser.parse: " + JSON.stringify(this.chart, null, 2));
  return this.chart;
};

module.exports = CYK_ChartParser;