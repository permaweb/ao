# creating man pages

Creating a `man page` is as simple as creating a markdown (or text) file and uploading it to the permaweb with specific tags.

<!-- toc -->

- [Spec (tags)](#spec-tags)
- [Using Irys CLI to Upload](#using-irys-cli-to-upload)

<!-- tocstop -->

## Spec (tags)

To author a manpage you can create a `markdown` file or just a `text` file and upload to `arweave` using the following tags:

| Name         | Description                                              |
| ------------ | -------------------------------------------------------- |
| ao-manpage   | This is the name that will be used to access the manpage |
| Type         | ANS-110 Tag with a value of `manpage`                    |
| Title        | The title of the manpage                                 |
| Content-Type | text/markdown or text/plain                              |

## Using Irys CLI to Upload


```zsh
irys upload creating-man-pages.md -h https://node2.irys.xyz -t arweave -w ${PATH_TO_WALLET} --tags ao-manpage  Content-Type text/markdown Type manpage Title 'Creating a manpage'
```