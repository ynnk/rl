.phony : install build

make dev:
	make clean_
	printf %s\\n {venv3, install} | xargs -n 1 -P 8 make
	printf %s\\n {build,lnen,lnfr} | xargs -n 1 -P 8 make

venv3 :
	@echo "\n ---------------------------\n"
	@echo "\n# **setting up virtualenv with python 3 **\n"
	
	virtualenv -p python3 venv3;
	. venv3/bin/activate; pip install -r requirements.txt

install: npm bower

npm:
	@echo "\n ---------------------------\n"
	@echo "\n# ** Installing node modules **"

	npm install jade --save
	npm install bower --save

bower: 
	@echo "\n ---------------------------\n"
	@echo "\n# ** Installing bower requirements **\n"
	
	mkdir -p spiderlex/static
	rm -rf spiderlex/static/bower_components
	./node_modules/bower/bin/bower --allow-root install
	wget https://raw.githubusercontent.com/mrdoob/three.js/r76/build/three.min.js -O spiderlex/jsext/three.min.js






build: jade deploy version

jade:

	@echo "\n ---------------------------\n"
	@echo "\n# ** Building flask templates **\n"

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
	@echo "\n ---------------------------\n"
	@echo "\n# ** copying static files **\n"
	cp -rf bower_components/ spiderlex/static/
	cp -rf spiderlex/css spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/
	cp -rf spiderlex/polymer/* spiderlex/static/

version:
	@echo "\n ---------------------------\n"
	@echo "\n# ** release git version **\n"
	
	git log -n1 > spiderlex/static/version.txt



graphs:
	@echo "\n ---------------------------\n"
	
	@echo "\n# ** Downloading csv data [HOST trick]**\n"
	wget -q http://lexsys.atilf.fr/export/spiderlex.tgz

	@echo "\n# ** unpacking **\n"
	tar xzf spiderlex.tgz
	
	@echo "\n# ** Parsing csv export **\n"

	make lnfr lnen

lnfr: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnfr ../ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez

lnen: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnen ../ls-en-spiderlex/ --complete ../completedb_en.sqlite -s igraph -o ../lnen.picklez




rundev: 
	. venv3/bin/activate; export PYTHONPATH=$$PYTHONPATH:../parser; export APP_DEBUG=true; export FLASK_APP=lexnet_app.py ;export FLASK_DEBUG=1; cd spiderlex ; flask run 

clean :
	@echo "\n# **Cleaning install directories**"
	make clean_graphs clean_js clean_py

clean_js:
	@echo "\n* removing node modules\n"
	rm -rf ./bower_components
	rm -rf ./node_modules
	rm -f package-lock.json
	@echo "\n* removing js libs\n"
	rm -rf spiderlex/static

clean_py:
	@echo "\n* removing python virtualenv\n"
	rm -rf venv3

clean_graphs:
	@echo "\n* deleting generated data\n"
	rm -f completedb_fr.sqlite
	rm -f completedb_en.sqlite
	rm -f lnen.picklez
	rm -f lnfr.picklez
	
clean_data:
	rm -rf ls-fr-spiderlex
	rm -rf ls-en-spiderlex
	rm -f spiderlex*.tgz*


help:
	@cat README
