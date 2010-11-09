# The Coco language has a good deal of optional syntax, implicit syntax,
# and shorthand syntax. This can greatly complicate a grammar and bloat
# the resulting parse table. Instead of making the parser handle it all, we take
# a series of passes over the token stream, using this **Rewriter** to convert
# shorthand into the unambiguous long form, add implicit indentation and
# parentheses, balance incorrect nestings, and generally clean things up.

# The **Rewriter** is used by the [Lexer](lexer.html), directly against
# its internal array of tokens.

# Helpful snippet for debugging:
#     console.log (t[0] + '/' + t[1] for t in tokens).join ' '

# Rewrite the token stream in multiple passes, one logical filter at
# a time. This could certainly be changed into a single pass through the
# stream, with a big ol' efficient switch, but it's much nicer to work with
# like this. The order of these passes matters -- indentation must be
# corrected before implicit parentheses can be wrapped around blocks of code.
exports.rewrite = (tokens) ->
  removeLeadingNewlines       tokens
  removeMidExpressionNewlines tokens
  closeOpenings               tokens
  addImplicitIndentation      tokens
  tagPostfixConditionals      tokens
  addImplicitBraces           tokens
  addImplicitParentheses      tokens
  ensureBalance               tokens
  rewriteClosingParens        tokens
  tokens

detectEnd = (tokens, i, condition, action) ->
  levels = 0
  while token = tokens[i]
    return action token, i   if levels is 0 and condition token, i
    return action token, i-1 if levels <  0
    if token[0] of EXPRESSION_START
      ++levels
    else if token[0] of EXPRESSION_END
      --levels
    ++i
  i - 1

# Leading newlines would introduce an ambiguity in the grammar, so we
# dispatch them here.
removeLeadingNewlines = (tokens) ->
  break for [tag], i of tokens when tag isnt 'TERMINATOR'
  tokens.splice 0, i if i

# Some blocks occur in the middle of expressions -- when we're expecting
# this, remove their trailing newlines.
removeMidExpressionNewlines = (tokens) ->
  i = 0
  while token = tokens[++i]
  when tokens[i-1][0] is 'TERMINATOR' and token[0] of EXPRESSION_CLOSE
    tokens.splice i-1, 1
  this

# The lexer has tagged each of the opening parenthesis/bracket of
# a call/indexing. Match it with its closing pair.
closeOpenings = (tokens) ->
  stack = []
  for token of tokens
    switch token[0]
    case <[ INDEX_START CALL_START [ ( ]>
      stack.push token[0]
    case <[ INDEX_END ] ]>
      token[0] = 'INDEX_END' if stack.pop() is 'INDEX_START'
    case <[ CALL_END  ) ]>
      token[0] =  'CALL_END' if stack.pop() is  'CALL_START'
  this

