# enso
The expressive templating engine.

## Note
enso is still in development!

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

### `enso.helper(id: string, callback: () => Maybe<string>): void;`

Register a helper function with enso. Helper functions are made available in enso expressions, and can do virtually anything, from data transformations to side-effects. If a helper returns a string value, it will be used in-place.

Example:

```js
enso.helper('loud', (value) => value.toUpperCase());

enso('"{{ loud(action) }}!", he shouted', { action: 'run' });
// -> "RUN!", he shouted
```

## Built-in function expressions

These functions are provided by enso and are usable within interpolation expressions, to various effects. Do to their nature, these functions should appear at the top-level of an interpolation expression and should not be composed.

### `render(blockId: string, data?: {})`
### `slot()`
### `each(value: Iterable<any>)`
### `if(value: boolean)`
### `end()`