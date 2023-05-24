type Helper = (...args: any[]) => (visitor: BranchNode) => void;

interface EnsoProps {
  delimiters: string;
  helpers: { [id: string]: () => any };
  blocks: { [id: string]: string };
  builtins: { [id: string]: Helper };
  helper(id: string, callback: () => any): void;
  block(id: string, template: string): void;
}

type Enso = (source: string, data?: {}) => string;

interface RootNode {
  type: 'root';
  children: Node[];
}

interface BlockNode {
  type: 'block';
  children: Node[];
}

interface TextNode {
  type: 'text';
  expression?: string;
  value: string;
}

type BranchNode = RootNode | BlockNode;
type LeafNode = TextNode

type Node = BranchNode | LeafNode;

const props: EnsoProps = {
  delimiters: '{{}}',
  helpers: {},
  blocks: {},
  builtins: {
    render(blockId, data = {}) {
      return function(visitor) {
        const template = _enso.blocks[blockId];

        const node = {
          type: 'block',
          children: []
        } as BlockNode;

        visitor.children.push(node);
        parse(template, data, node);
      }
    }
  },
  helper(id: string, callback: () => string) {
    this.helpers[id] = callback;
  },
  block(id: string, template: string) {
    this.blocks[id] = template;
  }
};

const _enso = Object.assign(
  <Enso>function enso(source, data = {}) {
    return output(parse(source, data, {
      type: 'root',
      children: [],
    }));
  },
  props
);

function parse(template: string, data: object, node: BranchNode): BranchNode {
  const expStart = _enso.delimiters.substring(0, 2);
  const expEnd = _enso.delimiters.substring(2);

  let startIndex: number = 0;
  let endIndex: number = 0;

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

      let value = new Function(
        ...Object.keys(data),
        ...Object.keys(_enso.helpers),
        ...Object.keys(_enso.builtins),
        `return ${expression};`
      )(
        ...Object.values(data),
        ...Object.values(_enso.helpers),
        ...Object.values(_enso.builtins)
      );

      if (typeof value === 'function') {
        value(node);
      } else {
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

function output(root: BranchNode): string {
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

function seek(text: string, sequence: string, from: number = 0): number {
  let found;
  let start = from;

  while ((found = text.indexOf(sequence[0], start)) !== -1) {
    if (text[found + 1] === sequence[1]) {
      return found;
    } else {
      start = found + 1;
    }
  }

  return -1;
}

function* flatten(root: BranchNode): Generator<Node> {
  for (const node of root.children) {
    if (node.type !== 'text') {
      yield* flatten(node);
    } else {
      yield node;
    }
  }
}

export = _enso;
