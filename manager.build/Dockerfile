FROM bmbroom/ngchmmanagerdefault:latest

MAINTAINER Bradley Broom <bmbroom@mdanderson.org>

ADD chmManagerConfig /chmManagerConfig

# Temporary fix for permissions issue.
RUN mv /opt/glassfish3/glassfish/domains/domain1/config /opt/glassfish3/glassfish/domains/domain1/config-old && \
    mv /opt/glassfish3/glassfish/domains/domain1/config-old /opt/glassfish3/glassfish/domains/domain1/config

