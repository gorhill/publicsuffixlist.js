/*******************************************************************************

    publicsuffixlist.js - an efficient javascript implementation to deal with
    Mozilla Foundation's Public Suffix List <http://publicsuffix.org/list/>

    Copyright (C) 2013-present Raymond Hill

    License: pick the one which suits you:
      GPL v3 see <https://www.gnu.org/licenses/gpl.html>
      APL v2 see <http://www.apache.org/licenses/LICENSE-2.0>

*/

/*! Home: https://github.com/gorhill/publicsuffixlist.js -- GPLv3 APLv2 */

/* jshint browser:true, esversion:6, laxbreak:true, undef:true, unused:true */
/* globals exports:true, module */

/*******************************************************************************

    Reference:
    https://publicsuffix.org/list/

    Excerpt:

    > Algorithm
    > 
    > 1. Match domain against all rules and take note of the matching ones.
    > 2. If no rules match, the prevailing rule is "*".
    > 3. If more than one rule matches, the prevailing rule is the one which
         is an exception rule.
    > 4. If there is no matching exception rule, the prevailing rule is the
         one with the most labels.
    > 5. If the prevailing rule is a exception rule, modify it by removing
         the leftmost label.
    > 6. The public suffix is the set of labels from the domain which match
         the labels of the prevailing rule, using the matching algorithm above.
    > 7. The registered or registrable domain is the public suffix plus one
         additional label.

*/

/******************************************************************************/

