<p align="center">
  <img src="https://www.pninja.tech/assets/pninja_logo.svg" height="200">
</p>

# generator-pninja

Generate a full **Laravel + React + Vite** application from a single **JDL model**.
Backend + Frontend + Docker + Database – ready in seconds ⚡

[![License][license-badge]][license-url]
[![npm version][npm-version-badge]][npm-version-url]
[![Downloads][npmcharts-image]][npmcharts-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![GitHub version][gh-image]][gh-url]

## License

This project is licensed under the Apache License 2.0 – see the [LICENSE.txt](LICENSE.txt) file for details.

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

### Quick Start with JDL

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

### Interactive Entity Creation

For incremental development or to add entities to an existing project, use the **entity sub-generator**:

```bash
yo pninja:entity [EntityName]
```

This interactive command allows you to:

- Create new entities step by step
- Add or remove fields and relationships
- Update existing entities (regenerate, add, or remove)

All entity configurations are stored in `.pninja/<EntityName>.json` files.

## What you get

```
my-app/
├── client/         # React + Vite app
├── docker/         # Docker compose
├── server/         # Laravel project
├── .pninja/        # Entity configurations
├── package.json    # With commands
└── README.md
```

Fully wired together: auth, routing, forms, CRUD, migrations.

## Core Features

### Authentication & Authorization

- **Keycloak Integration** - Enterprise-grade authentication
- **ACL System (Casbin)** - Fine-grained access control with policies and roles
- **Role-based Permissions** - Manage user permissions across entities

### Data Management

- **Soft Delete Support** - Logical deletion with `deleted_at` timestamps (use `@softDelete` annotation in JDL)

```jdl
  @softDelete
  entity MyEntity {
    name String required
    description String
  }
```

- **CSV Database Seeding** - Populate your database from CSV files
- **Audit Logging** - Complete change tracking for all entity modifications
- **Interactive Entity Generator** - Create and modify entities through CLI prompts
- **Incremental Migrations** - Automatic database migrations for entity changes

### Search & Indexing

- **Multiple Search Engines** - Choose from Database, Algolia, Elasticsearch, Meilisearch, Typesense, or Solr
- **Laravel Scout Integration** - Seamless search engine configuration

### Accessibility & UX

- **WCAG 2.1 Level AA Compliance** - Built-in accessibility standards
- **React Aria Components** - Accessible form components out-of-the-box
- **Keyboard Navigation** - Full keyboard support for all interactions
- **Screen Reader Support** - Optimized for assistive technologies

### Internationalization

- **i18next Integration** - Multi-language support ready to use
- **RTL Support** - Right-to-left language compatibility

### Modern UI/UX

- **Responsive Design** - Mobile-first approach
- **Tailwind CSS** - Utility-first styling
- **Material Symbols Icons** - Associate icons to entities using `@icon` annotation in JDL

```jdl
  @icon("star")
  entity MyEntity {
    name String required
    description String
  }
```

- **Component Library** - Pre-built accessible components

### DevOps Ready

- **Docker Compose** - Full containerization support
- **Environment Configuration** - Easy setup for different environments
- **Database Migrations** - Version-controlled schema changes

## Supported Technologies and Limitations

### Server Framework (PHP)

- [Laravel][laravel-url]

### Client Frameworks

- [React][react-url] + [Vite][vite-url]

### Databases

- [SQLite][sqlite-url], [MySQL][mysql-url], [MariaDB][mariadb-url], [PostgreSQL][postgresql-url]

### Authentication

- [Keycloak][keycloak-url]

### Authorization

- [Casbin][casbin-url] - Policy-based access control

### Search Engines

- [Algolia][algolia-url], [Elasticsearch][elasticsearch-url], [Meilisearch][meilisearch-url], [Typesense][typesense-url], [Solr][solr-url], Database

### Frontend Libraries

- [Tailwind CSS][tailwind-url]
- [React Aria][react-aria-url] - Accessible component primitives
- [Material Symbols][material-symbols-url] - Icon library

### Internationalization

- [i18next][i18next-url]

## Roadmap

### Frontend Frameworks

- [Vue][vue-url] support
- [Angular][angular-url] support

### Database Support

- [SQL Server][sqlserver-url] support
- [Oracle][oracle-url] support

### Features

- **Multi-tenancy Support** - Isolated data per tenant
- **API Versioning** - Version management for APIs
- **Real-time Features** - WebSockets/Pusher integration
- **GraphQL Support** - Alternative API layer
- **Advanced Caching** - Redis integration with cache strategies

### DevOps

- **GitHub Actions CI/CD** - Automated testing and deployment
- **Kubernetes Support** - Container orchestration configs

### Authentication Enhancements

- [Laravel Sanctum][sanctum-url] - SPA authentication option
- Social Login (Google, GitHub, Facebook)

## GitHub Repository

The source code for **generator-pninja** is hosted on GitHub. You can access the official repository at the following link:

[Generator PNinja GitHub Repository](https://github.com/consiglionazionaledellericerche/generator-pninja)

## Contributing

Contributions are welcome! Feel free to open issues or pull requests on the [GitHub repository](https://github.com/consiglionazionaledellericerche/generator-pninja).

## Support

For issues, questions, or feature requests, please use the [GitHub Issues](https://github.com/consiglionazionaledellericerche/generator-pninja/issues) page.

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
[casbin-url]: https://casbin.org/
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
[tailwind-url]: https://tailwindcss.com/
[react-aria-url]: https://react-spectrum.adobe.com/react-aria/
[material-symbols-url]: https://fonts.google.com/icons
[i18next-url]: https://www.i18next.com/
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