# Object literals may be written with implicit braces, for simple cases.
# Insert the missing braces here, so that the parser doesn't have to.
addImplicitBraces = (tokens) ->
  condition = (token, i) ->
    one = tokens[i+1]?[0]
    return false if 'HERECOMMENT' of [one, tokens[i-1]?[0]]
    [tag] = token
    tag is ',' and
      one not of <[ IDENTIFIER STRNUM THISPROP TERMINATOR OUTDENT ( ]> or
    tag of <[ TERMINATOR OUTDENT ]> and tokens[i+2]?[0] not of <[ : ... ]>
  action = (token, i) -> tokens.splice i, 0, ['}', '}', token[2]]
  stack  = []
  i      = -1
  while token = tokens[++i]
    [tag] = token
    if tag of EXPRESSION_START
      tag = '{' if tag is 'INDENT' and tokens[i-1]?[0] is '{'
      stack.push [tag, i]
      continue
    if tag of EXPRESSION_END
      start = stack.pop()
      continue
    continue unless tag is ':'
    paren = tokens[i-1]?[0] is ')'
    continue unless \
      paren and tokens[start[1]-1]?[0] is ':' or  # a: (..):
      tokens[i-2]?[0] is ':' or                   # a: b:
      stack[ *-1]?[0] isnt '{'
    stack.push ['{']
    idx  = if paren then start[1] else i-1
    idx -= 2 if tokens[idx-2]?[0] is 'HERECOMMENT'
    tok  = ['{', '{', token[2]]
    tok.generated = true
    tokens.splice idx, 0, tok
    detectEnd tokens, i+2, condition, action
    ++i
  this

# Methods may be optionally called without parentheses, for simple cases.
# Insert the implicit parentheses here, so that the parser doesn't have to
# deal with them.
addImplicitParentheses = (tokens) ->
  classLine = seenSingle = false
  condition = (token, i) ->
    return true if not seenSingle and token.fromThen
    [tag] = token
    [pre] = tokens[i-1]
    seenSingle := true if tag of <[ IF ELSE FUNCTION ]>
    return true  if tag is 'ACCESS' and pre is 'OUTDENT'
    return false if token.generated or  pre is ','
    tag of <[ POST_IF FOR WHILE WHEN BY TO CASE DEFAULT TERMINATOR ]> or
    tag is 'INDENT' and pre not of <[ FUNCTION { [ , ]> and
      tokens[i-2]?[0] isnt 'CLASS' and
      not ((post = tokens[i+1]) and post.generated and post[0] is '{')
  action = (token, i) ->
    ++i if token[0] is 'OUTDENT'
    tokens.splice i, 0, ['CALL_END', ')', token[2]]
  i = -1
  while token = tokens[++i]
    [tag] = token
    prev  = tokens[i-1]
    classLine  = true if tag is 'CLASS'
    callObject = not classLine and tag is 'INDENT' and
                 prev and prev[0] of IMPLICIT_FUNC and
                 (next = tokens[i+1]) and next.generated and next[0] is '{'
    classLine  = false if tag of <[ TERMINATOR INDENT OUTDENT ]>
    token.call = true  if tag is '?' and prev and not prev.spaced
    continue unless callObject or
      prev?.spaced and (prev.call or prev[0] of IMPLICIT_FUNC) and
      (tag of IMPLICIT_CALL or
       tag is 'PLUS_MINUS' and not (token.spaced or token.eol))
    tokens.splice i++, 0, ['CALL_START', '(', token[2]]
    ++i if callObject
    seenSingle = false
    detectEnd tokens, i, condition, action
    prev[0] = 'FUNC_EXIST' if prev[0] is '?'
  this

# Because our grammar is LALR(1), it can't handle some single-line
# expressions that lack ending delimiters. The **Rewriter** adds the implicit
# blocks, so it doesn't need to. ')' can close a single-line block,
# but we need to make sure it's balanced.
addImplicitIndentation = (tokens) ->
  i = -1
  while token = tokens[++i]
    [tag] = token
    if tag is 'ELSE' and tokens[i-1]?[0] isnt 'OUTDENT'
      tokens.splice i, 0, indentation(token)...
      i += 1
      continue
    if tag is 'CATCH' and tokens[i+2]?[0] of <[ OUTDENT TERMINATOR FINALLY ]>
      tokens.splice i+2, 0, indentation(token)...
      i += 3
      continue
    if tag is 'TERMINATOR' and tokens[i+1]?[0] is 'THEN'
      tokens.splice i, 1
      [tag] = token = tokens[i]
    continue if (next = tokens[i+1]?[0]) is 'INDENT'
    continue unless tag of <[ FUNCTION THEN DEFAULT TRY FINALLY ]> or
                    tag is 'ELSE' and next isnt 'IF'
    [indent, outdent] = indentation token
    indent.fromThen   = true if tag is 'THEN'
    indent.generated  = outdent.generated = true
    tokens.splice i+1, 0, indent
    detectEnd tokens, i+2
    , (token, i) ->
      [t] = token
      t of <[ CATCH FINALLY OUTDENT CASE DEFAULT ]> or
      t is 'TERMINATOR' and token[1] isnt ';' or
      t is 'ELSE' and tag of <[ IF THEN ]>
    , (token, i) ->
      tokens.splice (if tokens[i-1][0] is ',' then i-1 else i), 0, outdent
    if tag is 'THEN' then tokens.splice i, 1 else ++i
  this

# Tag postfix conditionals as such, so that we can parse them with a
# different precedence.
tagPostfixConditionals = (tokens) ->
  condition = ([tag]) -> tag of <[ TERMINATOR INDENT ]>
  action    = ([tag]) -> token[0] = 'POST_IF' if tag isnt 'INDENT'
  for token, i of tokens when token[0] is 'IF'
    detectEnd tokens, i + 1, condition, action
  this

# Ensure that all listed pairs of tokens are correctly balanced throughout
# the course of the token stream.
ensureBalance = (tokens) ->
  levels = {}
  olines = {}
  for token of tokens
    [tag] = token
    for [open, close] of BALANCED_PAIRS
      levels[open] |= 0
      if tag is open
        olines[open] = token[2] if levels[open]++ is 0
      else if tag is close and --levels[open] < 0
        throw SyntaxError "too many #{token[1]} on line #{ token[2] + 1 }"
  for all open, level in levels when level > 0
    throw SyntaxError \
      "unclosed #{open} on line #{ olines[open] + 1 }"
  this

# We'd like to support syntax like this:
#
#     el.click((event) ->
#       el.hide())
#
# In order to accomplish this, move outdents that follow closing parens
# inwards, safely. The steps to accomplish this are:
#
# 1. Check that all paired tokens are balanced and in order.
# 2. Rewrite the stream with a stack: if you see an `EXPRESSION_START`, add it
#    to the stack. If you see an `EXPRESSION_END`, pop the stack and replace
#    it with the inverse of what we've just popped.
# 3. Keep track of "debt" for tokens that we manufacture, to make sure we end
#    up balanced in the end.
# 4. Be careful not to alter array or parentheses delimiters with overzealous
#    rewriting.
rewriteClosingParens = (tokens) ->
  stack = []
  debt  = {}
  debt[key] = 0 for all key in INVERSES
  i = -1
  while token = tokens[++i]
    [tag] = token
    if tag of EXPRESSION_START
      stack.push token
      continue
    continue unless tag of EXPRESSION_END
    if debt[inv = INVERSES[tag]] > 0
      --debt[inv]
      tokens.splice i--, 1
      continue
    [start] = stoken = stack.pop()
    continue if tag is end = INVERSES[start]
    ++debt[start]
    tok = [end, if start is 'INDENT' then stoken[1] else end]
    if tokens[i+2]?[0] is start
      stack.push stoken
      tokens.splice i+3, 0, tok
    else
      tokens.splice i  , 0, tok
  this

# Generate the indentation tokens, based on another token on the same line.
indentation = (token) -> [['INDENT', 2, token[2]], ['OUTDENT', 2, token[2]]]

# Constants
# ---------

# List of the token pairs that must be balanced.
BALANCED_PAIRS = [
  <[ ( ) ]>
  <[ [ ] ]>
  <[ { } ]>
  <[ INDENT OUTDENT ]>
  <[  CALL_START  CALL_END ]>
  <[ PARAM_START PARAM_END ]>
  <[ INDEX_START INDEX_END ]>
]

# The inverse mappings of `BALANCED_PAIRS` we're trying to fix up, so we can
# look things up from either end.
INVERSES = {}

# The tokens that signal the start/end of a balanced pair.
EXPRESSION_START = []
EXPRESSION_END   = []

for [left, rite] of BALANCED_PAIRS
  EXPRESSION_START.push INVERSES[rite] = left
  EXPRESSION_END  .push INVERSES[left] = rite

# Tokens that indicate the close of a clause of an expression.
EXPRESSION_CLOSE =
  EXPRESSION_END.concat<[ ELSE WHEN BY TO CATCH FINALLY CASE DEFAULT ]>

# Tokens that, if followed by an `IMPLICIT_CALL`, indicate a function invocation.
IMPLICIT_FUNC = <[ IDENTIFIER THISPROP SUPER THIS ) CALL_END ] INDEX_END ]>

# If preceded by an `IMPLICIT_FUNC`, indicates a function invocation.
IMPLICIT_CALL = <[
  IDENTIFIER THISPROP STRNUM LITERAL THIS UNARY CREMENT PARAM_START FUNCTION
  IF TRY SWITCH CLASS [ ( {
]>
