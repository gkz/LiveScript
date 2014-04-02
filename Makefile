default: all

SRC = $(shell find src -name "*.ls" -type f | sort)
LIB = $(SRC:src/%.ls=lib/%.js) lib/parser.js
LSC = bin/lsc
SLAKE = bin/slake
BROWSERIFY = node_modules/.bin/browserify
UGLIFYJS = node_modules/.bin/uglifyjs
ISTANBUL = node_modules/.bin/istanbul

lib:
	mkdir -p lib/

lib/parser.js: lib/grammar.js
	$(SLAKE) build:parser

lib/%.js: src/%.ls lib
	$(LSC) --output lib --bare --compile "$<"

browser:
	mkdir browser/

browser/livescript.js: $(LIB) browser scripts/preroll.ls
	{ ./scripts/preroll ; $(BROWSERIFY) -r ./lib/browser.js:LiveScript ; } > browser/livescript.js

browser/livescript-min.js:  browser/livescript.js
	$(UGLIFYJS) browser/livescript.js --mangle --comments "all" > browser/livescript-min.js

package.json: package.json.ls
	$(LSC) --compile package.json.ls

.PHONY: build build-browser install dev-install test coverage loc clean

all: build

build: $(LIB) package.json

build-browser: browser/livescript.js browser/livescript-min.js

install: build
	npm install -g .

dev-install: package.json
	npm install .

test: build
	$(SLAKE) test

coverage: build
	$(ISTANBUL) cover $(SLAKE) -- test

loc:
	wc --lines src/*

clean:
	rm -f ./*.js
	rm -rf lib
	rm -rf browser/*.js
	rm -rf coverage
	rm -f package.json
