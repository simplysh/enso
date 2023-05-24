"use strict";
const props = {
    delimiters: '{{}}',
    helpers: {},
    builtins: {},
    helper(id, callback) {
        this.helpers[id] = callback;
    }
};
const enso = Object.assign(function _enso_(source, data = {}) {
    return output(parse(source, data, {
        type: 'root',
        children: [],
    }));
}, props);
function parse(template, data, node) {
    const expStart = enso.delimiters.substring(0, 2);
    const expEnd = enso.delimiters.substring(2);
    let startIndex = 0;
    let endIndex = 0;
    // we only really care about expressions
    while ((startIndex = seek(template, expStart, endIndex)) !== -1) {
        // we found an expression start, first insert all the text up to here
        const value = template.substring(endIndex, startIndex);
        if (value !== '') {
            node.children.push({
                type: 'text',
                value,
            });
        }
        // read expression and move index
        if ((endIndex = seek(template, expEnd, startIndex)) !== -1) {
            // evaluate expression in the current context
            const expression = template.substring(startIndex + 2, endIndex).trim();
            let value = new Function(...Object.keys(data), ...Object.keys(enso.helpers), ...Object.keys(enso.builtins), `return ${expression};`)(...Object.values(data), ...Object.values(enso.helpers), ...Object.values(enso.builtins));
            if (typeof value === 'function') {
                value(node);
            }
            else {
                node.children.push({
                    type: 'text',
                    value,
                    expression,
                });
            }
            endIndex = endIndex + 2;
            continue;
        }
        throw new Error(`Unterminated expression: ${template.substring(endIndex, 25)}...`);
    }
    // insert the remaining text after expression
    const value = template.substring(endIndex);
    if (value !== '') {
        node.children.push({
            type: 'text',
            value,
        });
    }
    return node;
}
function output(root) {
    // console.log(JSON.stringify(root, undefined, 2));
    let result = '';
    for (const node of flatten(root)) {
        switch (node.type) {
            case 'text':
                result += node.value;
                break;
            default:
                throw new Error(`Internal Error: no node type ${node.type}`);
        }
    }
    return result;
}
function seek(text, sequence, from = 0) {
    let found;
    let start = from;
    while ((found = text.indexOf(sequence[0], start)) !== -1) {
        if (text[found + 1] === sequence[1]) {
            return found;
        }
        else {
            start = found + 1;
        }
    }
    return -1;
}
function* flatten(root) {
    for (const node of root.children) {
        if (node.type !== 'text') {
            yield* flatten(node);
        }
        else {
            yield node;
        }
    }
}
module.exports = enso;
