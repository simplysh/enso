# enso
The expressive templating engine.

## Note
enso is still in development! Syntax and design choices might change.

## What is enso?

Enso is a templating engine written in TypeScript. It is heavily inspired by handlebars, but unlike more general purpose templating engines, which strive to be language agnostic, enso works solely with JavaScript expressions.

This means that any JavaScript expression can be used as an interpolated value:

```
2 + 3 is {{2 + 3}}.
```
```
2 + 3 is 5.
```

More complex behaviours are also acomplished through expressions. No templating DSL required!

```
{{ each(['Andrei', 'George']) }}
Hello, {{self}}!
{{ end() }}
```
```
Hello, Andrei!
Hello, George!
```

## Reference

### `enso(source: string, data?: {}): string`

This is the main callable function in enso. Given a source string, and an optional data object, it will interpolate all the expressions in the source.

Example:

```js
enso('{{city}} is my hometown.', { city: 'Nara' });
// -> Nara is my hometown.
```
### `enso.block(blockId: string, source: string): void`

Register a string template with enso. It can then be recalled and rendered as many times as required using the `render()` built-in function within interpolation expressions. Blocks are similar to handlebars partials, have their own scope, and can be given any data.

Example:

```js
enso.block('greet', 'Hello, {{name}}!');

enso("{{ render('greet', { name: 'Molly' }) }}");
// -> Hello, Molly!

enso("{{ render('greet', { name: names[1] }) }}", { names: ['Andy', 'James'] });
// -> Hello, James!
```

Blocks may also use the built-in `slot()` function expression to capture content in the parent context and define where it will appear within the block. In this way they become similar to components. Blocks which use slot **must** make a call to `end()` to suggest where the block scope ends.

Example:

```js
enso.block('emphasize', '<em>{{ slot() }}</em>');

enso("Get out of bed {{ render('emphasize') }}now{{ end() }}!");
// -> Get out of bed <em>now</em>!
```

### `enso.helper(id: string, callback: () => Maybe<string>): void;`

Register a helper function with enso. Helper functions are made available in enso expressions, and can do virtually anything, from data transformations to side-effects. If a helper returns a string value, it will be used in-place.

Example:

```js
enso.helper('loud', (value) => value.toUpperCase());

enso('"{{ loud(action) }}!", he shouted', { action: 'run' });
// -> "RUN!", he shouted
```

## Built-in function expressions

These functions are provided by enso and are usable within interpolation expressions, to various effects. Due to their nature, these functions should appear at the top-level of an interpolation expression and should not be composed.

### `render(blockId: string, data?: {})`
### `slot()`
### `each(value: Iterable<any>)`
### `if(value: boolean)`
### `end()`