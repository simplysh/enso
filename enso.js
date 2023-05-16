function enso(source, data) {
  return output(parse(source, data), data);
}

function seek(text, sequence, from) {
  let found;
  let start = from;

  while (
    (found = text.indexOf(sequence[0], start)) !== -1
  ) {
    if (text[found + 1] === sequence[1]) {
      return found;
    } else {
      start = found + 1;
    }
  }

  return -1;
}

function parse(template, data) {
  const root = {
    type: 'block',
    children: [],
  };

  let stack = [{ node: root, template, data }];

  while(stack.length) {
    let { node: parent, template, data } = stack.pop();
    let cursor = 0;
    let found = -1;

    // we only really care about expressions
    // read all text until we find one
    while ((found = seek(template, enso.marker.substring(0, 2), cursor)) !== -1) {
      // insert all text up to expression
      const value = template.substring(cursor, found);

      if (value !== '') {
        parent.children.push({
          type: 'text',
          value,
          children: [],
        });
      }

      // read expression and move cursor
      if ((cursor = seek(template, enso.marker.substring(2), found)) !== -1) {
        // resolve expression in the current context
        const expression = template.substring(found + 2, cursor).trim();

        let value = new Function(
          ...Object.keys(data),
          ...Object.keys(enso.helpers),
          ...Object.keys(enso.builtins),
          `return ${expression};`
        )(
          ...Object.values(data),
          ...Object.values(enso.helpers),
          ...Object.values(enso.builtins)
        );

        if (typeof value === 'function') {
          value(parent, stack);
        } else {
          parent.children.push({
            type: 'text',
            value,
            expression,
            children: [],
          });
        }

        cursor = cursor + 2;
        continue;
      }

      throw new Error(`Unterminated expression: ${template.substring(found, 25)}...`);
    }

    // insert the remaining text
    const value = template.substring(cursor);

    if (value !== '') {
      parent.children.push({
        type: 'text',
        value,
        children: [],
      });
    }
  }

  return root;
}

function* flatten(root) {
  for (node of root.children) {
    if (node.type === 'block') {
      yield* flatten(node);
    } else {
      yield node;
    }
  }
}

function output(root) {
  let result = '';

  for (node of flatten(root)) {
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

function render(block, data) {
  const template = enso.blocks[block];

  return function(parent, stack) {
    const node = {
      type: 'block',
      children: []
    };

    parent.children.push(node);
    stack.push({ node, template, data });
  }
}

function helper(name, callback) {
  enso.helpers[name] = callback;
}

function block(name, template) {
  enso.blocks[name] = template;
}

Object.assign(enso, {
  marker: '{{}}',
  builtins: {
    render
  },
  helpers: {},
  blocks: {},
  block,
  helper,
});

module.exports = enso;
