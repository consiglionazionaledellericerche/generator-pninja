<p align="center">
  <img src="https://www.pninja.tech/assets/pninja_logo.svg" height="200">
</p>

# generator-pninja

Generate a full **Laravel + React + Vite** application from a single **JDL model**.
Backend + Frontend + Docker + Database — ready in seconds ⚡

[![License][license-badge]][license-url]
[![npm version][npm-version-badge]][npm-version-url]
[![Downloads][npmcharts-image]][npmcharts-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![GitHub version][gh-image]][gh-url]

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

## GitHub Repository

The source code for **generator-pninja** is hosted on GitHub. You can access the official repository at the following link:

[Generator PNinja GitHub Repository](https://github.com/consiglionazionaledellericerche/generator-pninja)

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
[gh-image]: https://badge.fury.io/gh/consiglionazionaledellericerche%2Fgenerator-pninja.svg
[gh-url]: https://badge.fury.io/gh/consiglionazionaledellericerche%2Fgenerator-pninja
