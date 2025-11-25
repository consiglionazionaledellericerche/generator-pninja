<p align="center">
  <img src="https://www.pninja.tech/assets/pninja_logo.svg" height="200">
</p>

# generator-pninja

<p align="center">
  Generate a full <strong>Laravel + React + Vite</strong> application from a single <strong>JDL model</strong>.
  <br>
  Backend + Frontend + Docker + Database — ready in seconds ⚡
</p>

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0"><img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue.svg"></a>
  <a href="https://github.com/giatro/generator-pninja"><img alt="GitHub Repo" src="https://img.shields.io/github/stars/giatro/generator-pninja?style=social"></a>
  <a href="https://badge.fury.io/js/generator-pninja"><img alt="npm version" src="https://badge.fury.io/js/generator-pninja.svg"></a>
  <a href="https://npm.chart.dev/generator-pninja?primary=sky&gray=cool&theme=dark"><img alt="Downloads" src="https://img.shields.io/npm/dm/generator-pninja.svg?label=Downloads"></a>
  <img alt="Node Support" src="https://img.shields.io/badge/node-%3E%3D22-green">
  <a href="https://snyk.io/test/npm/generator-pninja"><img alt="Known Vulnerabilities" src="https://snyk.io/test/npm/generator-pninja/badge.svg"></a>
  <a href="https://snyk.io/advisor/npm-package/generator-pninja"><img alt="Package Health" src="https://snyk.io/advisor/npm-package/generator-pninja/badge.svg"></a>
</p>

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE.txt](LICENSE.txt) file for details.

## What is PNinja?

**PNinja** is a Yeoman generator that allows you to build an entire stack application:

- **Backend:** Laravel (API)
- **Frontend:** React + Vite (SPA)
- **Database:** SQL (SQLite/MySQL/PostgreSQL/MariaDB)
- **Search engine:** Database, Algolia, Elasticsearch, Meilisearch, Typesense, Solr
- **Docker Compose**

All based on a **single JDL file** describing your domain!

## Installation

Install Yeoman and PNinja:

```bash
npm install -g yo generator-pninja
```

## Usage

**Create your entity definition file using JDL:**

```bash
touch entities.jdl # or any other name of your choice
```

and edit it using this guide:
https://www.jhipster.tech/jdl/intro/

**Run the generator:**

```bash
yo pninja
```

**Answer a few prompts** ... and you're ready ⚡

## What you get

```
my-app/
├── client/ # React + Vite app
├── docker/ # Docker compose
├── server/ # Laravel project
├── package.json # With commands
└── README.md
```

Fully wired together: auth, routing, forms, CRUD, migrations.

## Supported Technologies and Limitations

### Server Framework (PHP)

- [Laravel][laravel-url]

### Client Frameworks

- [React][react-url] + [Vite][vite-url]

### Databases

- [SQLite][sqlite-url], [MySQL][mysql-url], [MariaDB][mariadb-url], [PostgreSQL][postgresql-url]

### Authentication

- [Keycloak][keycloak-url]

### Search Engines

- [Algolia][algolia-url], [Elasticsearch][elasticsearch-url], [Meilisearch][meilisearch-url], [Typesense][typesense-url], [Solr][solr-url], Database

### Roadmap

- [Vue][vue-url] & [Angular][angular-url] support
- [SQL Server][sqlserver-url] & [Oracle][oracle-url] support
- Authentication improvements ([Laravel Sanctum][sanctum-url] / [OAuth2][oauth2-url])
- GitHub CI

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
[vite-url]: https://vite.dev/
