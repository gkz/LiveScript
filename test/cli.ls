# version
command-eq "-v", ["LiveScript version #{LiveScript.VERSION}"]

# eval print
command-eq "-pe '2 + 2'", [4]

# help
command-eq "-h", [/^Usage: lsc (.|\n)*Misc:(.|\n)*Output control:(.|\n)*Version/]
