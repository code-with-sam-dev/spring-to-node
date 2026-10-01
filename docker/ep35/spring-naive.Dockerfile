# EPISODE 35. The Spring equivalent of the first attempt: build and run in the Maven image.
# Kept to measure against, not to use.
FROM maven:3.9-eclipse-temurin-25
WORKDIR /app
COPY . .
RUN mvn -B package -DskipTests
CMD ["sh", "-c", "java -jar target/*.jar"]
