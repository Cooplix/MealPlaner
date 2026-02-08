FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

ARG MAVEN_VERSION=3.9.6
ENV MAVEN_HOME=/opt/maven
ENV PATH=$MAVEN_HOME/bin:$PATH

RUN apt-get update \
  && apt-get install -y curl tar \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
    | tar -xzC /opt \
  && ln -s "/opt/apache-maven-${MAVEN_VERSION}" "$MAVEN_HOME"

COPY server-java/pom.xml ./
RUN mvn -q -e -DskipTests=true dependency:go-offline

COPY server-java/src ./src
RUN mvn -q -DskipTests=true package

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
