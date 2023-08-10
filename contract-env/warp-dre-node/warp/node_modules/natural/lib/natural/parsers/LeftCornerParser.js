/*
    Left Corner Chart Parser
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

// Algorithm based on the improved left-corner algorithm in 
// Improved Left-Corner Chart Parsing for Large Context-Free Grammars, Robert C. Moore
// IWPT2000

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

var EarleyItem = require('./EarleyItem');
var Chart = require('./Chart');
var ChartParser = require("./ChartParser");

// Constructor for the left-corner parser
function LeftCornerChartParser(grammar) {
  this.grammar = grammar;
  this.grammar.compute_lc_relation();
}

LeftCornerChartParser.prototype = Object.create(ChartParser.prototype);

LeftCornerChartParser.prototype.parse = function(tagged_sentence) {
  var that = this;

  this.initialise(tagged_sentence);
  var i;
  for (i = 0; i <= this.N; i++) {
    var items_added;
    do {
      items_added = 0;
      var items = this.chart.get_items_to(i);
      items.forEach(function(item) {
        items_added += item.completer(that.chart, that.grammar);
        items_added += item.lc_predictor(that.chart, that.grammar);
      });
    } while (items_added);
  }
  return this.chart;
};

module.exports = LeftCornerChartParser;