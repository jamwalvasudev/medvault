# Build stage — Maven + Node in one image
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Install Node.js for the frontend build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Cache Maven dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Build (frontend-maven-plugin will install Node deps + build React)
COPY src src
COPY frontend frontend
RUN mvn package -q -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/medhistory.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
