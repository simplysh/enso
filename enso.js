function enso(source, data = {}) {
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

function parse(template, data, parent) {
  parent ??= {
    type: 'root',
    children: [],
  };

  let target = parent;

  let cursor = 0;
  let found = -1;

  // we only really care about expressions
  // read all text until we find one
  while ((found = seek(template, enso.marker.substring(0, 2), cursor)) !== -1) {
    // insert all text up to expression
    const value = template.substring(cursor, found);

    if (value !== '') {
      target.children.push({
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
        target = value(parent) ?? parent;
        console.log('val', parent);
      } else {
        target.children.push({
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
    target.children.push({
      type: 'text',
      value,
      children: [],
    });
  }

  console.log('end', parent.type);

  return parent;
}

function* flatten(root) {
  for (node of root.children) {
    if (node.type !== 'text') {
      yield* flatten(node);
    } else {
      yield node;
    }
  }
}

function output(root) {
  console.log(JSON.stringify(root, undefined, 2));
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

function render(block, data = {}) {
  const template = enso.blocks[block];

  return function(visitor) {
    const node = {
      type: 'block',
      children: []
    };

    visitor.children.push(node);

    const result = parse(template, data, node);
    const slot = result.children.find(({ type }) => type === 'slot');

    if (slot) return slot;
  }
}

function slot() {
  return function(visitor, stack) {
    const node = {
      type: 'slot',
      children: []
    }

    visitor.children.push(node);
  }
}

function end() {
  return function(visitor, stack) {
    console.log('end', visitor, stack);
  }
}

function helper(name, callback) {
  enso.helpers[name] = callback;
}

function block(name, template) {
  enso.blocks[name] = template;
}

Object.assign(enso, {
  context: undefined,
  marker: '{{}}',
  builtins: {
    render,
    slot,
    end
  },
  helpers: {},
  blocks: {},
  block,
  helper,
});

enso.block('wrap', '<strong>{{ slot() }}</strong>');
console.log(enso("Exploring the city is a {{ render('wrap') }}{{ render('wrap') }}plm{{ end() }}{{ end() }}!"));

module.exports = enso;
