# publicsuffixlist.js

A javascript utility to make use of the Public Suffix List

This is just an implementation to deal with domain while taking into account
[Mozilla Foundation's Public Suffix List](http://publicsuffix.org). Follow
the link to understand why such a list is needed.

Now there was an existing javascript library dealing with the
Public Suffix List: <https://github.com/oncletom/tld.js>.

However, glancing at it I could see right away that it would not fullfill my
requirement: minding memory footprint and CPU cycles. Hence this version,
which address both concerns.

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

```
<script src="punycode.js"></script>
<script src="publicsuffixlist.js"></script>

...

var psl = new PublicSuffixList();

// feed it the list (you choose how you obtain it)
psl.parse(tehList, punycode.toASCII);

...

var domain = PSL.getDomain('whatisthis.global.prod.fastly.net');
// domain = 'global.prod.fastly.net' (yep, who knew)

var domain = PSL.getDomain('something.uk');
// domain = ''

Etc.

```

