/*
    Generic chart parser that can be used to create different types of chart parsers
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
logger.setLevel('ERROR');

var EarleyItem = require('./EarleyItem');
var Chart = require('./Chart');

ChartParser.prototype.initialise = function(tagged_sentence) {
  var that = this;
  var nr_items_added = 0;
  
  logger.debug('Enter ChartParser.initialise');
  this.tagged_sentence = tagged_sentence;
  this.N = this.tagged_sentence.length;
  // Initialise chart
  this.chart = new Chart(this.N);
  // Add items for rules that have the start symbol as left-hand-side
  var rules = this.grammar.rules_with_lhs(this.grammar.get_start_symbol());
  rules.forEach(function(rule) {
    var new_item = new EarleyItem(rule, 0, 0, 0);
    nr_items_added += that.chart.add_item(new_item);
  });

  // Add items for the tagged sentence
  for (var i = 0; i < this.N; i++) {
    // Create terminal item
    var term_item = new EarleyItem({'lhs': this.tagged_sentence[i][0], 'rhs': ''}, 1, i, i + 1);
    // Add tag items
    for (var j = 1; j < tagged_sentence[i].length; j++) {
      var tag_item = new EarleyItem({'lhs': this.tagged_sentence[i][j], 'rhs': [this.tagged_sentence[i][0]]}, 1, i, i + 1);
      tag_item.append_child(term_item);
      nr_items_added += this.chart.add_item(tag_item);
      logger.debug("ChartParser.initialise: |- " + tag_item.id);
    }
  }
  logger.debug("Exit ChartParser.initialise; number of items added: " + nr_items_added);
  return(nr_items_added);
};

function ChartParser() {}

module.exports = ChartParser;