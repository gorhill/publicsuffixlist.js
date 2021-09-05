/*******************************************************************************

    publicsuffixlist.js - an efficient javascript implementation to deal with
    Mozilla Foundation's Public Suffix List <http://publicsuffix.org/list/>

    Copyright (C) 2013-present Raymond Hill

    License: pick the one which suits you:
      GPL v3 see <https://www.gnu.org/licenses/gpl.html>
      APL v2 see <http://www.apache.org/licenses/LICENSE-2.0>

*/

// Script for running the same tests as docs/test.html until there is a proper
// Mocha-based test suite.

import { readFileSync } from 'fs';
import { domainToASCII } from 'url';

import publicSuffixList from '../publicsuffixlist.js';

let errorCount = 0;

function customFetch(fileURL) {
    const buffer = readFileSync(fileURL);
    return ({
        async arrayBuffer() {
            return new Uint8Array(buffer).buffer;
        }
    });
}

const resultTemplateGood = '   Success: checkPublicSuffix({{a}}, {{b}})';
const resultTemplateBad = '\u2757 Failure: got {{r}} instead: checkPublicSuffix({{a}}, {{b}})';

function checkPublicSuffix(a, b) {
    // publicSuffixList() does not normalize Unicode, it is the caller's
    // responsibility, because overhead etc.
    const anorm = a ? domainToASCII(a) : a;
    const bnorm = b ? domainToASCII(b) : b;

    let r = publicSuffixList.getDomain(anorm);
    if ( !r ) {
        r = null;
    }
    const template = r === bnorm ? resultTemplateGood : resultTemplateBad;
    const output = template
        .replace('{{a}}', a ? "'" + a + "'" : 'null')
        .replace('{{b}}', b ? "'" + b + "'" : 'null')
        .replace('{{r}}', r ? "'" + r + "'" : 'null');
    console.log(output);

    if ( template === resultTemplateBad ) {
        errorCount++;
    }
}

