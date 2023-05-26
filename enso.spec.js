const { expect } = require('chai');
const enso = require('./enso.js');

beforeEach(function() {
  enso.blocks = {};
  enso.helpers = {};
});

describe('interpolation', function() {
  it('start of string', function() {
    expect(
      enso('{{city}} is my hometown', { city: 'Tokyo' })
    ).to.equal(
      'Tokyo is my hometown'
    );
  });

  it('end of string', function() {
    expect(
      enso('I was born in {{city}}', { city: 'Kyoto' })
    ).to.equal(
      'I was born in Kyoto'
    );
  });

  it('entire string', function() {
    expect(
      enso('{{city}}', { city: 'Nara' })
    ).to.equal(
      'Nara'
    );
  });

  it('multiple occurences', function() {
    expect(
      enso('My name is {{name}}, aged {{age}}.', { name: 'Akari', age: 27 })
    ).to.equal(
      'My name is Akari, aged 27.'
    );
  });
});

describe('built-ins', function() {
  describe('render', function() {
    it('can accept data', function() {
      enso.block('greet', 'Hello, {{name}}!');

      expect(
        enso(
          "{{ render('greet', { name: patrons[0] }) }} {{ render('greet', { name: patrons[1] }) }}",
          { patrons: ['James', 'Jake'] }
        )
      ).to.equal(
        'Hello, James! Hello, Jake!'
      );
    });

    it('can be nested', function() {
      enso.block('super', "super");
      enso.block('duper', "{{ render('super') }} duper");
      enso.block('cool', "{{ render('duper') }} thing");

      expect(enso( "{{ render('cool') }}")).to.equal(
        'super duper thing'
      );
    });
  });

  describe('if', function() {
    it('keeps content when true', function() {
      expect(
        enso('The answer is: {{ if(true) }}yes{{ end() }}.')
      ).to.equal(
        'The answer is: yes.'
      );
    });

    it('removes content when false', function() {
      expect(
        enso('The answer is: {{ if(false) }}yes{{ end() }}.')
      ).to.equal(
        'The answer is: .'
      );
    });
  });
});

describe('blocks', function() {
  it('can be registered', function() {
    expect(() => enso.block('greet', 'Hello, {{name}}!')).not.to.throw();
    expect(enso.blocks).to.have.property('greet');
    expect(enso.blocks['greet']).to.equal('Hello, {{name}}!');
  });

  it('can use slots', function() {
    enso.block('wrap', '<strong>{{ slot() }}</strong>');

    expect(
      enso("Exploring the city is a {{ render('wrap') }}must{{ end() }}!")
    ).to.equal(
      'Exploring the city is a <strong>must</strong>!'
    );
  });

  it('can be nested with slots', function() {
    enso.block('a', '<a>{{ slot() }}</a>');
    enso.block('b', '<b>{{ slot() }}</b>');

    expect(
      enso("Double {{ render('a') }}{{ render('b') }}wrap{{ end() }}{{ end() }}, yo!")
    ).to.equal(
      'Double <a><b>wrap</b></a>, yo!'
    );
  });
});

describe('helpers', function() {
  it('should be callable', function() {
    enso.helper('loud', (value) => value.toUpperCase());

    expect(
      enso('"{{ loud(action) }}!", he shouted', { action: 'run' })
    ).to.equal(
      '"RUN!", he shouted'
    );
  });
});

