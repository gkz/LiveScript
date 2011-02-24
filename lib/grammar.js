var unwrap, o, bnf, operators, name, alternatives, alt, token, tokens;
unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
o = function(patterns, action, options){
  patterns = patterns.trim().split(/\s+/);
  action && (action = unwrap.exec(action)[1].replace(/\b(?!Er)[A-Z][\w.]*/g, 'yy.$&').replace(/\.L\(/g, '$&yylineno, '));
  return [patterns, action || '', options];
};
bnf = {
  Assignable: [
    o('SimpleAssignable'), o('[ ArgList    OptComma ]', function(){
      return L(Arr($2));
    }), o('{ Properties OptComma }', function(){
      return L(Obj($2));
    }), o('Chain CLONE { Properties OptComma }', function(){
      return new Clone($1.unwrap(), $4);
    })
  ],
  Chain: [
    o('Assignable', function(){
      return Chain($1);
    }), o('STRNUM', function(){
      return Chain(L(Literal($1)));
    }), o('LITERAL', function(){
      return Chain(L(Literal($1)));
    }), o('Parenthetical', function(){
      return Chain($1);
    }), o('Chain CALL( ArgList OptComma )CALL', function(){
      return $1.add(Call($3, $2));
    }), o('LET Function', function(){
      return Chain(Call['let']($2));
    })
  ],
  SimpleAssignable: [
    o('IDENTIFIER', function(){
      return L(Var($1));
    }), o('Chain DOT IDENTIFIER', function(){
      return $1.add(Index(L(Key($3)), $2));
    }), o('Chain DOT STRNUM', function(){
      return $1.add(Index(L(Literal($3)), $2));
    }), o('Chain DOT Parenthetical', function(){
      return $1.add(Index($3.it, $2));
    }), o('Chain DOT [ ArgList OptComma ]', function(){
      return $1.add(L(Index($4, $2)));
    }), o('SUPER', function(){
      return L(new Super);
    })
  ],
  Expression: [
    o('Chain', function(){
      return $1.unwrap();
    }), o('Assignable ASSIGN Expression', function(){
      return Assign($1, $3, $2);
    }), o('Assignable ASSIGN INDENT ArgList OptComma DEDENT', function(){
      return Assign($1, Arr.maybe($4), $2);
    }), o('CREMENT SimpleAssignable', function(){
      return Op($1, $2);
    }), o('SimpleAssignable CREMENT', function(){
      return Op($2, $1, null, true);
    }), o('UNARY Expression', function(){
      return ($1 === '!'
        ? $2.invert()
        : Op($1, $2));
    }), o('+-    Expression', function(){
      return Op($1, $2);
    }, {
      prec: 'UNARY'
    }), o('Expression +-       Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression MATH     Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression SHIFT    Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression COMPARE  Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression BITWISE  Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression LOGIC    Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression RELATION Expression', function(){
      return ('!' === $2.charAt(0)
        ? Op($2.slice(1), $1, $3).invert()
        : Op($2, $1, $3));
    }), o('Expression IMPORT Expression', function(){
      return Import($1, $3, $2 === '<<<<');
    }), o('Expression ?', function(){
      return Existence($1);
    }), o('Function'), o('FUNCTION Function', function(){
      return $2.named($1);
    }), o('IfBlock'), o('IfBlock ELSE Block', function(){
      return $1.addElse($3);
    }), o('Expression POST_IF Expression', function(){
      return L(If($3, $1, {
        name: $2
      }));
    }), o('LoopHead   Block', function(){
      return $1.addBody($2);
    }), o('Expression LoopHead', function(){
      return $2.addBody(Block($1));
    }), o('RETURN Expression', function(){
      return Return($2);
    }), o('THROW  Expression', function(){
      return new Throw($2);
    }), o('STATEMENT', function(){
      return L(new Statement($1));
    }), o('RETURN', function(){
      return L(Return());
    }), o('SWITCH Expression Cases', function(){
      return new Switch($2, $3);
    }), o('SWITCH Expression Cases DEFAULT Block', function(){
      return new Switch($2, $3, $5);
    }), o('SWITCH Cases', function(){
      return new Switch(null, $2);
    }), o('SWITCH Cases DEFAULT Block', function(){
      return new Switch(null, $2, $4);
    }), o('TRY Block', function(){
      return new Try($2);
    }), o('TRY Block CATCH Block', function(){
      return new Try($2, $3, $4);
    }), o('TRY Block CATCH Block FINALLY Block', function(){
      return new Try($2, $3, $4, $6);
    }), o('TRY Block             FINALLY Block', function(){
      return new Try($2, null, null, $4);
    }), o('WITH Expression Block', function(){
      return Call.block(Fun([], $3), [$2], '.call');
    }), o('CLASS OptExtends', function(){
      return new Class(null, $2);
    }), o('CLASS OptExtends Block', function(){
      return new Class(null, $2, $3);
    }), o('CLASS SimpleAssignable OptExtends', function(){
      return new Class($2, $3);
    }), o('CLASS SimpleAssignable OptExtends Block', function(){
      return new Class($2, $3, $4);
    }), o('Chain EXTENDS Expression', function(){
      return Util.Extends($1.unwrap(), $3);
    })
  ],
  Line: [
    o('Expression'), o('PARAM( ArgList OptComma )PARAM BACKCALL Expression', function(){
      return Call.back($2, $5, $6);
    }), o('COMMENT', function(){
      return L(JS($1, true, true));
    }), o('...', function(){
      return L(new Throw(JS("Error('unimplemented')")));
    })
  ],
  Body: [
    o('Line', function(){
      return Block($1);
    }), o('Body TERMINATOR Line', function(){
      return $1.add($3);
    }), o('Body Block', function(){
      return $1.add($2);
    }), o('Body TERMINATOR')
  ],
  OptComma: [o(''), o(',')],
  Arg: [
    o('Expression'), o('... Expression', function(){
      return L(Splat($2));
    }), o('...', function(){
      return L(Splat(Arr()));
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
  Parenthetical: [
    o('(        Body        )', function(){
      return L(Parens($2.unwrap()));
    }), o('( INDENT Body DEDENT )', function(){
      return L(Parens($3.unwrap()));
    })
  ],
  Block: [
    o('INDENT Body DEDENT', function(){
      return $2;
    }), o('INDENT      DEDENT', function(){
      return Block();
    })
  ],
  Function: [
    o('PARAM( ArgList OptComma )PARAM FUNC_ARROW Block', function(){
      return L(Fun($2, $6, $5));
    }), o('FUNC_ARROW Block', function(){
      return L(Fun([], $2, $1));
    })
  ],
  KeyBase: [
    o('IDENTIFIER', function(){
      return L(Key($1));
    }), o('STRNUM', function(){
      return L(Literal($1));
    })
  ],
  Key: [o('KeyBase'), o('Parenthetical')],
  KeyValue: [
    o('Key'), o('LITERAL DOT KeyBase', function(){
      return Assign($3, Chain(Literal($1), [Index($3, $2)]), ':');
    }), o('Key     DOT KeyBase', function(){
      return Assign($3, Chain($1, [Index($3, $2)]), ':');
    })
  ],
  Property: [
    o('Key : Expression', function(){
      return Assign($1, $3, ':');
    }), o('Key : INDENT ArgList OptComma DEDENT', function(){
      return Assign($1, Arr.maybe($4), ':');
    }), o('+- Key', function(){
      return Assign($2.asKey(), Literal($1 === '+'), ':');
    }), o('KeyValue'), o('KeyValue LOGIC Expression', function(){
      return Op($2, $1, $3);
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
      return If($2, $3, {
        name: $1
      });
    }), o('IfBlock ELSE IF Expression Block', function(){
      return $1.addElse(If($4, $5, {
        name: $3
      }));
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
    }), o('FOR IDENTIFIER              FORIN Expression', function(){
      return new For({
        object: true,
        own: !$1,
        index: $2,
        source: $4
      });
    }), o('FOR IDENTIFIER , Assignable FORIN Expression', function(){
      return new For({
        object: true,
        own: !$1,
        index: $2,
        name: $4,
        source: $6
      });
    }), o('FOR IDENTIFIER FROM Expression', function(){
      return new For({
        index: $2,
        from: Literal(0),
        op: 'til',
        to: $4
      });
    }), o('FOR IDENTIFIER FROM Expression TO Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6
      });
    }), o('FOR IDENTIFIER FROM Expression TO Expression BY Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6,
        step: $8
      });
    }), o('WHILE Expression', function(){
      return new While($2, $1);
    }), o('FOR EVER', function(){
      return L(new While);
    })
  ],
  Cases: [
    o('CASE Expression Block', function(){
      return [new Case($2, $3)];
    }), o('Cases CASE Expression Block', function(){
      return $1.concat(new Case($3, $4));
    })
  ],
  OptExtends: [
    o('', function(){
      return null;
    }), o('EXTENDS Expression', function(){
      return $2;
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
operators = [['nonassoc', 'CREMENT'], ['left', '?'], ['right', 'UNARY'], ['left', 'MATH'], ['left', '+-'], ['left', 'SHIFT', 'IMPORT'], ['left', 'RELATION'], ['right', 'COMPARE'], ['left', 'BITWISE'], ['right', 'LOGIC'], ['right', ':', 'ASSIGN', 'RETURN', 'THROW', 'EXTENDS', 'INDENT'], ['right', 'IF', 'ELSE', 'SWITCH', 'CASE', 'DEFAULT', 'CLASS', 'FORIN', 'FOROF', 'FROM', 'TO', 'BY'], ['left', 'POST_IF', 'FOR', 'WHILE']].reverse();
tokens = (function(){
  var _ref, _i, _ref2, _len, _j, _ref3, _len2, _results = [];
  for (name in _ref = bnf) {
    alternatives = _ref[name];
    for (_i = 0, _len = (_ref2 = alternatives).length; _i < _len; ++_i) {
      alt = _ref2[_i];
      if (name === 'Root') {
        alt[1] = "return " + (alt[1] || '$$');
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