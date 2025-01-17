import colors from 'ansi-colors';

export function hello(log) {
    log(colors.blueBright(`┏━┳━┳┳┓       `));
    log(colors.blueBright(`┃┃┃┃┃┣╋━┳┳┳━┓ `));
    log(colors.blueBright(`┃┏┫┃┃┃┃┃┃┣┫┃┗┓`));
    log(colors.blueBright(`┗┛┗┻━┻┻┻┳┛┣━━┛`));
    log(colors.blueBright(`        ┗━┛   `));
    // log(``);
    // log(colors.redBright(`█▀█ █▄ █ █ █▄ █   █ ▄▀█`));
    // log(colors.redBright(`█▀▀ █ ▀█ █ █ ▀█ █▄█ █▀█`));
    // log(``);
    // log(colors.redBright(`██████╗ ███╗   ██╗██╗███╗   ██╗     ██╗ █████╗ `));
    // log(colors.redBright(`██╔══██╗████╗  ██║██║████╗  ██║     ██║██╔══██╗`));
    // log(colors.redBright(`██████╔╝██╔██╗ ██║██║██╔██╗ ██║     ██║███████║`));
    // log(colors.redBright(`██╔═══╝ ██║╚██╗██║██║██║╚██╗██║██   ██║██╔══██║`));
    // log(colors.redBright(`██║     ██║ ╚████║██║██║ ╚████║╚█████╔╝██║  ██║`));
    // log(colors.redBright(`╚═╝     ╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═╝`));
    // log(colors.magenta('████████████ ████████████ ████             ████████ ████████████ ████████████'));
    // log(colors.magenta('████████████ ████████████ ████             ████████ ████████████ ████████████'));
    // log(colors.magenta('████    ████ ████         ████████         ████         ████     ████    ████'));
    // log(colors.magenta('████    ████ ████         ████████         ████         ████     ████    ████'));
    // log(colors.magenta('    ████████ ████             ████████ ████████         ████     ████████████'));
    // log(colors.magenta('    ████████ ████             ████████ ████████         ████     ████████████'));
    // log(colors.magenta('████                                                                         '));
    // log(colors.magenta('████                                                                         '));
    log(`\n${colors.bold.blueBright(`PNinja`)} ${colors.yellow(`v.0.2.0`)} | Yeoman generator for ${colors.whiteBright(`PHP`)}, ${colors.whiteBright(`SQL`)}, ${colors.whiteBright(`JavaScript`)} modern web applications`);
}
