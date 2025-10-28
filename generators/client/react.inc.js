import to from 'to-case';
import pluralize from 'pluralize';
import { getModelRelatedEntities } from './utils/getModelRelatedEntities.js';
import { getModelForeignIds } from './utils/getModelForeignIds.js';
import { getLanguageData } from './config/languages.js';

const colors = [
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
];

const navbarStartcolor = colors[Math.floor(Math.random() * colors.length)];

export async function createReactClient(that, parsedJDL) {
    const searchEngine = that.config.get('searchEngine');
    const { entities, enums, relationships } = parsedJDL;
    const appName = that.config.get('name');
    const nativeLanguage = that.config.get('nativeLanguage') || 'en';
    const languages = [nativeLanguage, ...that.config.get('languages')] || ['en', 'es', 'it', 'fr', 'de'];

    that.spawnCommandSync('npm', ['create', 'vite@6.1.1', 'client', '--', '--template', 'react-ts']);

    that.fs.copyTpl(that.templatePath('react/.env.ejs'), that.destinationPath('client/.env'), {});
    that.fs.copyTpl(that.templatePath('react/.gitignore.ejs'), that.destinationPath('client/.gitignore'), {});
    that.fs.copyTpl(that.templatePath('react/eslint.config.js.ejs'), that.destinationPath('client/eslint.config.js'), {});
    that.fs.copyTpl(that.templatePath('react/index.html.ejs'), that.destinationPath('client/index.html'), { appName });
    that.fs.copyTpl(that.templatePath('react/package.json.ejs'), that.destinationPath('client/package.json'), { name: to.slug(appName) });
    that.fs.copyTpl(that.templatePath('react/package-lock.json.ejs'), that.destinationPath('client/package-lock.json'), { name: to.slug(appName) });
    that.fs.copyTpl(that.templatePath('react/tsconfig.app.json.ejs'), that.destinationPath('client/tsconfig.app.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.json.ejs'), that.destinationPath('client/tsconfig.json'), {});
    that.fs.copyTpl(that.templatePath('react/tsconfig.node.json.ejs'), that.destinationPath('client/tsconfig.node.json'), {});
    that.fs.copyTpl(that.templatePath('react/vite.config.ts.ejs'), that.destinationPath('client/vite.config.ts'), {});

    for (const lang of languages) {
        that.fs.copyTpl(that.templatePath(`react/public/locales/${lang}/translation.json.ejs`), that.destinationPath(`client/public/locales/${lang}/translation.json`), { appName, entities, relationships, to, pluralize, getModelForeignIds, getModelRelatedEntities });
    };
    that.fs.copyTpl(that.templatePath("react/public/fonts/IBMPlexMono-Regular.ttf"), that.destinationPath(`client/public/fonts/IBMPlexMono-Regular.ttf`));
    that.fs.copyTpl(that.templatePath("react/public/fonts/InterVariable-Italic.woff2"), that.destinationPath(`client/public/fonts/InterVariable-Italic.woff2`));
    that.fs.copyTpl(that.templatePath("react/public/fonts/InterVariable.woff2"), that.destinationPath(`client/public/fonts/InterVariable.woff2`));

    that.fs.copyTpl(that.templatePath("react/src/App.css.ejs"), that.destinationPath(`client/src/App.css`), {});
    that.fs.copyTpl(that.templatePath("react/src/App.tsx.ejs"), that.destinationPath(`client/src/App.tsx`), { entities, to, pluralize });
    that.fs.copyTpl(that.templatePath("react/src/i18n.js.ejs"), that.destinationPath(`client/src/i18n.js`), {
        supportedLngs: JSON.stringify(languages).replaceAll(`"`, `'`),
        fallbackLng: nativeLanguage
    });
    that.fs.copyTpl(that.templatePath("react/src/index.css.ejs"), that.destinationPath(`client/src/index.css`), { navbarStartcolor });
    that.fs.copyTpl(that.templatePath("react/src/main.tsx.ejs"), that.destinationPath(`client/src/main.tsx`), {});

    that.fs.copyTpl(that.templatePath("assets/icon.png"), that.destinationPath(`client/public/icon.png`));
    that.fs.copyTpl(that.templatePath("assets/icon.svg"), that.destinationPath(`client/public/icon.svg`));
    that.fs.copyTpl(that.templatePath("assets/algolia-logo.svg"), that.destinationPath(`client/src/assets/algolia-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/elastic-logo.svg"), that.destinationPath(`client/src/assets/elastic-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/laravel-logo.svg"), that.destinationPath(`client/src/assets/laravel-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/logo.svg"), that.destinationPath(`client/src/assets/logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/mariadb-logo.svg"), that.destinationPath(`client/src/assets/mariadb-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/meilisearch-logo.svg"), that.destinationPath(`client/src/assets/meilisearch-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/mysql-logo.svg"), that.destinationPath(`client/src/assets/mysql-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/pgsql-logo.svg"), that.destinationPath(`client/src/assets/pgsql-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/pninja-logo-dark.svg"), that.destinationPath(`client/src/assets/pninja-logo-dark.svg`));
    that.fs.copyTpl(that.templatePath("assets/pninja-logo-light.svg"), that.destinationPath(`client/src/assets/pninja-logo-light.svg`));
    that.fs.copyTpl(that.templatePath("assets/react.svg"), that.destinationPath(`client/src/assets/react.svg`));
    that.fs.copyTpl(that.templatePath("assets/solr-logo.svg"), that.destinationPath(`client/src/assets/solr-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/sqlite-logo.svg"), that.destinationPath(`client/src/assets/sqlite-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/typesense-logo.svg"), that.destinationPath(`client/src/assets/typesense-logo.svg`));
    that.fs.copyTpl(that.templatePath("assets/vite.svg"), that.destinationPath(`client/src/assets/vite.svg`));
    that.fs.copyTpl(that.templatePath("assets/vue.svg"), that.destinationPath(`client/src/assets/vue.svg`));

    that.fs.copyTpl(that.templatePath("react/src/components/ApiResponsePagination.tsx.ejs"), that.destinationPath(`client/src/components/ApiResponsePagination.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/ConfirmButton.tsx.ejs"), that.destinationPath(`client/src/components/ConfirmButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/DarkModeToggle.tsx.ejs"), that.destinationPath(`client/src/components/DarkModeToggle.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/Footer.tsx.ejs"), that.destinationPath(`client/src/components/Footer.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/index.ts.ejs"), that.destinationPath(`client/src/components/formElements/index.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/Checkbox.tsx.ejs"), that.destinationPath(`client/src/components/formElements/Checkbox.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/ColorField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/ColorField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/DateField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/DateField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/DateTimeField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/DateTimeField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/DurationField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/DurationField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/EmailField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/EmailField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/FileField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/FileField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/FormErrors.tsx.ejs"), that.destinationPath(`client/src/components/formElements/FormErrors.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/FormErrorsAria.tsx.ejs"), that.destinationPath(`client/src/components/formElements/FormErrorsAria.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/FormLabel.tsx.ejs"), that.destinationPath(`client/src/components/formElements/FormLabel.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/FormLabelAria.tsx.ejs"), that.destinationPath(`client/src/components/formElements/FormLabelAria.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/InfoValidations.tsx.ejs"), that.destinationPath(`client/src/components/formElements/InfoValidations.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/NumberField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/NumberField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/PasswordField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/PasswordField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/RadioGroup.tsx.ejs"), that.destinationPath(`client/src/components/formElements/RadioGroup.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/RangeField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/RangeField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/RichTextEditor.tsx.ejs"), that.destinationPath(`client/src/components/formElements/RichTextEditor.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/SelectField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/SelectField.tsx`), { searchEngine });
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/TelField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/TelField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/Textarea.tsx.ejs"), that.destinationPath(`client/src/components/formElements/Textarea.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/TextField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/TextField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/TimeField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/TimeField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/UrlField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/UrlField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/formElements/UuidField.tsx.ejs"), that.destinationPath(`client/src/components/formElements/UuidField.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/HtmlViewer.tsx.ejs"), that.destinationPath(`client/src/components/HtmlViewer.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/JsonPrint.tsx.ejs"), that.destinationPath(`client/src/components/JsonPrint.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LangSelect.tsx.ejs"), that.destinationPath(`client/src/components/LangSelect.tsx`), { to });
    that.fs.copyTpl(that.templatePath("react/src/components/LoginButton.tsx.ejs"), that.destinationPath(`client/src/components/LoginButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/LogoutButton.tsx.ejs"), that.destinationPath(`client/src/components/LogoutButton.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/Menu.tsx.ejs"), that.destinationPath(`client/src/components/Menu.tsx`), { appName, entities, to, pluralize, withLangSelect: languages.length > 1 });
    that.fs.copyTpl(that.templatePath("react/src/components/LoginRedirector.tsx.ejs"), that.destinationPath(`client/src/components/LoginRedirector.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/components/ProtectedRoute.tsx.ejs"), that.destinationPath(`client/src/components/ProtectedRoute.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/components/SearchInput.tsx.ejs"), that.destinationPath(`client/src/components/SearchInput.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/SimpleLoader.tsx.ejs"), that.destinationPath(`client/src/components/SimpleLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/TableSkeletonLoader.tsx.ejs"), that.destinationPath(`client/src/components/TableSkeletonLoader.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/components/Toast.tsx.ejs"), that.destinationPath(`client/src/components/Toast.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/config/languages.ts.ejs"), that.destinationPath(`client/src/config/languages.ts`), {
        languages: JSON.stringify(languages).replaceAll(`"`, `'`),
        languagesData: JSON.stringify(languages.map(lng => getLanguageData(lng)), null, 2)
    });

    that.fs.copyTpl(that.templatePath("react/src/contexts/AuthContext.tsx.ejs"), that.destinationPath(`client/src/contexts/AuthContext.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/contexts/AuthProvider.tsx.ejs"), that.destinationPath(`client/src/contexts/AuthProvider.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/contexts/NotificationContext.tsx.ejs"), that.destinationPath(`client/src/contexts/NotificationContext.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/pages/Home.tsx.ejs"), that.destinationPath(`client/src/pages/Home.tsx`), {
        dbms: that.config.get('dbms'),
        searchEngine: that.config.get('searchEngine')
    });
    that.fs.copyTpl(that.templatePath("react/src/pages/Login.tsx.ejs"), that.destinationPath(`client/src/pages/Login.tsx`));
    that.fs.copyTpl(that.templatePath("react/src/pages/Logout.tsx.ejs"), that.destinationPath(`client/src/pages/Logout.tsx`));

    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err403.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err403.tsx`), {});
    that.fs.copyTpl(that.templatePath("react/src/pages/errors/Err404.tsx.ejs"), that.destinationPath(`client/src/pages/errors/Err404.tsx`), {});

    that.fs.copyTpl(that.templatePath("react/src/hooks/useApi.ts.ejs"), that.destinationPath(`client/src/hooks/useApi.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/hooks/useAuthState.ts.ejs"), that.destinationPath(`client/src/hooks/useAuthState.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/hooks/useAutoShortcuts.tsx.ejs"), that.destinationPath(`client/src/hooks/useAutoShortcuts.tsx`), {});
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
            that.templatePath("react/src/pages/entities/EntityList.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}List.tsx`),
            {
                entity,
                to,
                pluralize,
                columns: entity.body.map(c => to.snake(c.name)),
                durationColumns: entity.body.filter(c => c.type === 'Duration').map(c => to.snake(c.name)),
                fileColumns: entity.body.filter(c => c.type === 'Blob' || c.type === 'AnyBlob' || c.type === 'ImageBlob').map(c => to.snake(c.name)),
                foreignIds: getModelForeignIds(entity, relationships),
                relatedEntities: getModelRelatedEntities(entity, relationships),
                searchEngine,
            });
        that.fs.copyTpl(
            that.templatePath("react/src/pages/entities/EntityView.tsx.ejs"),
            that.destinationPath(`client/src/pages/entities/${entity.name}View.tsx`),
            {
                entity,
                to,
                pluralize,
                columns: entity.body.map(c => to.snake(c.name)),
                durationColumns: entity.body.filter(c => c.type === 'Duration').map(c => to.snake(c.name)),
                fileColumns: entity.body.filter(c => c.type === 'Blob' || c.type === 'AnyBlob' || c.type === 'ImageBlob').map(c => to.snake(c.name)),
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
            that.templatePath("react/src/components/entities/EntityForm.tsx.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.name}Form.tsx`),
            {
                entity,
                enums,
                relationships,
                foreignIds: getModelForeignIds(entity, relationships).filter(fi => ['OneToMany', 'ManyToOne'].includes(fi.cardinality)),
                relatedEntities: getModelRelatedEntities(entity, relationships)
                    .filter(re => ['OneToOne', 'ManyToMany'].includes(re.cardinality))
                    .filter(re => !(re.cardinality === 'OneToOne' && re.reverse === true)),
                relatedEntitiesForFilters: relationships.filter(relation =>
                    relation.cardinality === 'OneToOne'
                    && relation.from.name === entity.name
                ).map(rel => to.snake(rel.from.injectedField || rel.to.name)),
                to,
                pluralize,
                searchEngine
            }
        );
        that.fs.copyTpl(
            that.templatePath("react/src/components/entities/EntityDeleteButton.tsx.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.name}DeleteButton.tsx`),
            {
                entity,
                to,
                pluralize,
            }
        );
    }

    that.fs.copyTpl(that.templatePath("react/src/types/api-response.types.ts.ejs"), that.destinationPath(`client/src/types/api-response.types.ts`), {});
    that.fs.copyTpl(that.templatePath("react/src/types/auth.ts.ejs"), that.destinationPath(`client/src/types/auth.ts`), {});

    that.spawnCommandSync('npm', ['i'], { cwd: 'client' });
}
