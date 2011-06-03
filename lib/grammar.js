var unwrap, o, op, bnf, operators, name, alternatives, alt, token, tokens;
unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
o = function(patterns, action, options){
  patterns = patterns.trim().split(/\s+/);
  action && (action = unwrap.exec(action)[1].replace(/\b(?!Er)[A-Z][\w.]*/g, 'yy.$&').replace(/\.L\(/g, '$&yylineno, '));
  return [patterns, action || '', options];
};
bnf = {
  Chain: [
    o('Assignable', function(){
      return Chain($1);
    }), o('Parenthetical', function(){
      return Chain($1);
    }), o('STRNUM', function(){
      return Chain(L(Literal($1)));
    }), o('LITERAL', function(){
      return Chain(L(Literal($1)));
    }), o('Chain CALL( ArgList OptComma )CALL', function(){
      return $1.add(Call($3, $2));
    }), o('LET CALL( ArgList OptComma )CALL Block', function(){
      return Chain(Call['let']($3, $6));
    }), o('WITH Expression Block', function(){
      return Chain(Call.block(Fun([], $3), [$2], '.call'));
    })
  ],
  SimpleAssignable: [
    o('ID', function(){
      return L(Var($1));
    }), o('Chain DOT Key', function(){
      return $1.add(Index($3, $2));
    }), o('Chain DOT [ ArgList OptComma ]', function(){
      return $1.add(Index($4, $2));
    }), o('SUPER', function(){
      return L(new Super);
    })
  ],
  Key: [o('KeyBase'), o('Parenthetical')],
  KeyBase: [
    o('ID', function(){
      return L(Key($1));
    }), o('STRNUM', function(){
      return L(Literal($1));
    })
  ],
  ArgList: [
    o('', function(){
      return [];
    }), o('Arg', function(){
      return [$1];
    }), o('ArgList , Arg', function(){
      return $1.concat($3);
    }), o('ArgList OptComma TERMINATOR Arg', function(){
      return $1.concat($4);
    }), o('ArgList OptComma INDENT ArgList OptComma DEDENT', function(){
      return $1.concat($4);
    })
  ],
  Arg: [
    o('Expression'), o('... Expression', function(){
      return Splat($2);
    }), o('...', function(){
      return Splat(L(Arr()));
    })
  ],
  OptComma: [o(''), o(',')],
  Body: [
    o('Line', function(){
      return Block($1);
    }), o('Body TERMINATOR Line', function(){
      return $1.add($3);
    }), o('Body Block', function(){
      return $1.add($2);
    }), o('Body TERMINATOR')
  ],
  Line: [
    o('Expression'), o('LABEL Expression', function(){
      return new Label($1, $2);
    }), o('PARAM( ArgList OptComma )PARAM <- Expression', function(){
      return Call.back($2, $5, $6);
    }), o('COMMENT', function(){
      return L(JS($1, true, true));
    }), o('...', function(){
      return L(Throw(JS("Error('unimplemented')")));
    })
  ],
  Block: [
    o('INDENT Body DEDENT', function(){
      return $2;
    }), o('INDENT      DEDENT', function(){
      return Block();
    })
  ],
  Expression: [
    o('Chain', function(){
      return $1.unwrap();
    }), o('Assignable ASSIGN Expression', function(){
      return Assign($1, $3, $2);
    }), o('Assignable ASSIGN INDENT ArgList OptComma DEDENT', function(){
      return Assign($1, Arr.maybe($4), $2);
    }), o('Expression IMPORT Expression', function(){
      return Import($1, $3, $2 === '<<<<');
    }), o('Expression IMPORT INDENT ArgList OptComma DEDENT', function(){
      return Import($1, Arr.maybe($4), $2 === '<<<<');
    }), o('CREMENT SimpleAssignable', function(){
      return Op($1, $2);
    }), o('SimpleAssignable CREMENT', function(){
      return Op($2, $1, null, true);
    }), o('Expression +-       Expression', op = function(){
      return Op($2, $1, $3);
    }), o('Expression COMPARE  Expression', op), o('Expression LOGIC    Expression', op), o('Expression MATH     Expression', op), o('Expression SHIFT    Expression', op), o('Expression BITWISE  Expression', op), o('Expression RELATION Expression', function(){
      return ('!' === $2.charAt(0)
        ? Op($2.slice(1), $1, $3).invert()
        : Op($2, $1, $3));
    }), o('UNARY Expression', function(){
      return ($1 === '!'
        ? $2.invert()
        : Op($1, $2));
    }), o('+-    Expression', function(){
      return Op($1, $2);
    }, {
      prec: 'UNARY'
    }), o('Chain  ?', function(){
      return Existence($1.unwrap());
    }), o('Chain !?', function(){
      return Existence($1.unwrap(), true);
    }), o('Function'), o('FUNCTION Function', function(){
      return $2.named($1);
    }), o('FUNCTION CALL( ArgList OptComma )CALL Block', function(){
      return L(Fun($3, $6).named($1));
    }), o('IfBlock'), o('IfBlock ELSE Block', function(){
      return $1.addElse($3);
    }), o('Expression POST_IF Expression', function(){
      return If($3, $1, $2 === 'unless');
    }), o('LoopHead   Block', function(){
      return $1.addBody($2);
    }), o('Expression LoopHead', function(){
      return $2.addBody(Block($1));
    }), o('DO Block WHILE Expression', function(){
      return new While($4, $3 === 'until', true).addBody($2);
    }), o('HURL Expression', function(){
      return Jump[$1]($2);
    }), o('HURL INDENT ArgList OptComma DEDENT', function(){
      return Jump[$1](Arr.maybe($3));
    }), o('HURL', function(){
      return L(Jump[$1]());
    }), o('JUMP', function(){
      return L(new Jump($1));
    }), o('JUMP ID', function(){
      return L(new Jump($1, $2));
    }), o('SWITCH Expression Cases', function(){
      return new Switch($2, $3);
    }), o('SWITCH Expression Cases DEFAULT Block', function(){
      return new Switch($2, $3, $5);
    }), o('SWITCH Cases', function(){
      return new Switch(null, $2);
    }), o('SWITCH Cases DEFAULT Block', function(){
      return new Switch(null, $2, $4);
    }), o('SWITCH Block', function(){
      return new Switch(null, [], $2);
    }), o('TRY Block', function(){
      return new Try($2);
    }), o('TRY Block CATCH Block', function(){
      return new Try($2, $3, $4);
    }), o('TRY Block CATCH Block FINALLY Block', function(){
      return new Try($2, $3, $4, $6);
    }), o('TRY Block             FINALLY Block', function(){
      return new Try($2, null, null, $4);
    }), o('CLASS                                     Block', function(){
      return new Class(null, null, $2);
    }), o('CLASS                  EXTENDS Expression Block', function(){
      return new Class(null, $3, $4);
    }), o('CLASS SimpleAssignable                    Block', function(){
      return new Class($2, null, $3);
    }), o('CLASS SimpleAssignable EXTENDS Expression Block', function(){
      return new Class($2, $4, $5);
    }), o('Chain EXTENDS Expression', function(){
      return Util.Extends($1.unwrap(), $3);
    }), o('LABEL Block', function(){
      return new Label($1, $2);
    })
  ],
  KeyValue: [
    o('Key'), o('LITERAL DOT KeyBase', function(){
      return Prop($3, Chain(Literal($1), [Index($3, $2)]));
    }), o('Key     DOT KeyBase', function(){
      return Prop($3, Chain($1, [Index($3, $2)]));
    })
  ],
  Property: [
    o('Key : Expression', function(){
      return Prop($1, $3);
    }), o('Key : INDENT ArgList OptComma DEDENT', function(){
      return Prop($1, Arr.maybe($4));
    }), o('KeyValue'), o('KeyValue LOGIC Expression', function(){
      return Op($2, $1, $3);
    }), o('+- Key', function(){
      return Prop($2.maybeKey(), Literal($1 === '+'));
    }), o('... Expression', function(){
      return Splat($2);
    }), o('COMMENT', function(){
      return L(JS($1, true, true));
    })
  ],
  Properties: [
    o('', function(){
      return [];
    }), o('Property', function(){
      return [$1];
    }), o('Properties , Property', function(){
      return $1.concat($3);
    }), o('Properties OptComma TERMINATOR Property', function(){
      return $1.concat($4);
    }), o('Properties OptComma INDENT Properties OptComma DEDENT', function(){
      return $1.concat($4);
    })
  ],
  IfBlock: [
    o('IF Expression Block', function(){
      return If($2, $3, $1 === 'unless');
    }), o('IfBlock ELSE IF Expression Block', function(){
      return $1.addElse(If($4, $5, $3 === 'unless'));
    })
  ],
  Parenthetical: [
    o('(        Body        )', function(){
      return Parens($2.unwrap(), false, $1 === '"');
    }), o('( INDENT Body DEDENT )', function(){
      return Parens($3.unwrap(), false, $1 === '"');
    })
  ],
  Assignable: [
    o('SimpleAssignable'), o('[ ArgList    OptComma ]', function(){
      return L(Arr($2));
    }), o('{ Properties OptComma }', function(){
      return L(Obj($2));
    }), o('Chain CLONE { Properties OptComma }', function(){
      return Clone($1.unwrap(), $4);
    })
  ],
  Function: [
    o('PARAM( ArgList OptComma )PARAM -> Block', function(){
      return L(Fun($2, $6, $5));
    }), o('-> Block', function(){
      return L(Fun([], $2, $1));
    })
  ],
  LoopHead: [
    o('FOR Assignable FOROF Expression', function(){
      return new For({
        name: $2,
        index: $3,
        source: $4
      });
    }), o('FOR Assignable FOROF Expression BY Expression', function(){
      return new For({
        name: $2,
        index: $3,
        source: $4,
        step: $6
      });
    }), o('FOR     ID              FORIN Expression', function(){
      return new For({
        object: true,
        own: false,
        index: $2,
        source: $4
      });
    }), o('FOR     ID , Assignable FORIN Expression', function(){
      return new For({
        object: true,
        own: false,
        index: $2,
        name: $4,
        source: $6
      });
    }), o('FOR OWN ID              FORIN Expression', function(){
      return new For({
        object: true,
        own: true,
        index: $3,
        source: $5
      });
    }), o('FOR OWN ID , Assignable FORIN Expression', function(){
      return new For({
        object: true,
        own: true,
        index: $3,
        name: $5,
        source: $7
      });
    }), o('FOR ID FROM Expression', function(){
      return new For({
        index: $2,
        from: Literal(0),
        op: 'til',
        to: $4
      });
    }), o('FOR ID FROM Expression TO Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6
      });
    }), o('FOR ID FROM Expression TO Expression BY Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6,
        step: $8
      });
    }), o('WHILE Expression', function(){
      return new While($2, $1 === 'until');
    }), o('WHILE Expression , Expression', function(){
      return new While($2, $1 === 'until', $4);
    }), o('FOR EVER', function(){
      return L(new While);
    })
  ],
  Cases: [
    o('CASE Exprs Block', function(){
      return [new Case($2, $3)];
    }), o('Cases CASE Exprs Block', function(){
      return $1.concat(new Case($3, $4));
    })
  ],
  Exprs: [
    o('Expression', function(){
      return [$1];
    }), o('Exprs , Expression', function(){
      return $1.concat($3);
    })
  ],
  Root: [
    o('Body'), o('Block TERMINATOR'), o('Block TERMINATOR Body', function(){
      return $1.add($3);
    }), o('', function(){
      return Block();
    })
  ]
};
operators = [['left', 'POST_IF', 'FOR', 'WHILE'], ['right', ',', 'ASSIGN', 'HURL', 'EXTENDS', 'INDENT', 'SWITCH', 'CASE', 'TO', 'BY'], ['right', 'LOGIC'], ['left', 'BITWISE'], ['right', 'COMPARE'], ['left', 'RELATION'], ['left', 'SHIFT', 'IMPORT'], ['left', '+-'], ['left', 'MATH'], ['right', 'UNARY'], ['nonassoc', 'CREMENT']];
tokens = (function(){
  var _ref, _i, _ref2, _len, _j, _ref3, _len2, _results = [];
  for (name in _ref = bnf) {
    alternatives = _ref[name];
    for (_i = 0, _len = (_ref2 = alternatives).length; _i < _len; ++_i) {
      alt = _ref2[_i];
      if (name === 'Root') {
        alt[1] = "return " + (alt[1] || '$$') + ";";
      } else {
        alt[1] && (alt[1] = "$$ = " + alt[1] + ";");
      }
      for (_j = 0, _len2 = (_ref3 = alt[0]).length; _j < _len2; ++_j) {
        token = _ref3[_j];
        if (!(token in bnf)) {
          _results.push(token);
        }
      }
    }
  }
  return _results;
}()).join(' ');
exports.parser = new (require('jison')).Parser({
  bnf: bnf,
  operators: operators,
  tokens: tokens,
  startSymbol: 'Root'
});