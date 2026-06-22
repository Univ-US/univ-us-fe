# Next.js Static Export 결과(out/)를 Apache httpd로 정적 서빙
FROM httpd:2.4

# 기존 기본 문서 제거 후 빌드 산출물 복사
RUN rm -rf /usr/local/apache2/htdocs/*
COPY out/ /usr/local/apache2/htdocs/

# 없는 경로 → Next 정적 export가 만든 커스텀 404 페이지(404.html) 서빙
RUN echo 'ErrorDocument 404 /404.html' >> /usr/local/apache2/conf/httpd.conf

EXPOSE 80