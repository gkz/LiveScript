(function(){
  var alt, alternatives, grammar, name, o, operators, token, tokens, unwrap;
  unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
  o = function(patterns, action, options){
    var match;
    patterns = patterns.trim().split(/\s+/);
    if (!action) {
      return [patterns, '$1', options];
    }
    action = (match = unwrap.exec(action))
      ? match[1]
      : "(" + action + "())";
    action = action.replace(/\b(?:[A-Z]|mix\b)/g, 'yy.$&');
    return [patterns, action, options];
  };
  grammar = {
    Assignable: [o('SimpleAssignable'), o('Array'), o('Object')],
    Value: [
      o('Assignable', function(){
        return Value($1);
      }), o('STRNUM', function(){
        return Value(Literal($1));
      }), o('Parenthetical', function(){
        return Value($1);
      }), o('THIS', function(){
        return Value(Literal('this'));
      }), o('LITERAL', function(){
        return Value(Literal($1));
      }), o('Value CALL_START ArgList OptComma CALL_END', function(){
        return Value(Call($1, $3, $2));
      }), o('Value CALL_START ...              CALL_END', function(){
        return Value(Call($1, null, $2));
      })
    ],
    SimpleAssignable: [
      o('IDENTIFIER', function(){
        return Literal($1);
      }), o('Value ACCESS IDENTIFIER', function(){
        return $1.append(Access(Literal($3), $2));
      }), o('Value INDEX_START Expression INDEX_END', function(){
        return $1.append(Index($3, $2));
      }), o('ThisProperty'), o('SUPER', function(){
        return Super();
      })
    ],
    Expression: [
      o('Value'), o('Expression PLUS_MINUS Expression', function(){
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
        return Import($1, $3, $2);
      }), o('Expression RELATION   Expression', function(){
        return $2.charAt(0) === '!'
          ? Op($2.slice(1), $1, $3).invert()
          : Op($2, $1, $3);
      }), o('UNARY      Expression', function(){
        return Op($1, $2);
      }), o('PLUS_MINUS Expression', function(){
        return Op($1, $2);
      }, {
        prec: 'UNARY'
      }), o('Expression ?', function(){
        return Existence($1);
      }), o('Assignable       ASSIGN          Expression', function(){
        return Assign($1, $3, $2);
      }), o('SimpleAssignable COMPOUND_ASSIGN Expression', function(){
        return Assign($1, $3, $2);
      }), o('CREMENT SimpleAssignable', function(){
        return Op($1, $2);
      }), o('SimpleAssignable CREMENT', function(){
        return Op($2, $1, null, true);
      }), o('Code'), o('FUNCTION Code', function(){
        return mix($2, {
          statement: true
        });
      }), o('FUNCTION IDENTIFIER Code', function(){
        return mix($3, {
          statement: true,
          name: $2
        });
      }), o('IfBlock'), o('Statement  POST_IF Expression', function(){
        return If($3, Lines($1), {
          name: $2,
          statement: true
        });
      }), o('Expression POST_IF Expression', function(){
        return If($3, Lines($1), {
          name: $2,
          statement: true
        });
      }), o('LoopHead   Block', function(){
        return $1.addBody($2);
      }), o('Statement  LoopHead', function(){
        return $2.addBody(Lines($1));
      }), o('Expression LoopHead', function(){
        return $2.addBody(Lines($1));
      }), o('SWITCH Expression Cases', function(){
        return Switch($2, $3);
      }), o('SWITCH Expression Cases DEFAULT Block', function(){
        return Switch($2, $3, $5);
      }), o('SWITCH Cases', function(){
        return Switch(null, $2);
      }), o('SWITCH Cases DEFAULT Block', function(){
        return Switch(null, $2, $4);
      }), o('TRY Block', function(){
        return Try($2);
      }), o('TRY Block CATCH IDENTIFIER Block', function(){
        return Try($2, $4, $5);
      }), o('TRY Block                        FINALLY Block', function(){
        return Try($2, null, null, $4);
      }), o('TRY Block CATCH IDENTIFIER Block FINALLY Block', function(){
        return Try($2, $4, $5, $7);
      }), o('CLASS OptExtends', function(){
        return Class(null, $2);
      }), o('CLASS OptExtends Block', function(){
        return Class(null, $2, $3);
      }), o('CLASS SimpleAssignable OptExtends', function(){
        return Class($2, $3);
      }), o('CLASS SimpleAssignable OptExtends Block', function(){
        return Class($2, $3, $4);
      }), o('SimpleAssignable EXTENDS Expression', function(){
        return Extends($1, $3);
      })
    ],
    Body: [
      o('Expression', function(){
        return Lines($1);
      }), o('Statement', function(){
        return Lines($1);
      }), o('Body TERMINATOR Expression', function(){
        return $1.append($3);
      }), o('Body TERMINATOR Statement', function(){
        return $1.append($3);
      }), o('Body TERMINATOR')
    ],
    OptComma: [o(''), o(',')],
    Arg: [
      o('Expression'), o('Expression ...', function(){
        return Splat($1);
      }), o('... Expression', function(){
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
      }), o('ArgList OptComma INDENT ArgList OptComma OUTDENT', function(){
        return $1.concat($4);
      })
    ],
    Array: [
      o('[ ArgList OptComma ]', function(){
        return Arr($2);
      })
    ],
    ThisProperty: [
      o('THISPROP', function(){
        return Value(Literal('this'), [Access(Literal($1))], 'this');
      })
    ],
    Parenthetical: [
      o('( Body )', function(){
        return Parens($2);
      }), o('( INDENT Body OUTDENT )', function(){
        return Parens($3);
      })
    ],
    Statement: [
      o('RETURN', function(){
        return Return();
      }), o('RETURN Expression', function(){
        return Return($2);
      }), o('THROW  Expression', function(){
        return Throw($2);
      }), o('STATEMENT', function(){
        return Literal($1);
      }), o('HERECOMMENT', function(){
        return Comment($1);
      })
    ],
    Block: [
      o('INDENT Body OUTDENT', function(){
        return $2;
      }), o('INDENT      OUTDENT', function(){
        return Lines();
      })
    ],
    Code: [
      o('PARAM_START ParamList PARAM_END\
       FUNC_ARROW Block', function(){
        return Code($2, $5, $4);
      }), o('FUNC_ARROW Block', function(){
        return Code([], $2, $1);
      })
    ],
    ParamList: [
      o('', function(){
        return [];
      }), o('Param', function(){
        return [$1];
      }), o('ParamList , Param', function(){
        return $1.concat($3);
      })
    ],
    Param: [
      o('ParamVar', function(){
        return Param($1);
      }), o('ParamVar ...', function(){
        return Param($1, null, true);
      }), o('... ParamVar', function(){
        return Param($2, null, true);
      }), o('ParamVar ASSIGN Expression', function(){
        return Param($1, $3);
      })
    ],
    ParamVar: [
      o('IDENTIFIER', function(){
        return Literal($1);
      }), o('ThisProperty'), o('Array'), o('Object')
    ],
    ObjAssignable: [
      o('IDENTIFIER', function(){
        return Literal($1);
      }), o('STRNUM', function(){
        return Literal($1);
      }), o('Parenthetical'), o('ThisProperty')
    ],
    AssignObj: [
      o('ObjAssignable :        Expression', function(){
        return Assign($1, $3, ':');
      }), o('ObjAssignable : INDENT Expression OUTDENT', function(){
        return Assign($1, $4, ':');
      }), o('ObjAssignable', function(){
        return $1;
      }), o('ObjAssignable ...', function(){
        return Splat($1);
      }), o('... ObjAssignable', function(){
        return Splat($1);
      }), o('HERECOMMENT', function(){
        return Comment($1);
      })
    ],
    AssignList: [
      o('', function(){
        return [];
      }), o('AssignObj', function(){
        return [$1];
      }), o('AssignList , AssignObj', function(){
        return $1.concat($3);
      }), o('AssignList OptComma TERMINATOR AssignObj', function(){
        return $1.concat($4);
      }), o('AssignList OptComma INDENT AssignList OptComma OUTDENT', function(){
        return $1.concat($4);
      })
    ],
    Object: [
      o('{ AssignList OptComma }', function(){
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
      o('FOR Assignable              FOROF Expression', function(){
        return mix(For(), {
          name: $2,
          source: $4
        });
      }), o('FOR Assignable , IDENTIFIER FOROF Expression', function(){
        return mix(For(), {
          name: $2,
          index: $4,
          source: $6
        });
      }), o('FOR Assignable              FOROF Expression BY Expression', function(){
        return mix(For(), {
          name: $2,
          source: $4,
          step: $6
        });
      }), o('FOR Assignable , IDENTIFIER FOROF Expression BY Expression', function(){
        return mix(For(), {
          name: $2,
          index: $4,
          source: $6,
          step: $8
        });
      }), o('FOR IDENTIFIER              FORIN Expression', function(){
        return mix(For(), {
          object: true,
          own: !$1,
          index: $2,
          source: $4
        });
      }), o('FOR Assignable , Assignable FORIN Expression', function(){
        return mix(For(), {
          object: true,
          own: !$1,
          index: $2,
          name: $4,
          source: $6
        });
      }), o('FOR IDENTIFIER FROM Expression TO Expression', function(){
        return mix(For(), {
          index: $2,
          from: $4,
          op: $5,
          to: $6
        });
      }), o('FOR IDENTIFIER FROM Expression TO Expression BY Expression', function(){
        return mix(For(), {
          index: $2,
          from: $4,
          op: $5,
          to: $6,
          step: $8
        });
      }), o('WHILE Expression', function(){
        return While($2, $1);
      }), o('FOR EVER', function(){
        return While();
      })
    ],
    Cases: [
      o('CASE SimpleArgs Block', function(){
        return [Case($2, $3)];
      }), o('Cases CASE SimpleArgs Block', function(){
        return $1.concat(Case($3, $4));
      })
    ],
    SimpleArgs: [
      o('Expression', function(){
        return [$1];
      }), o('SimpleArgs , Expression', function(){
        return $1.concat($3);
      })
    ],
    OptExtends: [
      o('', function(){
        return null;
      }), o('EXTENDS Value', function(){
        return $2;
      })
    ],
    Root: [
      o('', function(){
        return Lines();
      }), o('Body'), o('Block TERMINATOR')
    ]
  };
  operators = [['nonassoc', 'CREMENT'], ['left', '?'], ['right', 'UNARY'], ['left', 'MATH'], ['left', 'PLUS_MINUS'], ['left', 'SHIFT'], ['left', 'RELATION', 'IMPORT'], ['left', 'COMPARE'], ['left', 'LOGIC'], ['right', ':', 'ASSIGN', 'COMPOUND_ASSIGN', 'RETURN', 'THROW', 'EXTENDS', 'INDENT'], ['right', 'IF', 'ELSE', 'SWITCH', 'CASE', 'DEFAULT', 'CLASS', 'FORIN', 'FOROF', 'FROM', 'TO', 'BY'], ['left', 'POST_IF', 'FOR', 'WHILE']];
  tokens = (function(){
    var _i, _j, _len, _len2, _ref, _ref2, _ref3, _results = [];
    for (name in _ref = grammar) {
      alternatives = _ref[name];
      for (_i = 0, _len = (_ref2 = alternatives).length; _i < _len; ++_i) {
        alt = _ref2[_i];
        alt[1] = "" + (name === 'Root' ? 'return' : '$$ =') + " " + alt[1] + ";";
        for (_j = 0, _len2 = (_ref3 = alt[0]).length; _j < _len2; ++_j) {
          token = _ref3[_j];
          if (!(token in grammar)) {
            _results.push(token);
          }
        }
      }
    }
    return _results;
  }());
  exports.parser = new require('jison').Parser({
    tokens: tokens.join(' '),
    bnf: grammar,
    operators: operators.reverse(),
    startSymbol: 'Root'
  });
}).call(this);
