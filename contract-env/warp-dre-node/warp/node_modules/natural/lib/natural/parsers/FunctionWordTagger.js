/*
    A part-of-speech tagger for English function words
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

var fs = require('fs');

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('ERROR');

// Files that contain function words; files are located in ../data
files_with_function_words = [
  "function_words_adverb.txt",
  "function_words_indefinite_pronoun.txt",
  "function_words_possessive_pronoun.txt",
  "function_words_relative_pronoun.txt",
  "function_words_conjunction.txt",
  "function_words_interrogative_pronoun.txt",
  "function_words_preposition.txt",
  "function_words_demonstrative_pronoun.txt",
  "function_words_particle.txt",
  "function_words_reciprocal_pronoun.txt",
  "function_words_determiner.txt",
  "function_words_personal_pronoun.txt",
  "function_words_reflexive_pronoun.txt"];
  
path_to_lexicon = "../data/";

// Returns an array of category for word
FunctionWordTagger.prototype.tag_word = function(word) {
  return(this.lexicon[word]);
};

// Parses the list of words; first lines is the POS category
FunctionWordTagger.prototype.read_words = function(text) {
  var words = text.split('\n');
  var category = words.shift();
  var that = this;
  
  logger.debug("Enter FunctionWordTagger.read_words");
  words.forEach(function(word) {
    if (!that.lexicon[word]) {
      that.lexicon[word] = [category];
    }
    else {
      that.lexicon[word].push(category);
    }
    logger.debug("FunctionWordTagger.read_words: lexicon entry " + word + " -> " + that.lexicon[word]);
  });
  logger.debug("Exit FunctionWordTagger.read_words");
};

// Constructor: reads files with function words and calls the callback with itself 
function FunctionWordTagger(callback) {
  var that = this;
  var nr_files = files_with_function_words.length;

  this.lexicon = {};
  files_with_function_words.forEach(function(filename){
    fs.readFile(path_to_lexicon + filename, 'utf8', function (error, text) {
      that.read_words(text);
      nr_files--;
      if (nr_files === 0) {
        callback(that);
      }
    });
  });
}

module.exports = FunctionWordTagger;