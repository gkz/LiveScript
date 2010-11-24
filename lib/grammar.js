(function(){
  var Parser, alt, alternatives, grammar, name, o, operators, token, tokens, unwrap;
  Parser = require('jison').Parser;
  unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
  o = function(patternString, action, options){
    var match;
    patternString = patternString.replace(/\s{2,}/g, ' ');
    if (!action) {
      return [patternString, '$$ = $1;', options];
    }
    action = (match = unwrap.exec(action)) ? match[1] : "(" + action + "())";
    action = action.replace(/\b(?:[A-Z]|mix\b)/g, 'yy.$&');
    return [patternString, "$$ = " + action + ";", options];
  };
  grammar = {
    Root: [
      o('', function(){
        return Expressions();
      }), o('Body'), o('Block TERMINATOR')
    ],
    Body: [
      o('Line', function(){
        return Expressions($1);
      }), o('Body TERMINATOR Line', function(){
        return $1.append($3);
      }), o('Body TERMINATOR')
    ],
    Line: [o('Expression'), o('Statement')],
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
    Expression: [
      o('Value'), o('Code'), o('FUNCTION Code', function(){
        return mix($2, {
          statement: true
        });
      }), o('FUNCTION IDENTIFIER Code', function(){
        return mix($3, {
          statement: true,
          name: $2
        });
      }), o('UNARY      Expression', function(){
        return Op($1, $2);
      }), o('PLUS_MINUS Expression', function(){
        return Op($1, $2);
      }, {
        prec: 'UNARY'
      }), o('CREMENT SimpleAssignable', function(){
        return Op($1, $2);
      }), o('SimpleAssignable CREMENT', function(){
        return Op($2, $1, null, true);
      }), o('Expression ?', function(){
        return Existence($1);
      }), o('Expression PLUS_MINUS Expression', function(){
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
        if ($2.charAt(0) === '!') {
          return Op($2.slice(1), $1, $3).invert();
        } else {
          return Op($2, $1, $3);
        }
      }), o('Assignable ASSIGN Expression', function(){
        return Assign($1, $3, $2);
      }), o('Assignable ASSIGN INDENT Expression OUTDENT', function(){
        return Assign($1, $4, $2);
      }), o('SimpleAssignable COMPOUND_ASSIGN\
       Expression', function(){
        return Assign($1, $3, $2);
      }), o('SimpleAssignable COMPOUND_ASSIGN\
       INDENT Expression OUTDENT', function(){
        return Assign($1, $4, $2);
      }), o('SimpleAssignable EXTENDS Expression', function(){
        return Extends($1, $3);
      }), o('LoopHead   Block', function(){
        return $1.addBody($2);
      }), o('Statement  LoopHead', function(){
        return $2.addBody(Expressions($1));
      }), o('Expression LoopHead', function(){
        return $2.addBody(Expressions($1));
      }), o('IfBlock'), o('Statement  POST_IF Expression', function(){
        return If($3, Expressions($1), {
          name: $2,
          statement: true
        });
      }), o('Expression POST_IF Expression', function(){
        return If($3, Expressions($1), {
          name: $2,
          statement: true
        });
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
      })
    ],
    OptExtends: [
      o('', function(){
        return null;
      }), o('EXTENDS Value', function(){
        return $2;
      })
    ],
    Block: [
      o('INDENT Body OUTDENT', function(){
        return $2;
      }), o('INDENT      OUTDENT', function(){
        return Expressions();
      })
    ],
    Identifier: [
      o('IDENTIFIER', function(){
        return Literal($1);
      })
    ],
    Literal: [
      o('STRNUM', function(){
        return Literal($1);
      }), o('THIS', function(){
        return Literal('this');
      }), o('LITERAL', function(){
        if ($1 === 'void') {
          return Op('void', Literal(8));
        } else {
          return Literal($1);
        }
      })
    ],
    AssignObj: [
      o('ObjAssignable', function(){
        return Value($1);
      }), o('ObjAssignable : Expression', function(){
        return Assign(Value($1), $3, ':');
      }), o('ObjAssignable :\
       INDENT Expression OUTDENT', function(){
        return Assign(Value($1), $4, ':');
      }), o('Identifier    ...', function(){
        return Splat($1);
      }), o('Parenthetical ...', function(){
        return Splat($1);
      }), o('ThisProperty'), o('HERECOMMENT', function(){
        return Comment($1);
      })
    ],
    ObjAssignable: [
      o('STRNUM', function(){
        return Literal($1);
      }), o('Identifier'), o('Parenthetical')
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
      }), o('ParamVar ASSIGN Expression', function(){
        return Param($1, $3);
      })
    ],
    ParamVar: [o('Identifier'), o('ThisProperty'), o('Array'), o('Object')],
    SimpleAssignable: [
      o('Identifier'), o('ThisProperty'), o('Value Accessor', function(){
        return $1.append($2);
      }), o('SUPER', function(){
        return Super();
      })
    ],
    Assignable: [o('SimpleAssignable'), o('Array'), o('Object')],
    Value: [
      o('Assignable', function(){
        return Value($1);
      }), o('Literal', function(){
        return Value($1);
      }), o('Parenthetical', function(){
        return Value($1);
      }), o('Value CALL_START                  CALL_END', function(){
        return Value(Call($1, [], $2));
      }), o('Value CALL_START ...              CALL_END', function(){
        return Value(Call($1, null, $2));
      }), o('Value CALL_START ArgList OptComma CALL_END', function(){
        return Value(Call($1, $3, $2));
      })
    ],
    Accessor: [
      o('ACCESS Identifier', function(){
        return Access($2, $1);
      }), o('INDEX_START Expression INDEX_END', function(){
        return Index($2, $1);
      })
    ],
    ThisProperty: [
      o('THISPROP', function(){
        return Value(Literal('this'), [Access(Literal($1))], 'this');
      })
    ],
    OptComma: [o(''), o(',')],
    Object: [
      o('{ AssignList OptComma }', function(){
        return Obj($2);
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
    Array: [
      o('[                  ]', function(){
        return Arr([]);
      }), o('[ ArgList OptComma ]', function(){
        return Arr($2);
      })
    ],
    ArgList: [
      o('Arg', function(){
        return [$1];
      }), o('ArgList , Arg', function(){
        return $1.concat($3);
      }), o('ArgList OptComma TERMINATOR Arg', function(){
        return $1.concat($4);
      }), o('INDENT ArgList OptComma OUTDENT', function(){
        return $2;
      }), o('ArgList OptComma INDENT ArgList OptComma OUTDENT', function(){
        return $1.concat($4);
      })
    ],
    Arg: [
      o('Expression'), o('Expression ...', function(){
        return Splat($1);
      })
    ],
    Parenthetical: [
      o('( Body )', function(){
        return Parens($2);
      }), o('( INDENT Body OUTDENT )', function(){
        return Parens($3);
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
      }), o('FOR EVER', function(){
        return While();
      }), o('WHILE Expression', function(){
        return While($2, $1);
      })
    ],
    Cases: [
      o('Case', function(){
        return [$1];
      }), o('Cases Case', function(){
        return $1.concat($2);
      })
    ],
    Case: [
      o('CASE SimpleArgs Block', function(){
        return Case($2, $3);
      })
    ],
    SimpleArgs: [
      o('Expression', function(){
        return [$1];
      }), o('SimpleArgs , Expression', function(){
        return $1.concat($3);
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
    ]
  };
  operators = [["left", "CALL_START", "CALL_END"], ["nonassoc", "CREMENT"], ["left", "?"], ["right", "UNARY"], ["left", "MATH"], ["left", "PLUS_MINUS"], ["left", "SHIFT"], ["left", "RELATION", "IMPORT"], ["left", "COMPARE"], ["left", "LOGIC"], ["nonassoc", "INDENT", "OUTDENT"], ["right", ":", "ASSIGN", "COMPOUND_ASSIGN", "RETURN", "THROW", "EXTENDS"], ["right", "IF", "ELSE", "SWITCH", "CASE", "DEFAULT", "CLASS", "FORIN", "FOROF", "FROM", "TO", "BY"], ["left", "POST_IF", "FOR", "WHILE"]];
  tokens = [];
  for (name in grammar) {
    alternatives = grammar[name];
    grammar[name] = (function(){
      var _i, _j, _len, _len2, _ref, _ref2, _results = [];
      for (_i = 0, _len = (_ref = alternatives).length; _i < _len; ++_i) {
        alt = _ref[_i];
        for (_j = 0, _len2 = (_ref2 = alt[0].split(' ')).length; _j < _len2; ++_j) {
          token = _ref2[_j];
          if (!grammar[token]) {
            tokens.push(token);
          }
        }
        if (name === 'Root') {
          alt[1] = "return " + alt[1];
        }
        _results.push(alt);
      }
      return _results;
    }());
  }
  exports.parser = new Parser({
    tokens: tokens.join(' '),
    bnf: grammar,
    operators: operators.reverse(),
    startSymbol: 'Root'
  });
}).call(this);
