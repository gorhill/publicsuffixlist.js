/*******************************************************************************

    publicsuffixlist.js - an efficient javascript implementation to deal with
    Mozilla Foundation's Public Suffix List <http://publicsuffix.org/list/>

    Copyright (C) 2013-present Raymond Hill

    License: pick the one which suits you:
      GPL v3 see <https://www.gnu.org/licenses/gpl.html>
      APL v2 see <http://www.apache.org/licenses/LICENSE-2.0>

*/

import { createWriteStream, readFileSync } from 'fs';
import { domainToASCII } from 'url';
import v8 from 'v8';

const content = readFileSync('./docs/public_suffix_list.dat', 'utf8');

let publicSuffixList = null;

function isOptionSet(name) {
    return process.argv.slice(2).includes(name);
}

function customFetch(fileURL) {
    const buffer = readFileSync(fileURL);
    return ({
        async arrayBuffer() {
            return new Uint8Array(buffer).buffer;
        }
    });
}

function wait(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function printMemoryUsage(label, values) {
    console.log(label);
    console.log(` *  Heap used: ${Math.ceil(values.heapUsed / 1024).toLocaleString()} KiB`);
    console.log(` *  Heap total: ${Math.ceil(values.heapTotal / 1024).toLocaleString()} KiB`);
    console.log();
}

async function memoryUsage() {
    return process.memoryUsage();
}

async function runGC() {
    gc();

    await wait(1000);
}

function saveHeapSnapshot(name) {
    const snapshotStream = v8.getHeapSnapshot();
    const fileStream = createWriteStream(`${name}.heapsnapshot`);
    snapshotStream.pipe(fileStream);
}

(async function () {
    const now = Date.now();

    await runGC();

    if ( isOptionSet('--heap-snapshot') ) {
        saveHeapSnapshot(`${now}--initial`);
    }

    printMemoryUsage('Initial:', await memoryUsage());

    publicSuffixList = (await import('../publicsuffixlist.js')).default;

    printMemoryUsage('On import():', await memoryUsage());

    if ( isOptionSet('--use-wasm') ) {
        await publicSuffixList.enableWASM({ customFetch });

        printMemoryUsage('On enableWASM():', await memoryUsage());
    }

    publicSuffixList.parse(content, domainToASCII);

    printMemoryUsage('On parse():', await memoryUsage());

    publicSuffixList.getDomain('example.com');

    printMemoryUsage(`On getDomain('example.com'):`, await memoryUsage());

    publicSuffixList.getDomain('example.s3-website.us-east-2.amazonaws.com');

    printMemoryUsage(`On getDomain('example.s3-website.us-east-2.amazonaws.com'):`,
                     await memoryUsage());

    publicSuffixList.getDomain('this.is.a.very.long.hostname.that.does.not.have.a.public.suffix');

    printMemoryUsage(`On getDomain('this.is.a.very.long.hostname.that.does.not.have.a.public.suffix'):`,
                     await memoryUsage());

    await runGC();

    if ( isOptionSet('--heap-snapshot') ) {
        saveHeapSnapshot(`${now}--after-gc`);
    }

    printMemoryUsage('After GC:', await memoryUsage());
})();
