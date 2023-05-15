const assert = require('assert');
const { render } = require('./enso.js');

describe('interpolation', function() {
  it('start of string', function() {
    assert.equal(
      render('{{city}} is my hometown', { city: 'Tokyo' }),
      'Tokyo is my hometown'
    );
  });

  it('end of string', function() {
    assert.equal(
      render('I was born in {{city}}', { city: 'Kyoto' }),
      'I was born in Kyoto'
    );
  });

  it('entire string', function() {
    assert.equal(
      render('{{city}}', { city: 'Nara' }),
      'Nara'
    );
  });

  it('multiple occurences', function() {
    assert.equal(
      render('My name is {{name}}, aged {{age}}.', { name: 'Akari', age: 27 }),
      'My name is Akari, aged 27.'
    );
  });
});

