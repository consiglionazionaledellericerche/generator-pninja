![Logo][pninja-logo]{height=300px}

# generator-pninja

[![License][license-badge]][license-url]
[![GitHub][github-badge]][github-url]
[![npm version][npm-version-badge]][npm-version-url]
[![Downloads][npmcharts-image]][npmcharts-url]
[![Known Vulnerabilities][snyk-image]][snyk-url] [![Package Health][health-image]][health-url]

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE.txt](LICENSE.txt) file for details.

## How to use

Install Yeoman and PNinja

```
npm install -g yo
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
  - [Laravel][laravel-url]
- **In Development / Future:**
  - Not yet planned

### DBMS

- **Supported:**
  - [SQLite][sqlite-url]
  - [MySQL][mysql-url]
  - [MariaDB][mariadb-url]
  - [PostgreSQL][postgresql-url]
- **In Development / Future:**
  - [SQL Server][sqlserver-url]
  - [Oracle][oracle-url]

### Package Managers

- **Supported:**
  - [Npm][npm-url]
- **In Development / Future:**
  - [Yarn][yarn-url]

### Authentication Systems

- **Supported:**
  - [Keycloak][keycloak-url]
- **In Development / Future:**
  - [Session-based authentication][session-auth-url] (Laravel session guard)
  - [Laravel Sanctum][sanctum-url] (tokens for SPA/API)
  - [OAuth2][oauth2-url] / social login with external providers ([Google][google-login-url], [GitHub][github-login-url], [Facebook][facebook-login-url])

### Client Frameworks

- **Supported:**
  - [React][react-url]
- **In Development / Future:**
  - [Vue][vue-url]
  - [Angular][angular-url]

### Search Engines

- **Supported:**
  - [Algolia][algolia-url]
  - [Elasticsearch][elasticsearch-url]
  - [Meilisearch][meilisearch-url]
  - [Typesense][typesense-url]
  - [Solr][solr-url]
- **In Development / Future:**
  - Not yet planned

### Docker

- **Supported:**
  - [Docker Compose][docker-compose-url]
- **In Development / Future:**
  - Not yet planned

[laravel-url]: https://laravel.com/
[sqlite-url]: https://www.sqlite.org/
[mysql-url]: https://www.mysql.com/
[mariadb-url]: https://mariadb.org/
[postgresql-url]: https://www.postgresql.org/
[sqlserver-url]: https://www.microsoft.com/en-us/sql-server
[oracle-url]: https://www.oracle.com/database/
[npm-url]: https://www.npmjs.com/
[yarn-url]: https://yarnpkg.com/
[keycloak-url]: https://www.keycloak.org/
[session-auth-url]: https://laravel.com/docs/session
[sanctum-url]: https://laravel.com/docs/sanctum
[oauth2-url]: https://oauth.net/2/
[google-login-url]: https://developers.google.com/identity
[github-login-url]: https://github.com/settings/applications
[facebook-login-url]: https://developers.facebook.com/docs/facebook-login/
[react-url]: https://reactjs.org/
[vue-url]: https://vuejs.org/
[angular-url]: https://angular.io/
[algolia-url]: https://www.algolia.com/
[elasticsearch-url]: https://www.elastic.co/
[meilisearch-url]: https://www.meilisearch.com/
[typesense-url]: https://typesense.org/
[solr-url]: https://solr.apache.org/
[docker-compose-url]: https://docs.docker.com/compose/
[license-badge]: https://img.shields.io/badge/License-Apache_2.0-blue.svg
[license-url]: https://opensource.org/licenses/Apache-2.0
[github-badge]: https://img.shields.io/badge/GitHub-giatro-181717?logo=github
[github-url]: https://github.com/giatro
[npm-version-badge]: https://badge.fury.io/js/generator-pninja.svg
[npm-version-url]: https://badge.fury.io/js/generator-pninja
[pninja-logo]: https://www.pninja.tech/assets/pninja_logo.svg
[npmcharts-image]: https://img.shields.io/npm/dm/generator-pninja.svg?label=Downloads&style=flat
[npmcharts-url]: https://npm.chart.dev/generator-pninja?primary=sky&gray=cool&theme=dark
[snyk-image]: https://snyk.io/test/npm/generator-pninja/badge.svg
[snyk-url]: https://snyk.io/test/npm/generator-pninja
[health-image]: https://snyk.io/advisor/npm-package/generator-pninja/badge.svg
[health-url]: https://snyk.io/advisor/npm-package/generator-pninja
