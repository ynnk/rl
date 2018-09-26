FROM ubuntu:latest as build

RUN apt-get update && apt-get -y install npm g++-7 make libxml2-dev python3 python3-pip npm git wget
COPY requirements.txt /usr/local/rl/
WORKDIR /usr/local/rl
RUN pip3 install -r requirements.txt
COPY . /usr/local/rl/
RUN make install && make build && mv bower_components spiderlex/static

FROM ubuntu:latest
RUN apt-get update && apt-get -y --no-install-recommends install python3 libxml2
COPY --from=build /usr/local/rl /usr/local/rl/
COPY --from=build /usr/lib/python3.6 /usr/lib/python3.6
COPY --from=build /usr/lib/python3/dist-packages /usr/lib/python3/dist-packages/
COPY --from=build /usr/local/lib/python3.6/dist-packages /usr/local/lib/python3.6/dist-packages/
COPY --from=build /usr/local/bin/gunicorn* /usr/local/bin/

WORKDIR /usr/local/rl/spiderlex
ENV PYTHONPATH /usr/local/rl/parser
CMD gunicorn --bind 0.0.0.0:80 lexnet_app:app