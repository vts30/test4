# docker build --pull --no-cache --build-arg PROXY="http://campus-proxy.rz.bankenit.de:8888" --platform=linux/amd64 -t registry-int.rz.bankenit.de/atruvia-banken-images/forumsuite:latest .

FROM registry-int.rz.bankenit.de/atruvia-banken-images/builder-base:latest AS BUILDER

ARG PROXY="http://server-proxy.pka.bankenit.de:1080"
ENV HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY http_proxy=$PROXY https_proxy=$PROXY

RUN yumdownloader $YUM_OPTS --releasever=8 --destdir=/build/rpm --installroot=/build/tmp1 -x '*i686' --resolve fontconfig && \
    sh /build/scripts/unpackRPM.sh

FROM registry-int.rz.bankenit.de/atruvia-banken-images/jre-21:latest

COPY --from=BUILDER --chown=root:root /build/root /

USER root
RUN mkdir -pv /forumsuite/config
WORKDIR /forumsuite

COPY ./FORUM_Suite*.jar /forumsuite/
COPY ./entrypoint.sh /forumsuite/entrypoint.sh
RUN chmod 555 /forumsuite/FORUM_Suite*.jar /forumsuite/entrypoint.sh && \
    chown -R 777 /usr/share/fonts

# JVM tuning — override per environment (Dev/Test/Prod) via Helm values.yaml or docker run -e
ENV JAVA_XMX=4G
ENV JAVA_XMS=512M
ENV JAVA_GC_OPTS="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
ENV JAVA_EXTRA_OPTS=""

EXPOSE 8080

ENTRYPOINT ["/bin/bash", "/forumsuite/entrypoint.sh"]
