/*
    GoalItem class
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

var typeOf = require('typeof');
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('ERROR');

function GoalItem(i, j, X) {
  logger.debug("Enter GoalItem: " + i + ", " + j + ", " + X);
  this.id = "Goal(" + i + ", " + j + ", " + X + ")";
  this.name = X;
  this.children = [];
  this.data = {};
  this.data.from = i;
  this.data.to = j;
  this.data.nonterminal = X;
}

module.exports = GoalItem;

var DoubleDottedItem = require('./DoubleDottedItem');
var CYK_Item = require('./CYK_Item');

// Returns false
GoalItem.prototype.is_complete = function() {
  logger.debug("Enter GoalItem.is_complete: a goal item always is incomplete!");
  return(false);
};

GoalItem.prototype.combine_with_chart = function(chart, agenda, grammar) {
  var nr_items_added = 0;
  
  logger.debug("Enter GoalItem.combine_with_chart:" + this.id);
  nr_items_added += this.hc_predict(chart, agenda, grammar);
  nr_items_added += this.hc_predict_empty(chart, agenda, grammar);
  nr_items_added += this.left_predict(chart, agenda, grammar);
  nr_items_added += this.right_predict(chart, agenda, grammar);
  nr_items_added += this.left_complete(chart, agenda, grammar);
  nr_items_added += this.right_complete(chart, agenda, grammar);
  logger.debug("Exit GoalItem.combine_with_chart: number of items added: " + nr_items_added);
  return(nr_items_added);
};

// Adds double dotted items to the chart based on goal and CYK items
GoalItem.prototype.hc_predict = function(chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;
  
  logger.debug("Enter GoalItem.hc_predict: " + this.id);
  var items = chart.get_items_from_to(this.data.from, this.data.to);
  items.forEach(function(item) {
    if (typeOf(item) === "cyk_item") {
      // Create head-corner items
      var rules = grammar.get_rules_with_head(item.data.rule.lhs);
      rules.forEach(function(rule) {
        if (grammar.is_headcorner_of(rule.lhs, that.data.nonterminal)) {
          var new_item = new DoubleDottedItem(rule, rule.head, rule.head+1, that.data.from, that.data.to);
          new_item.children.push(item);
          nr_items_added += agenda.add_item(new_item, chart);
          logger.debug("GoalItem.hc_predict: " + that.id +", " + item.id + " |- " + new_item.id);
        }
      });
    }
  });
  logger.debug("Exit GoalItem.hc_predict: number of items added: " + nr_items_added);
  return(nr_items_added);
};

// Add CYK items for epsilon rules with a left-hand-side that is head-corner of the goal
GoalItem.prototype.hc_predict_empty = function(chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter GoalItem.hc_predict_empty: " + this.id);
  if (this.data.from === this.data.to) {
    grammar.production_rules.forEach(function(rule) {
      if ((rule.rhs.length === 0) && grammar_is_headcorner_of(rule.lhs, that.data.nonterminal)) {
        var new_item = new CYK_item(rule, that.data.from, that.data.to);
        nr_items_added += agenda.add_item(new_item, chart);
        logger.debug("GoalItem.hc_predict_empty: " + that.id + " |- " + new_item.id);
      }
    });
  }
 logger.debug("Exit GoalItem.hc_predict_empty: number of items added: " + nr_items_added);
  return(nr_items_added);
};

GoalItem.prototype.left_predict = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter GoalItem.left_predict: " + this.id);
  var items = chart.get_items_to(this.data.to);
  items.forEach(function(item) {
    if ((typeOf(item) === "doubledotteditem") && (item.data.left_dot > 0)){
      if (grammar.is_headcorner_of(item.data.rule.lhs, that.data.nonterminal)) {
        for (var i = that.data.from; i <= item.data.from; i++) {
          for (var j = i; j <= item.data.from; j++) {
            var new_goal = new GoalItem(i, j, item.data.rule.rhs[item.data.left_dot-1]);
            nr_items_added += agenda.add_item(new_goal, chart);
            logger.debug("GoalItem.left_predict: " + that.id +", " + item.id + " |- " + new_goal.id);
          }
        }
      }
    }
  });
  logger.debug("Exit GoalItem.left_predict: number of items added: " + nr_items_added);
  return(nr_items_added);
};

GoalItem.prototype.right_predict = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter GoalItem.right_predict: " + this.id);
  var items = chart.get_items_from(this.data.from);
  items.forEach(function(item) {
    if ((typeOf(item) === "doubledotteditem") && (item.data.right_dot < item.data.rule.rhs.length)){
      if (grammar.is_headcorner_of(item.data.rule.lhs, that.data.nonterminal)) {
        for (var i = item.data.to; i <= that.data.to; i++) {
          for (var j = i; j <= that.data.to; j++) {
            var new_goal = new GoalItem(i, j, item.data.rule.rhs[item.data.right_dot]);
            nr_items_added += agenda.add_item(new_goal, chart);
            logger.debug("GoalItem.right_predict: " + that.id +", " + item.id + " |- " + new_goal.id);
          }
        }
      }
    }
  });
  logger.debug("Exit GoalItem.right_predict: number of items added: " + nr_items_added);
  return(nr_items_added);
};

GoalItem.prototype.left_complete = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter GoalItem.left_complete: " + this.id);
  for (var j = this.data.from; j <= this.data.to; j++) {
    var items1 = chart.get_items_from_to(this.data.from, j);
    var items2 = chart.get_items_from_to(j, this.data.to);
    items1.forEach(function(item1) {
      if (typeOf(item1) === "cyk_item") {
        items2.forEach(function(item2) {
          if ((typeOf(item2) === "doubledotteditem") && (item2.data.left_dot > 0)) {
            logger.debug("GoalItem.left_complete: trying: " + that.id + ", " + item2.id  + ", " + item1.id);
            if ((item2.data.rule.rhs[item2.data.left_dot-1] === item1.data.rule.lhs) && 
                grammar.is_headcorner_of(item2.data.rule.lhs, that.data.nonterminal)) {
              new_item = item2.copy();
              new_item.recognise_left(item1);
              nr_items_added += agenda.add_item(new_item, chart);
              logger.debug("GoalItem.left_complete: " + that.id +", " + item2.id + ", " + item1.id + " |- " + new_item.id);
            }
          }
        });
      }
    });
  }
  logger.debug("Exit GoalItem.left_complete: number of items added: " + nr_items_added);
  return(nr_items_added);
};

GoalItem.prototype.right_complete = function (chart, agenda, grammar) {
  var nr_items_added = 0;
  var that = this;
  
  logger.debug("Enter GoalItem.right_complete: " + this.id);
  for (var j = this.data.from; j <= this.data.to; j++) {
    var items1 = chart.get_items_from_to(this.data.from, j);
    var items2 = chart.get_items_from_to(j, this.data.to);
    items1.forEach(function(item1) {
      if (typeOf(item1) === "doubledotteditem") {
        items2.forEach(function(item2) {
          if (typeOf(item2) === "cyk_item") {
            logger.debug("GoalItem.right_complete: trying: " + that.id + ", " + item1.id  + ", " + item2.id);
            if ((item1.data.rule.rhs[item1.data.right_dot] === item2.data.rule.lhs) &&
                grammar.is_headcorner_of(item1.data.rule.lhs, that.data.nonterminal)) {
              new_item = item1.copy();
              new_item.recognise_right(item2);
              nr_items_added += agenda.add_item(new_item, chart);
              logger.debug("GoalItem.right_complete: " + that.id +", " + item1.id + ", " + item2.id + " |- " + new_item.id);
            }
          }
        });
      }
    });
  }
  logger.debug("Exit GoalItem.right_complete: number of items added: " + nr_items_added);
  return(nr_items_added);
};