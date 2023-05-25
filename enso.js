"use strict";
const props = {
    delimiters: '{{}}',
    context: [],
    helpers: {},
    blocks: {},
    builtins: {
        render(blockId, data = {}) {
            return function (visitor) {
                const template = _enso.blocks[blockId];
                const node = {
                    type: 'block',
                    children: []
                };
                visitor.children.push(node);
                parse(template, data, node);
                // if rendering added a context, "yield" it
                if (_enso.context.length)
                    return _enso.context[_enso.context.length - 1];
            };
        },
        slot() {
            return function (visitor) {
                const node = {
                    type: 'slot',
                    children: []
                };
                visitor.children.push(node);
                _enso.context.push(node);
            };
        },
        end() {
            return function () {
                _enso.context.pop();
            };
        }
    },
    helper(id, callback) {
        this.helpers[id] = callback;
    },
    block(id, template) {
        this.blocks[id] = template;
    }
};
const _enso = Object.assign(function enso(source, data = {}) {
    return output(parse(source, data, {
        type: 'root',
        children: [],
    }));
}, props);
function parse(template, data, node) {
    var _a;
    const expStart = _enso.delimiters.substring(0, 2);
    const expEnd = _enso.delimiters.substring(2);
    let startIndex = 0;
    let endIndex = 0;
    let target = node;
    // we only really care about expressions
    while ((startIndex = seek(template, expStart, endIndex)) !== -1) {
        // we found an expression start, first insert all the text up to here
        const value = template.substring(endIndex, startIndex);
        if (value !== '') {
            target.children.push({
                type: 'text',
                value,
            });
        }
        // read expression and move index
        if ((endIndex = seek(template, expEnd, startIndex)) !== -1) {
            // evaluate expression in the current context
            const expression = template.substring(startIndex + 2, endIndex).trim();
            const value = new Function(...Object.keys(data), ...Object.keys(_enso.helpers), ...Object.keys(_enso.builtins), `return ${expression};`)(...Object.values(data), ...Object.values(_enso.helpers), ...Object.values(_enso.builtins));
            if (typeof value === 'function') {
                // reassign the target in case the context has changed
                target = (_a = value(target)) !== null && _a !== void 0 ? _a : node;
            }
            else {
                target.children.push({
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
        target.children.push({
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
module.exports = _enso;
