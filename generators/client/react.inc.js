import to from 'to-case';
import pluralize from 'pluralize';
import jclrz from 'json-colorz';
import ejs from 'ejs';
import { getModelRelatedEntities } from './utils/getModelRelatedEntities.js';
import { getModelForeignIds } from './utils/getModelForeignIds.js';
import { getEntityFillableProperties } from './utils/getEntityFillableProperties.js';

export async function createReactClient(that, parsedJDL) {
    const { entities, enums, relationships } = parsedJDL;
    const appName = that.config.get('name');

    that.spawnCommandSync('npm', ['create', 'vite@latest', 'client', '--', '--template', 'react-ts']);
    // that.spawnCommandSync('npm', ['i'], { cwd: 'client' });
    // that.spawnCommandSync('npm', ['install', 'dotenv'], { cwd: 'client' });
    // that.spawnCommandSync('npm', ['install', '-D', 'prettier', 'tailwindcss@3', 'postcss', 'autoprefixer'], { cwd: 'client' });
    // that.spawnCommandSync('npm', ['install', '@headlessui/react'], { cwd: 'client' });
    // that.spawnCommandSync('npx', ['tailwindcss', 'init', '-p'], { cwd: 'client' });
    // that.fs.copyTpl(that.templatePath("react/.env"), that.destinationPath(`client/.env`));

    that.fs.copyTpl(that.templatePath('react/.env'), that.destinationPath('client/.env'), {});
    that.fs.copyTpl(that.templatePath('react/.gitignore'), that.destinationPath('client/.gitignore'), {});

    that.fs.copyTpl(that.templatePath('react/eslint.config.js'), that.destinationPath('client/eslint.config.js'), {});
    that.fs.copyTpl(that.templatePath('react/index.html.ejs'), that.destinationPath('client/index.html'), { appName });
    that.fs.copyTpl(that.templatePath('react/package.json'), that.destinationPath('client/package.json'), {});
    that.fs.copyTpl(that.templatePath('react/package-lock.json'), that.destinationPath('client/package-lock.json'), {});
    that.fs.copyTpl(that.templatePath('react/postcss.config.js'), that.destinationPath('client/postcss.config.js'), {});
    that.fs.copyTpl(that.templatePath('react/tailwind.config.js'), that.destinationPath('client/tailwind.config.js'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.app.json'), that.destinationPath('client/tsconfig.app.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.json'), that.destinationPath('client/tsconfig.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.node.json'), that.destinationPath('client/tsconfig.node.json'), {});
    that.fs.copyTpl(that.templatePath('react/vite.config.ts'), that.destinationPath('client/vite.config.ts'), {});

    that.fs.copyTpl(that.templatePath("react/public/logo.svg"), that.destinationPath(`client/public/logo.svg`), {});
    that.fs.copyTpl(that.templatePath("react/public/keycloak.json"), that.destinationPath(`client/public/keycloak.json`), {});

    ['en', 'it', 'fr', 'de'].forEach(lang => {
        that.fs.copyTpl(that.templatePath(`react/public/locales/${lang}/translation.json.ejs`), that.destinationPath(`client/public/locales/${lang}/translation.json`), { appName, entities, relationships, to, pluralize, getModelForeignIds, getModelRelatedEntities });
    });

    that.fs.copyTpl(that.templatePath("react/src/App.css"), that.destinationPath(`client/src/App.css`), {});
    that.fs.copyTpl(that.templatePath("react/src/App.tsx.ejs"), that.destinationPath(`client/src/App.tsx`), { entities, to, pluralize });
    that.fs.copyTpl(that.templatePath("react/src/Dropdown.tsx"), that.destinationPath(`client/src/Dropdown.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/i18n.js"), that.destinationPath(`client/src/i18n.js`), {});
    that.fs.copyTpl(that.templatePath("react/src/index.css"), that.destinationPath(`client/src/index.css`), {});
    that.fs.copyTpl(that.templatePath("react/src/keycloak.tsx"), that.destinationPath(`client/src/keycloak.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/main.tsx"), that.destinationPath(`client/src/main.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/vite-env.d.ts"), that.destinationPath(`client/src/vite-env.d.ts`), {});

    that.fs.copyTpl(that.templatePath("react/src/assets/laravel-logo.svg"), that.destinationPath(`client/src/assets/laravel-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/logo.svg"), that.destinationPath(`client/src/assets/logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/mariadb-logo.svg"), that.destinationPath(`client/src/assets/mariadb-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/mysql-logo.svg"), that.destinationPath(`client/src/assets/mysql-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/pgsql-logo.svg"), that.destinationPath(`client/src/assets/pgsql-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/pninja-logo.svg"), that.destinationPath(`client/src/assets/pninja-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/presto.svg"), that.destinationPath(`client/src/assets/presto.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/react.svg"), that.destinationPath(`client/src/assets/react.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/sqlite-logo.svg"), that.destinationPath(`client/src/assets/sqlite-logo.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/vite.svg"), that.destinationPath(`client/src/assets/vite.svg`));
    that.fs.copyTpl(that.templatePath("react/src/assets/vue.svg"), that.destinationPath(`client/src/assets/vue.svg`));

    that.fs.copyTpl(that.templatePath("react/src/components/DarkModeToggle.tsx.ejs"), that.destinationPath(`client/src/components/DarkModeToggle.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/JsonPrint.tsx.ejs"), that.destinationPath(`client/src/components/JsonPrint.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LangSelect.tsx.ejs"), that.destinationPath(`client/src/components/LangSelect.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/LoginButton.tsx.ejs"), that.destinationPath(`client/src/components/LoginButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LogoutButton.tsx.ejs"), that.destinationPath(`client/src/components/LogoutButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/Menu.tsx.ejs"), that.destinationPath(`client/src/components/Menu.tsx`), { appName, entities, to, pluralize });
    that.fs.copyTpl(that.templatePath("react/src/components/SimpleLoader.tsx.ejs"), that.destinationPath(`client/src/components/SimpleLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/SimpleLoader.tsx.ejs"), that.destinationPath(`client/src/components/SimpleLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/TableSkeletonLoader.tsx.ejs"), that.destinationPath(`client/src/components/TableSkeletonLoader.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/pages/Home.tsx.ejs"), that.destinationPath(`client/src/pages/Home.tsx`), { dbms: that.config.get('dbms') });
    that.fs.copyTpl(that.templatePath("react/src/pages/Login.tsx.ejs"), that.destinationPath(`client/src/pages/Login.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err401.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err401.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err403.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err403.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err404.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err404.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/hooks/useAuthenticatedFetch.ts.ejs"), that.destinationPath(`client/src/hooks/useAuthenticatedFetch.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/hooks/userAutenticatedHelper.tsx.ejs"), that.destinationPath(`client/src/hooks/userAutenticatedHelper.tsx`), {});

    for (const entity of entities) {
        that.fs.copyTpl(
            that.templatePath("react/src/shared/model/entity.model.ts.ejs"),
            that.destinationPath(`client/src/shared/model/${to.slug(entity.name)}.model.ts`),
            {
                entity,
                enums,
                relationships,
                to,
                foreignIds: getModelForeignIds(entity, relationships),
                relatedEntities: getModelRelatedEntities(entity, relationships)
            });
    }

    for (const enumeration of enums) {
        that.fs.copyTpl(that.templatePath("react/src/shared/model/enumerations/enumeration.model.ts.ejs"), that.destinationPath(`client/src/shared/model/enumerations/${to.slug(enumeration.name)}.model.ts`), { enumeration });
    }

    for (const entity of entities) {
        that.fs.copyTpl(
            that.templatePath("react/src/pages/entities/Entity.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}.tsx`),
            {
                entity,
                to,
                pluralize,
                columns: entity.body.map(c => to.snake(c.name)),
                foreignIds: getModelForeignIds(entity, relationships),
            });
        that.fs.copyTpl(
            that.templatePath("react/src/pages/entities/EntityView.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}View.tsx`),
            {
                entity,
                to,
                pluralize,
                columns: entity.body.map(c => to.snake(c.name)),
                foreignIds: getModelForeignIds(entity, relationships),
            });
    }
    that.spawnCommandSync('npm', ['i'], { cwd: 'client' });
}
