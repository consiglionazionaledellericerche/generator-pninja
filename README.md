![Logo](https://www.pninja.tech/assets/pninja_logo.svg){height=300px}

# generator-pninja

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)]()
[![GitHub](https://img.shields.io/badge/GitHub-giatro-181717?logo=github)](https://github.com/giatro)

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE.txt](LICENSE.txt) file for details.

## How to use

Install Yeoman

```
npm install -g yo
```

Install PNinja

```
npm install -g generator-pninja
```

Generate the JDL file for the entities (see https://www.jhipster.tech/jdl/intro), for example `entities.jdl`, and save it in the project folder, e.g., `~/myproject`.

Run PNinja

```
yo pninja
```

When prompted, provide the name of the file containing the entity definitions.

<!-- ![Screenshot](screenshot-pninja.png) -->

## Supported Technologies and Limitations

### Server-side PHP Framework

- **Supported:**
  - [Laravel](https://laravel.com/)
- **In Development / Future:**
  - Not yet planned

### DBMS

- **Supported:**
  - [SQLite](https://www.sqlite.org/)
  - [MySQL](https://www.mysql.com/)
  - [MariaDB](https://mariadb.org/)
  - [PostgreSQL](https://www.postgresql.org/)
- **In Development / Future:**
  - [SQL Server](https://www.microsoft.com/en-us/sql-server)
  - [Oracle](https://www.oracle.com/database/)

### Package Managers

- **Supported:**
  - [Npm](https://www.npmjs.com/)
- **In Development / Future:**
  - [Yarn](https://yarnpkg.com/)

### Authentication Systems

- **Supported:**
  - [Keycloak](https://www.keycloak.org/)
- **In Development / Future:**
  - [Session-based authentication](https://laravel.com/docs/session) (Laravel session guard)
  - [Laravel Sanctum](https://laravel.com/docs/sanctum) (tokens for SPA/API)
  - [OAuth2](https://oauth.net/2/) / social login with external providers ([Google](https://developers.google.com/identity), [GitHub](https://github.com/settings/applications), [Facebook](https://developers.facebook.com/docs/facebook-login/), etc.)

### Client Frameworks

- **Supported:**
  - [React](https://reactjs.org/)
- **In Development / Future:**
  - [Vue](https://vuejs.org/)
  - [Angular](https://angular.io/)

### Search Engines

- **Supported:**
  - [Algolia](https://www.algolia.com/)
  - [Elasticsearch](https://www.elastic.co/)
  - [Meilisearch](https://www.meilisearch.com/)
  - [Typesense](https://typesense.org/)
  - [Solr](https://solr.apache.org/)
- **In Development / Future:**
  - Not yet planned

### Docker

- **Supported:**
  - [Docker Compose](https://docs.docker.com/compose/)
- **In Development / Future:**
  - Not yet planned
