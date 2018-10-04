.phony : install build 



install: npm bower

npm:
	npm install jade --save
	npm install bower --save

bower: 
	@echo "\n --------------------------"
	@echo " * Installing js requirements with bower"
	@echo " --------------------------- \n"

	mkdir -p spiderlex/static
	rm -rf spiderlex/static/bower_components
	./node_modules/bower/bin/bower --allow-root install
	wget https://raw.githubusercontent.com/mrdoob/three.js/r76/build/three.min.js -O spiderlex/jsext/three.min.js






build: jade deploy

jade:

	@echo "\n ---------------------------"
	@echo " * Building flask templates"
	@echo " ---------------------------\n"

	#cd ./templates && pypugjs  *.jade
	cd ./spiderlex/templates && node ../../node_modules/jade/bin/jade.js -P *.jade

polymer:
	cd ../padagraph/application/src && make polymer

	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/cello.* ./spiderlex/jslib/

	mkdir -p ./spiderlex/jslib/padagraph_components/
	cp ../padagraph/application/src/static/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

deploy:
	cp -rf spiderlex/css spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/
	cp -rf spiderlex/polymer/* spiderlex/static/





graphs: lnfr lnen

lnfr: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnfr ../exports/ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez

lnen: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnen ../exports/ls-en-spiderlex/ --complete ../completedb_en.sqlite -s igraph -o ../lnen.picklez




rundev: 
	. venv3/bin/activate; export PYTHONPATH=$$PYTHONPATH:../parser; export APP_DEBUG=true; export FLASK_APP=lexnet_app.py ;export FLASK_DEBUG=1; cd spiderlex ; flask run 



help:
	@echo " --------------------------"
	
	@echo "\n   * INSTALL:"
	@echo "\n   $$ make install "

	@echo "\n --------------------------"
	
	@echo "\n   * Build:"
	@echo "\n   $$ make build "

	@echo "\n --------------------------"

	@echo "\n   * Parse export to graph:"
	@echo "\n   $$ make graphs "
	@echo "\n   $$ #or manual cmd "
	@echo "\n   $$ cd parser; python parse.py lnfr ../exports/ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez"
	
	@echo "\n --------------------------"

	@echo "\n   * Flask server FOR DEVELOPPEMENT ONLY :"
	@echo "\n   $$ make rundev"
	@echo "\n   $$ #or manual cmd "
	@echo "\n   $$ cd spiderlex; export PYTHONPATH=$PYTHONPATH:../parser/ ; port APP_DEBUG=true;  python lexnet_app.py  --port 5002"

	@echo "\n --------------------------\n"
