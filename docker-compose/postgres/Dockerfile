FROM postgres:17

# 필요한 패키지 및 pgvector 설치
RUN apt-get update && \
    apt-get install -y postgresql-server-dev-17 gcc make wget && \
    wget https://github.com/pgvector/pgvector/archive/refs/tags/v0.5.0.tar.gz && \
    tar -xzf v0.5.0.tar.gz && \
    cd pgvector-0.5.0 && \
    make && make install && \
    cd .. && rm -rf pgvector-0.5.0 v0.5.0.tar.gz && \
    apt-get remove -y gcc make wget && apt-get autoremove -y && apt-get clean

# 데이터 디렉토리 유지
VOLUME /var/lib/postgresql/data

# 기본 포트 노출
EXPOSE 5432
