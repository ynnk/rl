FROM ubuntu:latest as build

RUN apt-get update && apt-get -y install npm g++-7 make libxml2-dev python3 python3-pip npm git wget
COPY requirements.txt /usr/local/rl/
WORKDIR /usr/local/rl
RUN pip3 install -r requirements.txt
COPY . /usr/local/rl/
RUN make install && make build && mv bower_components spiderlex/static
WORKDIR /usr/local/rl/spiderlex
ENV PYTHONPATH /usr/local/rl/parser
RUN ls -al
CMD gunicorn --bind 0.0.0.0:80 lexnet_app:app
