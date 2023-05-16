const assert = require('assert');
const enso = require('./enso.js');

describe('interpolation', function() {
  it('start of string', function() {
    assert.equal(
      enso('{{city}} is my hometown', { city: 'Tokyo' }),
      'Tokyo is my hometown'
    );
  });

  it('end of string', function() {
    assert.equal(
      enso('I was born in {{city}}', { city: 'Kyoto' }),
      'I was born in Kyoto'
    );
  });

  it('entire string', function() {
    assert.equal(
      enso('{{city}}', { city: 'Nara' }),
      'Nara'
    );
  });

  it('multiple occurences', function() {
    assert.equal(
      enso('My name is {{name}}, aged {{age}}.', { name: 'Akari', age: 27 }),
      'My name is Akari, aged 27.'
    );
  });
});

describe('helpers', function() {
  it('should be callable', function() {
    enso.helper('shout', (value) => value.toUpperCase());

    assert.equal(
      enso('"{{ shout(action) }}!", he shouted', { action: 'run' }),
      '"RUN!", he shouted'
    );
  });
});

