# publicsuffixlist.js

A JavaScript utility to make use of [Mozilla Foundation's Public Suffix
List](http://publicsuffix.org) ("PSL").

## Why?

This is just an implementation to deal with domains while taking into account
[Mozilla Foundation's Public Suffix List](http://publicsuffix.org). Follow
the link to understand why such a list is needed.

## Test and benchmark

```
npm install
npm test
```

Also see [test and benchmark](https://gorhill.github.io/publicsuffixlist.js/) pages.

## API
```js
publicSuffixList = {
    version: '3.0',
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
<!-- https://github.com/mathiasbynens/punycode.js -->
<script src="punycode.js"></script>
<script type="module">
import publicSuffixList from 'publicsuffixlist.js';

/* … */

// Feed it the list (you choose how you obtain it).
// `list` must be unicode text.
publicSuffixList.parse(list, punycode.toASCII);

/* … */

// Caller is responsible to pass in hostnames which are "canonicalized in the
// normal way for hostnames": lower-case, punycode, and only a-z, 0-9, -, .

let domain = publicSuffixList.getDomain('haha.whatisthis.global.prod.fastly.net');
// domain = 'whatisthis.global.prod.fastly.net'

domain = publicSuffixList.getDomain('police.uk');
// domain = ''

domain = publicSuffixList.getDomain('www.xn--85x722f.xn--55qx5d.cn');
// domain = 'xn--85x722f.xn--55qx5d.cn'

// Etc.

</script>
```

### Node.js

```sh
npm install gorhill/publicsuffixlist.js
```
```js
import suffixList from 'publicsuffixlist';
import { domainToASCII } from 'url';
import fs from 'fs';

// Suffix list downloaded from https://publicsuffix.org/list/public_suffix_list.dat
const suffixData = fs.readFileSync('./public_suffix_list.dat', 'utf8');

suffixList.parse(suffixData, domainToASCII);

let domain = suffixList.getDomain('haha.whatisthis.global.prod.fastly.net');
// domain = 'whatisthis.global.prod.fastly.net'

domain = suffixList.getDomain('police.uk');
// domain = ''

domain = suffixList.getDomain('www.xn--85x722f.xn--55qx5d.cn');
// domain = 'xn--85x722f.xn--55qx5d.cn'

```

### Enable WebAssembly

```js
// Browser
await publicSuffixList.enableWASM();

// Node.js
await publicSuffixList.enableWASM({
    customFetch: fileURL => {
        const buffer = fs.readFileSync(fileURL);
        return ({
            async arrayBuffer() {
                return new Uint8Array(buffer).buffer;
            }
        });
    }
});
```
