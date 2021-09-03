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

    afterEach(() => {
        psl = null;
    });

    describe('version', () => {
        it('should be 3.0', () => {
            assert.equal(psl.version, '3.0');
        });
    });

    describe('parse()', () => {
        it('should not throw for blank list', () => {
            psl.parse('');
        });

        it('should not throw for list containing only blank line', () => {
            psl.parse('\n');
        });

        it('should not throw for list containing only blank line (DOS)', () => {
            psl.parse('\r\n');
        });

        it('should not throw for list containing only space', () => {
            psl.parse(' ');
        });

        it('should not throw for list containing only line with space', () => {
            psl.parse(' \n');
        });

        it('should not throw for list containing only line (DOS) with space', () => {
            psl.parse(' \r\n');
        });

        it('should not throw for list containing only tab', () => {
            psl.parse('\t');
        });

        it('should not throw for list containing only line with tab', () => {
            psl.parse('\t\n');
        });

        it('should not throw for list containing only line (DOS) with tab', () => {
            psl.parse('\t\r\n');
        });

        // The Public Suffix List specification is silent on the maximum line
        // length. The maximum length of a domain name is 253 characters. We
        // can support up to 1,024 characters here, including the newline.
        it('should not throw for list containing only 1,023 spaces', () => {
            psl.parse(' '.padStart(1023));
        });

        it('should not throw for list containing only line with 1,023 spaces', () => {
            psl.parse(' '.padStart(1023) + '\n');
        });

        it('should not throw for list containing only line (DOS) with 1,022 spaces', () => {
            psl.parse(' '.padStart(1022) + '\r\n');
        });

        it('should not throw for list containing only mix of spaces and tabs', () => {
            psl.parse(' \t  \t\t\t     \t\t\t\t\t\t\t\t             ');
        });

        it('should not throw for list containing only line with mix of spaces and tabs', () => {
            psl.parse(' \t  \t\t\t     \t\t\t\t\t\t\t\t             \n');
        });

        it('should not throw for list containing only line (DOS) with mix of spaces and tabs', () => {
            psl.parse(' \t  \t\t\t     \t\t\t\t\t\t\t\t             \r\n');
        });

        it('should not throw for list containing only comment', () => {
            psl.parse('// This is a comment.');
        });

        it('should not throw for list containing only line with comment', () => {
            psl.parse('// This is a comment.\n');
        });

        it('should not throw for list containing only line (DOS) with comment', () => {
            psl.parse('// This is a comment.\r\n');
        });

        it('should not throw for list containing only blank comment', () => {
            psl.parse('//');
        });

        it('should not throw for list containing only line with blank comment', () => {
            psl.parse('//\n');
        });

        it('should not throw for list containing only line (DOS) with blank comment', () => {
            psl.parse('//\r\n');
        });
   });
});
