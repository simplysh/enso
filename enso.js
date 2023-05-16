function enso(source, data) {
  return render(parse(source, data), data);
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
    type: 'root',
    children: [],
  };

  let parent = root; // todo actually handle recursive
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

      const value = new Function(
        ...Object.keys(data),
        ...Object.keys(enso.helpers),
        `return ${expression};`
      )(
        ...Object.values(data),
        ...Object.values(enso.helpers)
      );

      parent.children.push({
        type: 'text',
        value,
        expression,
        children: [],
      });

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

  return parent;
}

function render(root) {
  const stack = [root];
  let result = '';

  while (stack.length) {
    const parent = stack.pop();

    for (const node of parent.children) {
      if (node.value === '') continue;

      switch (node.type) {
        case 'text':
          result += node.value;
          break;
        default:
          throw new Error('Internal Error');
      }
    }
  }

  return result;
}

function helper(name, callback) {
  enso.helpers[name] = callback;
}

function block(name, template) {
  enso.blocks[name] = template;
}

Object.assign(enso, {
  marker: '{{}}',
  helpers: {},
  blocks: {},
  block,
  helper,
});

// enso('{{name}} are mere', { name: 'Ana' });

module.exports = enso;