// This function is a verbatim copy of the one in docs/test.html
function checkAll() {
    // Any copyright is dedicated to the Public Domain.
    // https://creativecommons.org/publicdomain/zero/1.0/

    // null input.
    checkPublicSuffix(null, null);
    // Mixed case.
    checkPublicSuffix('COM', null);
    checkPublicSuffix('example.COM', 'example.com');
    checkPublicSuffix('WwW.example.COM', 'example.com');
    // Leading dot.
    checkPublicSuffix('.com', null);
    checkPublicSuffix('.example', null);
    checkPublicSuffix('.example.com', null);
    checkPublicSuffix('.example.example', null);
    // Unlisted TLD.
    checkPublicSuffix('example', null);
    checkPublicSuffix('example.example', 'example.example');
    checkPublicSuffix('b.example.example', 'example.example');
    checkPublicSuffix('a.b.example.example', 'example.example');
    // Listed, but non-Internet, TLD.
    //checkPublicSuffix('local', null);
    //checkPublicSuffix('example.local', null);
    //checkPublicSuffix('b.example.local', null);
    //checkPublicSuffix('a.b.example.local', null);
    // TLD with only 1 rule.
    checkPublicSuffix('biz', null);
    checkPublicSuffix('domain.biz', 'domain.biz');
    checkPublicSuffix('b.domain.biz', 'domain.biz');
    checkPublicSuffix('a.b.domain.biz', 'domain.biz');
    // TLD with some 2-level rules.
    checkPublicSuffix('com', null);
    checkPublicSuffix('example.com', 'example.com');
    checkPublicSuffix('b.example.com', 'example.com');
    checkPublicSuffix('a.b.example.com', 'example.com');
    checkPublicSuffix('uk.com', null);
    checkPublicSuffix('example.uk.com', 'example.uk.com');
    checkPublicSuffix('b.example.uk.com', 'example.uk.com');
    checkPublicSuffix('a.b.example.uk.com', 'example.uk.com');
    checkPublicSuffix('test.ac', 'test.ac');
    // TLD with only 1 (wildcard) rule.
    checkPublicSuffix('mm', null);
    checkPublicSuffix('c.mm', null);
    checkPublicSuffix('b.c.mm', 'b.c.mm');
    checkPublicSuffix('a.b.c.mm', 'b.c.mm');
    // More complex TLD.
    checkPublicSuffix('jp', null);
    checkPublicSuffix('test.jp', 'test.jp');
    checkPublicSuffix('www.test.jp', 'test.jp');
    checkPublicSuffix('ac.jp', null);
    checkPublicSuffix('test.ac.jp', 'test.ac.jp');
    checkPublicSuffix('www.test.ac.jp', 'test.ac.jp');
    checkPublicSuffix('kyoto.jp', null);
    checkPublicSuffix('test.kyoto.jp', 'test.kyoto.jp');
    checkPublicSuffix('ide.kyoto.jp', null);
    checkPublicSuffix('b.ide.kyoto.jp', 'b.ide.kyoto.jp');
    checkPublicSuffix('a.b.ide.kyoto.jp', 'b.ide.kyoto.jp');
    checkPublicSuffix('c.kobe.jp', null);
    checkPublicSuffix('b.c.kobe.jp', 'b.c.kobe.jp');
    checkPublicSuffix('a.b.c.kobe.jp', 'b.c.kobe.jp');
    checkPublicSuffix('city.kobe.jp', 'city.kobe.jp');
    checkPublicSuffix('www.city.kobe.jp', 'city.kobe.jp');
    // TLD with a wildcard rule and exceptions.
    checkPublicSuffix('ck', null);
    checkPublicSuffix('test.ck', null);
    checkPublicSuffix('b.test.ck', 'b.test.ck');
    checkPublicSuffix('a.b.test.ck', 'b.test.ck');
    checkPublicSuffix('www.ck', 'www.ck');
    checkPublicSuffix('www.www.ck', 'www.ck');
    // US K12.
    checkPublicSuffix('us', null);
    checkPublicSuffix('test.us', 'test.us');
    checkPublicSuffix('www.test.us', 'test.us');
    checkPublicSuffix('ak.us', null);
    checkPublicSuffix('test.ak.us', 'test.ak.us');
    checkPublicSuffix('www.test.ak.us', 'test.ak.us');
    checkPublicSuffix('k12.ak.us', null);
    checkPublicSuffix('test.k12.ak.us', 'test.k12.ak.us');
    checkPublicSuffix('www.test.k12.ak.us', 'test.k12.ak.us');
    // IDN labels.
    checkPublicSuffix('食狮.com.cn', '食狮.com.cn');
    checkPublicSuffix('食狮.公司.cn', '食狮.公司.cn');
    checkPublicSuffix('www.食狮.公司.cn', '食狮.公司.cn');
    checkPublicSuffix('shishi.公司.cn', 'shishi.公司.cn');
    checkPublicSuffix('公司.cn', null);
    checkPublicSuffix('食狮.中国', '食狮.中国');
    checkPublicSuffix('www.食狮.中国', '食狮.中国');
    checkPublicSuffix('shishi.中国', 'shishi.中国');
    checkPublicSuffix('中国', null);
    // Same as above, but punycoded.
    checkPublicSuffix('xn--85x722f.com.cn', 'xn--85x722f.com.cn');
    checkPublicSuffix('xn--85x722f.xn--55qx5d.cn', 'xn--85x722f.xn--55qx5d.cn');
    checkPublicSuffix('www.xn--85x722f.xn--55qx5d.cn', 'xn--85x722f.xn--55qx5d.cn');
    checkPublicSuffix('shishi.xn--55qx5d.cn', 'shishi.xn--55qx5d.cn');
    checkPublicSuffix('xn--55qx5d.cn', null);
    checkPublicSuffix('xn--85x722f.xn--fiqs8s', 'xn--85x722f.xn--fiqs8s');
    checkPublicSuffix('www.xn--85x722f.xn--fiqs8s', 'xn--85x722f.xn--fiqs8s');
    checkPublicSuffix('shishi.xn--fiqs8s', 'shishi.xn--fiqs8s');
    checkPublicSuffix('xn--fiqs8s', null);
    // This one was added because of
    // https://github.com/gorhill/publicsuffixlist.js/commit/f2939e1997ed2eee40d6ab7f4693bc09421fd9de
    checkPublicSuffix('dont.you.watch', 'you.watch');
    // https://github.com/gorhill/uBlock/commit/f47ad8366e54be2072683ae0b11c4ce527903496
    checkPublicSuffix('b.example.com', 'example.com');
    checkPublicSuffix(null, null);
    checkPublicSuffix('b.example.com', 'example.com');
}

(async function () {
    const text = readFileSync('./docs/public_suffix_list.dat', 'utf8');

    publicSuffixList.parse(text, domainToASCII);
    console.log('JS');
    console.log();
    checkAll();
    console.log();

    if ( !(await publicSuffixList.enableWASM({ customFetch })) ) {
        throw new Error('Failed to enable Wasm.');
    }

    console.log('WASM');
    console.log();
    checkAll();
    console.log();

    console.log(`Finished with ${errorCount} errors ${errorCount === 0 ? '\ud83c\udf89' : '\u2620\ufe0f'}`);
    console.log();

    if ( errorCount > 0 ) {
        process.exit(1);
    }
})();