(function(context) {
// >>>>>>>> start of anonymous namespace

'use strict';

/*******************************************************************************

    Tree encoding in array buffer:
    
     Node:
     +  u8: length of char data
     +  u8: flags (bit 0: is_publicsuffix, bit 1: is_wildcarded
     + u16: length of array of children
     + u32: char data or offset to char data
     + u32: offset to array of children
     = 12 bytes

    More bits in flags could be used; for example:
    - to distinguish private suffixes

*/

                                    // i32 /  i8
const HOSTNAME_SLOT       = 0;      // jshint ignore:line
const HOSTNAME_LEN_SLOT   = 255;    //  -- / 255
const RULES_PTR_SLOT      = 64;     //  64 / 256
const CHARDATA_PTR_SLOT   = 65;     //  65 / 260
const EMPTY_STRING        = '';
const SELFIE_MAGIC        = 1;

let pslBuffer32;
let pslBuffer8;
let hostnameArg = EMPTY_STRING;

/******************************************************************************/

// Parse and set a UTF-8 text-based suffix list. Format is same as found at:
// http://publicsuffix.org/list/
//
// `toAscii` is a converter from unicode to punycode. Required since the
// Public Suffix List contains unicode characters.
// Suggestion: use <https://github.com/bestiejs/punycode.js>

const parse = function(text, toAscii) {
    const rootRule = { label: EMPTY_STRING, flags: 0, children: undefined };

    // Tree building
    {
        const compareLabels = function(a, b) {
            let n = a.length;
            let d = n - b.length;
            if ( d !== 0 ) { return d; }
            for ( let i = 0; i < n; i++ ) {
                d = a.charCodeAt(i) - b.charCodeAt(i);
                if ( d !== 0 ) { return d; }
            }
            return 0;
        };

        const addToStore = function(rule, exception) {
            let node = rootRule;
            let end = rule.length;
            while ( end > 0 ) {
                const beg = rule.lastIndexOf('.', end - 1);
                const label = rule.slice(beg + 1, end);
                end = beg;

                if ( Array.isArray(node.children) === false ) {
                    const child = { label, flags: 0, children: undefined };
                    node.children = [ child ];
                    node = child;
                    continue;
                }

                let left = 0;
                let right = node.children.length;
                while ( left < right ) {
                    const i = left + right >>> 1;
                    const d = compareLabels(label, node.children[i].label);
                    if ( d < 0 ) {
                        right = i;
                        if ( right === left ) {
                            const child = {
                                label,
                                flags: 0,
                                children: undefined
                            };
                            node.children.splice(left, 0, child);
                            node = child;
                            break;
                        }
                        continue;
                    }
                    if ( d > 0 ) {
                        left = i + 1;
                        if ( left === right ) {
                            const child = {
                                label,
                                flags: 0,
                                children: undefined
                            };
                            node.children.splice(right, 0, child);
                            node = child;
                            break;
                        }
                        continue;
                    }
                    /* d === 0 */
                    node = node.children[i];
                    break;
                }
            }
            node.flags |= 0b01;
            if ( exception ) {
                node.flags |= 0b10;
            }
        };

        // 2. If no rules match, the prevailing rule is "*".
        addToStore('*', false);

        const mustPunycode = /[^a-z0-9.-]/;
        const textEnd = text.length;
        let lineBeg = 0;

        while ( lineBeg < textEnd ) {
            let lineEnd = text.indexOf('\n', lineBeg);
            if ( lineEnd === -1 ) {
                lineEnd = text.indexOf('\r', lineBeg);
                if ( lineEnd === -1 ) {
                    lineEnd = textEnd;
                }
            }
            let line = text.slice(lineBeg, lineEnd).trim();
            lineBeg = lineEnd + 1;

            // Ignore comments
            const pos = line.indexOf('//');
            if ( pos !== -1 ) {
                line = line.slice(0, pos);
            }

            // Ignore surrounding whitespaces
            line = line.trim();
            if ( line.length === 0 ) { continue; }

            const exception = line.charCodeAt(0) === 0x21 /* '!' */;
            if ( exception ) {
                line = line.slice(1);
            }

            if ( mustPunycode.test(line) ) {
                line = toAscii(line.toLowerCase());
            }

            addToStore(line, exception);
        }
    }

    {
        const labelToOffsetMap = new Map();
        const treeData = [];
        const charData = [];

        const allocate = function(n) {
            const ibuf = treeData.length;
            for ( let i = 0; i < n; i++ ) {
                treeData.push(0);
            }
            return ibuf;
        };

        const storeNode = function(ibuf, node) {
            const nChars = node.label.length;
            const nChildren = node.children !== undefined
                ? node.children.length
                : 0;
            treeData[ibuf+0] = nChars << 24 | node.flags << 16 | nChildren;
            // char data
            if ( nChars <= 4 ) {
                let v = 0;
                if ( nChars > 0 ) {
                    v |= node.label.charCodeAt(0);
                    if ( nChars > 1 ) {
                        v |= node.label.charCodeAt(1) << 8;
                        if ( nChars > 2 ) {
                            v |= node.label.charCodeAt(2) << 16;
                            if ( nChars > 3 ) {
                                v |= node.label.charCodeAt(3) << 24;
                            }
                        }
                    }
                }
                treeData[ibuf+1] = v;
            } else {
                let offset = labelToOffsetMap.get(node.label);
                if ( offset === undefined ) {
                    offset = charData.length;
                    for ( let i = 0; i < nChars; i++ ) {
                        charData.push(node.label.charCodeAt(i));
                    }
                    labelToOffsetMap.set(node.label, offset);
                }
                treeData[ibuf+1] = offset;
            }
            // child nodes
            if ( Array.isArray(node.children) === false ) {
                treeData[ibuf+2] = 0;
                return;
            }
            
            const iarray = allocate(nChildren * 3);
            treeData[ibuf+2] = iarray;
            for ( let i = 0; i < nChildren; i++ ) {
                storeNode(iarray + i * 3, node.children[i]);
            }
        };

        // First 512 bytes are reserved for internal use
        allocate(512 >> 2);

        const iRootRule = allocate(3);
        storeNode(iRootRule, rootRule);
        treeData[RULES_PTR_SLOT] = iRootRule;

        const iCharData = treeData.length << 2;
        treeData[CHARDATA_PTR_SLOT] = iCharData;

        const byteLength = (treeData.length << 2) + (charData.length + 3 & ~3);
        const arrayBuffer = new ArrayBuffer(byteLength);

        pslBuffer32 = new Uint32Array(arrayBuffer);
        pslBuffer32.set(treeData);

        pslBuffer8 = new Uint8Array(arrayBuffer);
        pslBuffer8.set(charData, treeData.length << 2);
    }

    window.dispatchEvent(new CustomEvent('publicSuffixListChanged'));
};

/******************************************************************************/

const setHostnameArg = function(hostname) {
    if ( hostname === hostnameArg ) { return; }
    const buf = pslBuffer8;
    if ( typeof hostname !== 'string' || hostname.length === 0 ) {
        return (buf[HOSTNAME_LEN_SLOT] = 0);
    }
    hostname = hostname.toLowerCase();
    hostnameArg = hostname;
    let n = hostname.length;
    if ( n > 254 ) { n = 254; }
    buf[HOSTNAME_LEN_SLOT] = n;
    let i = n;
    while ( i-- ) {
        buf[i] = hostname.charCodeAt(i);
    }
    return n;
};

/******************************************************************************/

// WASM-able, because no information outside the buffer content is required.

const getPublicSuffixPos = function(iRoot) {
    const buf8 = pslBuffer8;
    const buf32 = pslBuffer32;

    let iNode = iRoot;
    let cursorPos = buf8[HOSTNAME_LEN_SLOT];
    let labelBeg = cursorPos;

    // Label-lookup loop
    for (;;) {
        // Extract label indices
        // TODO: remember/reuse these when encoding hostname
        const labelEnd = labelBeg;
        while ( buf8[labelBeg-1] !== 0x2E /* '.' */ ) {
            labelBeg -= 1;
            if ( labelBeg === 0 ) { break; }
        }
        const labelLen = labelEnd - labelBeg;
        // Match-lookup loop: binary search
        const nCandidates = buf32[iNode+0] & 0x0000FFFF;
        if ( nCandidates === 0 ) { break; }
        const iCandidates = buf32[iNode+2];
        let l = 0;
        let r = nCandidates;
        let iFound = 0;
        while ( l < r ) {
            const iCandidate = l + r >>> 1;
            const iCandidateNode = iCandidates + iCandidate * 3;
            const candidateLen = buf32[iCandidateNode+0] >>> 24;
            let d = labelLen - candidateLen;
            if ( d === 0 ) {
                const iCandidateChar = candidateLen <= 4
                    ? iCandidateNode + 1 << 2
                    : buf32[CHARDATA_PTR_SLOT] + buf32[iCandidateNode+1];
                for ( let i = 0; i < labelLen; i++ ) {
                    d = buf8[labelBeg+i] - buf8[iCandidateChar+i];
                    if ( d !== 0 ) { break; }
                }
            }
            if ( d < 0 ) {
                r = iCandidate;
            } else if ( d > 0 ) {
                l = iCandidate + 1;
            } else /* if ( d === 0 ) */ {
                iFound = iCandidateNode;
                break;
            }
        }
        // 2. If no rules match, the prevailing rule is "*".
        if ( iFound === 0 ) {
            if ( buf8[iCandidates + 1 << 2] !== 0x2A /* '*' */ ) { break; }
            iFound = iCandidates;
        }
        iNode = iFound;
        // 5. If the prevailing rule is a exception rule, modify it by
        //    removing the leftmost label.
        if ( (buf32[iNode+0] & 0x00020000) !== 0 ) {
            for (;;) {
                if ( labelBeg === cursorPos ) { break; }
                if ( buf8[labelBeg] === 0x2E /* '.' */ ) {
                    return labelBeg + 1;
                }
                labelBeg += 1;
            }
            break;
        }
        if ( (buf32[iNode+0] & 0x00010000) !== 0 ) {
            cursorPos = labelBeg;
        }
        if ( labelBeg === 0 ) { break; }
        labelBeg -= 1; // skip dot
    }

    return cursorPos;
};

/******************************************************************************/

const getPublicSuffix = function(hostname) {
    if ( pslBuffer32 === undefined ) { return EMPTY_STRING; }

    const hostnameLen = setHostnameArg(hostname);
    const buf8 = pslBuffer8;
    if ( hostnameLen === 0 || buf8[0] === 0x2E /* '.' */ ) {
        return EMPTY_STRING;
    }

    let cursorPos = getPublicSuffixPos(pslBuffer32[RULES_PTR_SLOT]);
    if ( cursorPos === hostnameLen || cursorPos === 0 ) {
        return EMPTY_STRING;
    }

    return cursorPos === 0 ? hostnameArg : hostnameArg.slice(cursorPos);
};

/******************************************************************************/

const getDomain = function(hostname) {
    if ( pslBuffer32 === undefined ) { return EMPTY_STRING; }

    const hostnameLen = setHostnameArg(hostname);
    const buf8 = pslBuffer8;
    if ( hostnameLen === 0 || buf8[0] === 0x2E /* '.' */ ) {
        return EMPTY_STRING;
    }

    let cursorPos = getPublicSuffixPos(pslBuffer32[RULES_PTR_SLOT]);
    if ( cursorPos === hostnameLen || cursorPos === 0 ) {
        return EMPTY_STRING;
    }

    // 7. The registered or registrable domain is the public suffix plus one
    //    additional label.
    cursorPos -= 1; // skip dot
    while ( buf8[cursorPos-1] !== 0x2E /* '.' */ ) {
        cursorPos -= 1;
        if ( cursorPos === 0 ) { break; }
    }

    return cursorPos === 0 ? hostnameArg : hostnameArg.slice(cursorPos);
};

/******************************************************************************/

const toSelfie = function() {
    const selfie = {
        magic: SELFIE_MAGIC,
        buffer: pslBuffer32 !== undefined
            ? Array.from(pslBuffer32)
            : null,
    };
    return selfie;
};

const fromSelfie = function(selfie) {
    if (
        selfie instanceof Object === false ||
        selfie.magic !== SELFIE_MAGIC ||
        Array.isArray(selfie.buffer) === false
    ) {
        return false;
    }
    if (
        pslBuffer32 !== undefined &&
        pslBuffer32.length < selfie.buffer.length
    ) {
        pslBuffer32 = undefined;
        pslBuffer8 = undefined;
    }
    if ( pslBuffer32 === undefined ) {
        pslBuffer32 = new Uint32Array(selfie.buffer.length);
        pslBuffer8 = new Uint8Array(pslBuffer32.buffer);
    }
    pslBuffer32.set(selfie.buffer);
    hostnameArg = ''; // Important!
    return true;
};

/******************************************************************************/

// TODO: load WASM module here (optional)

/******************************************************************************/

context = context || window;

// Keep v1 around if it is present -- for benchmark purpose only.
if ( context.publicSuffixList !== undefined ) {
    context.publicSuffixListV1 = context.publicSuffixList;
}

context.publicSuffixList = {
    version: '2.0',
    parse,
    getDomain,
    getPublicSuffix,
    toSelfie,
    fromSelfie
};

if ( typeof module !== 'undefined' ) { 
    module.exports = context.publicSuffixList;
} else if ( typeof exports !== 'undefined' ) {
    exports = context.publicSuffixList;
}

/******************************************************************************/

// <<<<<<<< end of anonymous namespace
})(this);
