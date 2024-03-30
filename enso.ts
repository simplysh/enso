const props: EnsoProps = {
  delimiters: '{{}}',
  context: [],
  data: {},
  helpers: {},
  blocks: {},
  builtins: {
    render(blockId, data = {}) {
      return function(visitor) {
        const template = _enso.blocks[blockId];

        const node: BlockNode = {
          type: 'block',
          deferred: false,
          children: []
        };

        visitor.children.push(node);
        parse(template, data, node);

        // if rendering added a context, "yield" it
        if (_enso.context.length) return _enso.context[_enso.context.length - 1];
      }
    },
    slot() {
      return function(visitor) {
        if (visitor.type !== 'block') {
          throw new Error('Slots may only be used within block expressions.');
        }

        const node: SlotNode = {
          type: 'slot',
          deferred: false,
          children: []
        };

        visitor.children.push(node);
        _enso.context.push(node);
      }
    },
    end() {
      return function() {
        const node = _enso.context.pop();
        if (!node) return;

        switch (node.type) {
          // evaluate the iterator node, now that we have its entire body
          case 'iterator': {
            // make a copy of children before clearing
            const body: Node[] = [...node.children];
            node.children = [];
            node.deferred = false;

            // loop through all the values and apply them to all the children in order
            // self becomes the value iterated through
            for (const value of node.value) {
              for (const component of body) {
                if (component.type === 'text') {
                  parse(component.expression ?? component.value, { self: value }, node);
                }
              }
            }
            break;
          }

          case 'conditional': {
            // make a copy of children before clearing
            const body: Node[] = [...node.children];
            node.children = [];
            node.deferred = false;

            if (node.value) {
              for (const component of body) {
                if (component.type === 'text') {
                  parse(component.expression ?? component.value, _enso.data, node);
                }
              }
            }

            break;
          }

          default: break;
        }
      }
    },
    _if(value: boolean) {
      return function(visitor) {
        const node: ConditionalNode = {
          type: 'conditional',
          deferred: true,
          value,
          children: []
        };

        visitor.children.push(node);
        _enso.context.push(node);

        return node;
      }
    },
    each(value: Iterable<any>) {
      return function(visitor) {
        const node: IteratorNode = {
          type: 'iterator',
          deferred: true,
          value,
          children: []
        };

        visitor.children.push(node);
        _enso.context.push(node);

        return node;
      }
    }
  },
  helper(helperId: string, callback: () => string) {
    this.helpers[helperId] = callback;
  },
  block(blockId: string, template: string) {
    this.blocks[blockId] = template;
  },
  deferred: []
};

const _enso = Object.assign(
  <Enso>function enso(source, data = {}) {
    _enso.data = data;

    const ast = parse(source, data, {
      type: 'root',
      deferred: false,
      children: [],
    });

    // evaluate deferred (lazy) expressions
    for (const node of _enso.deferred) {
      node.deferred = false;
      parse(node.value, data, node);
    }
    _enso.deferred = [];

    return output(ast);
  },
  props
);

function parse(template: string, data: object, node: BranchNode): BranchNode {
  const expStart = _enso.delimiters.substring(0, 2);
  const expEnd = _enso.delimiters.substring(2);

  let startIndex: number = 0;
  let endIndex: number = 0;

  let target = node;

  // we only really care about expressions
  while ((startIndex = seek(template, expStart, endIndex)) !== -1) {
    // we found an expression start, first insert all the text up to here
    const value = template.substring(endIndex, startIndex);

    if (value !== '') {
      target.children.push({
        type: 'text',
        deferred: false,
        value,
      });
    }

    const isDeferred = template[startIndex + 1] === '_';
    const isEscaped = template[startIndex + 1] === '#';

    if (isDeferred && (endIndex = seek(template, `_${expEnd[1]}`, startIndex)) !== -1) {
      const expression = template.substring(startIndex + 2, endIndex).trim();

      const node: DeferredNode = {
        type: 'deferred',
        deferred: true,
        value: expression,
        children: []
      };

      target.children.push(node);
      _enso.deferred.push(node);

      endIndex = endIndex + 2;
      continue;
    } else if (isEscaped && (endIndex = seek(template, `#${expEnd[1]}`, startIndex)) !== -1) {
      const expression = template.substring(startIndex + 2, endIndex).trim();

      const node: TextNode = {
        type: 'text',
        deferred: false,
        value: expression
      };

      target.children.push(node);

      endIndex = endIndex + 2;
      continue;
    } else if ((endIndex = seek(template, expEnd, startIndex)) !== -1) {
      // read expression and move index
      const expression = template.substring(startIndex + 2, endIndex).trim();
      let value: string | Visitor;

      if (!target.deferred || expression === 'end()') {
        // evaluate expression in the current context
        value = new Function(
          ...Object.keys(data),
          'context',
          'isset',
          ...Object.keys(_enso.helpers),
          ...Object.keys(_enso.builtins),
          `return ${expression
            .replace(/if\((.*)\)/g, '_if(Boolean($1))')
            .replace(/unless\((.*)\)/g, '_if(!Boolean($1))')
            };`
        )(
          ...Object.values(data),
          _enso.data,
          (key: string) => Object.hasOwn(data, key),
          ...Object.values(_enso.helpers).map(value => value.bind(_enso.data)),
          ...Object.values(_enso.builtins)
        ) ?? '';
      } else {
        value = expression;
      }

      if (typeof value === 'function') {
        // reassign the target in case the context has changed
        target = value(target) ?? node;
      } else {
        target.children.push({
          type: 'text',
          deferred: false,
          value,
          expression: `{{${expression}}}`,
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
      deferred: false,
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
    if (text[found + 1] === sequence[1] || text[found + 1] === '_' || text[found + 1] === '#') {
      return found;
    } else {
      start = found + 1;
    }
  }

  return -1;
}

function* flatten(root: BranchNode): Generator<Node> {
  for (const node of root.children) {
    if (node.type === 'conditional') {
      if (node.value) yield* flatten(node);
    } else if (node.type !== 'text') {
      yield* flatten(node);
    } else {
      yield node;
    }
  }
}

export = _enso;

type Maybe<T> = T | void;

type Visitor = (visitor: BranchNode) => Maybe<BranchNode>
type BuiltIn = (...args: any[]) => Visitor;

interface EnsoProps {
  delimiters: string;
  context: BranchNode[];
  data: object;
  helpers: { [id: string]: () => any };
  blocks: { [id: string]: string };
  builtins: { [id: string]: BuiltIn };
  helper(id: string, callback: () => Maybe<string>): void;
  block(id: string, template: string): void;
  deferred: DeferredNode[]
}

type Enso = (source: string, data?: {}) => string;

interface RootNode {
  type: 'root';
  deferred: boolean;
  children: Node[];
}

interface BlockNode {
  type: 'block';
  deferred: boolean;
  children: Node[];
}

interface SlotNode {
  type: 'slot';
  deferred: boolean;
  children: Node[];
}

interface IteratorNode {
  type: 'iterator';
  deferred: boolean;
  value: Iterable<any>;
  children: Node[];
}

interface ConditionalNode {
  type: 'conditional';
  deferred: boolean;
  value: boolean;
  children: Node[];
}

interface DeferredNode {
  type: 'deferred';
  deferred: boolean;
  value: string;
  children: Node[];
}

interface TextNode {
  type: 'text';
  deferred: boolean;
  expression?: string;
  value: string;
}

type BranchNode = RootNode
  | BlockNode
  | SlotNode
  | ConditionalNode
  | IteratorNode
  | DeferredNode;
type LeafNode = TextNode;

type Node = BranchNode | LeafNode;

