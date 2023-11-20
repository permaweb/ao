# Manpages

The `man-pages` directory holds several small manuals related to `ao` and `aos`.  These `manpages` can be easily installed on your own AOS instance!

Manpages will follow the following spec.

<!-- toc -->

- [aos Manpages Spec](#aos-manpages-spec)
  - [Abstract](#abstract)
  - [Spec](#spec)
  - [Collections _future_](#collections-future-)

<!-- tocstop -->

## aos Manpages Spec

### Abstract

manpages is way to create documentation for unix programs, for aos, we want to provide the same concept. 


### Spec

To author a manpage you can create a `markdown` file or just a `text` file and upload to `arweave` using the following tags:

| Name         | Description                                              |
| ------------ | -------------------------------------------------------- |
| ao-manpage   | This is the name that will be used to access the manpage |
| Type         | ANS-110 Tag with a value of `manpage`                    |
| Title        | The title of the manpage                                 |
| Content-Type | text/markdown or text/plain                              |


### Collections _future_

Using the collection spec, we can create group of man pages that can be installed with a collection manifest. The collection manifest is a spec that holds an array of manpages.



