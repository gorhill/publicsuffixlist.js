/*******************************************************************************

    publicsuffixlist.js - an efficient javascript implementation to deal with
    Mozilla Foundation's Public Suffix List <http://publicsuffix.org/list/>

    Copyright (C) 2013-present Raymond Hill

    License: pick the one which suits you:
      GPL v3 see <https://www.gnu.org/licenses/gpl.html>
      APL v2 see <http://www.apache.org/licenses/LICENSE-2.0>

*/

import { randomBytes } from 'crypto';
import { domainToASCII } from 'url';

import publicSuffixList from '../publicsuffixlist.js';

for ( let i = 0; i < 100; i++ ) {
  // Up to ~16 MiB or 0xFFFF00 bytes
  const bytes = randomBytes(randomBytes(2).readUIntLE(0, 2) << 8);
  console.log(`${bytes.length.toLocaleString()} random bytes`);

  const string = bytes.toString('utf8');

  console.time('parse');
  publicSuffixList.parse(string, domainToASCII);
  console.timeEnd('parse');

  console.log();
}

console.log('Yay, we made it!');
console.log();
