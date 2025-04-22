import to from 'to-case';
import pluralize from 'pluralize';
import { getModelRelatedEntities } from './utils/getModelRelatedEntities.js';
import { getModelForeignIds } from './utils/getModelForeignIds.js';

export async function createReactClient(that, parsedJDL) {
    const { entities, enums, relationships } = parsedJDL;
    const appName = that.config.get('name');

    that.spawnCommandSync('npm', ['create', 'vite@latest', 'client', '--', '--template', 'react-ts']);

    that.fs.copyTpl(that.templatePath('react/.env'), that.destinationPath('client/.env'), {});
    that.fs.copyTpl(that.templatePath('react/.gitignore'), that.destinationPath('client/.gitignore'), {});

    that.fs.copyTpl(that.templatePath('react/eslint.config.js'), that.destinationPath('client/eslint.config.js'), {});
    that.fs.copyTpl(that.templatePath('react/index.html.ejs'), that.destinationPath('client/index.html'), { appName });
    that.fs.copyTpl(that.templatePath('react/package.json.ejs'), that.destinationPath('client/package.json'), { name: to.slug(appName) });
    that.fs.copyTpl(that.templatePath('react/package-lock.json.ejs'), that.destinationPath('client/package-lock.json'), { name: to.slug(appName) });
    that.fs.copyTpl(that.templatePath('react/tsconfig.app.json'), that.destinationPath('client/tsconfig.app.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.json'), that.destinationPath('client/tsconfig.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.node.json'), that.destinationPath('client/tsconfig.node.json'), {});
    that.fs.copyTpl(that.templatePath('react/vite.config.ts.ejs'), that.destinationPath('client/vite.config.ts'), {});

    for (const lang of ['en', 'it', 'fr', 'de']) {
        that.fs.copyTpl(that.templatePath(`react/public/locales/${lang}/translation.json.ejs`), that.destinationPath(`client/public/locales/${lang}/translation.json`), { appName, entities, relationships, to, pluralize, getModelForeignIds, getModelRelatedEntities });
    };

    that.fs.copyTpl(that.templatePath("react/src/App.css"), that.destinationPath(`client/src/App.css`), {});
    that.fs.copyTpl(that.templatePath("react/src/App.tsx.ejs"), that.destinationPath(`client/src/App.tsx`), { entities, to, pluralize });
    that.fs.copyTpl(that.templatePath("react/src/i18n.js"), that.destinationPath(`client/src/i18n.js`), {});
    that.fs.copyTpl(that.templatePath("react/src/index.css"), that.destinationPath(`client/src/index.css`), {});
    that.fs.copyTpl(that.templatePath("react/src/main.tsx.ejs"), that.destinationPath(`client/src/main.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/vite-env.d.ts"), that.destinationPath(`client/src/vite-env.d.ts`), {});

    that.fs.copyTpl(that.templatePath("assets/icon.png"), that.destinationPath(`client/public/icon.png`), {});
    that.fs.copyTpl(that.templatePath("assets/icon.svg"), that.destinationPath(`client/public/icon.svg`), {});
    that.fs.copyTpl(that.templatePath("assets/laravel-logo.svg"), that.destinationPath(`client/src/assets/laravel-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/logo.svg"), that.destinationPath(`client/src/assets/logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/mariadb-logo.svg"), that.destinationPath(`client/src/assets/mariadb-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/mysql-logo.svg"), that.destinationPath(`client/src/assets/mysql-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/pgsql-logo.svg"), that.destinationPath(`client/src/assets/pgsql-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/pninja-logo-dark.svg"), that.destinationPath(`client/src/assets/pninja-logo-dark.svg`));
    that.fs.copyTpl(that.templatePath("assets/pninja-logo-light.svg"), that.destinationPath(`client/src/assets/pninja-logo-light.svg`));
    that.fs.copyTpl(that.templatePath("assets/react.svg"), that.destinationPath(`client/src/assets/react.svg`));
    that.fs.copyTpl(that.templatePath("assets/sqlite-logo.svg"), that.destinationPath(`client/src/assets/sqlite-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/vite.svg"), that.destinationPath(`client/src/assets/vite.svg`));
    that.fs.copyTpl(that.templatePath("assets/vue.svg"), that.destinationPath(`client/src/assets/vue.svg`));

    that.fs.copyTpl(that.templatePath("react/src/components/DarkModeToggle.tsx.ejs"), that.destinationPath(`client/src/components/DarkModeToggle.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/JsonPrint.tsx.ejs"), that.destinationPath(`client/src/components/JsonPrint.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LangSelect.tsx.ejs"), that.destinationPath(`client/src/components/LangSelect.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/LoginButton.tsx.ejs"), that.destinationPath(`client/src/components/LoginButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LogoutButton.tsx.ejs"), that.destinationPath(`client/src/components/LogoutButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/Menu.tsx.ejs"), that.destinationPath(`client/src/components/Menu.tsx`), { appName, entities, to, pluralize });
    that.fs.copyTpl(that.templatePath("react/src/components/ProtectedRoute.tsx.ejs"), that.destinationPath(`client/src/components/ProtectedRoute.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/components/RoleProtectedRoute.tsx.ejs"), that.destinationPath(`client/src/components/RoleProtectedRoute.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/components/SimpleLoader.tsx.ejs"), that.destinationPath(`client/src/components/SimpleLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/TableSkeletonLoader.tsx.ejs"), that.destinationPath(`client/src/components/TableSkeletonLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/Toast.tsx.ejs"), that.destinationPath(`client/src/components/Toast.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/contexts/AuthContext.tsx.ejs"), that.destinationPath(`client/src/contexts/AuthContext.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/contexts/NotificationContext.tsx.ejs"), that.destinationPath(`client/src/contexts/NotificationContext.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/pages/Home.tsx.ejs"), that.destinationPath(`client/src/pages/Home.tsx`), { dbms: that.config.get('dbms') });

    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err403.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err403.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err404.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err404.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/hooks/useApi.ts.ejs"), that.destinationPath(`client/src/hooks/useApi.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/hooks/useRoles.ts.ejs"), that.destinationPath(`client/src/hooks/useRoles.ts`), {});

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
                numericColums: entity.body.reduce((acc, col) => {
                    if (['Integer', 'Long', 'BigDecimal', 'Float', 'Double', 'LocalDate', 'ZonedDateTime', 'Instant'].includes(col.type)) {
                        acc.push(`'${to.snake(col.name)}'`)
                    }
                    return acc;
                }, [`'id'`]),
                foreignIds: getModelForeignIds(entity, relationships),
                relatedEntities: getModelRelatedEntities(entity, relationships)
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
                relatedEntities: getModelRelatedEntities(entity, relationships)
            });
        that.fs.copyTpl(
            that.templatePath("react/src/pages/entities/EntityEdit.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}Edit.tsx`),
            {
                entity,
                to,
                pluralize,
                columns: entity.body.map(c => to.snake(c.name)),
                foreignIds: getModelForeignIds(entity, relationships),
                relatedEntities: getModelRelatedEntities(entity, relationships)
            });
        that.fs.copyTpl(
            that.templatePath("react/src/pages/entities/EntityForm.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}Form.tsx`),
            {
                entity,
                enums,
                relationships,
                foreignIds: getModelForeignIds(entity, relationships).filter(fi => ['OneToMany', 'ManyToOne'].includes(fi.cardinality)),
                relatedEntities: getModelRelatedEntities(entity, relationships).filter(re => ['OneToOne', 'ManyToMany'].includes(re.cardinality)),
                relatedEntitiesForFilters: relationships.filter(relation =>
                    relation.cardinality === 'OneToOne'
                    && relation.from.name === entity.name
                ).map(rel => to.snake(rel.from.injectedField || rel.to.name)),
                to,
                pluralize,
            }
        );
    }

    that.fs.copyTpl(that.templatePath("react/src/types/auth.ts.ejs"), that.destinationPath(`client/src/types/auth.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/utils/tokenStore.ts.ejs"), that.destinationPath(`client/src/utils/tokenStore.ts`), {});

    that.spawnCommandSync('npm', ['i'], { cwd: 'client' });
}
