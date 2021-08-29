/*******************************************************************************

    publicsuffixlist.js - an efficient javascript implementation to deal with
    Mozilla Foundation's Public Suffix List <http://publicsuffix.org/list/>

    Copyright (C) 2013-present Raymond Hill

    License: pick the one which suits you:
      GPL v3 see <https://www.gnu.org/licenses/gpl.html>
      APL v2 see <http://www.apache.org/licenses/LICENSE-2.0>

*/

import { strict as assert } from 'assert';
import process from 'process';

import { createWorld } from 'esm-world';

process.on('warning', warning => {
    // Ignore warnings about experimental features like
    // --experimental-vm-modules
    if ( warning.name !== 'ExperimentalWarning' ) {
        console.warn(warning.stack);
    }
});

describe('publicsuffixlist', () => {
    let psl = null;

    beforeEach(async () => {
        psl = (await createWorld('./publicsuffixlist.js')).default;
    });

    describe('version', () => {
        it('should be 3.0', () => {
            assert.equal(psl.version, '3.0');
        });
    });
});
