# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Install Node.js for the frontend build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw

# Cache Maven dependencies
RUN ./mvnw dependency:go-offline -q

COPY src src
COPY frontend frontend

RUN ./mvnw package -q -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/medhistory.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
