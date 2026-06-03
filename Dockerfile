# Next.js Static Export 결과(out/)를 Apache httpd로 정적 서빙
FROM httpd:2.4

# 기존 기본 문서 제거 후 빌드 산출물 복사
RUN rm -rf /usr/local/apache2/htdocs/*
COPY out/ /usr/local/apache2/htdocs/

EXPOSE 80