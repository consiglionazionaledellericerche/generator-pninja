import to from 'to-case';
import pluralize from 'pluralize';
import jclrz from 'json-colorz';

export async function createReactClient(that, parsedJDL) {
    that.spawnCommandSync('npm', ['create', 'vite@latest', 'client', '--', '--template', 'react-ts']);
    that.spawnCommandSync('npm', ['i'], { cwd: 'client' });
    that.spawnCommandSync('npm', ['install', '-D', 'prettier'], { cwd: 'client' });
    that.spawnCommandSync('npm', ['install', '-D', 'tailwindcss@3', 'postcss', 'autoprefixer'], { cwd: 'client' });
    that.spawnCommandSync('npm', ['install', '@headlessui/react'], { cwd: 'client' });
    that.spawnCommandSync('npx', ['tailwindcss', 'init', '-p'], { cwd: 'client' });
    that.fs.copyTpl(that.templatePath("react/postcss.config.js"), that.destinationPath(`client/postcss.config.js`));
    that.fs.copyTpl(that.templatePath("react/tailwind.config.js"), that.destinationPath(`client/tailwind.config.js`));
    that.fs.copyTpl(that.templatePath("react/tsconfig.json"), that.destinationPath(`client/tsconfig.json`));
    that.fs.copyTpl(that.templatePath("react/tsconfig.app.json"), that.destinationPath(`client/tsconfig.app.json`));
    that.fs.copyTpl(that.templatePath("react/tsconfig.node.json"), that.destinationPath(`client/tsconfig.node.json`));
    that.fs.copyTpl(that.templatePath("react/vite.config.ts"), that.destinationPath(`client/vite.config.ts`));
}
