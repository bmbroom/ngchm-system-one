FROM bmbroom/ngchm-rproxy-test:latest

MAINTAINER Bradley Broom <bmbroom@mdanderson.org>

ADD docroot /usr/share/ngchm/docroot

RUN echo /usr/local/tools/add-upstream-server chm:8080 chm >> /usr/local/tools/initproxydir && \
    echo /usr/local/tools/add-dyce-server dynjs:8080 dynjs >> /usr/local/tools/initproxydir

