# publicsuffixlist.js

A javascript utility to make use of [Mozilla Foundation's Public Suffix
List](http://publicsuffix.org).

## Why?

This is just an implementation to deal with domain while taking into account
[Mozilla Foundation's Public Suffix List](http://publicsuffix.org). Follow
the link to understand why such a list is needed.

Now there was an existing javascript library dealing with the
Public Suffix List: <https://github.com/oncletom/tld.js>.

However, glancing at it I could see right away that it would not fullfill my
requirements: minding memory footprint and CPU cycles. Hence this version,
which addresses both concerns.

Benchmark: Randomly picking 20 hostnames from all over the world, and
for each of these extracting the domain name (that would be the hostname for
which it is safe to set cookies, etc.). Typical result:

```
tld.js              x    506 ops/sec ±0.55% (89 runs sampled)
publicsuffixlist.js x 25,743 ops/sec ±0.47% (97 runs sampled)

tld.js              x    216 ops/sec ±0.63% (84 runs sampled)
publicsuffixlist.js x 22,222 ops/sec ±0.57% (97 runs sampled)

tld.js              x    281 ops/sec ±0.66% (89 runs sampled)
publicsuffixlist.js x 23,332 ops/sec ±0.52% (96 runs sampled)
```

Memory footprint-wise, this is what I observe (in chromium):

```
tld.js             : 297,752 bytes
publicsuffixlist.js: 173,776 bytes
```

If one was to force all the Public Suffix List rules to be hit, the memory
footprint of `tld.js` would go much, *much* higher. The memory footprint of
`publicsuffixlist.js` will never grow, it is static.

Also, `tld.js` currently fails with the Unicode rules present in the Public
Suffix List.

So that is mainly why `publicsuffixlist.js`, something fast and mindful of
memory was key in that [other project](https://github.com/gorhill/httpswitchboard)
which has to deal in realtime with web requests.

## Usage

```js
<script src="punycode.js"></script>
<script src="publicsuffixlist.js"></script>

...

var psl = new PublicSuffixList();

// Feed it the list (you choose how you obtain it).
// `list` must be unicode text.
// Need to pass a converter to punycode (punycode.js is
// awesome: https://github.com/bestiejs/punycode.js).
psl.parse(list, punycode.toASCII);

...

// Caller is responsible to pass in hostnames which are "canonicalized in the
// normal way for hostnames": lower-case, punycode, and only a-z, 0-9, -, .

var domain = psl.getDomain('haha.whatisthis.global.prod.fastly.net');
// domain = 'whatisthis.global.prod.fastly.net' (yep, who knew)

var domain = psl.getDomain('something.uk');
// domain = ''

var domain = psl.getDomain('www.xn--85x722f.xn--55qx5d.cn');
// domain = 'xn--85x722f.xn--55qx5d.cn'

Etc.

```

