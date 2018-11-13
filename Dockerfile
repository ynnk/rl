FROM ubuntu:latest as build

RUN apt-get update && apt-get -y install g++-7 make libxml2-dev python3 python3-pip npm git wget curl unzip
WORKDIR /usr/local/rl

COPY requirements.txt ./
RUN pip3 install -r requirements.txt
COPY Makefile ./
RUN make yarn
COPY package.json  ./
RUN make install 
COPY . ./
RUN make build


FROM ubuntu:latest
RUN apt-get update && apt-get -y --no-install-recommends install python3 libxml2 cron supervisor wget
COPY --from=build /usr/lib/python3.6 /usr/lib/python3.6
COPY --from=build /usr/lib/python3/dist-packages /usr/lib/python3/dist-packages/
COPY --from=build /usr/local/lib/python3.6/dist-packages /usr/local/lib/python3.6/dist-packages/
COPY --from=build /usr/local/bin/gunicorn* /usr/local/bin/
COPY --from=build /usr/local/rl/parser /usr/local/rl/parser/
COPY --from=build /usr/local/rl/spiderlex /usr/local/rl/spiderlex/
COPY ./docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ./docker/spidercron /etc/cron.daily/
COPY ./docker/download.sh /usr/local
COPY ./docker/docker-entrypoint.sh /usr/local
RUN chmod +x /etc/cron.daily/spidercron && chmod +x /usr/local/docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/usr/local/docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
