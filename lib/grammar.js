(function(){
  var Parser, alt, alternatives, grammar, name, o, operators, token, tokens, unwrap, _i, _j, _len, _len2, _ref, _result;
  Parser = require('jison').Parser;
  unwrap = /^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/;
  o = function(patternString, action, options){
    var match;
    patternString = patternString.replace(/\s{2,}/g, ' ');
    if (!action) {
      return [patternString, '$$ = $1;', options];
    }
    action = (match = unwrap.exec(action)) ? match[1] : "(" + action + "())";
    action = action.replace(/\bnew\s/g, '$&yy.');
    action = action.replace(/\bextend\b/g, 'yy.$&');
    return [patternString, "$$ = " + action + ";", options];
  };
  grammar = {
    Root: [
      o('', function(){
        return new Expressions;
      }), o('TERMINATOR', function(){
        return new Expressions;
      }), o('Body'), o('Block TERMINATOR')
    ],
    Body: [
      o('Line', function(){
        return new Expressions($1);
      }), o('Body TERMINATOR Line', function(){
        return $1.append($3);
      }), o('Body TERMINATOR')
    ],
    Line: [o('Expression'), o('Statement')],
    Statement: [
      o('Comment'), o('Return'), o('Throw'), o('BREAK', function(){
        return new Literal($1);
      }), o('CONTINUE', function(){
        return new Literal($1);
      }), o('DEBUGGER', function(){
        return new Literal($1);
      })
    ],
    Expression: [o('Value'), o('Invocation'), o('Code'), o('Operation'), o('Assign'), o('If'), o('Try'), o('While'), o('For'), o('Switch'), o('Extends'), o('Class')],
    Block: [
      o('INDENT Body OUTDENT', function(){
        return $2;
      }), o('INDENT      OUTDENT', function(){
        return new Expressions;
      }), o('TERMINATOR Comment', function(){
        return new Expressions($2);
      })
    ],
    Identifier: [
      o('IDENTIFIER', function(){
        return new Literal($1);
      })
    ],
    AlphaNumeric: [
      o('STRNUM', function(){
        return new Literal($1);
      })
    ],
    Literal: [
      o('AlphaNumeric'), o('THIS', function(){
        return new Literal('this');
      }), o('LITERAL', function(){
        if ($1 === 'void') {
          return new Op('void', new Literal(0));
        } else {
          return new Literal($1);
        }
      })
    ],
    Assign: [
      o('Assignable  = Expression', function(){
        return new Assign($1, $3);
      }), o('Assignable  = INDENT Expression OUTDENT', function(){
        return new Assign($1, $4);
      }), o('Assignable := Expression', function(){
        return new Assign($1, $3, '=');
      }), o('Assignable := INDENT Expression OUTDENT', function(){
        return new Assign($1, $4, '=');
      })
    ],
    AssignObj: [
      o('ObjAssignable', function(){
        return new Value($1);
      }), o('ObjAssignable : Expression', function(){
        return new Assign(new Value($1), $3, ':');
      }), o('ObjAssignable :\
       INDENT Expression OUTDENT', function(){
        return new Assign(new Value($1), $4, ':');
      }), o('Identifier    ...', function(){
        return new Splat($1);
      }), o('Parenthetical ...', function(){
        return new Splat($1);
      }), o('ThisProperty'), o('Comment')
    ],
    ObjAssignable: [o('Identifier'), o('AlphaNumeric'), o('Parenthetical')],
    Return: [
      o('RETURN Expression', function(){
        return new Return($2);
      }), o('RETURN', function(){
        return new Return;
      })
    ],
    Comment: [
      o('HERECOMMENT', function(){
        return new Comment($1);
      })
    ],
    Code: [
      o('PARAM_START ParamList PARAM_END\
       FUNCTION Block', function(){
        return new Code($2, $5, $4);
      }), o('FUNCTION Block', function(){
        return new Code([], $2, $1);
      })
    ],
    OptComma: [o(''), o(',')],
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
        return new Param($1);
      }), o('ParamVar ...', function(){
        return new Param($1, null, true);
      }), o('ParamVar  =  Expression', function(){
        return new Param($1, $3);
      })
    ],
    ParamVar: [o('Identifier'), o('ThisProperty'), o('Array'), o('Object')],
    Splat: [
      o('Expression ...', function(){
        return new Splat($1);
      })
    ],
    SimpleAssignable: [
      o('Identifier', function(){
        return new Value($1);
      }), o('Value      Accessor', function(){
        return $1.append($2);
      }), o('Invocation Accessor', function(){
        return new Value($1, [$2]);
      }), o('ThisProperty')
    ],
    Assignable: [
      o('SimpleAssignable'), o('Array', function(){
        return new Value($1);
      }), o('Object', function(){
        return new Value($1);
      })
    ],
    Value: [
      o('Assignable'), o('Literal', function(){
        return new Value($1);
      }), o('Parenthetical', function(){
        return new Value($1);
      })
    ],
    Accessor: [
      o('ACCESS Identifier', function(){
        return new Accessor($2, $1);
      }), o('INDEX_START Expression INDEX_END', function(){
        return new Index($2, $1);
      })
    ],
    Object: [
      o('{ AssignList OptComma }', function(){
        return new Obj($2);
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
    Class: [
      o('CLASS SimpleAssignable', function(){
        return new Class($2);
      }), o('CLASS SimpleAssignable EXTENDS Value', function(){
        return new Class($2, $4);
      }), o('CLASS SimpleAssignable\
       INDENT ClassBody OUTDENT', function(){
        return new Class($2, null, $4);
      }), o('CLASS SimpleAssignable EXTENDS Value\
       INDENT ClassBody OUTDENT', function(){
        return new Class($2, $4, $6);
      }), o('CLASS INDENT ClassBody OUTDENT', function(){
        return new Class(null, null, $3);
      }), o('CLASS', function(){
        return new Class(null, null, new Expressions);
      }), o('CLASS EXTENDS Value', function(){
        return new Class(null, $3, new Expressions);
      }), o('CLASS EXTENDS Value\
       INDENT ClassBody OUTDENT', function(){
        return new Class(null, $3, $5);
      })
    ],
    ClassAssign: [
      o('AssignObj', function(){
        return $1;
      }), o('ThisProperty : Expression', function(){
        return new Assign(new Value($1), $3, 'this');
      }), o('ThisProperty : INDENT Expression OUTDENT', function(){
        return new Assign(new Value($1), $4, 'this');
      })
    ],
    ClassBody: [
      o('', function(){
        return [];
      }), o('ClassAssign', function(){
        return [$1];
      }), o('ClassBody TERMINATOR ClassAssign', function(){
        return $1.concat($3);
      }), o('{ ClassBody }', function(){
        return $2;
      })
    ],
    Extends: [
      o('SimpleAssignable EXTENDS Value', function(){
        return new Extends($1, $3);
      })
    ],
    Invocation: [
      o('Value      OptFuncExist Arguments', function(){
        return new Call($1, $3, $2);
      }), o('Invocation OptFuncExist Arguments', function(){
        return new Call($1, $3, $2);
      }), o('SUPER', function(){
        return new Call('super', [new Splat(new Literal('arguments'))]);
      }), o('SUPER Arguments', function(){
        return new Call('super', $2);
      })
    ],
    OptFuncExist: [
      o('', function(){
        return false;
      }), o('FUNC_EXIST', function(){
        return true;
      })
    ],
    Arguments: [
      o('CALL_START CALL_END', function(){
        return [];
      }), o('CALL_START ArgList OptComma CALL_END', function(){
        return $2;
      })
    ],
    ThisProperty: [
      o('THISPROP', function(){
        return new Value(new Literal('this'), [new Accessor(new Literal($1))], 'this');
      })
    ],
    Array: [
      o('[ ]', function(){
        return new Arr([]);
      }), o('[ ArgList OptComma ]', function(){
        return new Arr($2);
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
    Arg: [o('Expression'), o('Splat')],
    SimpleArgs: [
      o('Expression', function(){
        return [$1];
      }), o('SimpleArgs , Expression', function(){
        return $1.concat($3);
      })
    ],
    Try: [
      o('TRY Block', function(){
        return new Try($2);
      }), o('TRY Block Catch', function(){
        return new Try($2, $3[0], $3[1]);
      }), o('TRY Block FINALLY Block', function(){
        return new Try($2, null, null, $4);
      }), o('TRY Block Catch FINALLY Block', function(){
        return new Try($2, $3[0], $3[1], $5);
      })
    ],
    Catch: [
      o('CATCH Identifier Block', function(){
        return [$2, $3];
      })
    ],
    Throw: [
      o('THROW Expression', function(){
        return new Throw($2);
      })
    ],
    Parenthetical: [
      o('( Expression )', function(){
        return new Parens($2);
      })
    ],
    WhileSource: [
      o('WHILE Expression', function(){
        return new While($2, {
          name: $1
        });
      }), o('WHILE Expression WHEN Expression', function(){
        return new While($2, {
          name: $1,
          guard: $4
        });
      })
    ],
    While: [
      o('WhileSource Block', function(){
        return $1.addBody($2);
      }), o('Statement  WhileSource', function(){
        return $2.addBody(new Expressions($1));
      }), o('Expression WhileSource', function(){
        return $2.addBody(new Expressions($1));
      }), o('Loop', function(){
        return $1;
      })
    ],
    Loop: [
      o('LOOP Block', function(){
        return new While(new Literal(true)).addBody($2);
      }), o('LOOP Expression', function(){
        return new While(new Literal(true)).addBody(new Expressions($2));
      })
    ],
    For: [
      o('Statement  ForBody', function(){
        return new For($1, $2);
      }), o('Expression ForBody', function(){
        return new For($1, $2);
      }), o('ForBody    Block', function(){
        return new For($2, $1);
      })
    ],
    ForValue: [
      o('Identifier'), o('Array', function(){
        return new Value($1);
      }), o('Object', function(){
        return new Value($1);
      })
    ],
    ForIn: [
      o('FORIN Expression', function(){
        return {
          source: $2
        };
      }), o('FORIN Expression WHEN Expression', function(){
        return {
          source: $2,
          guard: $4
        };
      }), o('FORIN Expression BY Expression', function(){
        return {
          source: $2,
          step: $4
        };
      }), o('FORIN Expression BY Expression\
                        WHEN Expression', function(){
        return {
          source: $2,
          step: $4,
          guard: $6
        };
      })
    ],
    ForOf: [
      o('FOROF Expression', function(){
        return {
          object: true,
          source: $2
        };
      }), o('FOROF Expression WHEN Expression', function(){
        return {
          object: true,
          source: $2,
          guard: $4
        };
      })
    ],
    ForTo: [
      o('TO Expression', function(){
        return {
          op: $1,
          to: $2
        };
      }), o('TO Expression WHEN Expression', function(){
        return {
          op: $1,
          to: $2,
          guard: $4
        };
      }), o('TO Expression BY Expression', function(){
        return {
          op: $1,
          to: $2,
          step: $4
        };
      }), o('TO Expression BY Expression\
                     WHEN Expression', function(){
        return {
          op: $1,
          to: $2,
          step: $4,
          guard: $6
        };
      })
    ],
    ForBody: [
      o('FOR ForValue ForIn', function(){
        return extend($3, {
          name: $2
        });
      }), o('FOR ForValue , Identifier ForIn', function(){
        return extend($5, {
          name: $2,
          index: $4
        });
      }), o('FOR Identifier ForOf', function(){
        return extend($3, {
          index: $2
        });
      }), o('FOR ForValue , ForValue ForOf', function(){
        return extend($5, {
          index: $2,
          name: $4
        });
      }), o('FOR ALL Identifier ForOf', function(){
        return extend($4, {
          raw: true,
          index: $3
        });
      }), o('FOR ALL Identifier , ForValue ForOf', function(){
        return extend($6, {
          raw: true,
          index: $3,
          name: $5
        });
      }), o('FOR Identifier FROM Expression ForTo', function(){
        return extend($5, {
          index: $2,
          from: $4
        });
      })
    ],
    Switch: [
      o('SWITCH Expression Cases', function(){
        return new Switch($2, $3);
      }), o('SWITCH Expression Cases DEFAULT Block', function(){
        return new Switch($2, $3, $5);
      }), o('SWITCH Cases', function(){
        return new Switch(null, $2);
      }), o('SWITCH Cases DEFAULT Block', function(){
        return new Switch(null, $2, $4);
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
        return new Case($2, $3);
      })
    ],
    IfBlock: [
      o('IF Expression Block', function(){
        return new If($2, $3, {
          name: $1
        });
      }), o('IfBlock ELSE IF Expression Block', function(){
        return $1.addElse(new If($4, $5, {
          name: $3
        }));
      }), o('IfBlock ELSE Block', function(){
        return $1.addElse($3);
      })
    ],
    If: [
      o('IfBlock'), o('Statement  POST_IF Expression', function(){
        return new If($3, new Expressions($1), {
          name: $2,
          statement: true
        });
      }), o('Expression POST_IF Expression', function(){
        return new If($3, new Expressions($1), {
          name: $2,
          statement: true
        });
      })
    ],
    Operation: [
      o('UNARY      Expression', function(){
        return new Op($1, $2);
      }), o('PLUS_MINUS Expression', function(){
        return new Op($1, $2);
      }, {
        prec: 'UNARY'
      }), o('CREMENT SimpleAssignable', function(){
        return new Op($1, $2);
      }), o('SimpleAssignable CREMENT', function(){
        return new Op($2, $1, null, true);
      }), o('Expression ?', function(){
        return new Existence($1);
      }), o('Expression PLUS_MINUS Expression', function(){
        return new Op($2, $1, $3);
      }), o('Expression MATH       Expression', function(){
        return new Op($2, $1, $3);
      }), o('Expression SHIFT      Expression', function(){
        return new Op($2, $1, $3);
      }), o('Expression COMPARE    Expression', function(){
        return new Op($2, $1, $3);
      }), o('Expression LOGIC      Expression', function(){
        return new Op($2, $1, $3);
      }), o('Expression IMPORT     Expression', function(){
        return new Import($1, $3, $2);
      }), o('Expression RELATION   Expression', function(){
        if ($2.charAt(0) === '!') {
          return new Op($2.slice(1), $1, $3).invert();
        } else {
          return new Op($2, $1, $3);
        }
      }), o('SimpleAssignable COMPOUND_ASSIGN\
       Expression', function(){
        return new Assign($1, $3, $2);
      }), o('SimpleAssignable COMPOUND_ASSIGN\
       INDENT Expression OUTDENT', function(){
        return new Assign($1, $4, $2);
      })
    ]
  };
  operators = [["left", "CALL_START", "CALL_END"], ["nonassoc", "CREMENT"], ["left", "?"], ["right", "UNARY"], ["left", "MATH"], ["left", "PLUS_MINUS"], ["left", "SHIFT"], ["left", "RELATION", "IMPORT"], ["left", "COMPARE"], ["left", "LOGIC"], ["nonassoc", "INDENT", "OUTDENT"], ["right", ":", "=", ":=", "COMPOUND_ASSIGN", "RETURN"], ["right", "WHEN", "LEADING_WHEN", "FORIN", "FOROF", "FROM", "TO", "BY", "THROW", "IF", "UNLESS", "ELSE", "FOR", "WHILE", "LOOP", "SWITCH", "CASE", "DEFAULT", "SUPER", "CLASS", "EXTENDS"], ["right", "POST_IF"]];
  tokens = [];
  for (name in grammar) {
    alternatives = grammar[name];
    grammar[name] = (function(){
      _result = [];
      for (_i = 0, _len = alternatives.length; _i < _len; ++_i) {
        alt = alternatives[_i];
        _ref = alt[0].split(' ');
        for (_j = 0, _len2 = _ref.length; _j < _len2; ++_j) {
          token = _ref[_j];
          if (!grammar[token]) {
            tokens.push(token);
          }
        }
        if (name === 'Root') {
          alt[1] = "return " + alt[1];
        }
        _result.push(alt);
      }
      return _result;
    }());
  }
  exports.parser = new Parser({
    tokens: tokens.join(' '),
    bnf: grammar,
    operators: operators.reverse(),
    startSymbol: 'Root'
  });
}).call(this);
