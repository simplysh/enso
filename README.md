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
// -> 'Nara is my hometown.'
```

## Built-in expressions

### `render(blockId: string, data?: {})`
### `slot()`
### `each(value: Iterable<any>)`
### `if(value: boolean)`
### `end()`