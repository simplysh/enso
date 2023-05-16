function enso(source, data) {
  return render(parse(source, data), data);
}

function parse(template, data, parent) {
  parent ??= {
    type: 'root',
    children: [],
  };

  let cursor = 0;
  let found = -1;

  // we only really care about expressions
  // read all text until we find one
  while (
    (found = template.indexOf(enso.marker[0], cursor)) !== -1
    && template[found + 1] === enso.marker[1]
  ) {
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
    if (
      (cursor = template.indexOf(enso.marker[2], found)) !== -1
      && template[cursor + 1] === enso.marker[3]
    ) {
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

    throw new Error(`Unterminated expression: ${template.substring(found, 10)}...`);
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

Object.assign(enso, {
  marker: '{{}}',
  helpers: {},
  helper,
});

module.exports = enso;
