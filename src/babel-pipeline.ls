require! {
    './ast': lsASTDefs
    'babel-core/lib/api/browser': babel
}

lsNodeTypes =
    Object.keys lsASTDefs
    .filter (.match(/^[A-Z]+/)?)

# Makes an LS AST Node more readable, by:
#  - Adding a `type` field
#  - Adding a `loc` field and removing [column line first_column first_line last_column last_line]>
function simplifyLsNode lsNode
    simplifiedNode =
        __original: lsNode
        type: lsNode.constructor.name
        loc:
            start:
                column: lsNode.first_column
                line: lsNode.first_line
            end:
                column: lsNode.last_column
                line: lsNode.last_line

    for own key, val of lsNode
        continue if key in <[column line first_column first_line last_column last_line]>
        if Array.isArray val
            simplifiedNode[key] = val.map simplifyLsNode
        else if not val? or typeof val in <[string number boolean]>
            simplifiedNode[key] = val
        else if val.constructor.name in lsNodeTypes
            simplifiedNode[key] = simplifyLsNode val
        else
            throw "Not sure what to do with this pair"

    simplifiedNode


export function lsASTToBabelAST code
    rootLSNode = simplifyLsNode code

    # Apparently, the entire AST needs to be wrapped in a `File` node
    type: \File
    # We can worry about preserving comments later
    comments: []
    # Tokens aren't needed, unless some tool needs to look at them. So far, the
    # only tool that inspect tokens is ESLint, when the `indent` rule is enabled.
    tokens: []
    loc: rootLSNode.loc
    # not sure if we even need start/end fields
    start: null
    end: null
    program:
        type: \Program
        # could either be \file or \module. Let's just hard-code for \module for now
        sourceType: \module
        directives: []
        loc: rootLSNode.loc
        start: null
        end: null
        body: rootLSNode.lines.map lsNodeToBabelNode

lsNodeToBabelNode = (lsNode) ->
    {loc: lsNode.loc, ...convertorsByType[lsNode.type](lsNode)}

convertorsByType =
    Block: (lsNode) ->
        type: \BlockStatement
        body: lsNode.lines.map lsNodeToBabelNode

    Fun: (lsNode) ->
        node =
            type: \FunctionDeclaration
            id:
                type: \Identifier
                name: lsNode.name
                start: null
                end: null
                loc:
                    start: lsNode.loc.start
                    end:
                        column: lsNode.loc.start.column + lsNode.name.length
                        line: lsNode.loc.start.column
            generator: false
            expression: false
            params: lsNode.params.map ->
                type: \Identifier
                loc: it.loc
                start: null
                end: null
                name: it.value

            body: lsNode.body |> lsNodeToBabelNode

        node

    Binary: (lsNode) ->
        type: \BinaryExpression
        operator: lsNode.op
        left: lsNodeToBabelNode lsNode.first
        right: lsNodeToBabelNode lsNode.second

    Var: (lsNode) ->
        type: \Identifier
        name: lsNode.value

export function compile lsAst, code, opts
    ast = lsASTToBabelAST lsAst
    babel.transformFromAst ast, code, opts