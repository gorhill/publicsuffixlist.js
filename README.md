# publicsuffixlist.js

A javascript utility to make use of [Mozilla Foundation's Public Suffix
List](http://publicsuffix.org) ("PSL").

## Why?

This is just an implementation to deal with domain while taking into account
[Mozilla Foundation's Public Suffix List](http://publicsuffix.org). Follow
the link to understand why such a list is needed.

## Test and benchmark

See [test and benchmark](https://gorhill.github.io/publicsuffixlist.js/) pages.

## API
```js
context.publicSuffixList = {
    version: '2.0',
    parse,
    getDomain,
    getPublicSuffix,
    suffixInPSL,
    toSelfie, fromSelfie,
    disableWASM, enableWASM
};
```
## Usage

```html
<script src="punycode.js"></script>
<script src="publicsuffixlist.js"></script>
```
```js
// window.publixSuffixList should now be present.

/* … */

// Feed it the list (you choose how you obtain it).
// `list` must be unicode text.
// Need to pass a converter to punycode (punycode.js is
// awesome: https://github.com/bestiejs/punycode.js).
window.publicSuffixList.parse(list, punycode.toASCII);

/* … */

// Caller is responsible to pass in hostnames which are "canonicalized in the
// normal way for hostnames": lower-case, punycode, and only a-z, 0-9, -, .

let domain = window.publicSuffixList.getDomain('haha.whatisthis.global.prod.fastly.net');
// domain = 'whatisthis.global.prod.fastly.net'

domain = window.publicSuffixList.getDomain('police.uk');
// domain = ''

domain = window.publicSuffixList.getDomain('www.xn--85x722f.xn--55qx5d.cn');
// domain = 'xn--85x722f.xn--55qx5d.cn'

// Etc.
```

## Usage with node.js

```sh
npm install gorhill/publicsuffixlist.js
```
```js
const suffixList = require('publicsuffixlist');
// For utf-8 conversion - npm install punycode
const punycode = require('punycode/'); 
const fs = require('fs');

// Suffix list downloaded from https://publicsuffix.org/list/public_suffix_list.dat
const suffixData = fs.readFileSync('./public_suffix_list.dat', 'utf8');

suffixList.parse(suffixData, punycode.toASCII);

let domain = suffixList.getDomain('haha.whatisthis.global.prod.fastly.net');
// domain = 'whatisthis.global.prod.fastly.net'

domain = suffixList.getDomain('police.uk');
// domain = ''

domain = suffixList.getDomain('www.xn--85x722f.xn--55qx5d.cn');
// domain = 'xn--85x722f.xn--55qx5d.cn'

```
