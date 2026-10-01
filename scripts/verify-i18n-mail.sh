#!/bin/sh
# Episode 39. Reproduces every figure the email and translations episode puts on screen.
# Real processes and a real (silent) TCP server standing in for SMTP; no containers needed.
#
#   ./scripts/verify-i18n-mail.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node           $(node -v)"
echo "@nestjs/i18n   $(node -p "require('./nestjs-api/probes/i18n-mail/node_modules/@nestjs/i18n/package.json').version")"
echo "@nestjs/core   $(node -p "require('./nestjs-api/probes/i18n-mail/node_modules/@nestjs/core/package.json').version") (the probe's own package)"
echo "nodemailer     $(node -p "require('./nestjs-api/probes/i18n-mail/node_modules/nodemailer/package.json').version")"
echo "spring boot    4.1.1, $(unzip -l spring-i18n-mail/target/spring-i18n-mail-probe-0.0.1-SNAPSHOT.jar 2>/dev/null | grep -o 'angus-mail-[0-9.]*[0-9]' | head -1)"
date -u +"run            %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-i18n-mail && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api/probes/i18n-mail && npm ci --silent && npx tsc -p tsconfig.json )
echo "=== Both: MessageSource and JavaMailSender, @nestjs/i18n and nodemailer, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/i18n-mail.mjs
