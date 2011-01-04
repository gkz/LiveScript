var unwrap, yy, o, bnf, operators, name, alternatives, alt, token, tokens;
unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
yy = /\b(?:(?!Er)[A-Z][\w.]+|mix\b)/g;
o = function(patterns, action, options){
  patterns = patterns.trim().split(/\s+/);
  action && (action = unwrap.exec(action)[1].replace(yy, 'yy.$&'));
  return [patterns, action != null ? action : '$1', options];
};
bnf = {
  Assignable: [o('SimpleAssignable'), o('Array'), o('Object')],
  Value: [
    o('Assignable', function(){
      return Value($1);
    }), o('Primitive', function(){
      return Value($1);
    }), o('Parenthetical', function(){
      return Value($1);
    }), o('THIS', function(){
      return Value(Literal('this', true));
    }), o('Value CALL( ArgList OptComma )CALL', function(){
      return Value(Call($1, $3, $2));
    }), o('Value CALL(        ...       )CALL', function(){
      return Value(Call($1, null, $2));
    })
  ],
  Primitive: [
    o('STRNUM', function(){
      return Literal($1);
    }), o('LITERAL', function(){
      return Literal($1, true);
    })
  ],
  SimpleAssignable: [
    o('IDENTIFIER', function(){
      return Literal($1);
    }), o('ThisProperty'), o('Value DOT IDENTIFIER', function(){
      return $1.add(Index(Key($3), $2));
    }), o('Value DOT STRNUM', function(){
      return $1.add(Index(Literal($3), $2));
    }), o('Value DOT Parenthetical', function(){
      return $1.add(Index($3.it, $2));
    }), o('Value DOT [ ArgList OptComma ]', function(){
      return $1.add(Index($4, $2));
    }), o('Value CLONE Object', function(){
      return new Clone($1.unwrap(), $3);
    }), o('SUPER', function(){
      return new Super;
    })
  ],
  Expression: [
    o('Value', function(){
      return $1.unwrap();
    }), o('Assignable ASSIGN Expression', function(){
      return Assign($1, $3, $2);
    }), o('Expression +-         Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression MATH       Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression SHIFT      Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression COMPARE    Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression LOGIC      Expression', function(){
      return Op($2, $1, $3);
    }), o('Expression IMPORT     Expression', function(){
      return Import($1, $3, $2 === '<<<<');
    }), o('Expression RELATION   Expression', function(){
      return $2.charAt(0) === '!'
        ? Op($2.slice(1), $1, $3).invert()
        : Op($2, $1, $3);
    }), o('UNARY Expression', function(){
      return Op($1, $2);
    }), o('+-    Expression', function(){
      return Op($1, $2);
    }, {
      prec: 'UNARY'
    }), o('Expression ?', function(){
      return Existence($1);
    }), o('CREMENT SimpleAssignable', function(){
      return Op($1, $2);
    }), o('SimpleAssignable CREMENT', function(){
      return Op($2, $1, null, true);
    }), o('Fun'), o('FUNCTION Fun', function(){
      return mix($2, {
        statement: true
      });
    }), o('FUNCTION IDENTIFIER Fun', function(){
      return mix($3, {
        statement: true,
        name: $2
      });
    }), o('IfBlock'), o('Expression POST_IF Expression', function(){
      return If($3, $1, {
        name: $2
      });
    }), o('LoopHead   Block', function(){
      return $1.addBody($2);
    }), o('Expression LoopHead', function(){
      return $2.addBody(Lines($1));
    }), o('RETURN Expression', function(){
      return Return($2);
    }), o('RETURN', function(){
      return Return();
    }), o('STATEMENT', function(){
      return new Statement($1);
    }), o('THROW  Expression', function(){
      return new Throw($2);
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
    }), o('CLASS OptExtends', function(){
      return new Class(null, $2);
    }), o('CLASS OptExtends Block', function(){
      return new Class(null, $2, $3);
    }), o('CLASS SimpleAssignable OptExtends', function(){
      return new Class($2, $3);
    }), o('CLASS SimpleAssignable OptExtends Block', function(){
      return new Class($2, $3, $4);
    }), o('SimpleAssignable EXTENDS Expression', function(){
      return Util.Extends($1, $3);
    })
  ],
  Line: [
    o('Expression'), o('COMMENT', function(){
      return Comment($1);
    }), o('...', function(){
      return new Throw(Literal("Error('stub code executed')"));
    })
  ],
  Body: [
    o('Line', function(){
      return Lines($1);
    }), o('Body TERMINATOR Line', function(){
      return $1.add($3);
    }), o('Body TERMINATOR')
  ],
  OptComma: [o('', 0), o(',', 0)],
  Arg: [
    o('Expression'), o('... Expression', function(){
      return Splat($2);
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
    }), o('ArgSeq'), o('ArgList , ArgSeq', function(){
      return $1.concat($3);
    }), o('ArgList OptComma TERMINATOR ArgSeq', function(){
      return $1.concat($4);
    })
  ],
  ArgSeq: [
    o('Primitive Primitive', function(){
      return [$1, $2];
    }), o('ArgSeq    Primitive', function(){
      return $1.concat($2);
    })
  ],
  ThisProperty: [
    o('THISPROP', function(){
      return Value(Literal('this'), [Index(Key($1))], true);
    })
  ],
  Parenthetical: [
    o('(        Body        )', function(){
      return Parens($2.unwrap());
    }), o('( INDENT Body DEDENT )', function(){
      return Parens($3.unwrap());
    })
  ],
  Block: [
    o('INDENT Body DEDENT', function(){
      return $2;
    }), o('INDENT      DEDENT', function(){
      return Lines();
    })
  ],
  Fun: [
    o('PARAM( ArgList OptComma )PARAM FUNC_ARROW Block', function(){
      return Fun($2, $6, $5);
    }), o('FUNC_ARROW Block', function(){
      return Fun([], $2, $1);
    })
  ],
  Array: [
    o('[ ArgList OptComma ]', function(){
      return Arr($2);
    })
  ],
  Key: [
    o('IDENTIFIER', function(){
      return Literal($1);
    }), o('STRNUM', function(){
      return Literal($1);
    }), o('Parenthetical'), o('ThisProperty')
  ],
  Property: [
    o('Key :        Expression', function(){
      return Assign($1.asKey(), $3, ':');
    }), o('Key : INDENT Expression DEDENT', function(){
      return Assign($1.asKey(), $4, ':');
    }), o('Key'), o('... Key', function(){
      return Splat($2);
    }), o('+-  Key', function(){
      return Assign($2.asKey(), Literal($1 === '+'), ':');
    }), o('Key LOGIC Expression', function(){
      return Op($2, $1, $3);
    }), o('COMMENT', function(){
      return Comment($1);
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
    }), o('KeySeq'), o('Properties , KeySeq', function(){
      return $1.concat($3);
    }), o('Properties OptComma TERMINATOR KeySeq', function(){
      return $1.concat($4);
    })
  ],
  KeySeq: [
    o('STRNUM STRNUM', function(){
      return [Literal($1), Literal($2)];
    }), o('KeySeq STRNUM', function(){
      return $1.concat;
    })
  ],
  Object: [
    o('{ Properties OptComma }', function(){
      return Obj($2);
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
    }), o('IfBlock ELSE Block', function(){
      return $1.addElse($3);
    })
  ],
  LoopHead: [
    o('FOR Assignable FOROF Expression', function(){
      return mix(new For, {
        name: $2,
        index: $3,
        source: $4
      });
    }), o('FOR Assignable FOROF Expression BY Expression', function(){
      return mix(new For, {
        name: $2,
        index: $3,
        source: $4,
        step: $6
      });
    }), o('FOR IDENTIFIER              FORIN Expression', function(){
      return mix(new For, {
        object: true,
        own: !$1,
        index: $2,
        source: $4
      });
    }), o('FOR IDENTIFIER , Assignable FORIN Expression', function(){
      return mix(new For, {
        object: true,
        own: !$1,
        index: $2,
        name: $4,
        source: $6
      });
    }), o('FOR IDENTIFIER FROM Expression', function(){
      return mix(new For, {
        index: $2,
        from: Literal(0),
        op: 'til',
        to: $4
      });
    }), o('FOR IDENTIFIER FROM Expression TO Expression', function(){
      return mix(new For, {
        index: $2,
        from: $4,
        op: $5,
        to: $6
      });
    }), o('FOR IDENTIFIER FROM Expression TO Expression BY Expression', function(){
      return mix(new For, {
        index: $2,
        from: $4,
        op: $5,
        to: $6,
        step: $8
      });
    }), o('WHILE Expression', function(){
      return new While($2, $1);
    }), o('FOR EVER', function(){
      return new While;
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
    o('Body'), o('Block TERMINATOR'), o('', function(){
      return Lines();
    })
  ]
};
operators = [['nonassoc', 'CREMENT'], ['left', '?'], ['right', 'UNARY'], ['left', 'MATH'], ['left', '+-'], ['left', 'SHIFT', 'IMPORT'], ['left', 'RELATION'], ['left', 'COMPARE'], ['left', 'LOGIC'], ['right', ':', 'ASSIGN', 'RETURN', 'THROW', 'EXTENDS', 'INDENT'], ['right', 'IF', 'ELSE', 'SWITCH', 'CASE', 'DEFAULT', 'CLASS', 'FORIN', 'FOROF', 'FROM', 'TO', 'BY'], ['left', 'POST_IF', 'FOR', 'WHILE']].reverse();
tokens = (function(){
  var _ref, _i, _ref2, _len, _j, _ref3, _len2, _results = [];
  for (name in _ref = bnf) {
    alternatives = _ref[name];
    for (_i = 0, _len = (_ref2 = alternatives).length; _i < _len; ++_i) {
      alt = _ref2[_i];
      alt[1] = "" + (name === 'Root' ? 'return' : '$$ =') + " " + alt[1] + ";";
      for (_j = 0, _len2 = (_ref3 = alt[0]).length; _j < _len2; ++_j) {
        token = _ref3[_j];
        if (!(token in bnf)) {
          _results.push(token);
        }
      }
    }
  }
  return _results;
}());
tokens = tokens.join(' ');
exports.parser = new (require('jison')).Parser({
  bnf: bnf,
  operators: operators,
  tokens: tokens,
  startSymbol: 'Root'
});