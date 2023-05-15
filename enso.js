const markers = '{{}}';

function render(template, data) {
  const root = {
    type: 'root',
    children: []
  }

  let parent = root;
  let cursor = 0;

  // build AST tree
  while ((found = template.indexOf(markers[0], cursor)) !== -1 && template[found + 1] === markers[1]) {
    // insert all text up to expression
    parent.children.push({
      type: 'text',
      value: template.substring(cursor, found),
      children: []
    });

    // add expression and move cursor
    if ((cursor = template.indexOf(markers[2], found)) !== -1 && template[cursor + 1] === markers[3]) {
      parent.children.push({
        type: 'expression',
        value: template.substring(found + 2, cursor),
        children: []
      });

      cursor = cursor + 2;
      continue;
    }

    throw new Error('Unterminated expression.');
  }

  parent.children.push({
    type: 'text',
    value: template.substring(cursor),
    children: []
  });

  // render back to string
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
        case 'expression':
          result += (new Function(...Object.keys(data), `return ${node.value};`))(...Object.values(data));
          break;
        default:
          throw new Error('Internal Error');
      }
    }
  }

  return result;
}

exports.render = render;
