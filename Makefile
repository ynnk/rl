.phony : build

build:
	echo

pdg:
	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	./spiderlex/jslib/padagraph_components
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/
	mkdir -p ./spiderlex/jslib/padagraph_components & cp ../padagraph/application/src/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

deploy:
	git pull
	cp spiderlex/js/* spiderlex/static/
	cp spiderlex/jsext/* spiderlex/static/
	cp -r spiderlex/jslib/* spiderlex/static/

