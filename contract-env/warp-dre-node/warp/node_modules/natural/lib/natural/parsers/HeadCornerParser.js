/*
    Head-Corner Chart Parser
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

var DoubleDottedItem = require('./DoubleDottedItem');
var GoalItem = require('./GoalItem');
var CYK_Item = require('./CYK_Item');
var Chart = require('./Chart');
var Agenda = require('./Agenda');

HeadCornerChartParser.prototype.initialise = function(tagged_sentence) {
  var that = this;
  var new_item;
  var nr_items_added = 0;
  var i,j;

  logger.debug("Enter HeadCornerChartParser.initialise");
  this.tagged_sentence = tagged_sentence;
  this.N = tagged_sentence.length;
  // Initialise agenda
  this.agenda = new Agenda();
  // Initialise chart
  this.chart = new Chart(this.N);

  // Add goal items for the start symbol
  for (i = 0; i <= this.N; i++) {
    for (j = i; j <= this.N; j++) {
      new_item = new GoalItem(i, j, this.grammar.get_start_symbol());
      nr_items_added += this.agenda.add_item(new_item, this.chart);
      logger.debug("HeadCornerChartParser.initialise: |- " + new_item.id);
    }
  }

  // Add items for the tagged sentence
  for (i = 0; i < this.N; i++) {
    // Add terminal item
    var term_item = new CYK_Item({'lhs': this.tagged_sentence[i][0], 'rhs': ''}, i, i + 1);
    // Add tag items
    for (j = 1; j < tagged_sentence[i].length; j++) {
      var tag_item = new CYK_Item({'lhs': this.tagged_sentence[i][j], 'rhs': [this.tagged_sentence[i][0]]}, i, i + 1);
      tag_item.children.push(term_item);
      nr_items_added += this.chart.add_item(tag_item);
      logger.debug("HeadCornerChartParser.initialise: |- " + tag_item.id);
    }
  }
  logger.debug("Exit  HeadCornerChartParser.initialise: number of items added: " + nr_items_added);
  return(nr_items_added);
};

// Pseudo code of a chart parser with agenda (based on Sikkel's parsing schemata)
// create initial chart and agenda
// while agenda is not empty
//   delete (arbitrarily chosen) item current from agenda
//   if current is not on the chart then
//     add current to chart
//     add all items that can be deduced by combining current with
//     the items already on the chart
//     to the agenda if it is not already on chart or agenda
HeadCornerChartParser.prototype.parse = function (tagged_sentence) {
  logger.debug("Enter HeadCornerChartParser.parse: sentence: " + tagged_sentence);
  this.initialise(tagged_sentence);
  var items_added = 0;
  var current;
  do {
    current = this.agenda.get_item();
    if (current) {
      if (this.chart.add_item(current)) {
        items_added += current.combine_with_chart(this.chart, this.agenda, this.grammar);
      }
    }
  } while (current);
  logger.debug("Exit HeadCornerChartParser.parse");
  return this.chart;
};

// Constructor for the left-corner parser
function HeadCornerChartParser(grammar) {
  this.grammar = grammar;
  this.grammar.compute_hc_relation();
  logger.debug("HeadCornerChartParser: " + JSON.stringify(grammar.hc));
}

module.exports = HeadCornerChartParser;