#! shebangs located lower in the file

# Custom Markdown Parser Guide

A cheat sheet and guide for building the custom Markdown parser in svelte powering this blog.

## Meta Data Shebangs

Post metadata is stored in `#!` shebangs within the file. As a matter of formatting, the shebangs should be at the top of the file and separated by a newline. The parser will discover and utilize them regardless of where in the post they are found. The shebangs are used to store metadata about the post, such as the title, date, tags, description, author, and image. Here is an example of the shebangs used in this post:

```
#! title: Custom Markdown Parser Guide
#! date: 11/14/2024
#! tags: web-development, markdown, programming, tutorial, documentation
#! description: A cheat sheet and guide for building a custom Markdown parser in svelte.
#! author: Eli Bukoski
#! image: logo.webp
```

Note: everything after the `: ` is considered the value of the metadata. Everything before the `: ` is considered the key and must match exactly with the keys used in the parser.

## Galleries and Images

Images a built using the DynaImage and DynaGallery components. The DynaImage component is used to display a single image, while the DynaGallery component is used to display a collection of images. The image paths are relative to the `$lib/img/` directory. Here is an example of how to use the DynaImage and DynaGallery components:

![DynaImage Example](logo.webp){DynaImage Example with caption}

```
![DynaImage Example](logo.webp){DynaImage Example with caption}
```

#!g
![DynaGallery Example](logo.webp)
![DynaGallery Example](logo-invert.webp)
![me](headshot/eli.webp){captions available}
#!g
Markdown syntax:

```
#!g
![DynaGallery Example](logo.webp)
![DynaGallery Example](logo-invert.webp)
![me](headshot/eli.webp){captions available}
#!g
```

## Columns

#% 1,2

This is a half page column. Columns are denoted with custom `# %` shebangs, without the space. Following the symbol a space, and then a fraction: `1,2` determines the size of the column. The fraction is a numerator and denominator separated by a comma. At this time `1,2`, `1,3`, and `2,3` are supported.
#% 1,2

Columns have predefined mobile-compatible css. Under 600 px the columns will stack on top of each other.

Here's an example of a column syntax:

```
# % 1,3 (do not include the space between the # and %)
I'm a third page column.
I can be multiple lines long. and contain any markdown.
The actual shebangs cannot be shown here as they have a higher order of operation/precedence than the code block.
The parser will break the code block to form the columns.
# % 2,3
I'm a two-thirds page column.
Columns must be closed with a shebang, but see the shebang above closed the first column and opened the second.
# %
```

#%

## Hyperlinks

Hyperlinks are created using the standard markdown syntax. Here is an example of how to create a hyperlink:

```
[Link Text](https://www.example.com)
```

## Code Blocks

Code blocks are created using the standard markdown syntax of triple backticks. The syntax highlighting is provided by HLJS. When encapsulating code, the code block has a higher order of operation/precedence than everything except columns and metadata shebangs (The metadata stripper will read shebangs encapsulated in code blocks, however the parser will still render them properly.)

Inline code made with single backticks will not be highlighted. It is WIP to add this feature.

## General Markdown Headers

The parser supports all standard markdown headers. Here is an example of how to create a header:

```
# Header 1
## Header 2
### Header 3

Standard text!
```

## Lists/ Indentation

The parser support rudimentary numeric lists. This is a WIP feature. Here is an example of how to create a list:

```
1. Alpha
2. Beta
3. Gamma
```

The parser indents the list:

1. Alpha
2. Beta
3. Gamma
4. 1. Delta
5. 2. Epsilon

Note for hyphenated lists, the parser will accept both leading spaces or multiple hyphens. Here is an example of how to create a hyphenated list:

- Alpha
- Beta
- Gamma
  - Delta (Double leading spaces with 1 hyphen)
  - Epsilon
- - Kilo (Double space hyphen pair)
- - Lima
    Note the parser matches [0-9]+. for numeric lists and [ ]\*[-]+ for hyphenated lists.
    If the parser encounters multiple spaces before a hyphen, it consume 1 space and add an indent level. Otherwise it always consumes the entire indent signature and indents 1 level.

## Style

The parser supports bold, italic, and strikethrough text. Here is an example of how to create styled text:

```
**Bold Text**
_Italic Text_
~~Strikethrough Text~~
**_Bold and Italic Text_**
<<Underline Text<<
```

**Bold Text**
_Italic Text_
~~Strikethrough Text~~
**_Bold and Italic Text_**

Note:
These inline styles can be used anywhere within a line unlike most other features requiring a newline. They do not currently support nesting.
