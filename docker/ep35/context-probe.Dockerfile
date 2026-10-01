# EPISODE 35. Measures what the builder actually receives as context: copy all of it, count it.
FROM alpine:3.22
COPY . /ctx
RUN du -sm /ctx | cut -f1 > /context-mb && (ls -d /ctx/node_modules/@*/*darwin* /ctx/node_modules/*darwin* 2>/dev/null | wc -l) > /darwin-packages
