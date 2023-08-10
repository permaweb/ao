The Article class determines whether "a" or "an" should precede a word in English using the method described in [this stackoverflow response](http://stackoverflow.com/questions/1288291/how-can-i-correctly-prefix-a-word-with-a-and-an/1288473#1288473). The wikipedia-article-text dump provided by [Eamon Nerbonne](http://home.nerbonne.org/A-vs-An/) was used as the basis for the dataset.

To use:

	npm install articles

Example:

    Articles = require('articles')
	Articles.articlize(
	  'unanticipated result'
	  'unanimous vote'
	  'honest decision'
	  'honeysuckle shrub'
	  '0800 number'
	  '∞ of oregano'
	  'NASA scientist'
	  'NSA analyst'
	  'FIAT car'
	  'FAA policy'
	)

Output:

	[ 'an unanticipated result',
	  'a unanimous vote',
	  'an honest decision',
	  'a honeysuckle shrub',
	  'an 0800 number',
	  'an ∞ of oregano',
	  'a NASA scientist',
	  'an NSA analyst',
	  'a FIAT car',
	  'an FAA policy' ]


