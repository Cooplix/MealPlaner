FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y maven \
  && rm -rf /var/lib/apt/lists/*

COPY server-java/pom.xml ./
RUN mvn -q -e -DskipTests=true dependency:go-offline

COPY server-java/src ./src
RUN mvn -q -DskipTests=true package

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
