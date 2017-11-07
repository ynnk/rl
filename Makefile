.phony : build

build:
	echo

pdg:
	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/

	mkdir -p ./spiderlex/jslib/padagraph_components/ & cp ../padagraph/application/src/static/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

deploy:
	#git pull
	cp -r spiderlex/css/* spiderlex/static/
	cp -r spiderlex/js/* spiderlex/static/
	cp -r spiderlex/jsext/* spiderlex/static/
	cp -r spiderlex/jslib/* spiderlex/static/

