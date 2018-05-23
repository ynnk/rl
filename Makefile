.phony : install build 


install:

	npm install jade --save
 

jade:

	@echo "\n ---------------------------"
	@echo " * Building flask templates"
	@echo " ---------------------------\n"

	#cd ./templates && pypugjs  *.jade
	cd ./spiderlex/templates && node ../../node_modules/jade/bin/jade.js -P *.jade


build: jade 

	cd ../padagraph/application/src && make polymer

	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/cello.* ./spiderlex/jslib/

	mkdir -p ./spiderlex/jslib/padagraph_components/
	cp ../padagraph/application/src/static/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

	cp -rf spiderlex/css spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/

help:
	@echo " --------------------------"
	
	@echo "\n   * Build:"
	@echo "\n   $$ make build "

	@echo "\n --------------------------"

	@echo "\n   * Parse export to graph:"
	@echo "\n   $$ cd parser; python parse.py lnfr ../exports/fr-ls-spiderlex/ --complete ../completedb_fr1804.sqlite -s igraph -o ../lnfr1804.picklez"
	
	@echo "\n --------------------------"

	@echo "\n   * Flask server:"
	@echo "\n   $$ cd spiderlex; export PYTHONPATH=$PYTHONPATH:../parser/ ; port APP_DEBUG=true;  python lexnet_app.py  --port 5002"

	@echo "\n --------------------------\n"