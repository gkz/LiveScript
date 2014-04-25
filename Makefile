default: all

SRC = $(shell find src -name "*.ls" -type f | sort)
LIB = $(SRC:src/%.ls=lib/%.js) lib/parser.js
LSC = bin/lsc
BROWSERIFY = node_modules/.bin/browserify
UGLIFYJS = node_modules/.bin/uglifyjs
ISTANBUL = node_modules/.bin/istanbul

lib:
	mkdir -p lib/

lib/parser.js: lib/grammar.js
	./scripts/build-parser > lib/parser.js

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

.PHONY: build build-browser force full install dev-install test test-harmony coverage loc clean

all: build

build: $(LIB) package.json

build-browser: browser/livescript.js browser/livescript-min.js

force:
	make -B

full:
	make force && make force && make test && make coverage

install: build
	npm install -g .

dev-install: package.json
	npm install .

test: build
	./scripts/test

test-harmony: build
	node --harmony ./scripts/test

coverage: build
	$(ISTANBUL) cover ./scripts/test

loc:
	wc --lines src/*

clean:
	rm -f ./*.js
	rm -rf lib
	rm -rf browser/*.js
	rm -rf coverage
	rm -f package.json
